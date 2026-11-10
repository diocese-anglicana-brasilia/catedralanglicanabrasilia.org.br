import type { CollectionEntry } from "astro:content";
import type { CardItem } from "../types/card";
import { textExcerpt } from "./text";


export function eventCard(entry: CollectionEntry<"events">): CardItem {
  return {
    title: entry.data.name,
    href: `/events/${entry.id}`,
    date: entry.data.start_date,
    endDate: entry.data.end_date,
    dateTimeZone: "America/Sao_Paulo",
    description: textExcerpt(entry.data.description),
  };
}
type EventDates = { start_date: Date; end_date?: Date | null };

const dayInBrasilia = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(date);

export function isCurrentOrUpcoming(data: EventDates, now = new Date()): boolean {
  return data.end_date
    ? data.end_date.getTime() >= now.getTime()
    : dayInBrasilia(data.start_date) >= dayInBrasilia(now);
}

export function orderEvents<T extends { data: EventDates }>(entries: T[], now = new Date()): T[] {
  return [...entries].sort((a, b) => {
    const first = a.data.start_date.getTime();
    const second = b.data.start_date.getTime();
    const firstUpcoming = isCurrentOrUpcoming(a.data, now);
    const secondUpcoming = isCurrentOrUpcoming(b.data, now);
    if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1;
    return firstUpcoming ? first - second : second - first;
  });
}

export function eventsPageHref(page: number): string {
  return page === 1 ? "/events/" : `/events/pagina/${page}/`;
}

export { textExcerpt as eventExcerpt } from "./text";
