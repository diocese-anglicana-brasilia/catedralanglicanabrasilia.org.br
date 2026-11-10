import { expect, test } from "@playwright/test";
import { eventExcerpt, eventsPageHref, isCurrentOrUpcoming, orderEvents } from "../src/utils/events";
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
    .map((date) => ({ data: { start_date: new Date(`${date}T12:00:00Z`) } }));
  expect(orderEvents(events, new Date("2026-01-10T15:00:00Z")).map((event) => event.data.start_date.toISOString().slice(0, 10)))
    .toEqual(["2026-01-11", "2026-01-12", "2026-01-08", "2026-01-03", "2026-01-01"]);
  expect(paginateItems(Array.from({ length: 19 })).map((page) => page.length)).toEqual([9, 9, 1]);
  expect(eventsPageHref(1)).toBe("/events/");
  expect(eventsPageHref(2)).toBe("/events/pagina/2/");
});

test("considera encerramento e horário de Brasília ao identificar eventos vigentes", () => {
  const now = new Date("2026-01-10T15:00:00Z");
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-08T12:00:00Z"), end_date: new Date("2026-01-11T12:00:00Z") }, now)).toBe(true);
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-08T12:00:00Z"), end_date: new Date("2026-01-10T14:59:00Z") }, now)).toBe(false);
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-10T12:00:00Z") }, now)).toBe(true);
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-09T12:00:00Z") }, now)).toBe(false);
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-10T12:00:00Z") }, new Date("2026-01-11T02:30:00Z"))).toBe(true);
  expect(isCurrentOrUpcoming({ start_date: new Date("2026-01-10T12:00:00Z") }, new Date("2026-01-11T03:00:00Z"))).toBe(false);
});

test("mostra o período no card e os horários no detalhamento", async ({ page }) => {
  await page.goto("/");
  const visibleAtBuild = isCurrentOrUpcoming({
    start_date: new Date("2026-01-01T12:00:00Z"),
    end_date: new Date("2026-12-31T12:00:00Z"),
  });
  await expect(page.locator("#eventos .content-card").getByRole("link", { name: "Evento de exemplo" })).toHaveCount(visibleAtBuild ? 1 : 0);
  await page.goto("/events/");
  await expect(page.getByRole("heading", { level: 1, name: "Eventos" })).toBeVisible();
  const card = page.locator(".content-card").filter({ has: page.getByRole("link", { name: "Evento de exemplo" }) });
  await expect(card.locator("time")).toHaveCount(2);
  await expect(card.locator("time").nth(0)).toHaveText("01/01/2026");
  await expect(card.locator("time").nth(1)).toHaveText("31/12/2026");
  await card.getByRole("link", { name: "Evento de exemplo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Evento de exemplo" })).toBeVisible();
  const dates = page.locator("main time");
  await expect(dates).toHaveCount(2);
  await expect(dates.nth(0)).toHaveText(/01\/01\/2026.*09:00/);
  await expect(dates.nth(1)).toHaveText(/31\/12\/2026.*09:00/);
  await expect(page.getByText("(horário de Brasília)")).toBeVisible();
});

test("apresenta calendário mensal navegável com eventos em todos os dias do período", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-02-15T15:00:00Z"));
  await page.goto("/events/");
  const calendar = page.getByRole("region", { name: "Calendário de eventos" });
  await expect(calendar.getByRole("heading", { name: /fevereiro de 2026/i })).toBeVisible();
  const firstDay = calendar.locator('[data-date="2026-02-01"]');
  await expect(firstDay.getByRole("link", { name: "Evento de exemplo" })).toHaveAttribute("href", "/events/evento-exemplo");
  await expect(calendar.locator('[data-date="2026-02-28"]').getByRole("link", { name: "Evento de exemplo" })).toBeVisible();
  await calendar.getByRole("button", { name: "Próximo mês" }).click();
  await expect(calendar.getByRole("heading", { name: /março de 2026/i })).toBeVisible();
  await calendar.getByRole("button", { name: "Mês anterior" }).focus();
  await page.keyboard.press("Enter");
  await expect(calendar.getByRole("heading", { name: /fevereiro de 2026/i })).toBeVisible();
  await expect(page.locator(".content-card").filter({ hasText: "Evento de exemplo" })).toBeVisible();
});

test("respeita o mês de Brasília e navega entre anos", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2027-01-01T02:00:00Z"));
  await page.goto("/events/");
  const calendar = page.getByRole("region", { name: "Calendário de eventos" });
  await expect(calendar.getByRole("heading", { name: /dezembro de 2026/i })).toBeVisible();
  await expect(calendar.locator('[data-date="2026-12-31"]').getByRole("link", { name: "Evento de exemplo" })).toBeVisible();
  await calendar.getByRole("button", { name: "Próximo mês" }).click();
  await expect(calendar.getByRole("heading", { name: /janeiro de 2027/i })).toBeVisible();
  await expect(calendar.getByRole("link", { name: "Evento de exemplo" })).toHaveCount(0);
});

test("preserva a lista de eventos quando o JavaScript está desativado", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/events/");
  await expect(page.locator(".content-card").getByRole("link", { name: "Evento de exemplo" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calendário de eventos" })).toHaveCount(0);
  await context.close();
});
