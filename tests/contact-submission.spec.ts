import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/pages/contact", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace(/\sdata-contact-endpoint="[^"]*"/, "").replace("data-contact-form", 'data-contact-form data-contact-endpoint="https://forms.example.test/contact"').replace(/<div class="cf-turnstile"[^>]*><\/div>/, "").replace(/<script[^>]*challenges\.cloudflare\.com[^>]*><\/script>/, "").replace(/(<button[^>]*type="submit"[^>]*) disabled/, "$1") });
  });
});

test("envia o contato e confirma apenas depois da gravação", async ({ page }) => {
  let body: any;
  await page.route("https://forms.example.test/contact", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("/pages/contact");
  const form = page.locator("[data-contact-form]");
  await form.getByLabel("Nome").fill("Pessoa Teste");
  await form.getByLabel("E-mail").fill("teste@example.org");
  await form.getByLabel("Mensagem").fill("Olá, gostaria de informações.");
  await form.evaluate((element) => { const input = document.createElement("input"); input.type = "hidden"; input.name = "cf-turnstile-response"; input.value = "verification-token"; element.append(input); });
  await form.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(form.getByRole("status")).toContainText("Mensagem enviada");
  expect(body).toMatchObject({ nome: "Pessoa Teste", email: "teste@example.org", mensagem: "Olá, gostaria de informações.", turnstileToken: "verification-token" });
  expect(body).not.toHaveProperty("cf-turnstile-response");
  await expect(form.getByLabel("Mensagem")).toHaveValue("");
});

test("preserva a mensagem e informa falha quando o envio não é confirmado", async ({ page }) => {
  await page.route("https://forms.example.test/contact", (route) => route.fulfill({ status: 503, body: "Indisponível" }));
  await page.goto("/pages/contact");
  const form = page.locator("[data-contact-form]");
  await form.getByLabel("Nome").fill("Pessoa Teste");
  await form.getByLabel("E-mail").fill("teste@example.org");
  await form.getByLabel("Mensagem").fill("Mensagem que deve ser preservada");
  await form.evaluate((element) => { const input = document.createElement("input"); input.type = "hidden"; input.name = "cf-turnstile-response"; input.value = "verification-token"; element.append(input); });
  await form.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(form.getByRole("status")).toContainText("Não foi possível enviar");
  await expect(form.getByLabel("Mensagem")).toHaveValue("Mensagem que deve ser preservada");
});

test("não envia o formulário sem a verificação antispam", async ({ page }) => {
  let requests = 0;
  await page.route("https://forms.example.test/contact", (route) => { requests++; return route.abort(); });
  await page.goto("/pages/contact");
  const form = page.locator("[data-contact-form]");
  await form.getByLabel("Nome").fill("Pessoa Teste");
  await form.getByLabel("E-mail").fill("teste@example.org");
  await form.getByLabel("Mensagem").fill("Mensagem de teste");
  await form.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(form.getByRole("status")).toContainText("verificação de segurança");
  expect(requests).toBe(0);
});

test("exige pelo menos um meio de contato e alterna a obrigatoriedade", async ({ page }) => {
  await page.goto("/pages/contact");
  const email = page.getByLabel("E-mail");
  const phone = page.getByLabel("Telefone/WhatsApp");
  await expect(email).toHaveAttribute("required", "");
  await expect(phone).toHaveAttribute("required", "");
  await phone.fill("(61) 98191-3204");
  await expect(email).not.toHaveAttribute("required");
  await email.fill("pessoa@example.org");
  await expect(phone).not.toHaveAttribute("required");
  await phone.clear();
  await expect(email).toHaveAttribute("required", "");
  await email.clear();
  await expect(phone).toHaveAttribute("required", "");
  await phone.fill("(61) 98191-3204");
  await page.locator("[data-contact-form]").evaluate((form: HTMLFormElement) => form.reset());
  await expect(email).toHaveAttribute("required", "");
  await expect(phone).toHaveAttribute("required", "");
});

test("envia contato apenas com telefone", async ({ page }) => {
  let payload: any;
  await page.route("https://forms.example.test/contact", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("/pages/contact");
  const form = page.locator("[data-contact-form]");
  await form.getByLabel("Nome").fill("Pessoa Teste");
  await form.getByLabel("Telefone/WhatsApp").fill("(61) 98191-3204");
  await form.getByLabel("Mensagem").fill("Peço informações.");
  await form.evaluate((element) => { const input = document.createElement("input"); input.type = "hidden"; input.name = "cf-turnstile-response"; input.value = "token"; element.append(input); });
  await form.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(form.getByRole("status")).toContainText("Mensagem enviada");
  expect(payload).toMatchObject({ email: "", telefone: "(61) 98191-3204" });
});
