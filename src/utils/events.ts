import type { CollectionEntry } from "astro:content";
import type { CardItem } from "../types/card";
import { textExcerpt } from "./text";

export const eventExcerpt = textExcerpt;

export function eventCard(entry: CollectionEntry<"events">): CardItem {
  return {
    title: entry.data.name,
    href: `/events/${entry.id}`,
    date: entry.data.date,
    description: textExcerpt(entry.data.description),
  };
}
export function orderEvents<T extends { data: { date: Date } }>(entries: T[], now = new Date()): T[] {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const cutoff = today.getTime();
  return [...entries].sort((a, b) => {
    const first = a.data.date.getTime();
    const second = b.data.date.getTime();
    const firstUpcoming = first >= cutoff;
    const secondUpcoming = second >= cutoff;
    if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1;
    return firstUpcoming ? first - second : second - first;
  });
}

export function eventsPageHref(page: number): string {
  return page === 1 ? "/events/" : `/events/pagina/${page}/`;
}
