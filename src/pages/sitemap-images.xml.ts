import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { contentImages, imageEntriesSitemap } from "../utils/sitemap-content";
import { isCurrentOrUpcoming } from "../utils/events";
export async function GET({ site }: APIContext) {
  if (!site) throw new Error("Configure o endereço do site.");
  const [news, pages, events, programs, reverends, members, authors, locations] = await Promise.all([
    getCollection("news", ({ data }) => data.status === "published"), getCollection("pages"), getCollection("events", ({ data }) => isCurrentOrUpcoming(data)), getCollection("programs"), getCollection("reverends"), getCollection("board_members", ({ data }) => data.is_active && data.indexable), getCollection("authors", ({ data }) => data.profile_enabled), getCollection("locations"),
  ]);
  const items = [
    ...news.map((e) => ({ e, path: `/news/${e.id}/`, fields: [e.body], images: [e.data.featured_image] })),
    ...pages.map((e) => ({ e, path: `/pages/${e.id}/`, fields: [e.body], images: [] })),
    ...events.map((e) => ({ e, path: `/events/${e.id}/`, fields: [e.body, e.data.description], images: [e.data.featured_image, e.data.image] })),
    ...programs.map((e) => ({ e, path: `/programs/${e.id}/`, fields: [e.body, e.data.description, e.data.impact], images: e.data.images || [] })),
    ...reverends.map((e) => ({ e, path: `/reverends/${e.id}/`, fields: [e.body, e.data.bio], images: [e.data.photo] })),
    ...members.map((e) => ({ e, path: `/board-members/${e.id}/`, fields: [e.body, e.data.bio], images: [e.data.photo] })),
    ...authors.map((e) => ({ e, path: `/authors/${e.id}/`, fields: [e.body, e.data.bio], images: [e.data.photo] })),
    ...locations.map((e) => ({ e, path: `/locations/${e.id}/`, fields: [e.body], images: [] })),
  ];
  const mapped = items.map(({ e, path, fields, images }) => ({ path, updated_at: e.data.updated_at || (e.collection === "news" ? e.data.date : undefined), images: [...images.flatMap((image) => image ? [typeof image === "string" ? image : image.src] : []), ...fields.flatMap((text) => contentImages(text || "", new URL(path, site).href))] }));
  return new Response(imageEntriesSitemap(mapped, site.href), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
