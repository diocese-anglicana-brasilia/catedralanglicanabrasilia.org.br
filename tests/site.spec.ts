import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const contactMessage = {
  name: "Pessoa de teste",
  email: "teste@example.com",
  subject: "Batismo",
  message: "Mensagem enviada por um teste automatizado.",
};

const fillContactForm = async (page: Page) => {
  await page.getByLabel("Nome").fill(contactMessage.name);
  await page.getByLabel("E-mail").fill(contactMessage.email);
  await page.getByLabel("Assunto").selectOption({ label: contactMessage.subject });
  await page.getByLabel("Mensagem").fill(contactMessage.message);
};

test("permite navegar até a seção de contato", async ({ page }, testInfo) => {
  await page.goto("/");

  if (testInfo.project.name === "mobile-chromium") {
    await page.locator("#menuBtn").click();
  }

  await page.locator('#navLinks a[href="#contato"]').click();

  await expect(page).toHaveURL(/#contato$/);
  await expect(page.getByRole("heading", { name: "Contato" })).toBeVisible();
});

test("envia uma mensagem e confirma o sucesso", async ({ page }) => {
  let receivedPayload: unknown;

  await page.route("**/flows/trigger/**", async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST",
          "access-control-allow-headers": "content-type",
        },
      });
      return;
    }

    receivedPayload = request.postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: "[1]",
      headers: { "access-control-allow-origin": "*" },
    });
  });

  await page.goto("/#contato");
  await fillContactForm(page);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Mensagem enviada. Entraremos em contato em breve.",
  );
  expect(receivedPayload).toEqual(contactMessage);
});

test("mantém os dados e explica o erro quando o Directus recusa a mensagem", async ({ page }) => {
  await page.route("**/flows/trigger/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ name: "DirectusError" }),
      headers: { "access-control-allow-origin": "*" },
    });
  });

  await page.goto("/#contato");
  await fillContactForm(page);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Não foi possível enviar sua mensagem agora. Tente novamente em alguns instantes.",
  );
  await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  await expect(page.locator("form")).not.toHaveAttribute("aria-busy");
  await expect(page.getByLabel("Mensagem")).toHaveValue(contactMessage.message);
});

test("explica o erro quando a rede falha ao enviar o formulário", async ({ page }) => {
  await page.route("**/flows/trigger/**", (route) => route.abort());

  await page.goto("/#contato");
  await fillContactForm(page);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Não foi possível enviar sua mensagem agora. Tente novamente em alguns instantes.",
  );
  await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
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
