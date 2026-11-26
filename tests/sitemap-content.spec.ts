import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";

test("gera sitemaps de notícias e imagens com metadados válidos", async () => {
  const { newsSitemap, imageSitemap } = await import("../src/utils/sitemap-content");
  const entries = [
    { id: "recente", data: { title: "Fé & comunhão", status: "published", date: new Date("2026-11-25T12:00:00Z"), featured_image: "https://cdn.example.org/foto.webp" } },
    { id: "antiga", data: { title: "Antiga", status: "published", date: new Date("2026-10-01T12:00:00Z"), featured_image: "https://cdn.example.org/antiga.webp" } },
    { id: "rascunho", data: { title: "Rascunho", status: "draft", date: new Date("2026-11-25T12:00:00Z"), featured_image: "https://cdn.example.org/privada.webp" } },
  ];
  const news = newsSitemap(entries, "https://example.org/", new Date("2026-11-26T12:00:00Z"));
  expect(news).toContain("Fé &amp; comunhão");
  expect(news).toContain("2026-11-25T12:00:00.000Z");
  expect(news).toContain("<lastmod>2026-11-25T12:00:00.000Z</lastmod>");
  expect(news).not.toContain("antiga");
  expect(news).not.toContain("rascunho");
  const images = imageSitemap(entries, "https://example.org/");
  expect(images).toContain("https://example.org/news/recente/");
  expect(images).toContain("https://cdn.example.org/antiga.webp");
  expect(images).toContain("<lastmod>2026-11-25T12:00:00.000Z</lastmod>");
  expect(images).not.toContain("privada.webp");
});

test("build inclui atualização e imagens das páginas, sem expor perfis não indexáveis", { tag: "@desktop" }, () => {
  test.setTimeout(90000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-sitemap-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    writeFileSync(path.join(fixture, "src/content/pages/teste-sitemap.md"), '---\ntitle: Teste\nupdated_at: 2026-11-25T12:00:00Z\n---\n![Altar](https://cdn.example.org/altar.webp)\n\n<figure data-content-gallery="true"><div><img src="https://cdn.example.org/galeria.webp" alt="Foto" loading="lazy"></div></figure>\n');
    writeFileSync(path.join(fixture, "src/content/news/teste-publicacao.md"), '---\ntitle: Notícia\ndate: 2026-11-25T12:00:00Z\nstatus: published\n---\nConteúdo.\n');
    writeFileSync(path.join(fixture, "src/content/board-members/teste-privado.md"), '---\nname: Pessoa\nrole: Líder\nis_active: true\nindexable: false\nphoto: https://cdn.example.org/privado.webp\n---\n');
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const sitemap = readFileSync(path.join(fixture, "dist/sitemap-0.xml"), "utf8");
    expect(sitemap).toMatch(/<loc>https:\/\/catedralanglicanabrasilia\.org\.br\/pages\/teste-sitemap\/<\/loc><lastmod>2026-11-25T12:00:00/);
    expect(sitemap).toMatch(/<loc>https:\/\/catedralanglicanabrasilia\.org\.br\/news\/teste-publicacao\/<\/loc><lastmod>2026-11-25T12:00:00/);
    const images = readFileSync(path.join(fixture, "dist/sitemap-images.xml"), "utf8");
    expect(images).toContain("https://cdn.example.org/altar.webp");
    expect(images).toContain("https://cdn.example.org/galeria.webp");
    expect(images).not.toContain("https://cdn.example.org/privado.webp");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("sitemaps incluem atualização e imagens do conteúdo sem URLs perigosas", async () => {
  const { contentImages, newsSitemap } = await import("../src/utils/sitemap-content");
  const images = contentImages('![Altar](https://cdn.example.org/altar.webp)\n<figure data-content-gallery="true"><div><img src="https://cdn.example.org/galeria.webp" alt="Foto"></div></figure>\n<img src="javascript:alert(1)" alt="x">', "https://example.org/");
  expect(images).toEqual(["https://cdn.example.org/altar.webp", "https://cdn.example.org/galeria.webp"]);
  const result = newsSitemap([{ id: "a", data: { title: "Notícia", status: "published", date: new Date("2026-11-25T12:00:00Z"), updated_at: new Date("2026-11-26T10:00:00Z") } }], "https://example.org/", new Date("2026-11-26T12:00:00Z"));
  expect(result).toContain("<lastmod>2026-11-26T10:00:00.000Z</lastmod>");
});
