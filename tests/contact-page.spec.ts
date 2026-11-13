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

test("exibe o Instagram da Catedral na página de contato e no rodapé", async ({ page }) => {
  const instagram = "https://www.instagram.com/catedralanglicanadebrasilia/";
  await page.goto("/pages/contact");
  for (const area of [page.getByRole("main"), page.locator("footer")]) {
    const link = area.getByRole("link", { name: "Instagram", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", instagram);
  }
  await expect(page.getByRole("main").getByRole("link", { name: "Instagram", exact: true })).toHaveText("Instagram");
  const footerLink = page.locator("footer").getByRole("link", { name: "Instagram", exact: true });
  await expect(footerLink.locator("svg[aria-hidden='true']")).toBeVisible();
  await expect(footerLink).toHaveText("");
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute("href", instagram);
});
