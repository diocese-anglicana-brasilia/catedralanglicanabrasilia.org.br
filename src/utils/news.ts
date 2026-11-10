import type { CollectionEntry } from "astro:content";
import type { CardItem } from "../types/card";

export function newsCard(entry: CollectionEntry<"news">): CardItem {
  const image = entry.data.featured_image;
  const src = typeof image === "string" ? image : image?.src;
  return {
    title: entry.data.title,
    href: `/news/${entry.id}`,
    date: entry.data.date,
    description: entry.data.excerpt,
    image: src ? { src, alt: "" } : undefined,
  };
}

export function publishedNews<T extends Pick<CollectionEntry<"news">, "data">>(entries: T[]): T[] {
  return entries
    .filter(({ data }) => data.status === "published")
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const NEWS_PAGE_SIZE = 9;

export function paginateNews<T>(entries: T[], pageSize = NEWS_PAGE_SIZE): T[][] {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  return Array.from({ length: totalPages }, (_, index) =>
    entries.slice(index * pageSize, (index + 1) * pageSize),
  );
}

export function newsPageHref(page: number): string {
  return page === 1 ? "/news/" : `/news/pagina/${page}/`;
}
