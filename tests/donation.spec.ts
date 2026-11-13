import { expect, test } from "@playwright/test";

test("apresenta a chave e o titular corretos na seção inicial de doações", async ({ page }) => {
  await page.goto("/#doacoes");
  const section = page.locator("#doacoes");
  await expect(section.getByText("anglicana309sul@gmail.com")).toBeVisible();
  await expect(section.getByText("Diocese Missionária de Brasília")).toBeVisible();
});
