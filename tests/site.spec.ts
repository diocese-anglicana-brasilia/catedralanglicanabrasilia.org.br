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
  await page.getByLabel("Nome").fill("Pessoa de teste");
  await page.getByLabel("E-mail").fill("teste@example.com");
  await page.getByLabel("Assunto").selectOption({ label: "Batismo" });
  await page.getByLabel("Mensagem").fill("Mensagem enviada por um teste automatizado.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Mensagem enviada. Entraremos em contato em breve.",
  );
  expect(receivedPayload).toEqual({
    name: "Pessoa de teste",
    email: "teste@example.com",
    subject: "Batismo",
    message: "Mensagem enviada por um teste automatizado.",
  });
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
