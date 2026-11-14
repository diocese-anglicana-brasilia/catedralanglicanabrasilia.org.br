import { expect, test } from "@playwright/test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";

test("oferece bloco de galeria editável sem substituir imagens únicas", async ({ page }) => {
  const script = "public/admin/gallery-editor.js";
  expect(existsSync(script)).toBe(true);
  await page.goto("/");
  const result = await page.evaluate((source) => {
    let component: any;
    (window as any).CMS = { registerEditorComponent: (definition: any) => { component = definition; } };
    new Function(source)();
    const data = { title: "Celebração", images: [{ src: "https://example.org/1.jpg", alt: "Pessoas reunidas" }, { src: "https://example.org/2.jpg", alt: "Altar" }] };
    const block = component.toBlock(data);
    return { fields: component.fields, block, parsed: component.fromBlock(component.pattern.exec(block)) };
  }, readFileSync(script, "utf8"));
  expect(result.parsed).toEqual({ title: "Celebração", images: [{ src: "https://example.org/1.jpg", alt: "Pessoas reunidas" }, { src: "https://example.org/2.jpg", alt: "Altar" }] });
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  const programs = config.collections.find((item: { name: string }) => item.name === "programs");
  expect(programs.fields.some((item: { name: string; widget: string }) => item.name === "body" && item.widget === "richtext")).toBe(true);
});

test("adapta a galeria à largura disponível sem cortar as fotos", async ({ page }) => {
  await page.goto("/");
  await page.locator("main").evaluate((main) => {
    const section = document.createElement("div");
    section.className = "content-body";
    section.innerHTML = '<figure data-content-gallery="true"><div><img src="/missing.jpg" alt="Foto um"><img src="/missing2.jpg" alt="Foto dois"></div><figcaption>Galeria</figcaption></figure>';
    main.prepend(section);
  });
  const gallery = page.locator("[data-content-gallery]");
  await expect(gallery).toBeVisible();
  await expect(gallery.locator("img").first()).toHaveCSS("object-fit", "contain");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("renderiza galerias em textos de notícias e atividades, entre imagens e parágrafos", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-galeria-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const gallery = '<figure data-content-gallery="true"><div><img src="https://example.org/1.jpg" alt="Pessoas reunidas"><img src="https://example.org/2.jpg" alt="Altar"></div><figcaption>Celebração</figcaption></figure>';
    const body = `Antes.\n\n![Imagem única](https://example.org/unica.jpg)\n\n${gallery}\n\nDepois.`;
    writeFileSync(path.join(fixture, "src/content/news/galeria-teste.md"), `---\ntitle: Galeria teste\ndate: 2026-11-01\nstatus: published\n---\n${body}\n`);
    writeFileSync(path.join(fixture, "src/content/programs/galeria-teste.md"), `---\nname: Atividade teste\ndescription: Descrição\nimages:\n  - https://example.org/destaque.jpg\n---\n${body}\n`);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const route of ["news/galeria-teste", "programs/galeria-teste"]) {
      const html = readFileSync(path.join(fixture, `dist/${route}/index.html`), "utf8");
      expect(html).toContain('data-content-gallery="true"');
      expect(html).toContain('alt="Pessoas reunidas"');
      expect(html).toContain('alt="Imagem única"');
      expect(html.indexOf("Antes.")).toBeLessThan(html.indexOf("data-content-gallery"));
      expect(html.indexOf("data-content-gallery")).toBeLessThan(html.indexOf("Depois."));
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
