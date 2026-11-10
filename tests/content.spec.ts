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
  await page.goto("/#noticias");
  const home = page.locator("#noticias");
  await expect(home.locator(".content-card")).toHaveCount(1);
  await expect(home.getByText("Conteúdo fictício para testar o cadastro de notícias.")).toBeVisible();
  await expect(home.locator("time")).toHaveText("01/01/2026");
  await home.getByRole("link", { name: "Ver todas as notícias" }).click();
  await expect(page).toHaveURL(/\/news\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Notícias" })).toBeVisible();
  await expect(page.locator(".content-card")).toHaveCount(1);
  await page.locator(".content-card").getByRole("link", { name: "Notícia de exemplo" }).click();
  await expect(page).toHaveURL(/\/news\/2026-01-01-noticia-exemplo\/?$/);
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
  await page.goto("/#noticias");
  const link = page.locator("#noticias").getByRole("link", { name: "Notícia de exemplo" });
  await expect(link).toHaveAttribute("href", "/news/2026-01-01-noticia-exemplo");
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "Notícia de exemplo" })).toBeVisible();
  await expect(page.getByText("Esta notícia é apenas um exemplo e não deve ser publicada.")).toBeVisible();
});

test("gera páginas para conteúdos editoriais, eventos e locais", async ({ page }) => {
  for (const [url, title] of [
    ["/pages/about", "Sobre e História"],
    ["/pages/contact", "Contato"],
    ["/pages/dean", "Reverenda Deã"],
    ["/pages/donate", "Doar"],
    ["/pages/leadership", "Liderança"],
    ["/pages/reverends_gallery", "Galeria de reverendos"],
    ["/events/evento-exemplo", "Evento de exemplo"],
    ["/locations/local-exemplo", "Local de exemplo"],
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
