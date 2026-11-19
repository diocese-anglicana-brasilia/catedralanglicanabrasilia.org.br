import { expect, test } from "@playwright/test";

test("carrega comentários apenas nas notícias, com configuração em português e fonte do site", async ({ page }) => {
  let loads = 0;
  await page.route("https://comentarios.catedralanglicanabrasilia.org.br/web/embed.mjs", async (route) => {
    loads++;
    await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "text/javascript", body: 'window.__remarkTestConfig = window.remark_config; document.getElementById("remark42").textContent = "Comentários disponíveis";' });
  });
  await page.goto("/news/");
  await expect(page.locator("#remark42")).toHaveCount(0);
  const href = await page.locator('a[href^="/news/"]:not([href="/news/"])').first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(`${href}?origem=teste#texto`);
  await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();
  await expect(page.locator("#remark42")).toHaveText("Comentários disponíveis");
  const config = await page.evaluate(() => (window as any).__remarkTestConfig);
  expect(config).toMatchObject({ host: "https://comentarios.catedralanglicanabrasilia.org.br", site_id: "catedral-brasilia", locale: "bp", custom_properties: { "--font-family": '"Aller Light", sans-serif' } });
  expect(config.url).toBe(new URL(href!, "http://127.0.0.1:4322").href.replace(/\/$/, ""));
  expect(loads).toBe(1);
  await page.goto("/pages/contact");
  await expect(page.locator("#remark42")).toHaveCount(0);
  expect(loads).toBe(1);
});
