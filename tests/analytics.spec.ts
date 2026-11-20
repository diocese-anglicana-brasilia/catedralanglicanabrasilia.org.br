import { expect, test } from "@playwright/test";

for (const path of ["/", "/admin/"]) {
  for (const hostname of ["localhost", "127.0.0.1", "catedral.example"]) {
    test(`${path} carrega análises somente fora de ${hostname}`, async ({ page, request }) => {
      const requests: string[] = [];
      await page.route("https://data.leocarvalho.dev/**", async (route) => {
        requests.push(new URL(route.request().url()).pathname);
        await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
      });
      await page.route(`http://${hostname}/**`, async (route) => {
        const url = new URL(route.request().url());
        const response = await request.get(`http://127.0.0.1:4322${url.pathname}${url.search}`);
        await route.fulfill({ response });
      });
      await page.goto(`http://${hostname}${path}`, { waitUntil: "domcontentloaded" });
      if (hostname === "catedral.example") {
        await expect.poll(() => requests.sort()).toEqual(["/recorder.js", "/stats.js"]);
        const scripts = page.locator('script[data-website-id="26e81a87-2c68-441e-aa04-f3accf18ede9"]');
        await expect(scripts).toHaveCount(2);
      } else {
        await page.waitForLoadState("load");
        expect(requests).toEqual([]);
      }
    });
  }
}
