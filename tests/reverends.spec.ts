import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";

test("atualiza a idade de uma pessoa viva no aniversário sem recompilar", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-03-01T02:30:00Z"));
  await page.goto("/reverends/tatiana-ribeiro");
  await expect(page.locator("[data-person-age]")).toHaveText(" (44 anos)");
  await page.clock.setFixedTime(new Date("2026-03-01T03:00:00Z"));
  await page.reload();
  await expect(page.locator("[data-person-age]")).toHaveText(" (45 anos)");
});

test("centraliza a linha e alterna os lados no desktop, adaptando-se ao celular", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/pages/reverends-gallery");
  const timeline = page.locator(".reverend-timeline");
  const items = timeline.locator(".reverend-timeline-content");
  await expect(items).not.toHaveCount(0);
  const bounds = await timeline.boundingBox();
  const first = await items.nth(0).boundingBox();
  const second = await items.nth(1).boundingBox();
  expect(bounds && first && second).toBeTruthy();
  const center = bounds!.x + bounds!.width / 2;
  expect(first!.x + first!.width).toBeLessThan(center);
  expect(second!.x).toBeGreaterThan(center);
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(items.first()).toBeVisible();
  await expect(items.nth(1)).toBeVisible();
});

test("mostra uma linha do tempo na ordem escolhida no CMS", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-reverendos-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    writeFileSync(path.join(fixture, "src/content/pages/reverends-gallery.md"), "---\ntitle: Galeria de reverendos\nreverends: [magda_guedes, josias-conserva]\n---\nConteúdo da galeria.\n");
    writeFileSync(path.join(fixture, "src/content/reverends/magda_guedes.md"), `---
name: Magda Guedes
role: Reverenda
start_date: 01/2012
end_date: 11/2018
birth_date: 23/05/1950
diaconal_ordination_date: 10/03/1980
priestly_ordination_date: 11/04/1981
episcopal_consecration_date: 12/05/2005
death_date: 13/06/2020
birth_place:
  city: Erechim
  state: Rio Grande do Sul
  country: Brasil
death_place:
  city: Brasília
  country: Brasil
diaconal_ordination:
  ministers: [Bispa Ana, Bispo João]
  location:
    parish: Paróquia da Paz
    diocese: Diocese de Brasília
    city: Brasília
    state: DF
    country: Brasil
priestly_ordination:
  ministers: [Bispo Pedro]
episcopal_consecration:
  location:
    diocese: Diocese Exemplo
bio: |
  Biografia exclusiva da página individual, com **destaque** e [link](/pages/about).

  <figure data-content-gallery="true"><div><img src="https://example.org/foto.jpg" alt="Celebração" loading="lazy"></div><figcaption>Galeria</figcaption></figure>

  <script>alert('inseguro')</script>
---
`);
    writeFileSync(path.join(fixture, "src/content/reverends/josias-conserva.md"), "---\nname: Josias Conserva\nrole: Reverendo\nstart_date: 01/2000\nbirth_place:\n  city: Recife\ndiaconal_ordination:\n  ministers: [Bispo Exemplo]\n---\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const html = readFileSync(path.join(fixture, "dist/pages/reverends-gallery/index.html"), "utf8");
    expect(html).toContain('<ol class="reverend-timeline"');
    expect(html.indexOf(">Magda Guedes</a>")).toBeLessThan(html.indexOf(">Josias Conserva</a>"));
    expect(html).toContain("janeiro de 2012");
    expect(html).toContain("novembro de 2018");
    expect(html).not.toContain("Biografia exclusiva da página individual");
    const profile = readFileSync(path.join(fixture, "dist/reverends/magda_guedes/index.html"), "utf8");
    expect(profile).toContain("Biografia exclusiva da página individual");
    expect(profile).toContain("<strong>destaque</strong>");
    expect(profile).toContain('<a href="/pages/about">link</a>');
    expect(profile).toContain('data-content-gallery="true"');
    expect(profile).toContain('src="https://example.org/foto.jpg"');
    expect(profile).not.toContain("<script>alert('inseguro')</script>");
    for (const value of ["Nascimento", "23 de maio de 1950", "70 anos", "Ordenação diaconal", "10 de março de 1980", "Ordenação presbiteral", "11 de abril de 1981", "Sagração episcopal", "12 de maio de 2005", "Falecimento", "13 de junho de 2020"]) expect(profile).toContain(value);
    for (const value of ["Erechim, Rio Grande do Sul, Brasil", "Brasília, Brasil", "Bispa Ana", "Bispo João", "Paróquia da Paz", "Diocese de Brasília", "Bispo Pedro", "Diocese Exemplo"]) expect(profile).toContain(value);
    const ongoingProfile = readFileSync(path.join(fixture, "dist/reverends/josias-conserva/index.html"), "utf8");
    expect(ongoingProfile).toContain("atualmente");
    expect(ongoingProfile).toContain("Recife");
    expect(ongoingProfile).toContain("Ordenação diaconal");
    expect(ongoingProfile).toContain("Bispo Exemplo");
    expect(ongoingProfile).not.toContain("Sagração episcopal");
    expect(html).toContain("atualmente");
    const cms = parse(readFileSync(path.join(fixture, "public/admin/config.yml"), "utf8"));
    const pages = cms.collections.find((item: { name: string }) => item.name === "pages");
    const reverends = cms.collections.find((item: { name: string }) => item.name === "reverends");
    expect(reverends.fields.find((item: { name: string }) => item.name === "bio").editor_components).toContain("content-gallery");
    for (const field of ["birth_date", "diaconal_ordination_date", "priestly_ordination_date", "episcopal_consecration_date", "death_date"]) {
      expect(reverends.fields.find((item: { name: string }) => item.name === field)).toMatchObject({ widget: "datetime", required: false, date_format: "DD/MM/YYYY", time_format: false });
    }
    for (const field of ["birth_place", "death_place", "diaconal_ordination", "priestly_ordination", "episcopal_consecration"]) {
      expect(reverends.fields.find((item: { name: string }) => item.name === field)).toMatchObject({ widget: "object", required: false });
    }
    const gallery = pages.files.find((item: { name: string }) => item.name === "reverends-gallery");
    const field = gallery.fields.find((item: { name: string }) => item.name === "reverends");
    expect(field.widget).toBe("list");
    expect(field.field).toMatchObject({ widget: "relation", collection: "reverends" });
    expect(field.field.display_fields.join(" ")).toContain("{{start_date");
    expect(field.field.display_fields.join(" ")).toContain("{{end_date");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

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

test("apresenta a linha do tempo sem rolagem horizontal", async ({ page }) => {
  await page.goto("/pages/reverends-gallery");
  const timeline = page.locator("main ol.reverend-timeline");
  await expect(timeline).toBeVisible();
  const names = await timeline.locator("li h3 a").allTextContents();
  expect(names).toEqual(["Josias Conserva", "Aubri Ecotem", "Magda Guedes"]);
  await expect(timeline.locator("li").first().locator("time")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
