export function textExcerpt(description?: string | null): string | undefined {
  const text = description
    ?.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/(^|\s)[#>*_~`-]+/g, "$1")
    .replace(/[*_~`]/g, "")
    .trim();
  if (!text) return undefined;
  return `${text.split(/\s+/).slice(0, 15).join(" ")}...`;
}
