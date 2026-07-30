import { expect, test } from "@playwright/test";

test("respeita o orçamento local de carregamento", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const performanceBudget = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const sameOriginTransferSize = resources
      .filter((resource) => new URL(resource.name).origin === location.origin)
      .reduce((total, resource) => total + resource.transferSize, 0);

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      resourceCount: resources.length,
      sameOriginTransferSize,
    };
  });

  expect(performanceBudget.domContentLoaded).toBeLessThanOrEqual(3000);
  expect(performanceBudget.resourceCount).toBeLessThanOrEqual(30);
  expect(performanceBudget.sameOriginTransferSize).toBeLessThanOrEqual(500_000);
});
