import { expect, test } from "@playwright/test";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

test("mostra nomes das tags antes dos comentários apenas quando existem", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-noticia-tags-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const content = path.join(fixture, "src/content");
    writeFileSync(path.join(content, "tags/etiqueta-teste.md"), "---\ntitle: Comunidade e serviço\n---\n");
    const header = "---\ntitle: Notícia teste\ndate: 2026-11-20T10:00:00-03:00\nstatus: published\n";
    writeFileSync(path.join(content, "news/tags-teste.md"), `${header}tags: [etiqueta-teste, inexistente]\n---\nTexto da notícia.\n`);
    writeFileSync(path.join(content, "news/sem-tags-teste.md"), `${header}---\nTexto sem tags.\n`);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const html = readFileSync(path.join(fixture, "dist/news/tags-teste/index.html"), "utf8");
    expect(html).toContain('aria-label="Tags"');
    expect(html).toContain("Comunidade e serviço");
    expect(html).not.toContain(">inexistente<");
    expect(html.indexOf('aria-label="Tags"')).toBeLessThan(html.indexOf('id="comments-title"'));
    expect(html).toMatch(/class="[^"]*text-sm[^"]*"[^>]*aria-label="Tags"/);
    const noTags = readFileSync(path.join(fixture, "dist/news/sem-tags-teste/index.html"), "utf8");
    expect(noTags).not.toContain('aria-label="Tags"');
    expect(noTags).toContain('id="comments-title"');
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("usa imagem de destaque somente nos cards e metadados, preservando as imagens do texto", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-noticia-destaque-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const news = path.join(fixture, "src/content/news");
    rmSync(news, { recursive: true }); mkdirSync(news);
    const image = "https://example.org/destaque.webp";
    const header = `---\ntitle: Notícia de teste\ndate: 2026-11-20T10:00:00-03:00\nstatus: published\nfeatured_image: ${image}\n---\n`;
    writeFileSync(path.join(news, "com-imagem.md"), `${header}\nTexto inicial.\n\n![Descrição da foto](${image})\n`);
    writeFileSync(path.join(news, "sem-imagem.md"), `${header}\nTexto sem foto.\n`);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const file of ["index.html", "news/index.html"]) expect(readFileSync(path.join(fixture, "dist", file), "utf8")).toContain(`src="${image}"`);
    const article = readFileSync(path.join(fixture, "dist/news/com-imagem/index.html"), "utf8");
    expect(article).toContain(`property="og:image" content="${image}"`);
    expect(article).toContain(`name="twitter:image" content="${image}"`);
    expect(article).toContain(`"image":"${image}"`);
    const body = article.slice(article.indexOf("<body"));
    expect(body.match(new RegExp(`src="${image}"`, "g"))).toHaveLength(1);
    expect(body).toContain('alt="Descrição da foto"');
    const withoutInline = readFileSync(path.join(fixture, "dist/news/sem-imagem/index.html"), "utf8");
    expect(withoutInline.slice(withoutInline.indexOf("<body"))).not.toContain(`src="${image}"`);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("exibe horário de Brasília e autor com foto ou imagem padrão", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-noticia-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const astroConfig = path.join(fixture, "astro.config.mjs");
    writeFileSync(astroConfig, readFileSync(astroConfig, "utf8").replace("vite: { plugins:", 'vite: { cacheDir: "./.vite-cache", plugins:'));
    const content = path.join(fixture, "src/content");
    const news = path.join(content, "news");
    rmSync(news, { recursive: true });
    mkdirSync(news);
    writeFileSync(path.join(content, "authors/com-foto.md"), "---\nname: Autora Exemplo\nphoto: https://example.org/autora.webp\n---\n");
    writeFileSync(path.join(content, "authors/sem-foto.md"), "---\nname: Autor Sem Foto\n---\n");
    writeFileSync(path.join(content, "news/com-foto.md"), "---\ntitle: Notícia Com Foto\ndate: 2026-12-06T10:23:45\nauthor: com-foto\nstatus: published\n---\nTexto\n");
    writeFileSync(path.join(content, "news/sem-foto.md"), "---\ntitle: Notícia Sem Foto\ndate: 2026-12-06T13:23:45Z\nauthor: sem-foto\nstatus: published\n---\nTexto\n");
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe", env: { ...process.env, TZ: "UTC" } });
    for (const route of ["index.html", "news/index.html"]) {
      const listing = readFileSync(path.join(fixture, "dist", route), "utf8");
      expect(listing).toContain("06/12/2026, às 10:23");
    }
    const first = readFileSync(path.join(fixture, "dist/news/com-foto/index.html"), "utf8");
    expect(first).toContain("06 de dezembro de 2026, às 10:23");
    expect(first).toContain("Autora Exemplo");
    expect(first).toContain('src="https://example.org/autora.webp"');
    const second = readFileSync(path.join(fixture, "dist/news/sem-foto/index.html"), "utf8");
    expect(second).toContain("06 de dezembro de 2026, às 10:23");
    expect(second).toContain("Autor Sem Foto");
    expect(second).toContain("https://cdn.catedralanglicanabrasilia.org.br/cms-uploads/20261114-90e953160594.webp");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
