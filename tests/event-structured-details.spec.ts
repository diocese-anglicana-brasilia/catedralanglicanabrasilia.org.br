import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { linkFixtureDependencies } from "./fixture-dependencies.mjs";

test("dados recomendados de eventos são opcionais e refletem apenas informações cadastradas", async () => {
  const { eventStructuredDetails } = await import("../src/utils/event-structured-details");
  expect(eventStructuredDetails({})).toEqual({});
  expect(eventStructuredDetails({ performer_name: "Coral" })).not.toHaveProperty("performer");
  expect(eventStructuredDetails({ event_status: "cancelled", image: "https://example.org/cartaz.webp", organizer_name: "Comunidade", organizer_url: "https://example.org/", performer_name: "Coral", performer_type: "PerformingGroup", admission_price: 0 })).toEqual({
    eventStatus: "https://schema.org/EventCancelled",
    image: "https://example.org/cartaz.webp",
    organizer: { "@type": "Organization", name: "Comunidade", url: "https://example.org/" },
    performer: { "@type": "PerformingGroup", name: "Coral" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
  });
});

test("publica informações cadastradas na página e no JSON-LD", { tag: "@desktop" }, () => {
  test.setTimeout(90000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-evento-jsonld-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    linkFixtureDependencies(fixture);
    writeFileSync(path.join(fixture, "src/content/events/evento-teste-jsonld.md"), '---\nname: Evento teste\nstart_date: 2099-11-28T14:00:00-03:00\nfeatured_image: https://example.org/cartaz.webp\norganizer_name: Comunidade\norganizer_url: https://example.org/\nperformer_name: Coral\nperformer_type: PerformingGroup\nadmission_price: 0\n---\n');
    execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe" });
    const html = readFileSync(path.join(fixture, "dist/events/evento-teste-jsonld/index.html"), "utf8");
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]);
    expect(json).toMatchObject({ eventStatus: "https://schema.org/EventScheduled", image: "https://example.org/cartaz.webp", organizer: { name: "Comunidade" }, performer: { name: "Coral" }, offers: { price: 0, priceCurrency: "BRL" } });
    expect(html).toContain('property="og:image" content="https://example.org/cartaz.webp"');
    expect(html).not.toContain('<img src="https://example.org/cartaz.webp"');
    const eventDir = path.join(fixture, "dist/events");
    const listings = ["index.html", ...readdirSync(path.join(eventDir, "pagina"), { recursive: true }).map(String).filter((name) => name.endsWith("index.html")).map((name) => path.join("pagina", name))];
    expect(listings.some((name) => readFileSync(path.join(eventDir, name), "utf8").includes('src="https://example.org/cartaz.webp"'))).toBe(true);
    expect(html).toContain("Agendado");
    expect(html).toContain("Gratuita");
    expect(html).toContain("Comunidade");
    expect(html).toContain("Coral");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
