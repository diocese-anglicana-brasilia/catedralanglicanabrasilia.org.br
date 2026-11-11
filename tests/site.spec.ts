import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("carrega Tailwind compilado localmente sem depender do CDN", async ({ page }) => {
  const warnings: string[] = [];
  const requests: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/", { waitUntil: "networkidle" });
  expect(requests.some((url) => url.startsWith("https://cdn.tailwindcss.com"))).toBe(false);
  expect(warnings.some((message) => message.includes("cdn.tailwindcss.com"))).toBe(false);
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCSS("display", "flex");
  await expect(page.locator("#inicio")).toHaveCSS("min-height", "600px");
  await expect(page.locator("#inicio .hero-overlay")).toHaveCSS("position", "absolute");
});

test("escurece as imagens de fundo sem reduzir a opacidade do texto", async ({ page }) => {
  await page.goto("/");
  const intro = page.locator("#inicio .hero-overlay");
  await expect(intro).toHaveCSS("background-image", /rgba\(10, 10, 10, 0\.5\)/);
  for (const id of ["casamentos", "historia"]) {
    const section = page.locator(`#${id}`);
    await expect(section.locator(".hero-image-overlay")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.65)");
    await expect(section.locator("h2")).toHaveCSS("opacity", "1");
  }
  await expect(page.locator("#inicio h1")).toHaveCSS("opacity", "1");
});

test("apresenta a identidade visual com logotipo acessível e fontes solicitadas", async ({ page }) => {
  await page.goto("/");
  const logo = page.getByRole("link", { name: "Catedral Anglicana da Ressurreição" }).getByRole("img");
  await expect(logo).toHaveAttribute("src", "https://cdn.catedralanglicanabrasilia.org.br/logo_horizontal.png");
  await expect(logo).toBeVisible();
  const pattern = page.locator("footer [data-footer-pattern]");
  await expect(pattern).toBeVisible();
  await expect(pattern).toHaveAttribute("aria-hidden", "true");
  await expect(pattern.locator("pattern")).toHaveAttribute("width", "1361");
  const positions = await page.locator("footer").evaluate((footer) => ({
    imageBottom: footer.querySelector("[data-footer-pattern]")!.getBoundingClientRect().bottom,
    titleTop: footer.querySelector("[data-footer-title]")!.getBoundingClientRect().top,
  }));
  expect(positions.imageBottom).toBeLessThanOrEqual(positions.titleTop);
  await expect(page.locator("h1")).toHaveCSS("font-family", /Alegreya Sans SC/);
  await expect(page.locator("h1")).toHaveCSS("font-weight", "300");
  await expect(page.locator("body")).toHaveCSS("font-family", /Aller/);
  await expect(page.locator("body")).toHaveCSS("font-weight", "300");
});

test("permite navegar até a página de contato", async ({ page }) => {
  await page.goto("/");

  if (await page.locator("#menuBtn").isVisible()) {
    await page.locator("#menuBtn").click();
  }

  await page.getByRole("button", { name: "Fale conosco" }).click();
  await page.locator('#navLinks a[href="/pages/contact"]').click();

  await expect(page).toHaveURL(/\/pages\/contact\/?$/);
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

test("adapta a navegação ao tamanho da tela", async ({ page }) => {
  await page.goto("/");

  const menuButton = page.locator("#menuBtn");
  const contactLink = page.locator('#navLinks a[href="/pages/contact"]');

  if (await menuButton.isVisible()) {
    await expect(menuButton).toBeVisible();
    await expect(contactLink).toBeHidden();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Fale conosco" }).click();
    await expect(contactLink).toBeVisible();

    await contactLink.click();
    await expect(page).toHaveURL(/\/pages\/contact\/?$/);
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(menuButton).toBeHidden();
    await page.getByRole("button", { name: "Fale conosco" }).click();
    await expect(contactLink).toBeVisible();
  }
});

test("alinha os itens principais do menu na mesma linha no desktop", { tag: "@desktop" }, async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#menuBtn")).toBeHidden();

  const centers = await page.locator("#navLinks > li > :is(a, button)").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top + rect.height / 2;
    }),
  );
  expect(centers).toHaveLength(5);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
});

test("agrupa os destinos e permite navegar pelos submenus", async ({ page }) => {
  await page.goto("/");
  const menuButton = page.locator("#menuBtn");
  if (await menuButton.isVisible()) await menuButton.click();

  for (const [group, links] of [
    ["Sobre", ["Sobre nós", "Reverenda Deã", "Galeria de reverendo(a)s", "Liderança"]],
    ["O que fazemos", ["Notícias", "Eventos", "Ações sociais"]],
    ["Fale conosco", ["Contato", "Endereço"]],
  ] as const) {
    const button = page.getByRole("button", { name: group, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    for (const title of links) {
      await expect(page.locator("#navLinks").getByRole("link", { name: title, exact: true })).toBeVisible();
    }
  }

  await page.locator('#navLinks a[href="/pages/contact"]').click();
  await expect(page).toHaveURL(/\/pages\/contact\/?$/);
});

test("destaca a página atual na navegação", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#navLinks a[href="/"]')).toHaveAttribute("aria-current", "page");
  await page.goto("/pages/contact");
  await expect(page.locator('#navLinks a[href="/pages/contact"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('#navLinks a[href="/"]')).not.toHaveAttribute("aria-current", "page");
});

test("fecha o submenu com Escape e devolve o foco ao agrupador", async ({ page }) => {
  await page.goto("/");
  if (await page.locator("#menuBtn").isVisible()) await page.locator("#menuBtn").click();
  const group = page.getByRole("button", { name: "Sobre", exact: true });
  await group.click();
  await page.getByRole("link", { name: "Reverenda Deã" }).focus();
  await page.keyboard.press("Escape");
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await expect(group).toBeFocused();
});

test("permite pular diretamente ao conteúdo com o teclado", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo principal" });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#conteudo")).toBeFocused();
});

test("fecha o menu mobile ao pressionar Escape", { tag: "@mobile" }, async ({ page }) => {

  await page.goto("/");
  const menuButton = page.locator("#menuBtn");

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("devolve o foco ao botão ao fechar o menu mobile com Escape", { tag: "@mobile" }, async ({ page }) => {

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
    const contactLink = intermediatePage.locator('#navLinks a[href="/pages/contact"]');

    if (await menuButton.isVisible()) {
      await expect(contactLink).toBeHidden();
      await menuButton.click();
    }
    await intermediatePage.getByRole("button", { name: "Fale conosco" }).click();
    await expect(contactLink).toBeVisible();

    await context.close();
  }
});

test("oferece alvos de toque adequados no menu e nas ações mobile", { tag: "@mobile" }, async ({ page }) => {

  await page.goto("/");
  await page.locator("#menuBtn").click();

  const targetSizes = await page
    .locator("#menuBtn, #navLinks .nav-link:visible, #navLinks .nav-group-toggle, .btn-gold, [data-contact-form] button")
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
  await expect(page).toHaveTitle("Catedral Anglicana da Ressureição");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://catedralanglicanabrasilia.org.br/",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");

  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(structuredData ?? "{}");
  expect(data["@context"]).toBe("https://schema.org");
  const graph = data["@graph"];
  const cathedral = graph.find((item: { "@id": string }) => item["@id"] === "https://catedralanglicanabrasilia.org.br/#catedral");
  const diocese = graph.find((item: { "@id": string }) => item["@id"] === "https://catedralanglicanabrasilia.org.br/#diocese");
  const church = graph.find((item: { "@id": string }) => item["@id"] === "https://catedralanglicanabrasilia.org.br/#ieab");
  expect(cathedral).toMatchObject({ "@type": "Organization", name: "Catedral Anglicana da Ressurreição", parentOrganization: { "@id": diocese["@id"] } });
  expect(diocese).toMatchObject({ "@type": "Organization", name: "Diocese Anglicana de Brasília", url: "https://dab.org.br/", parentOrganization: { "@id": church["@id"] } });
  expect(church).toMatchObject({ "@type": "Organization", name: "Igreja Episcopal Anglicana do Brasil", url: "https://ieab.org.br/" });
  await page.goto("/pages/about");
  const otherPage = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "{}");
  expect(otherPage["@type"]).toBe("ReligiousOrganization");
});

test("impede a indexação da página 404", async ({ page }) => {
  await page.goto("/caminho-inexistente");

  await expect(page).toHaveTitle("Página não encontrada | Catedral Anglicana da Ressureição");
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

test("preserva o cabeçalho desktop", { tag: "@desktop" }, async ({ page }) => {

  await page.goto("/");
  await expect(page.locator("header")).toHaveScreenshot("header-desktop.png", {
    animations: "disabled",
  });
});

test("preserva o menu aberto no mobile", { tag: "@mobile" }, async ({ page }) => {

  await page.goto("/");
  await page.locator("#menuBtn").click();
  await expect(page).toHaveScreenshot("menu-mobile.png", {
    animations: "disabled",
    mask: [page.locator("#inicio")],
  });
});

test("preserva o visual da página 404", { tag: "@desktop" }, async ({ page }) => {

  await page.goto("/caminho-inexistente");
  await expect(page.locator("#conteudo")).toHaveScreenshot("not-found.png", {
    animations: "disabled",
  });
});

test("preserva o formulário de contato em desktop", { tag: "@desktop" }, async ({ page }) => {

  await page.goto("/#contato");
  await expect(page.locator("[data-contact-form]")).toHaveScreenshot("contact-form-desktop.png", {
    animations: "disabled",
    maxDiffPixels: 350,
  });
});

test("preserva o formulário de contato em mobile", { tag: "@mobile" }, async ({ page }) => {

  await page.goto("/#contato");
  await expect(page.locator("[data-contact-form]")).toHaveScreenshot("contact-form-mobile.png", {
    animations: "disabled",
  });
});

test("preserva os cards de sacramentos em desktop", { tag: "@desktop" }, async ({ page }) => {

  await page.goto("/#sacramentos");
  await expect(page.locator("#sacramentos .grid")).toHaveScreenshot("sacrament-cards-desktop.png", {
    animations: "disabled",
  });
});
