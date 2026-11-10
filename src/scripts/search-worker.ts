type Result = { title: string; href: string; searchText: string; description?: string; date?: string; endDate?: string; dateTimeZone?: string; image?: { src: string; alt: string } };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
let index: Promise<(Result & { normalized: string })[]> | undefined;

self.onmessage = async (message: MessageEvent<{ id: number; query: string; page: number }>) => {
  const { id, query, page } = message.data;
  try {
    index ??= Promise.all(["news", "events"].map(async (type) => {
      const response = await fetch(`/search-index/${type}.json`);
      if (!response.ok) throw new Error("search unavailable");
      const entries = await response.json() as Result[];
      return entries.map((entry) => ({ ...entry, normalized: normalize(entry.searchText) }));
    })).then((collections) => collections.flat());
    const entries = await index;
    const words = normalize(query).trim().split(/\s+/);
    const matching = entries.filter((entry) => words.every((word) => entry.normalized.includes(word)));
    const results = matching.slice((page - 1) * 9, page * 9).map(({ searchText, normalized, ...card }) => card);
    self.postMessage({ id, results, total: matching.length, page });
  } catch {
    index = undefined;
    self.postMessage({ id, error: true });
  }
};
