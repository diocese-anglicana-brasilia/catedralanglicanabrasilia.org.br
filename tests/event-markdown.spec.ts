import { expect, test } from "@playwright/test";

test("renderiza a formatação da descrição sem aceitar HTML ou links perigosos", async () => {
  const { renderEventDescription } = await import("../src/utils/event-markdown");
  const html = renderEventDescription("**Destaque** e *ênfase*\n\n- Primeiro\n- Segundo\n\n[Link](/pages/dean)\n\n<script>alert(1)</script>\n\n[Inseguro](javascript:alert(1))");
  expect(html).toContain("<strong>Destaque</strong>");
  expect(html).toContain("<em>ênfase</em>");
  expect(html).toContain("<li>Primeiro</li>");
  expect(html).toContain('href="/pages/dean"');
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="javascript:');
});

test("renderiza a descrição em Markdown do evento como parágrafos e links", async ({ page }) => {
  await page.goto("/events/reconducao-da-rev-tati-como-dea-da-catedral");
  const article = page.locator("main article");
  await expect(article.getByRole("link", { name: "Reverenda Tati Ribeiro" })).toHaveAttribute("href", "/pages/dean");
  await expect(article.getByRole("link", { name: "Junta Paroquial" })).toHaveAttribute("href", "/pages/leadership");
  await expect(article.locator("[data-event-description] p")).toHaveCount(2);
  await expect(article).not.toContainText("[Reverenda Tati Ribeiro](/pages/dean)");
});
