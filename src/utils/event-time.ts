const brasiliaParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

// Horários sem fuso são horários civis de Brasília, independentemente do servidor do build.
export function parseEventTime(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour = "00", minute = "00", second = "00", fraction = ""] = match;
  const milliseconds = Number(fraction.padEnd(3, "0"));
  const wallTime = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, milliseconds);
  let instant = wallTime;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(brasiliaParts.formatToParts(new Date(instant)).filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, Number(part)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, milliseconds);
    const correction = wallTime - represented;
    if (correction === 0) return new Date(instant);
    instant += correction;
  }
  return new Date(NaN);
}
