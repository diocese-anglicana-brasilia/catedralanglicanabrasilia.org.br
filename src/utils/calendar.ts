export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date | null;
  description?: string | null;
  location?: string | null;
  url: string;
}

const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

// A continuação começa com espaço, que também conta no limite de 75 bytes.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let part = "";
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += length;
  }
  lines.push(part);
  return lines.join("\r\n");
}

export function calendarIcs(event: CalendarEvent, generatedAt = new Date()): string {
  const uid = `${encodeURIComponent(event.id)}@${new URL(event.url).hostname}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Catedral Anglicana de Brasilia//Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(generatedAt)}`,
    `DTSTART:${utcStamp(event.start)}`,
    ...(event.end && event.end > event.start ? [`DTEND:${utcStamp(event.end)}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  const end = event.end && event.end > event.start ? event.end : event.start;
  url.searchParams.set("dates", `${utcStamp(event.start)}/${utcStamp(end)}`);
  url.searchParams.set("details", [event.description, event.url].filter(Boolean).join("\n\n"));
  if (event.location) url.searchParams.set("location", event.location);
  return url.toString();
}
