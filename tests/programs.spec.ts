import { expect, test } from "@playwright/test";
import type { CollectionEntry } from "astro:content";
import { paginateItems } from "../src/utils/pagination";
import { orderPrograms, programCard, programsPageHref } from "../src/utils/programs";

test("ordena e pagina ações sociais, criando cards com destino e resumo", () => {
  const entries = [
    { collection: "programs", id: "solidariedade", data: { name: "Solidariedade", description: "Apoio à comunidade", images: [] } },
    { collection: "programs", id: "acolhimento", data: { name: "Acolhimento", description: "Cuidado e acolhida", images: [] } },
  ] as CollectionEntry<"programs">[];
  expect(orderPrograms(entries).map((entry) => entry.data.name)).toEqual(["Acolhimento", "Solidariedade"]);
  expect(programCard(entries[0])).toMatchObject({
    title: "Solidariedade", href: "/programs/solidariedade", description: "Apoio à comunidade...",
  });
  expect(paginateItems(Array.from({ length: 19 })).map((page) => page.length)).toEqual([9, 9, 1]);
  expect(programsPageHref(1)).toBe("/programs/");
  expect(programsPageHref(2)).toBe("/programs/pagina/2/");
});

test("abre a lista de ações sociais pelo menu", async ({ page }) => {
  await page.goto("/");
  if (await page.locator("#menuBtn").isVisible()) await page.locator("#menuBtn").click();
  await page.getByRole("button", { name: "O que fazemos" }).click();
  const link = page.getByRole("link", { name: "Ações sociais" });
  await expect(link).toHaveAttribute("href", "/programs/");
  await link.click();
  await expect(page).toHaveURL(/\/programs\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ações sociais" })).toBeVisible();
  const cards = page.locator(".content-card");
  const count = await cards.count();
  expect(count).toBeLessThanOrEqual(9);
  if (count === 0) await expect(page.getByText("Ainda não há ações sociais cadastradas.")).toBeVisible();
});
