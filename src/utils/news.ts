import type { CollectionEntry } from "astro:content";
import type { CardItem } from "../types/card";
import { DEFAULT_PAGE_SIZE, paginateItems } from "./pagination";

export function newsCard(entry: CollectionEntry<"news">): CardItem {
  const image = entry.data.featured_image;
  const src = typeof image === "string" ? image : image?.src;
  return {
    title: entry.data.title,
    href: `/news/${entry.id}`,
    date: entry.data.date,
    dateStyle: "news",
    dateTimeZone: "America/Sao_Paulo",
    description: entry.data.excerpt,
    image: src ? { src, alt: "" } : undefined,
  };
}

export function publishedNews<T extends Pick<CollectionEntry<"news">, "data">>(entries: T[]): T[] {
  return entries
    .filter(({ data }) => data.status === "published")
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const NEWS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function paginateNews<T>(entries: T[], pageSize = NEWS_PAGE_SIZE): T[][] {
  return paginateItems(entries, pageSize);
}

export function newsPageHref(page: number): string {
  return page === 1 ? "/news/" : `/news/pagina/${page}/`;
}
