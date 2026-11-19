import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { parse } from "yaml";

test("oferece metadados no CMS para os conteúdos com página e para páginas fixas", () => {
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  const names = ["news", "events", "locations", "programs", "reverends", "board_members"];
  for (const name of names) {
    const collection = config.collections.find((item: { name: string }) => item.name === name);
    expect(collection.fields.map((field: { name: string }) => field.name)).toEqual(expect.arrayContaining(["seo_description", "seo_keywords"]));
  }
  const pages = config.collections.find((item: { name: string }) => item.name === "pages");
  for (const page of pages.files) expect(page.fields.map((field: { name: string }) => field.name)).toEqual(expect.arrayContaining(["seo_description", "seo_keywords"]));
  const seo = config.collections.find((item: { name: string }) => item.name === "site_seo");
  expect(seo.files.map((item: { name: string }) => item.name)).toEqual(expect.arrayContaining(["home", "news", "events", "locations", "programs", "not-found"]));
});

test("usa os metadados da página inicial apenas no cabeçalho HTML", async ({ page }) => {
  await page.goto("/");
  const description = "Conheça a Catedral Anglicana da Ressurreição, sua comunidade, notícias e eventos em Brasília.";
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute("content", "Catedral Anglicana, Brasília, comunidade anglicana");
  await expect(page.locator("body")).not.toContainText(description);
});

test("oferece imagens sociais opcionais no CMS e gera metadados das páginas estáticas", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  for (const collectionName of ["pages", "site_seo"]) {
    const collection = config.collections.find((item: { name: string }) => item.name === collectionName);
    for (const entry of collection.files) expect(entry.fields.find((field: { name: string }) => field.name === "seo_image"), entry.name).toMatchObject({ widget: "image", required: false });
  }
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-social-image-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    for (const [file, image] of [["pages/history.md", "https://cdn.example.org/historia.jpg"], ["pages/about.md", "javascript:alert(1)"], ["site-seo/home.md", "/media/capa.jpg"], ["site-seo/news.md", "https://cdn.example.org/noticias.jpg"], ["site-seo/not-found.md", "https://cdn.example.org/404.jpg"]]) {
      const filePath = path.join(fixture, "src/content", file);
      const content = readFileSync(filePath, "utf8").replace(/^seo_image:.*\n/gm, "");
      writeFileSync(filePath, content.replace(/^---\s*\n/, `---\nseo_image: "${image}"\n`));
    }
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const [file, image] of [["pages/history/index.html", "https://cdn.example.org/historia.jpg"], ["index.html", "https://catedralanglicanabrasilia.org.br/media/capa.jpg"], ["news/index.html", "https://cdn.example.org/noticias.jpg"], ["404.html", "https://cdn.example.org/404.jpg"]]) {
      const html = readFileSync(path.join(fixture, "dist", file), "utf8");
      expect(html).toContain(`property="og:image" content="${image}"`);
      expect(html).toContain(`name="twitter:image" content="${image}"`);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
    }
    const withoutImage = readFileSync(path.join(fixture, "dist/pages/contact/index.html"), "utf8");
    const defaultImage = "https://cdn.catedralanglicanabrasilia.org.br/public/media/logo_cores.webp";
    expect(withoutImage).toContain(`property="og:image" content="${defaultImage}"`);
    expect(withoutImage).toContain(`name="twitter:image" content="${defaultImage}"`);
    expect(withoutImage).toContain('name="twitter:card" content="summary_large_image"');
    expect(readFileSync(path.join(fixture, "dist/pages/about/index.html"), "utf8")).toContain(`property="og:image" content="${defaultImage}"`);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("gera metadados dos conteúdos e listagens com segurança", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-seo-test-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) {
      cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    }
    linkFixtureDependencies(fixture);
    const astroConfig = path.join(fixture, "astro.config.mjs");
    writeFileSync(astroConfig, readFileSync(astroConfig, "utf8").replace("vite: { plugins:", 'vite: { cacheDir: "./.vite-cache", plugins:'));
    const entries = [
      ["news/2026-11-11-catedral-anglicana-da-ressurreicao-estreia-novo-site.md", "news/2026-11-11-catedral-anglicana-da-ressurreicao-estreia-novo-site"],
      ["events/reconducao-da-rev-tati-como-dea-da-catedral.md", "events/reconducao-da-rev-tati-como-dea-da-catedral"],
      ["locations/catedral-anglicana-da-ressurreicao.md", "locations/catedral-anglicana-da-ressurreicao"],
      ["pages/about.md", "pages/about"],
      ["board-members/tati-ribeiro.md", "board-members/tati-ribeiro"],
      ["reverends/josias-conserva.md", "reverends/josias-conserva"],
      ["site-seo/news.md", "news"],
      ["site-seo/events.md", "events"],
      ["site-seo/locations.md", "locations"],
      ["site-seo/programs.md", "programs"],
      ["site-seo/not-found.md", "404.html"],
    ];
    for (const [source] of entries) {
      const file = path.join(fixture, "src/content", source);
      const content = readFileSync(file, "utf8").replace(/^seo_(?:description|keywords):.*\n/gm, "");
      writeFileSync(file, content.replace(/^---\s*\n/, `---\nseo_description: 'Descrição "especial" & segura'\nseo_keywords: "igreja, fé"\n`));
    }
    const program = path.join(fixture, "src/content/programs/programa-teste.md");
    writeFileSync(program, `---\nname: Programa teste\ndescription: Descrição pública\nseo_description: 'Descrição "especial" & segura'\nseo_keywords: "igreja, fé"\n---\n`);
    entries.push(["programs/programa-teste.md", "programs/programa-teste"]);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const [, route] of entries) {
      const html = readFileSync(path.join(fixture, "dist", route.endsWith(".html") ? route : `${route}/index.html`), "utf8");
      expect(html, route).toContain('name="description" content="Descrição &quot;especial&quot; &amp; segura"');
      expect(html, route).toContain('name="keywords" content="igreja, fé"');
      expect(html, route).toContain('property="og:description" content="Descrição &quot;especial&quot; &amp; segura"');
      expect(html.slice(html.indexOf("<body")), route).not.toContain("Descrição &quot;especial&quot; &amp; segura");
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
