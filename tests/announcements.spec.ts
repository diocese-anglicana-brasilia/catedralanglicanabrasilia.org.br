import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";
import AxeBuilder from "@axe-core/playwright";
import { parse } from "yaml";

test("o CMS oferece avisos sem bloquear o site", () => {
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  const collection = config.collections.find((item: { name: string }) => item.name === "announcements");
  expect(collection).toBeDefined();
  expect(collection.fields.find((item: { name: string }) => item.name === "type").options).toEqual([
    { label: "Barra no topo", value: "banner" }, { label: "Janela modal", value: "modal" },
  ]);
});

test("exibe barra e modal, permite dispensar e mantém a escolha na sessão", async ({ page }) => {
  test.setTimeout(90000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-avisos-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    const dir = path.join(fixture, "src/content/announcements");
    writeFileSync(path.join(dir, "barra.md"), '---\ntitle: Aviso de culto\nmessage: Horário especial\ntype: banner\nstatus: published\npriority: 2\ndismiss: session\n---\n');
    writeFileSync(path.join(dir, "modal.md"), '---\ntitle: Comunicado importante\nmessage: Informação para a comunidade\ntype: modal\nstatus: published\ndismiss: session\n---\n');
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    await page.route("http://avisos.test/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(fixture, "dist", pathname === "/" ? "index.html" : pathname.endsWith("/") ? `${pathname}index.html` : pathname);
      try { await route.fulfill({ path: file }); } catch { await route.fulfill({ status: 404 }); }
    });
    await page.goto("http://avisos.test/");
    const banner = page.locator("[data-announcement-banner]");
    const dialog = page.getByRole("dialog", { name: "Comunicado importante" });
    await expect(banner).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Fechar" })).toBeFocused();
    const audit = await new AxeBuilder({ page }).include("[data-announcement-dialog]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await banner.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(dialog).toBeHidden();
    await expect(banner).toBeHidden();
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("seleciona avisos publicados, dentro do período e da página, pela prioridade", async () => {
  const { selectAnnouncements } = await import("../src/utils/announcements.mjs");
  const now = Date.parse("2026-11-21T12:00:00Z");
  const base = { status: "published", start: null, end: null, paths: [], priority: 0 };
  const notices = [
    { ...base, id: "draft", type: "banner", status: "draft", priority: 100 },
    { ...base, id: "future", type: "banner", start: "2026-11-22T00:00:00Z", priority: 100 },
    { ...base, id: "expired", type: "banner", end: "2026-11-21T12:00:00Z", priority: 100 },
    { ...base, id: "other", type: "banner", paths: ["/news"], priority: 100 },
    { ...base, id: "lower", type: "banner", priority: 1 },
    { ...base, id: "top", type: "banner", paths: ["/pages/about/"], priority: 2 },
    { ...base, id: "modal", type: "modal", priority: 1 },
  ];
  expect(selectAnnouncements(notices, "/pages/about", now).map((item: { id: string }) => item.id)).toEqual(["top", "modal"]);
});
