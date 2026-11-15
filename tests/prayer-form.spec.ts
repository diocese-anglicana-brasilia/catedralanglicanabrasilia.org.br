import { expect, test } from "@playwright/test";

test("recebe pedido de oração anônimo e informa falhas sem perder o texto", async ({ page }) => {
  await page.route("**/pages/prayer", async (route) => {
    const response = await route.fetch(); const html = await response.text();
    await route.fulfill({ response, body: html.replace("data-prayer-form", 'data-prayer-form data-prayer-endpoint="https://forms.example.test/prayer"').replace(/(<button[^>]*type="submit"[^>]*) disabled/, "$1") });
  });
  let payload: any; let success = false;
  await page.route("https://forms.example.test/prayer", async (route) => { payload = route.request().postDataJSON(); await route.fulfill({ status: success ? 201 : 503, contentType: "application/json", body: success ? '{"ok":true}' : '{"ok":false}' }); });
  await page.goto("/pages/prayer");
  const form = page.locator("[data-prayer-form]");
  await form.getByLabel("Pedido de oração").fill("Oração pela família");
  await form.getByLabel(/Estou ciente/).check();
  await form.evaluate((element) => { const input = document.createElement("input"); input.type = "hidden"; input.name = "cf-turnstile-response"; input.value = "token"; element.append(input); });
  await form.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(form.getByRole("status")).toContainText("Não foi possível");
  await expect(form.getByLabel("Pedido de oração")).toHaveValue("Oração pela família");
  success = true;
  await form.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(form.getByRole("status")).toContainText("Pedido enviado");
  expect(payload).toMatchObject({ nome: "", mensagem: "Oração pela família", turnstileToken: "token" });
  await expect(form.getByLabel("Pedido de oração")).toHaveValue("");
});
