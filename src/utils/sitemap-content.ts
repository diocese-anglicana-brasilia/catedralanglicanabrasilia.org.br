import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
type Entry = { id: string; body?: string; data: { title: string; status: string; date: Date; updated_at?: Date | null; featured_image?: string | { src: string } | null } };
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const url = (path: string, site: string) => escapeXml(new URL(path, site).href);
const wrap = (body: string, ns: string) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${ns}>${body}</urlset>`;
export function newsSitemap(entries: Entry[], site: string, now = new Date()) {
  const recent = entries.filter(({ data }) => data.status === "published" && data.date.getTime() <= now.getTime() && data.date.getTime() >= now.getTime() - 2 * 86400000);
  return wrap(recent.map(({ id, data }) => `<url><loc>${url(`/news/${encodeURIComponent(id)}/`, site)}</loc><lastmod>${(data.updated_at || data.date).toISOString()}</lastmod><news:news><news:publication><news:name>Catedral Anglicana da Ressurreição</news:name><news:language>pt</news:language></news:publication><news:publication_date>${data.date.toISOString()}</news:publication_date><news:title>${escapeXml(data.title)}</news:title></news:news></url>`).join(""), 'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
}
export function contentImages(content: string, site: string): string[] {
  const found: string[] = [];
  const html = new MarkdownIt({ html: true }).render(content);
  sanitizeHtml(html, { allowedTags: ["img"], allowedAttributes: { img: ["src"] }, transformTags: { img: (_tag, attrs) => {
    try { if (attrs.src?.trim()) { const image = new URL(attrs.src, site); if (["http:", "https:"].includes(image.protocol) && !attrs.src.startsWith("//")) found.push(image.href); } } catch { /* Ignora URLs inválidas. */ }
    return { tagName: "img", attribs: attrs };
  } } });
  return [...new Set(found)];
}
export function imageEntriesSitemap(entries: { path: string; images: string[]; updated_at?: Date | null }[], site: string) {
  return wrap(entries.filter((item) => item.images.length).map((item) => `<url><loc>${url(item.path, site)}</loc>${item.updated_at ? `<lastmod>${item.updated_at.toISOString()}</lastmod>` : ""}${[...new Set(item.images)].slice(0, 1000).map((src) => `<image:image><image:loc>${url(src, site)}</image:loc></image:image>`).join("")}</url>`).join(""), 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
}
export function imageSitemap(entries: Entry[], site: string) {
  return imageEntriesSitemap(entries.filter(({ data }) => data.status === "published").map(({ id, data, body }) => ({ path: `/news/${encodeURIComponent(id)}/`, updated_at: data.updated_at || data.date, images: [...(data.featured_image ? [typeof data.featured_image === "string" ? data.featured_image : data.featured_image.src] : []), ...contentImages(body || "", site)] })), site);
}
