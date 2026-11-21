import { expect, test } from "@playwright/test";

for (const path of ["/", "/pages/about/"]) {
  test(`entrega estilos sem requisição bloqueante e antecipa fontes em ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[data-site-styles]')).toHaveCount(1);
    const stylesheet = page.locator('link[data-site-styles]');
    await expect(stylesheet).toHaveAttribute("href", /\.css/);
    await expect(stylesheet).toHaveAttribute("rel", "stylesheet");
    expect(await page.locator("noscript").first().textContent()).toContain('rel="stylesheet"');
    expect(await page.locator("style").evaluateAll((styles) => styles.some((style) => style.textContent?.includes("Alegreya Sans SC")))).toBe(true);
    for (const font of ["Aller-Light.woff2", "AlegreyaSansSC-Light.woff2"]) {
      const link = page.locator(`link[rel="preload"][as="font"][href$="/${font}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("crossorigin", "anonymous");
    }
    await expect(page.locator('link[rel="preload"][as="image"][href*="hero1.webp"]')).toHaveCount(path === "/" ? 1 : 0);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}

test("o cabeçalho e o hero permanecem utilizáveis antes do CSS complementar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*.css", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#inicio h1")).toBeVisible();
  await expect(page.locator("#inicio")).toHaveCSS("min-height", "600px");
  await expect(page.locator("header")).toHaveCSS("position", "fixed");
  await expect(page.locator("#menuBtn")).toBeVisible();
});

test("carrega os estilos completos sem JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/pages/history/");
  await expect(page.locator(".content-body [data-content-gallery]").first()).toHaveCSS("border-top-width", "1px");
  await context.close();
});
