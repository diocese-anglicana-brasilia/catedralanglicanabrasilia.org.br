import { expect, test } from "@playwright/test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";

test("gera página apenas para autor habilitado e lista suas notícias publicadas", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-autores-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const content = path.join(fixture, "src/content");
    writeFileSync(path.join(content, "authors/habilitado.md"), "---\nname: Autora Ativa\nbio: Texto da **biografia**.\nphoto: https://example.org/autora.jpg\nprofile_enabled: true\n---\n");
    writeFileSync(path.join(content, "authors/desabilitado.md"), "---\nname: Autor Desativado\nprofile_enabled: false\n---\n");
    writeFileSync(path.join(content, "authors/segunda.md"), "---\nname: Segunda Autora\nprofile_enabled: true\n---\n");
    writeFileSync(path.join(content, "authors/padrao.md"), "---\nname: Autor Padrão\n---\n");
    for (const [id, author, status] of [["publicada", "habilitado", "published"], ["rascunho", "habilitado", "draft"], ["arquivo", "habilitado", "archived"], ["outro", "desabilitado", "published"], ["padrao", "padrao", "published"]]) {
      writeFileSync(path.join(content, `news/${id}.md`), `---\ntitle: Notícia ${id}\ndate: 2026-11-01T12:00:00-03:00\nauthor: ${author}\nstatus: ${status}\n---\n`);
    }
    for (let i = 1; i <= 10; i++) writeFileSync(path.join(content, `news/extra-${i}.md`), `---\ntitle: Publicação ${i}\ndate: 2026-10-${String(i).padStart(2, "0")}T12:00:00-03:00\nauthor: habilitado\nstatus: published\n---\n`);
    writeFileSync(path.join(content, "news/coautoria.md"), "---\ntitle: Notícia em coautoria\ndate: 2026-11-02T12:00:00-03:00\nauthor:\n  - segunda\n  - desabilitado\n  - habilitado\nstatus: published\n---\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const profile = readFileSync(path.join(fixture, "dist/authors/habilitado/index.html"), "utf8");
    expect(profile).toContain("Autora Ativa");
    expect(profile).toContain("Texto da <strong>biografia</strong>");
    expect(profile).toContain('src="https://example.org/autora.jpg"');
    expect(profile).toContain("Notícia publicada");
    expect(profile).toContain("Notícia em coautoria");
    expect(readFileSync(path.join(fixture, "dist/authors/segunda/index.html"), "utf8")).toContain("Notícia em coautoria");
    expect(profile).toContain("Publicação 1");
    expect(profile).toContain("Publicação 10");
    expect(profile.indexOf("Publicação 10")).toBeLessThan(profile.indexOf("Publicação 1</a>"));
    expect(profile).not.toContain("Notícia rascunho");
    expect(profile).not.toContain("Notícia arquivo");
    expect(profile).not.toContain("Notícia outro");
    for (const name of ["desabilitado", "padrao"]) expect(existsSync(path.join(fixture, `dist/authors/${name}/index.html`))).toBe(false);
    const news = (id: string) => readFileSync(path.join(fixture, `dist/news/${id}/index.html`), "utf8");
    expect(news("publicada")).toMatch(/href="\/authors\/habilitado"[^>]*>Autora Ativa<\/a>/);
    expect(news("outro")).toContain("Autor Desativado");
    expect(news("outro")).not.toContain('href="/authors/desabilitado"');
    expect(news("padrao")).not.toContain('href="/authors/padrao"');
    const coauthored = news("coautoria");
    expect(coauthored).toMatch(/href="\/authors\/segunda"[^>]*>Segunda Autora<\/a>/);
    expect(coauthored).toMatch(/href="\/authors\/habilitado"[^>]*>Autora Ativa<\/a>/);
    expect(coauthored).toContain("Autor Desativado");
    expect(coauthored).not.toContain('href="/authors/desabilitado"');
    expect(coauthored.indexOf("Segunda Autora")).toBeLessThan(coauthored.indexOf("Autor Desativado"));
    expect(coauthored.indexOf("Autor Desativado")).toBeLessThan(coauthored.indexOf("Autora Ativa"));
    const sitemap = readFileSync(path.join(fixture, "dist/sitemap-0.xml"), "utf8");
    expect(sitemap).toContain("/authors/habilitado/");
    expect(sitemap).not.toContain("/authors/desabilitado/");
    const cms = parse(readFileSync(path.join(fixture, "public/admin/config.yml"), "utf8"));
    const authors = cms.collections.find((item: { name: string }) => item.name === "authors");
    expect(authors.fields.find((field: { name: string }) => field.name === "profile_enabled").default).toBe(false);
    const newsCollection = cms.collections.find((item: { name: string }) => item.name === "news");
    expect(newsCollection.fields.find((field: { name: string }) => field.name === "author").multiple).toBe(true);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
