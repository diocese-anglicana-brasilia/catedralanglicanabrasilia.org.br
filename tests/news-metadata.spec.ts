import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

test("exibe horário de Brasília e autor com foto ou imagem padrão", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-noticia-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const content = path.join(fixture, "src/content");
    writeFileSync(path.join(content, "authors/com-foto.md"), "---\nname: Autora Exemplo\nphoto: https://example.org/autora.webp\n---\n");
    writeFileSync(path.join(content, "authors/sem-foto.md"), "---\nname: Autor Sem Foto\n---\n");
    writeFileSync(path.join(content, "news/com-foto.md"), "---\ntitle: Notícia Com Foto\ndate: 2026-12-06T10:23:45\nauthor: com-foto\nstatus: published\n---\nTexto\n");
    writeFileSync(path.join(content, "news/sem-foto.md"), "---\ntitle: Notícia Sem Foto\ndate: 2026-12-06T13:23:45Z\nauthor: sem-foto\nstatus: published\n---\nTexto\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe", env: { ...process.env, TZ: "UTC" } });
    for (const route of ["index.html", "news/index.html"]) {
      const listing = readFileSync(path.join(fixture, "dist", route), "utf8");
      expect(listing).toContain("06/12/2026, às 10:23:45");
    }
    const first = readFileSync(path.join(fixture, "dist/news/com-foto/index.html"), "utf8");
    expect(first).toContain("06 de dezembro de 2026, às 10:23:45");
    expect(first).toContain("Autora Exemplo");
    expect(first).toContain('src="https://example.org/autora.webp"');
    const second = readFileSync(path.join(fixture, "dist/news/sem-foto/index.html"), "utf8");
    expect(second).toContain("06 de dezembro de 2026, às 10:23:45");
    expect(second).toContain("Autor Sem Foto");
    expect(second).toContain("https://cdn.catedralanglicanabrasilia.org.br/cms-uploads/20261114-90e953160594.webp");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
