import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("abre a pesquisa global no cabeçalho e encontra notícias e eventos", async ({ page, context }) => {
  const requests: string[] = [];
  await context.route("**/search-index/*.json", (route) => {
    const url = route.request().url(); requests.push(url);
    const news = url.includes("news.json");
    return route.fulfill({ json: [{ title: news ? "Notícia de exemplo" : "Evento de exemplo", href: news ? "/news/exemplo" : "/events/exemplo", searchText: "exemplo" }] });
  });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Abrir pesquisa" });
  await expect(open).toBeVisible();
  expect(requests).toHaveLength(0);
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Pesquisar no site" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("searchbox", { name: "Pesquisar notícias e eventos" });
  await expect(input).toBeFocused();
  await input.fill("exemplo");
  await expect(dialog.getByRole("link", { name: "Notícia de exemplo" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Evento de exemplo" })).toBeVisible();
  const newsCard = dialog.locator(".content-card").filter({ has: page.getByRole("link", { name: "Notícia de exemplo" }) });
  const eventCard = dialog.locator(".content-card").filter({ has: page.getByRole("link", { name: "Evento de exemplo" }) });
  const newsBadge = newsCard.locator(".search-result-badge");
  const eventBadge = eventCard.locator(".search-result-badge");
  await expect(newsBadge).toHaveText("NOTÍCIA");
  await expect(eventBadge).toHaveText("EVENTO");
  expect(await newsBadge.evaluate((badge) => Boolean(badge.compareDocumentPosition(badge.closest("article")!.querySelector("h3")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(await newsBadge.evaluate((badge) => getComputedStyle(badge).backgroundColor)).not.toBe(await eventBadge.evaluate((badge) => getComputedStyle(badge).backgroundColor));
  await expect(newsBadge).toHaveCSS("border-radius", "9999px");
  const audit = await new AxeBuilder({ page }).include("[data-search-results]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations).toEqual([]);
  await expect(dialog.getByRole("status")).toContainText("2 resultados");
  expect(requests).toHaveLength(2);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

test("mantém a janela de pesquisa acessível e sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir pesquisa" }).click();
  const dialog = page.getByRole("dialog", { name: "Pesquisar no site" });
  const audit = await new AxeBuilder({ page }).include("[data-content-search]").analyze();
  expect(audit.violations).toEqual([]);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Fechar pesquisa" })).toBeFocused();
});

test("pesquisa o texto completo das notícias publicadas, ignorando acentos", async ({ page, context }) => {
  let requests = 0;
  await context.route("**/search-index/*.json", (route) => {
    const news = route.request().url().includes("news.json");
    if (news) requests++;
    return route.fulfill({ json: news ? [{ title: "Notícia de exemplo", href: "/news/exemplo", searchText: "não deve ser publicada" }] : [] });
  });
  await page.goto("/news/");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Abrir pesquisa" }).click();
  const dialog = page.getByRole("dialog", { name: "Pesquisar no site" });
  await dialog.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).fill("nao deve ser publicada");
  await expect(dialog.getByRole("link", { name: "Notícia de exemplo" })).toBeVisible();
  expect(requests).toBe(1);
  await dialog.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).fill("palavra inexistente");
  await expect(page.getByText("Nenhum resultado encontrado.")).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).clear();
  await dialog.getByRole("button", { name: "Fechar pesquisa" }).click();
  await expect(page.locator("main .content-card").first()).toBeVisible();
});

test("pesquisa o conteúdo completo de eventos", async ({ page, context }) => {
  await context.route("**/search-index/*.json", (route) => route.fulfill({ json: route.request().url().includes("events.json") ? [{ title: "Evento de exemplo", href: "/events/exemplo", searchText: "programação real" }] : [] }));
  await page.goto("/events/");
  await page.getByRole("button", { name: "Abrir pesquisa" }).click();
  const dialog = page.getByRole("dialog", { name: "Pesquisar no site" });
  await dialog.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).fill("programacao real");
  await expect(dialog.getByRole("link", { name: "Evento de exemplo", exact: true })).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText("1 resultado");
});

test("paginação da pesquisa limita resultados a nove", async ({ page, context }) => {
  await context.route("**/search-index/events.json", (route) => route.fulfill({ json: [] }));
  await context.route("**/search-index/news.json", (route) => route.fulfill({ json: Array.from({ length: 11 }, (_, index) => ({
    title: `Resultado ${index + 1}`, href: `/news/${index + 1}`, searchText: "palavra", date: "2026-01-01T12:00:00.000Z",
  })) }));
  await page.goto("/news/");
  await page.getByRole("button", { name: "Abrir pesquisa" }).click();
  await page.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).fill("palavra");
  await expect(page.locator("[data-search-results] .content-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Próxima página de resultados" }).click();
  await expect(page.locator("[data-search-results] .content-card")).toHaveCount(2);
});

test("exibe erro recuperável se o índice não puder ser carregado", async ({ page, context }) => {
  await context.route("**/search-index/news.json", (route) => route.abort());
  await page.goto("/news/");
  await page.getByRole("button", { name: "Abrir pesquisa" }).click();
  await page.getByRole("searchbox", { name: "Pesquisar notícias e eventos" }).fill("teste");
  await expect(page.getByRole("status")).toContainText("Não foi possível carregar a pesquisa");
  await page.getByRole("button", { name: "Fechar pesquisa" }).click();
  await expect(page.locator("main .content-card").first()).toBeVisible();
});

test("mantém a listagem disponível sem JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/news/");
  await expect(page.getByRole("button", { name: "Abrir pesquisa" })).toHaveCount(0);
  await expect(page.locator("main .content-card").first()).toBeVisible();
  await context.close();
});
