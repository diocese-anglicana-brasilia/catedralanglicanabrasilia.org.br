import { expect, test } from "@playwright/test";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

test("mantém histórico sem links quebrados e gera páginas somente para eventos vigentes", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-eventos-passados-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const astroConfig = path.join(fixture, "astro.config.mjs");
    writeFileSync(astroConfig, readFileSync(astroConfig, "utf8").replace("vite: { plugins:", 'vite: { cacheDir: "./.vite-cache", plugins:'));
    const events = path.join(fixture, "src/content/events");
    writeFileSync(path.join(events, "passado-teste.md"), "---\nname: Encontro antigo de teste\nstart_date: 2000-01-01T10:00:00-03:00\nend_date: 2000-01-01T12:00:00-03:00\n---\n");
    writeFileSync(path.join(events, "vigente-teste.md"), "---\nname: Encontro vigente de teste\nstart_date: 2000-01-01T10:00:00-03:00\nend_date: 2099-01-01T12:00:00-03:00\n---\n");
    writeFileSync(path.join(events, "futuro-teste.md"), "---\nname: Encontro futuro de teste\nstart_date: 2099-01-01T10:00:00-03:00\n---\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    expect(existsSync(path.join(events, "passado-teste.md"))).toBe(true);
    expect(existsSync(path.join(fixture, "dist/events/passado-teste/index.html"))).toBe(false);
    expect(existsSync(path.join(fixture, "dist/events/vigente-teste/index.html"))).toBe(true);
    expect(existsSync(path.join(fixture, "dist/events/futuro-teste/index.html"))).toBe(true);
    expect(existsSync(path.join(fixture, "dist/events/passado-teste.ics"))).toBe(false);
    expect(existsSync(path.join(fixture, "dist/events/vigente-teste.ics"))).toBe(true);
    expect(existsSync(path.join(fixture, "dist/events/futuro-teste.ics"))).toBe(true);
    const list = readFileSync(path.join(fixture, "dist/events/index.html"), "utf8");
    const otherPages = ["2", "3", "4"].map((n) => { const file = path.join(fixture, `dist/events/pagina/${n}/index.html`); return existsSync(file) ? readFileSync(file, "utf8") : ""; }).join("");
    const archive = list + otherPages;
    expect(archive).toContain("Encontro antigo de teste");
    expect(archive).not.toContain('href="/events/passado-teste"');
    expect(list).not.toContain('"href":"/events/passado-teste"');
    const search = JSON.parse(readFileSync(path.join(fixture, "dist/search-index/events.json"), "utf8"));
    expect(search.find((entry: { title: string }) => entry.title === "Encontro antigo de teste")?.href).toBeUndefined();
    const sitemap = readFileSync(path.join(fixture, "dist/sitemap-0.xml"), "utf8");
    expect(sitemap).not.toContain("/events/passado-teste/");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
