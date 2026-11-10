import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { publishedNews } from "../utils/news";

export async function GET(context: APIContext) {
  if (!context.site) throw new Error("Configure o endereço do site para gerar o RSS.");

  const news = publishedNews(await getCollection("news"));

  return rss({
    title: "Notícias | Catedral Anglicana de Brasília",
    description: "Notícias e comunicados da Catedral Anglicana de Brasília.",
    site: context.site,
    customData: "<language>pt-BR</language>",
    items: news.map(({ id, data }) => ({
      title: data.title,
      link: `/news/${id}`,
      pubDate: data.date,
      description: data.excerpt ?? undefined,
      categories: data.tags ?? undefined,
    })),
  });
}
