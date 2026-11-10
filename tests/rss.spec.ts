import { expect, test } from "@playwright/test";
import { publishedNews } from "../src/utils/news";

test("seleciona apenas notícias publicadas e ordena por data", () => {
  const entries = [
    { data: { status: "published" as const, date: new Date("2025-01-01"), title: "Antiga" } },
    { data: { status: "draft" as const, date: new Date("2026-03-01"), title: "Rascunho" } },
    { data: { status: "archived" as const, date: new Date("2026-02-01"), title: "Arquivada" } },
    { data: { status: "published" as const, date: new Date("2026-01-01"), title: "Recente" } },
  ];
  expect(publishedNews(entries).map(({ data }) => data.title)).toEqual(["Recente", "Antiga"]);
});

test("disponibiliza um RSS válido com a notícia publicada", async ({ page, request }) => {
  const response = await request.get("/rss.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/(?:application|text)\/(?:rss\+)?xml/);
  const body = await response.text();
  const feed = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return {
      error: document.querySelector("parsererror")?.textContent,
      title: document.querySelector("channel > title")?.textContent,
      language: document.querySelector("channel > language")?.textContent,
      items: [...document.querySelectorAll("item")].map((item) => ({
        title: item.querySelector("title")?.textContent,
        link: item.querySelector("link")?.textContent,
        description: item.querySelector("description")?.textContent,
      })),
    };
  }, body);
  expect(feed.error).toBeUndefined();
  expect(feed.title).toBe("Notícias | Catedral Anglicana de Brasília");
  expect(feed.language).toBe("pt-BR");
  expect(feed.items).toContainEqual({
    title: "Notícia de exemplo",
    link: "https://catedralanglicanabrasilia.org.br/news/2026-01-01-noticia-exemplo/",
    description: "Conteúdo fictício para testar o cadastro de notícias.",
  });

  await page.goto("/");
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", "/rss.xml");
  await expect(page.getByRole("link", { name: "Feed RSS de notícias" })).toHaveAttribute("href", "/rss.xml");
});
