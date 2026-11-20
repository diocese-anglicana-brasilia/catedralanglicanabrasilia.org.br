import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";

test("gera páginas de tags com notícias publicadas e links nas notícias", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-tags-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const content = path.join(fixture, "src/content");
    writeFileSync(path.join(content, "tags/grupo-teste.md"), "---\ntitle: Comunidade de teste\n---\n");
    writeFileSync(path.join(content, "tags/vazia-teste.md"), "---\ntitle: Tag sem notícias\n---\n");
    const entries = [["nova-teste", "published", "2026-11-20", "grupo-teste"], ["antiga-teste", "published", "2026-11-01", "grupo-teste"], ["rascunho-teste", "draft", "2026-11-21", "grupo-teste"], ["arquivo-teste", "archived", "2026-11-22", "grupo-teste"], ["outra-teste", "published", "2026-11-23", "site"]];
    for (const [id, status, date, tag] of entries) writeFileSync(path.join(content, `news/${id}.md`), `---\ntitle: Notícia ${id}\ndate: ${date}T12:00:00-03:00\nstatus: ${status}\ntags: [${tag}]\nexcerpt: Resumo ${id}\n---\nConteúdo.\n`);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const article = readFileSync(path.join(fixture, "dist/news/nova-teste/index.html"), "utf8");
    expect(article).toMatch(/href="\/tags\/grupo-teste"[^>]*>Comunidade de teste<\/a>/);
    const page = readFileSync(path.join(fixture, "dist/tags/grupo-teste/index.html"), "utf8");
    expect(page).toContain("Comunidade de teste");
    expect(page).toContain("Notícia nova-teste");
    expect(page).toContain("Notícia antiga-teste");
    expect(page.indexOf("Notícia nova-teste")).toBeLessThan(page.indexOf("Notícia antiga-teste"));
    expect(page).toContain("Resumo nova-teste");
    expect(page).not.toContain("Notícia rascunho-teste");
    expect(page).not.toContain("Notícia arquivo-teste");
    expect(page).not.toContain("Notícia outra-teste");
    expect(page).toContain('href="/news/nova-teste"');
    const empty = readFileSync(path.join(fixture, "dist/tags/vazia-teste/index.html"), "utf8");
    expect(empty).toContain("Ainda não há notícias publicadas com esta tag.");
    expect(readFileSync(path.join(fixture, "dist/sitemap-0.xml"), "utf8")).toContain("/tags/grupo-teste/");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
