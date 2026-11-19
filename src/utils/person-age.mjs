/** Idade em anos completos para datas civis no formato AAAA-MM-DD. */
export function ageOnDate(birth, reference) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !/^\d{4}-\d{2}-\d{2}$/.test(reference) || reference < birth) return null;
  const [birthYear, birthMonth, birthDay] = birth.split("-").map(Number);
  const [year, month, day] = reference.split("-").map(Number);
  return year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
}

export function dateInBrasilia(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
