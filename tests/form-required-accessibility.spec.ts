import { expect, test } from "@playwright/test";

test("identifica visualmente e para tecnologias assistivas os campos obrigatórios de contato", async ({ page }) => {
  await page.goto("/pages/contact");
  for (const id of ["nome", "email", "mensagem"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("required", "");
    await expect(page.locator(`label[for="${id}"]`)).toContainText("(obrigatório)");
  }
  await expect(page.locator('label[for="assunto"]')).not.toContainText("(obrigatório)");
});

test("identifica o pedido e a confirmação obrigatórios sem marcar o nome opcional", async ({ page }) => {
  await page.goto("/pages/prayer");
  await expect(page.locator("#prayer-message")).toHaveAttribute("required", "");
  await expect(page.locator('label[for="prayer-message"]')).toContainText("(obrigatório)");
  const confirmation = page.locator('[data-prayer-form] input[type="checkbox"]');
  await expect(confirmation).toHaveAttribute("required", "");
  await expect(confirmation.locator("..")).toContainText("(obrigatório)");
  await expect(page.locator('label[for="prayer-name"]')).toContainText("(opcional)");
});
