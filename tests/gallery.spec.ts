import { expect, test } from "@playwright/test";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import AxeBuilder from "@axe-core/playwright";
import { renderBiographyMarkdown } from "../src/utils/biography-markdown";

test("apresenta fotos da galeria com contorno claro e sombra inferior", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const photo = gallery.locator("img:visible").first();
  await expect(photo).toHaveCSS("border-top-width", "4px");
  await expect(photo).toHaveCSS("border-top-color", "rgb(247, 243, 236)");
  const radius = await photo.evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
  expect(radius).toBeGreaterThan(0);
  await expect(gallery.locator(".gallery-stage")).not.toHaveCSS("box-shadow", "none");
});

test("identifica visualmente a galeria e sua legenda como um bloco", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  await expect(gallery.locator(":scope > figcaption")).toBeVisible();
  const frame = await gallery.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, padding: parseFloat(style.paddingLeft), border: parseFloat(style.borderLeftWidth) };
  });
  expect(frame.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(frame.padding).toBeGreaterThan(0);
  expect(frame.border).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

test("legendas de imagens individuais seguem o estilo das fotos da galeria", async ({ page }) => {
  await page.goto("/pages/history");
  const captions = await page.evaluate(() => {
    const body = document.querySelector(".content-body")!;
    const figure = document.createElement("figure");
    figure.innerHTML = '<img src="/foto.jpg" alt="Foto"><figcaption>Legenda individual</figcaption>';
    body.append(figure);
    const galleryCaption = document.querySelector("[data-gallery-caption]")!;
    const read = (element: Element) => {
      const style = getComputedStyle(element);
      return { color: style.color, fontSize: style.fontSize, textAlign: style.textAlign, marginTop: style.marginTop };
    };
    return { single: read(figure.querySelector("figcaption")!), gallery: read(galleryCaption) };
  });
  expect(captions.single).toEqual(captions.gallery);
});

test("preserva legendas opcionais de fotos no editor e nas biografias", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate((source) => {
    let component: any;
    (window as any).CMS = { registerEditorComponent: (definition: any) => { component = definition; } };
    new Function(source)();
    const data = { title: "Galeria", images: [{ src: "/foto.jpg", alt: "Altar", caption: 'Foto "histórica" & especial' }, { src: "/outra.jpg", alt: "Pessoas" }] };
    const block = component.toBlock(data);
    return { block, parsed: component.fromBlock(component.pattern.exec(block)), fields: component.fields };
  }, readFileSync("public/admin/gallery-editor.js", "utf8"));
  expect(result.block).toContain('data-caption="Foto &quot;histórica&quot; &amp; especial"');
  expect(result.parsed.images).toEqual([{ src: "/foto.jpg", alt: "Altar", caption: 'Foto "histórica" & especial' }, { src: "/outra.jpg", alt: "Pessoas" }]);
  expect(result.fields.find((field: any) => field.name === "images").fields.find((field: any) => field.name === "caption").required).toBe(false);
  expect(renderBiographyMarkdown(result.block)).toContain(result.block);
  expect(renderBiographyMarkdown('<figure data-content-gallery="true"><div><img src="javascript:alert(1)" alt="x" loading="lazy" data-caption="teste"></div></figure>')).not.toContain('<img src="javascript:');
});

test("mostra a legenda da foto atual dentro e fora da ampliação", async ({ page }) => {
  await page.route("**/pages/history", async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    html = html.replace('alt="Pequena capela de madeira com uma cruz na fachada, em terreno aberto."', '$& data-caption="Legenda da capela"');
    html = html.replace('alt="Grupo de crianças e adultos reunido diante de uma construção de madeira."', '$& data-caption="Legenda da comunidade"');
    html = html.replace(/(alt="Grupo de adultos e crianças diante da casa paroquial\."[^>]*?) data-caption="[^"]*"/, "$1");
    await route.fulfill({ response, body: html });
  });
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const caption = gallery.locator("[data-gallery-caption]");
  await expect(caption).toHaveText("Legenda da capela");
  await gallery.getByRole("button", { name: "Próxima foto" }).click();
  await expect(caption).toHaveText("Legenda da comunidade");
  await gallery.getByRole("button", { name: /ampliar foto/i }).click();
  const dialog = page.getByRole("dialog", { name: "Foto ampliada" });
  await expect(dialog.locator("[data-gallery-caption]")).toHaveText("Legenda da comunidade");
  await dialog.getByRole("button", { name: "Próxima foto" }).click();
  await expect(dialog.locator("[data-gallery-caption]")).toBeHidden();
  await dialog.getByRole("button", { name: "Foto anterior" }).click();
  await expect(dialog.locator("[data-gallery-caption]")).toHaveText("Legenda da comunidade");
  await page.keyboard.press("Escape");
  await expect(caption).toHaveText("Legenda da comunidade");
});

test("a página com galerias não ultrapassa a largura visível", async ({ page }) => {
  await page.goto("/pages/history");
  const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.visualViewport!.width }));
  expect(dimensions.content).toBeLessThanOrEqual(Math.ceil(dimensions.viewport));
});

test("navega pela galeria, amplia a imagem e respeita os limites", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const previous = gallery.getByRole("button", { name: "Foto anterior" });
  const next = gallery.getByRole("button", { name: "Próxima foto" });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(gallery.getByRole("status")).toHaveText("Foto 1 de 3");
  await expect(gallery.locator("img:visible")).toHaveCount(1);
  await next.click();
  await expect(gallery.getByRole("status")).toHaveText("Foto 2 de 3");
  await gallery.getByRole("button", { name: /ampliar foto/i }).click();
  const modal = page.getByRole("dialog", { name: "Foto ampliada" });
  await expect(modal).toBeVisible();
  await expect(modal.locator("img")).toHaveAttribute("alt", /Grupo de crianças/);
  const audit = await new AxeBuilder({ page }).include(".gallery-dialog[open]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("ArrowRight");
  await expect(modal.getByRole("button", { name: "Próxima foto" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(gallery.getByRole("button", { name: /ampliar foto/i })).toBeFocused();
  await expect(gallery.getByRole("status")).toHaveText("Foto 3 de 3");
  await expect(next).toBeDisabled();
});

test("navega por gesto de toque e pelos indicadores", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const imageButton = gallery.getByRole("button", { name: /ampliar foto/i });
  await imageButton.evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 250, clientY: 100 });
    const end = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 105 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(gallery.getByRole("status")).toHaveText("Foto 2 de 3");
  await gallery.getByRole("button", { name: "Ir para foto 1" }).click();
  await expect(gallery.getByRole("status")).toHaveText("Foto 1 de 3");
});

test("a foto acompanha o dedo e revela a próxima antes de soltar", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const button = gallery.getByRole("button", { name: /ampliar foto/i });
  const before = await button.locator("img:visible").first().boundingBox();
  await button.evaluate((element) => {
    const touch = (x: number) => new Touch({ identifier: 1, target: element, clientX: x, clientY: 100 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(250)] }));
    element.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(170)] }));
  });
  const after = await button.locator("img:visible").first().boundingBox();
  expect(after!.x).toBeLessThan(before!.x - 30);
  await expect(button.locator('[data-gallery-drag-preview]')).toBeVisible();
  await expect(gallery.getByRole("status")).toHaveText("Foto 1 de 3");
  await button.evaluate((element) => {
    const end = new Touch({ identifier: 1, target: element, clientX: 170, clientY: 100 });
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(gallery.getByRole("status")).toHaveText("Foto 2 de 3");
});

test("arraste curto retorna à foto e a foto ampliada também acompanha o dedo", async ({ page }) => {
  await page.goto("/pages/history");
  const gallery = page.locator('[data-content-gallery="true"]').first();
  const button = gallery.getByRole("button", { name: /ampliar foto/i });
  const gesture = async (locator: typeof button, start: number, end: number, finish: boolean) => {
    await locator.evaluate((element, { start, end, finish }) => {
      const touch = (x: number) => new Touch({ identifier: 1, target: element, clientX: x, clientY: 100 });
      element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(start)] }));
      element.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(end)] }));
      if (finish) element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(end)] }));
    }, { start, end, finish });
  };
  await gesture(button, 250, 230, true);
  await expect(gallery.getByRole("status")).toHaveText("Foto 1 de 3");
  await expect(button.locator('[data-gallery-drag-preview]')).toHaveCount(0);
  await page.waitForTimeout(450);
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Foto ampliada" });
  const viewport = dialog.locator(".gallery-dialog-viewport");
  const before = await viewport.locator("img").first().boundingBox();
  await gesture(viewport, 250, 160, false);
  const during = await viewport.locator("img").first().boundingBox();
  expect(during!.x).toBeLessThan(before!.x - 30);
  await expect(viewport.locator('[data-gallery-drag-preview]')).toBeVisible();
  await viewport.dispatchEvent("touchcancel");
  await expect(viewport.locator('[data-gallery-drag-preview]')).toHaveCount(0);
  await expect(dialog.getByRole("status")).toHaveText("Foto 1 de 3");
});

test("mantém as galerias independentes e oferece conteúdo sem JavaScript", async ({ page, browser }) => {
  await page.goto("/pages/history");
  const galleries = page.locator('[data-content-gallery="true"]');
  await galleries.nth(0).getByRole("button", { name: "Próxima foto" }).click();
  await expect(galleries.nth(0).getByRole("status")).toHaveText("Foto 2 de 3");
  await expect(galleries.nth(1).getByRole("status")).toHaveText("Foto 1 de 4");
  const audit = await new AxeBuilder({ page }).include("[data-content-gallery]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations).toEqual([]);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noScript = await context.newPage();
  await noScript.goto("/pages/history");
  await expect(noScript.locator('[data-content-gallery="true"]').first().locator("img:visible")).toHaveCount(3);
  await context.close();
});

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
    linkFixtureDependencies(fixture);
    const astroConfig = path.join(fixture, "astro.config.mjs");
    writeFileSync(astroConfig, readFileSync(astroConfig, "utf8").replace("vite: { plugins:", 'vite: { cacheDir: "./.vite-cache", plugins:'));
    const gallery = '<figure data-content-gallery="true"><div><img src="https://example.org/1.jpg" alt="Pessoas reunidas" data-caption="Primeira legenda"><img src="https://example.org/2.jpg" alt="Altar"></div><figcaption>Celebração</figcaption></figure>';
    const body = `Antes.\n\n![Imagem única](https://example.org/unica.jpg)\n\n${gallery}\n\nDepois.`;
    writeFileSync(path.join(fixture, "src/content/news/galeria-teste.md"), `---\ntitle: Galeria teste\ndate: 2026-11-01\nstatus: published\n---\n${body}\n`);
    writeFileSync(path.join(fixture, "src/content/programs/galeria-teste.md"), `---\nname: Atividade teste\ndescription: Descrição\nimages:\n  - https://example.org/destaque.jpg\n---\n${body}\n`);
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    for (const route of ["news/galeria-teste", "programs/galeria-teste"]) {
      const html = readFileSync(path.join(fixture, `dist/${route}/index.html`), "utf8");
      expect(html).toContain('data-content-gallery="true"');
      expect(html).toContain('alt="Pessoas reunidas"');
      expect(html).toContain('data-caption="Primeira legenda"');
      expect(html).toContain('alt="Imagem única"');
      expect(html.indexOf("Antes.")).toBeLessThan(html.indexOf("data-content-gallery"));
      expect(html.indexOf("data-content-gallery")).toBeLessThan(html.indexOf("Depois."));
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
