import type { CollectionEntry } from "astro:content";

export function publishedNews<T extends Pick<CollectionEntry<"news">, "data">>(entries: T[]): T[] {
  return entries
    .filter(({ data }) => data.status === "published")
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
