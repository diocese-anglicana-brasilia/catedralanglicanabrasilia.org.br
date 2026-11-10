import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("permite navegar até a seção de contato", async ({ page }, testInfo) => {
  await page.goto("/");

  if (testInfo.project.name === "mobile-chromium") {
    await page.locator("#menuBtn").click();
  }

  await page.locator('#navLinks a[href="#contato"]').click();

  await expect(page).toHaveURL(/#contato$/);
  await expect(page.getByRole("heading", { name: "Contato" })).toBeVisible();
});

test("informa que o formulário está indisponível e oferece contato por e-mail", async ({ page }) => {
  await page.goto("/#contato");
  const form = page.locator("[data-contact-form]");
  await expect(form.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  await expect(form.getByRole("status")).toContainText("temporariamente indisponível");
  await expect(form.getByRole("link")).toHaveAttribute("href", "mailto:contato@catedralanglicanabsb.org.br");
  await expect(form).not.toHaveAttribute("data-contact-endpoint");
});

test("exibe uma página 404 com retorno à página inicial", async ({ page }) => {
  await page.goto("/caminho-inexistente");

  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("adapta a navegação ao tamanho da tela", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile-chromium";

  await page.goto("/");

  const menuButton = page.locator("#menuBtn");
  const contactLink = page.locator('#navLinks a[href="#contato"]');

  if (isMobile) {
    await expect(menuButton).toBeVisible();
    await expect(contactLink).toBeHidden();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(contactLink).toBeVisible();

    await contactLink.click();
    await expect(page).toHaveURL(/#contato$/);
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(menuButton).toBeHidden();
    await expect(contactLink).toBeVisible();
  }
});

test("permite pular diretamente ao conteúdo com o teclado", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo principal" });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#conteudo")).toBeFocused();
});

test("fecha o menu mobile ao pressionar Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Exclusivo do menu mobile.");

  await page.goto("/");
  const menuButton = page.locator("#menuBtn");

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("devolve o foco ao botão ao fechar o menu mobile com Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Exclusivo do menu mobile.");

  await page.goto("/");
  const menuButton = page.locator("#menuBtn");
  const firstMenuLink = page.locator("#navLinks a").first();

  await menuButton.click();
  await page.keyboard.press("Tab");
  await expect(firstMenuLink).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();
});

test("respeita a preferência por movimento reduzido", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  });
  const reducedMotionPage = await context.newPage();

  await reducedMotionPage.goto("/");
  const heroContent = reducedMotionPage.locator("#inicio .fade-in");

  await expect(heroContent).toBeVisible();
  expect(await heroContent.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  expect(await heroContent.evaluate((element) => getComputedStyle(element).transform)).toMatch(
    /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
  );

  await context.close();
});

test("mantém a navegação utilizável em larguras intermediárias", async ({ browser }) => {
  for (const width of [640, 768, 960]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const intermediatePage = await context.newPage();

    await intermediatePage.goto("/");
    expect(
      await intermediatePage.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const menuButton = intermediatePage.locator("#menuBtn");
    const contactLink = intermediatePage.locator('#navLinks a[href="#contato"]');

    if (await menuButton.isVisible()) {
      await expect(contactLink).toBeHidden();
      await menuButton.click();
      await expect(contactLink).toBeVisible();
    } else {
      await expect(contactLink).toBeVisible();
    }

    await context.close();
  }
});

test("oferece alvos de toque adequados no menu e nas ações mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Exclusivo do viewport mobile.");

  await page.goto("/");
  await page.locator("#menuBtn").click();

  const targetSizes = await page
    .locator("#menuBtn, #navLinks .nav-link, .btn-gold, [data-contact-form] button")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      }),
    );

  expect(targetSizes).not.toEqual([]);
  expect(targetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
});

test("mantém âncoras e contatos com destinos válidos", async ({ page }) => {
  await page.goto("/");

  const linkIntegrity = await page.locator("a[href]").evaluateAll((links) => {
    const anchors = links
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href?.startsWith("#")))
      .filter((href) => !document.getElementById(href.slice(1)));
    const invalidEmails = links
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href?.startsWith("mailto:")))
      .filter((href) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href.slice("mailto:".length)));

    return { anchors, invalidEmails };
  });

  expect(linkIntegrity.anchors).toEqual([]);
  expect(linkIntegrity.invalidEmails).toEqual([]);
});

test("expõe metadados de SEO e dados estruturados na página inicial", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page).toHaveTitle("Catedral Anglicana de Brasília");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /comunidade de fé/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://catedralanglicanabrasilia.org.br/",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");

  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(structuredData ?? "{}")).toMatchObject({
    "@type": "ReligiousOrganization",
    name: "Catedral Anglicana de Brasília",
    url: "https://catedralanglicanabrasilia.org.br",
  });
});

test("impede a indexação da página 404", async ({ page }) => {
  await page.goto("/caminho-inexistente");

  await expect(page).toHaveTitle("Página não encontrada | Catedral Anglicana de Brasília");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://catedralanglicanabrasilia.org.br/404",
  );
});

test("não apresenta violações automáticas de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.locator(".fade-in").evaluateAll((elements) => {
    elements.forEach((element) => element.classList.add("visible"));
  });
  await page.waitForTimeout(900);

  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  expect(accessibilityScan.violations).toEqual([]);
});

test("mantém o conteúdo responsivo e sem rolagem horizontal", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile-chromium";

  await page.goto("/#contato");

  const layout = await page.locator("#contato > div").evaluate((contactGrid) => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    contactColumns: getComputedStyle(contactGrid).gridTemplateColumns
      .split(" ")
      .filter(Boolean).length,
  }));

  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.contactColumns).toBe(isMobile ? 1 : 2);
});

test("preserva o cabeçalho desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Referência visual desktop.");

  await page.goto("/");
  await expect(page.locator("header")).toHaveScreenshot("header-desktop.png", {
    animations: "disabled",
  });
});

test("preserva o menu aberto no mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Referência visual mobile.");

  await page.goto("/");
  await page.locator("#menuBtn").click();
  await expect(page).toHaveScreenshot("menu-mobile.png", {
    animations: "disabled",
    mask: [page.locator("#inicio")],
  });
});

test("preserva o visual da página 404", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Referência visual desktop.");

  await page.goto("/caminho-inexistente");
  await expect(page.locator("#conteudo")).toHaveScreenshot("not-found.png", {
    animations: "disabled",
  });
});

test("preserva o formulário de contato em desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Referência visual desktop.");

  await page.goto("/#contato");
  await expect(page.locator("[data-contact-form]")).toHaveScreenshot("contact-form-desktop.png", {
    animations: "disabled",
  });
});

test("preserva o formulário de contato em mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Referência visual mobile.");

  await page.goto("/#contato");
  await expect(page.locator("[data-contact-form]")).toHaveScreenshot("contact-form-mobile.png", {
    animations: "disabled",
  });
});

test("preserva os cards de sacramentos em desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Referência visual desktop.");

  await page.goto("/#sacramentos");
  await expect(page.locator("#sacramentos .grid")).toHaveScreenshot("sacrament-cards-desktop.png", {
    animations: "disabled",
  });
});
