import { expect, test } from "@playwright/test";

test("carrega a fonte dos títulos pelo CDN sem a folha do Google Fonts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
  const declaration = await page.evaluate(() => {
    return [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules].map((rule) => rule.cssText); } catch { return []; }
    }).find((rule) => rule.includes("@font-face") && rule.includes("Alegreya Sans SC"));
  });
  expect(declaration).toContain("https://cdn.catedralanglicanabrasilia.org.br/AlegreyaSansSC-Light.woff2");
  expect(declaration).toContain("font-display: swap");
  expect(declaration).toContain("font-weight: 300");
});
