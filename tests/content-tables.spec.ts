import { expect, test } from "@playwright/test";

test("tabelas do conteúdo têm células delimitadas e cabem na tela", async ({ page }) => {
  await page.goto("/pages/history");
  await page.locator(".content-body").evaluate((body) => {
    body.insertAdjacentHTML("beforeend", '<table><thead><tr><th>Informação</th><th>Descrição</th></tr></thead><tbody><tr><td>Contato</td><td>Mensagem com informações relevantes para a comunidade e para quem visita a Catedral.</td></tr></tbody></table>');
  });
  const table = page.locator(".content-body table").last();
  for (const cell of await table.locator("th, td").all()) {
    await expect(cell).toHaveCSS("border-top-style", "solid");
    await expect(cell).toHaveCSS("border-top-width", "1px");
    expect(await cell.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft))).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
