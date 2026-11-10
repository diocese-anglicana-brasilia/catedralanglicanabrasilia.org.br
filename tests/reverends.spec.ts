import { expect, test } from "@playwright/test";

test("abre a página individual a partir da galeria", async ({ page }) => {
  await page.goto("/pages/reverends-gallery");
  const gallery = page.locator("main");
  const link = gallery.getByRole("link", { name: "Josias Conserva" });
  await expect(link).toHaveAttribute("href", "/reverends/josias-conserva");
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "Josias Conserva" })).toBeVisible();
  await expect(page.getByText("Reverendo Coadjutor")).toBeVisible();
  await expect(page.locator("main time")).toHaveCount(2);
  await page.getByRole("link", { name: "Voltar à galeria de reverendo(a)s" }).click();
  await expect(page).toHaveURL(/\/pages\/reverends-gallery\/?$/);
});
