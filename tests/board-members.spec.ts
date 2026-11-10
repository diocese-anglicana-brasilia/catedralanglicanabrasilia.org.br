import { expect, test } from "@playwright/test";
import { isActiveMember } from "../src/utils/board-members";

test("restringe páginas individuais aos membros ativos", () => {
  expect(isActiveMember({ is_active: true })).toBe(true);
  expect(isActiveMember({ is_active: false })).toBe(false);
});

test("abre a página individual de um membro pela liderança", async ({ page }) => {
  await page.goto("/pages/leadership");
  const link = page.locator("main").getByRole("link", { name: "Caio Costa" });
  await expect(link).toHaveAttribute("href", "/board-members/caio-costa");
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "Caio Costa" })).toBeVisible();
  await expect(page.getByText("1º Guardião")).toBeVisible();
  await page.getByRole("link", { name: "Voltar à liderança" }).click();
  await expect(page).toHaveURL(/\/pages\/leadership\/?$/);
});

test("inclui a página ativa no sitemap gerado", async ({ request }) => {
  const response = await request.get("/sitemap-0.xml");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("/board-members/caio-costa/");
});
