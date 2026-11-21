import { expect, test } from "@playwright/test";

test("a página inicial adia as imagens de conteúdo após as duas primeiras", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#inicio")).toHaveAttribute("style", /hero1\.webp/);
  await expect(page.locator("#horarios-culto img")).toHaveAttribute("loading", "eager");
  for (const id of ["doacoes", "casamentos", "batismos", "historia"]) {
    const image = page.locator(`#${id} img`).first();
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("src", /\.webp/);
  }
  for (const image of await page.locator("#noticias img").all()) await expect(image).toHaveAttribute("loading", "lazy");
});
