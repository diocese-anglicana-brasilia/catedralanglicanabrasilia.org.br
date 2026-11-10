import { getCollection, getEntry } from "astro:content";
import type { APIContext } from "astro";
import { eventCard, orderEvents } from "../../utils/events";
import { newsCard, publishedNews } from "../../utils/news";

export function getStaticPaths() {
  return ["news", "events"].map((type) => ({ params: { type } }));
}

export async function GET({ params }: APIContext) {
  const entries = params.type === "news"
    ? publishedNews(await getCollection("news")).map((entry) => ({
        ...newsCard(entry), searchText: [entry.data.title, entry.data.excerpt, entry.data.author, ...(entry.data.tags ?? []), entry.body].filter(Boolean).join(" "),
      }))
    : await Promise.all(orderEvents(await getCollection("events")).map(async (entry) => {
        const location = entry.data.location ? await getEntry("locations", entry.data.location) : undefined;
        return { ...eventCard(entry), searchText: [entry.data.name, entry.data.description, entry.body, location?.data.name, location?.data.address, location?.data.city].filter(Boolean).join(" ") };
      }));
  return new Response(JSON.stringify(entries), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
