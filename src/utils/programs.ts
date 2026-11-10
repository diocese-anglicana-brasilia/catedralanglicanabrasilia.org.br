import type { CollectionEntry } from "astro:content";
import type { CardItem } from "../types/card";
import { textExcerpt } from "./text";

export function programCard(entry: CollectionEntry<"programs">): CardItem {
  const image = entry.data.images?.[0];
  const src = typeof image === "string" ? image : image?.src;
  return {
    title: entry.data.name,
    href: `/programs/${entry.id}`,
    description: textExcerpt(entry.data.description),
    image: src ? { src, alt: "" } : undefined,
  };
}

export function orderPrograms<T extends { data: { name: string } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.name.localeCompare(b.data.name, "pt-BR"));
}

export function programsPageHref(page: number): string {
  return page === 1 ? "/programs/" : `/programs/pagina/${page}/`;
}
