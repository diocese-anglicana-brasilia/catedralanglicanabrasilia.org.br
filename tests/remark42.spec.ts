import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";

test("permite desativar comentários por notícia, mantendo o padrão ativado", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const cms = parse(readFileSync("public/admin/config.yml", "utf8"));
  const news = cms.collections.find((collection: { name: string }) => collection.name === "news");
  expect(news.fields.find((field: { name: string }) => field.name === "comments_enabled")).toMatchObject({ widget: "boolean", default: true });
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-comentarios-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const newsDir = path.join(fixture, "src/content/news");
    for (const [id, setting] of [["padrao-comentarios", ""], ["ativos-comentarios", "comments_enabled: true\n"], ["inativos-comentarios", "comments_enabled: false\n"]]) {
      writeFileSync(path.join(newsDir, `${id}.md`), `---\ntitle: Notícia teste\ndate: 2026-11-20T12:00:00-03:00\nstatus: published\n${setting}---\nConteúdo.\n`);
    }
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const id of ["padrao-comentarios", "ativos-comentarios"]) {
      const html = readFileSync(path.join(fixture, `dist/news/${id}/index.html`), "utf8");
      expect(html).toContain('id="comments-title"');
      expect(html).toContain('id="remark42"');
    }
    const disabled = readFileSync(path.join(fixture, "dist/news/inativos-comentarios/index.html"), "utf8");
    expect(disabled).not.toContain('id="comments-title"');
    expect(disabled).not.toContain('id="remark42"');
    expect(disabled).not.toContain("window.remark_config");
    expect(disabled).not.toContain("comentarios.catedralanglicanabrasilia.org.br");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("carrega comentários apenas nas notícias, com configuração em português e fonte do site", async ({ page }) => {
  let loads = 0;
  await page.route("https://comentarios.catedralanglicanabrasilia.org.br/web/embed.mjs", async (route) => {
    loads++;
    await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "text/javascript", body: 'window.__remarkTestConfig = window.remark_config; document.getElementById("remark42").textContent = "Comentários disponíveis";' });
  });
  await page.goto("/news/");
  await expect(page.locator("#remark42")).toHaveCount(0);
  const href = await page.locator('a[href^="/news/"]:not([href="/news/"])').first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(`${href}?origem=teste#texto`);
  await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();
  await expect(page.locator("#remark42")).toHaveText("Comentários disponíveis");
  const config = await page.evaluate(() => (window as any).__remarkTestConfig);
  expect(config).toMatchObject({ host: "https://comentarios.catedralanglicanabrasilia.org.br", site_id: "catedral-brasilia", locale: "bp", custom_properties: { "--font-family": '"Aller Light", sans-serif' } });
  expect(config.url).toBe(new URL(href!, "http://127.0.0.1:4322").href.replace(/\/$/, ""));
  expect(loads).toBe(1);
  await page.goto("/pages/contact");
  await expect(page.locator("#remark42")).toHaveCount(0);
  expect(loads).toBe(1);
});
