export function formatNewsDate(date: Date, detail = false): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  const dateText = detail ? `${parts.day} de ${parts.month} de ${parts.year}` : `${parts.day}/${parts.month}/${parts.year}`;
  return `${dateText}, às ${parts.hour}:${parts.minute}:${parts.second}`;
}
