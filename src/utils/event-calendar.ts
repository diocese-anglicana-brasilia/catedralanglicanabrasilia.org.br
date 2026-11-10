import type { CollectionEntry } from "astro:content";
import type { CalendarEvent } from "./calendar";

export function eventCalendar(event: CollectionEntry<"events">, location: CollectionEntry<"locations"> | undefined, site: URL): CalendarEvent {
  return {
    id: event.id,
    title: event.data.name,
    start: event.data.start_date,
    end: event.data.end_date,
    description: event.data.description,
    location: location && [location.data.name, location.data.address, location.data.city, location.data.online_url].filter(Boolean).join(" — "),
    url: new URL(`/events/${event.id}`, site).toString(),
  };
}
