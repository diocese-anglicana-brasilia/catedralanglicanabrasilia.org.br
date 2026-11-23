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

test("renderiza imagens, legendas e HTML seguro na descrição do evento", async () => {
  const { renderEventDescription } = await import("../src/utils/event-markdown");
  const html = renderEventDescription('Texto **importante**.\n\n<figure><img src="https://cdn.example.org/cartaz.webp" alt="Cartaz do evento"><figcaption>Legenda do cartaz</figcaption></figure>\n\n<p>Reserve pelo <a href="https://wa.me/5561999999999">WhatsApp</a>.</p>\n\n<img src="javascript:alert(1)" onerror="alert(1)"><script>alert(1)</script>');
  expect(html).toContain("<strong>importante</strong>");
  expect(html).toContain('<img src="https://cdn.example.org/cartaz.webp" alt="Cartaz do evento"');
  expect(html).toContain("<figcaption>Legenda do cartaz</figcaption>");
  expect(html).toContain('href="https://wa.me/5561999999999"');
  expect(html).not.toContain("onerror=");
  expect(html).not.toContain('src="javascript:');
  expect(html).not.toContain("<script>");
});

test("exibe o cartaz e a legenda no evento Velas do Advento", async ({ page }) => {
  await page.goto("/events/velas-do-advento-2026-11-28");
  const figure = page.locator("[data-event-description] figure");
  await expect(figure.locator("img")).toHaveAttribute("alt", /Cartaz/);
  await expect(figure.locator("figcaption")).toContainText("juventudes da Catedral");
});

test("renderiza a descrição em Markdown do evento como parágrafos e links", async ({ page }) => {
  await page.goto("/events/reconducao-da-rev-tati-como-dea-da-catedral");
  const article = page.locator("main article");
  await expect(article.getByRole("link", { name: "Reverendíssima Tati Ribeiro" })).toHaveAttribute("href", "/pages/dean");
  await expect(article.getByRole("link", { name: "Junta Paroquial" })).toHaveAttribute("href", "/pages/leadership");
  await expect(article.locator("[data-event-description] p").filter({ hasText: "Uma grande festa" })).toBeVisible();
  await expect(article).not.toContainText("[Reverendíssima Tati Ribeiro](/pages/dean)");
});
