import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("constrói notícias com imagens remotas no Markdown sem buscar o CDN", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-imagens-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) {
      cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    }
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const source = path.join(fixture, "src/content/news/teste-imagem-remota.md");
    writeFileSync(source, '---\ntitle: Teste de imagem\ndate: 2026-11-13\nstatus: published\n---\n\n![Descrição de teste](https://cdn.catedralanglicanabrasilia.org.br/cms-uploads/imagem-inexistente-teste.webp "Título de teste")\n');
    const result = spawnSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, encoding: "utf8", timeout: 60_000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const html = readFileSync(path.join(fixture, "dist/news/teste-imagem-remota/index.html"), "utf8");
    assert.match(html, /src="https:\/\/cdn\.catedralanglicanabrasilia\.org\.br\/cms-uploads\/imagem-inexistente-teste\.webp"/);
    assert.match(html, /alt="Descrição de teste"/);
    assert.match(html, /title="Título de teste"/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
