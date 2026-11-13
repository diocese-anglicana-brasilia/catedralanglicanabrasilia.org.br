import { expect, test } from "@playwright/test";

test("mantém o formulário somente na página de contato", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-contact-form]")).toHaveCount(0);
  await page.locator("#contato").getByRole("link", { name: "Entre em contato" }).click();
  await expect(page).toHaveURL(/\/pages\/contact\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Contato" })).toBeVisible();
  await expect(page.getByText("EQS 309/310, Asa Sul, Brasília/DF")).toBeVisible();
  await expect(page.getByRole("link", { name: "anglicana309sul@gmail.com" }).first()).toHaveAttribute("href", "mailto:anglicana309sul@gmail.com");
  await expect(page.getByRole("link", { name: "(61) 3879-0382" })).toHaveAttribute("href", "https://wa.me/556138790382");
  const form = page.locator("[data-contact-form]");
  await expect(form).toBeVisible();
  await expect(form.getByRole("status")).toContainText("temporariamente indisponível");
  for (const label of ["Nome", "E-mail", "Assunto", "Mensagem"]) await expect(form.getByLabel(label, { exact: true })).toBeVisible();
  await expect(form.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
