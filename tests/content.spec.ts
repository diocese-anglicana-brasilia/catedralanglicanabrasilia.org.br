import { expect, test } from "@playwright/test";

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
