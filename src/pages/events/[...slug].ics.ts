import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import type { APIContext } from "astro";
import { calendarIcs } from "../../utils/calendar";
import { eventCalendar } from "../../utils/event-calendar";

export async function getStaticPaths() {
  const events = await getCollection("events");
  return events.map((event) => ({ params: { slug: event.id }, props: { event } }));
}

export async function GET({ props, site }: APIContext) {
  const event = props.event as CollectionEntry<"events">;
  const location = event.data.location ? await getEntry("locations", event.data.location) : undefined;
  if (!site) throw new Error("Configure o endereço do site para gerar o calendário.");
  const body = calendarIcs(eventCalendar(event, location, site));
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
