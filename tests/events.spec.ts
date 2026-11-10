import { expect, test } from "@playwright/test";
import { eventExcerpt, eventsPageHref, orderEvents } from "../src/utils/events";
import { paginateItems } from "../src/utils/pagination";

test("gera excertos a partir das primeiras 15 palavras da descrição", () => {
  expect(eventExcerpt("Um **dois** três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis"))
    .toBe("Um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze...");
  expect(eventExcerpt("Um [encontro especial](https://example.org) para todos"))
    .toBe("Um encontro especial para todos...");
  expect(eventExcerpt("  ")).toBeUndefined();
  expect(eventExcerpt(null)).toBeUndefined();
});

test("ordena próximos eventos por proximidade e anteriores do mais recente ao mais antigo", () => {
  const events = ["2026-01-03", "2026-01-12", "2026-01-08", "2026-01-11", "2026-01-01"]
    .map((date) => ({ data: { date: new Date(`${date}T12:00:00Z`) } }));
  expect(orderEvents(events, new Date("2026-01-10T15:00:00Z")).map((event) => event.data.date.toISOString().slice(0, 10)))
    .toEqual(["2026-01-11", "2026-01-12", "2026-01-08", "2026-01-03", "2026-01-01"]);
  expect(paginateItems(Array.from({ length: 19 })).map((page) => page.length)).toEqual([9, 9, 1]);
  expect(eventsPageHref(1)).toBe("/events/");
  expect(eventsPageHref(2)).toBe("/events/pagina/2/");
});

test("exibe o evento na página inicial e na lista completa", async ({ page }) => {
  await page.goto("/#eventos");
  const section = page.locator("#eventos");
  await expect(section.locator(".content-card")).toHaveCount(1);
  await expect(section.locator(".content-card img")).toHaveCount(0);
  await expect(section.locator("time")).toHaveText("01/01/2026");
  await section.getByRole("link", { name: "Ver todos os eventos" }).click();
  await expect(page).toHaveURL(/\/events\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Eventos" })).toBeVisible();
  await page.locator(".content-card").getByRole("link", { name: "Evento de exemplo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Evento de exemplo" })).toBeVisible();
});
