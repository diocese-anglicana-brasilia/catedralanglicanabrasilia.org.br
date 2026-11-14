import { expect, test } from "@playwright/test";
import { isActiveMember } from "../src/utils/board-members";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";

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

test("por padrão, mantém perfis ativos acessíveis mas não indexáveis", async ({ page, request }) => {
  await page.goto("/pages/leadership");
  const link = page.locator("main").getByRole("link", { name: "Caio Costa" });
  await expect(link).toHaveAttribute("rel", "nofollow");
  await expect(page.locator("main article.content-card").filter({ hasText: "Caio Costa" })).toContainText("1º Guardião");
  await page.goto("/board-members/caio-costa");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  const response = await request.get("/sitemap-0.xml");
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toContain("/board-members/caio-costa/");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).not.toMatch(/Disallow:\s*\/board-members/);
});

test("preserva a data completa nas listagens de notícias e eventos", async ({ page }) => {
  for (const url of ["/news/", "/events/"]) {
    await page.goto(url);
    const dates = page.locator(".content-card time");
    expect(await dates.count()).toBeGreaterThan(0);
    for (const date of await dates.all()) await expect(date).toHaveText(url === "/news/" ? /^\d{2}\/\d{2}\/\d{4}, às \d{2}:\d{2}:\d{2}$/ : /^\d{2}\/\d{2}\/\d{4}$/);
  }
});

test("ordena departamentos e respeita perfis indexáveis, não indexáveis e inativos", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-liderancas-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const content = path.join(fixture, "src/content");
    writeFileSync(path.join(content, "pages/leadership.md"), "---\ntitle: Liderança\ndepartments:\n  - name: Música\n    description: 'Servimos com **música** e [acolhimento](/pages/about). <script>alert(1)</script>'\n    members: [indexavel, privado, inativo]\n  - name: Junta Paroquial\n    members: [caio-costa]\n---\n");
    writeFileSync(path.join(content, "board-members/indexavel.md"), "---\nname: Pessoa Indexável\nrole: Coordenação\nstart_date: 2024-03-15\nphoto: https://cdn.catedralanglicanabrasilia.org.br/foto-exemplo.webp\nindexable: true\nis_active: true\n---\n");
    writeFileSync(path.join(content, "board-members/privado.md"), "---\nname: Pessoa Não Indexável\nrole: Auxiliar\nstart_date: 11/2018\nis_active: true\n---\n");
    writeFileSync(path.join(content, "board-members/inativo.md"), "---\nname: Pessoa Inativa\nrole: Colaboradora\nindexable: true\nis_active: false\n---\n");
    writeFileSync(path.join(content, "reverends/josias-conserva.md"), "---\nname: Josias Conserva\nrole: Reverendo Coadjutor\nstart_date: 11/1990\nend_date: 11/2000\n---\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const html = readFileSync(path.join(fixture, "dist/pages/leadership/index.html"), "utf8");
    expect(html.indexOf(">Música</h2>")).toBeLessThan(html.indexOf(">Junta Paroquial</h2>"));
    expect(html.indexOf(">Pessoa Indexável</a>")).toBeLessThan(html.indexOf(">Pessoa Não Indexável</a>"));
    expect(html).toMatch(/<time[^>]*>março de 2024<\/time>/);
    expect(html).toMatch(/<time[^>]*>novembro de 2018<\/time>/);
    expect(html).not.toContain("01/2018");
    expect(html).toContain("Servimos com <strong>música</strong>");
    expect(html).toContain('<a href="/pages/about">acolhimento</a>');
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain('src="https://cdn.catedralanglicanabrasilia.org.br/foto-exemplo.webp"');
    expect(html).toMatch(/href="\/board-members\/indexavel"[^>]*>Pessoa Indexável/);
    expect(html).toMatch(/href="\/board-members\/privado" rel="nofollow"/);
    expect(html).not.toContain('href="/board-members/inativo"');
    const gallery = readFileSync(path.join(fixture, "dist/pages/reverends-gallery/index.html"), "utf8");
    expect(gallery).toMatch(/<time[^>]*>novembro de 1990<\/time>/);
    expect(gallery).toMatch(/<time[^>]*>novembro de 2000<\/time>/);
    const reverend = readFileSync(path.join(fixture, "dist/reverends/josias-conserva/index.html"), "utf8");
    expect(reverend).toMatch(/<time[^>]*>novembro de 1990<\/time>/);
    expect(reverend).toMatch(/<time[^>]*>novembro de 2000<\/time>/);
    const profile = readFileSync(path.join(fixture, "dist/board-members/indexavel/index.html"), "utf8");
    expect(profile).not.toContain('name="robots" content="noindex');
    const sitemap = readFileSync(path.join(fixture, "dist/sitemap-0.xml"), "utf8");
    expect(sitemap).toContain("/board-members/indexavel/");
    expect(sitemap).not.toContain("/board-members/privado/");
    expect(sitemap).not.toContain("/board-members/inativo/");
    const cms = parse(readFileSync(path.join(fixture, "public/admin/config.yml"), "utf8"));
    const leaders = cms.collections.find((item: { name: string }) => item.name === "board_members");
    expect(leaders.fields.find((field: { name: string }) => field.name === "indexable").default).toBe(false);
    const pages = cms.collections.find((item: { name: string }) => item.name === "pages");
    const leadership = pages.files.find((item: { name: string }) => item.name === "leadership");
    const departments = leadership.fields.find((field: { name: string }) => field.name === "departments");
    const members = departments.fields.find((field: { name: string }) => field.name === "members");
    expect(members.widget).toBe("list");
    expect(members.field).toMatchObject({ widget: "relation", collection: "board_members" });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
