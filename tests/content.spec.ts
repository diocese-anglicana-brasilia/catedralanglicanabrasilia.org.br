import { expect, test } from "@playwright/test";
import { newsPageHref, paginateNews, publishedNews } from "../src/utils/news";

test("organiza notícias publicadas em páginas de até nove itens", () => {
  const entries = Array.from({ length: 20 }, (_, index) => ({
    data: {
      title: `Notícia ${index}`,
      date: new Date(Date.UTC(2026, 0, index + 1)),
      status: index === 19 ? "draft" as const : "published" as const,
    },
  }));
  const pages = paginateNews(publishedNews(entries));
  expect(pages.map((page) => page.length)).toEqual([9, 9, 1]);
  expect(pages[0][0].data.title).toBe("Notícia 18");
  expect(pages[2][0].data.title).toBe("Notícia 0");
  expect(paginateNews([])).toEqual([[]]);
  expect(newsPageHref(1)).toBe("/news/");
  expect(newsPageHref(2)).toBe("/news/pagina/2/");
});

test("apresenta os mesmos cards na página inicial e no arquivo de notícias", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#noticias");
  const home = page.locator("#noticias");
  const homeLinks = await home.locator(".content-card h3 a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(homeLinks.length).toBeGreaterThan(0);
  expect(homeLinks.length).toBeLessThanOrEqual(3);
  await home.getByRole("link", { name: "Ver todas as notícias" }).click();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Notícias" })).toBeVisible();
  const listingLinks = await page.locator("main .content-card .content-card-title a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(listingLinks.slice(0, homeLinks.length)).toEqual(homeLinks);
  await page.locator("main .content-card .content-card-title a").first().click();
  await expect(page).toHaveURL(new RegExp(`${homeLinks[0]}/?$`));
});

test("mantém o tamanho e a proporção dos cards com imagens de formatos diferentes", async ({ page }) => {
  await page.goto("/#noticias");
  const card = page.locator("#noticias .content-card").first();
  await card.evaluate((element) => {
    for (const [width, height] of [[200, 1200], [1600, 300]]) {
      const frame = document.createElement("div");
      frame.className = "content-card-media";
      const image = document.createElement("img");
      image.alt = "";
      image.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`)}`;
      frame.append(image);
      element.prepend(frame);
    }
  });

  const frames = card.locator(".content-card-media");
  await expect(frames).toHaveCount(2);
  const sizes = await frames.evaluateAll((elements) => elements.map((element) => {
    const frame = element.getBoundingClientRect();
    const image = element.querySelector("img")!.getBoundingClientRect();
    return { width: frame.width, height: frame.height, imageWidth: image.width, imageHeight: image.height };
  }));
  for (const size of sizes) {
    expect(size.width).toBeLessThanOrEqual(427);
    expect(size.height).toBeLessThanOrEqual(240);
    expect(size.width / size.height).toBeCloseTo(16 / 9, 1);
    expect(size.imageWidth).toBeCloseTo(size.width, 1);
    expect(size.imageHeight).toBeCloseTo(size.height, 1);
  }
});

test("mostra a notícia publicada e permite abri-la a partir da página inicial", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#noticias");
  const link = page.locator("#noticias .content-card h3 a").first();
  const title = await link.textContent();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/news\//);
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: title!.trim() })).toBeVisible();
  await expect(page.locator("main article")).toBeVisible();
});

test("gera páginas para conteúdos editoriais, eventos e locais", async ({ page }) => {
  for (const [url, title] of [
    ["/pages/about", "Sobre nós"],
    ["/pages/contact", "Contato"],
    ["/pages/dean", "Reverendíssima Deã Tati Ribeiro"],
    ["/pages/donate", "Doar"],
    ["/pages/leadership", "Liderança"],
    ["/pages/reverends-gallery", "Galeria de reverendos"],
    ["/events/reconducao-da-rev-tati-como-dea-da-catedral", "Recondução da Rev. Tati como Deã da Catedral"],
    ["/locations/catedral-anglicana-da-ressurreicao", "Catedral Anglicana da Ressurreição"],
  ]) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    expect(response?.status(), url).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
});

test("retorna 404 para notícias inexistentes", async ({ page }) => {
  const response = await page.goto("/news/noticia-inexistente");
  expect(response?.status()).toBe(404);
});
