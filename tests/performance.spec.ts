import { expect, test } from "@playwright/test";

type WebVitals = {
  cls: number;
  lcp: number;
};

test("mantém métricas de experiência e fontes dentro do esperado", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0 };
    (window as Window & { __testWebVitals?: WebVitals }).__testWebVitals = metrics;

    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        metrics.lcp = entry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries() as PerformanceEntryList) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput) metrics.cls += layoutShift.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(250);

  const experience = await page.evaluate(async () => {
    await document.fonts.ready;

    return {
      metrics: (window as Window & { __testWebVitals?: WebVitals }).__testWebVitals,
      textFontLoaded: [...document.fonts].some((font) => font.family === "Aller" && font.status === "loaded"),
      titleFontLoaded: [...document.fonts].some((font) => font.family === "Alegreya Sans SC" && font.status === "loaded"),
    };
  });

  expect(experience.metrics?.lcp).toBeGreaterThan(0);
  expect(experience.metrics?.lcp).toBeLessThanOrEqual(3000);
  expect(experience.metrics?.cls).toBeLessThanOrEqual(0.1);
  expect(experience.textFontLoaded).toBe(true);
  expect(experience.titleFontLoaded).toBe(true);
});

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
