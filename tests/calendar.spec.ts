import { expect, test } from "@playwright/test";
import { calendarIcs, googleCalendarUrl, type CalendarEvent } from "../src/utils/calendar";

const event: CalendarEvent = {
  id: "celebracao",
  title: "Celebração, fé e união; todos convidados",
  start: new Date("2026-12-24T21:00:00Z"),
  end: new Date("2026-12-24T22:30:00Z"),
  description: "Primeira linha\nSegunda linha \\ especial",
  location: "Catedral — Brasília",
  url: "https://example.org/events/celebracao",
};

test("gera iCalendar válido com texto escapado e linhas limitadas em UTF-8", () => {
  const calendar = calendarIcs({ ...event, title: event.title.repeat(8) }, new Date("2026-01-01T00:00:00Z"));
  const unfolded = calendar.replace(/\r\n /g, "");
  expect(calendar.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75)).toBe(true);
  expect(unfolded).toContain("DTSTART:20261224T210000Z\r\nDTEND:20261224T223000Z");
  expect(unfolded).toContain("SUMMARY:Celebração\\, fé e união\\; todos convidados");
  expect(unfolded).toContain("DESCRIPTION:Primeira linha\\nSegunda linha \\\\ especial");
  expect(unfolded).toContain("LOCATION:Catedral — Brasília");
  expect(unfolded).toContain("UID:celebracao@example.org");
});

test("não inventa horário de encerramento e prepara o Google Agenda", () => {
  const withoutEnd = { ...event, end: undefined };
  expect(calendarIcs(withoutEnd)).not.toContain("DTEND:");
  const url = new URL(googleCalendarUrl(withoutEnd));
  expect(url.origin).toBe("https://calendar.google.com");
  expect(url.searchParams.get("dates")).toBe("20261224T210000Z/20261224T210000Z");
  expect(url.searchParams.get("location")).toBe(event.location);
  expect(url.searchParams.get("details")).toContain(event.url);
});

test("oferece ações de calendário na página e um arquivo estático para download", async ({ page, request }) => {
  await page.goto("/events/evento-exemplo");
  const download = page.getByRole("link", { name: /baixar arquivo icalendar/i });
  await expect(download).toHaveAttribute("href", "/events/evento-exemplo.ics");
  const response = await request.get("/events/evento-exemplo.ics");
  expect(response.status()).toBe(200);
  const ics = (await response.text()).replace(/\r\n /g, "");
  expect(ics).toContain("SUMMARY:Evento de exemplo");
  expect(ics).toContain("DTSTART:20260101T120000Z");
  await expect(page.getByRole("link", { name: /google agenda/i })).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
});
