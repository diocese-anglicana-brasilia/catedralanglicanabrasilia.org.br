import { expect, test } from "@playwright/test";

test("destaca visualmente citações no conteúdo de eventos", async ({ page }) => {
  await page.goto("/events/reconducao-da-rev-tati-como-dea-da-catedral");
  const quote = page.locator("[data-event-description] blockquote");
  await expect(quote).toBeVisible();
  await expect(quote).toHaveCSS("border-left-style", "solid");
  await expect(quote).not.toHaveCSS("border-left-width", "0px");
  await expect(quote).not.toHaveCSS("padding-left", "0px");
});
