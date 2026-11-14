import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { parseEventTime } from "../src/utils/event-time";

test("respeita o fuso histórico de Brasília e offsets explícitos", () => {
  expect((parseEventTime("2018-01-10T12:00:00") as Date).toISOString()).toBe("2018-01-10T14:00:00.000Z");
  expect(new Date(parseEventTime("2026-12-06T10:00:00-03:00") as string).toISOString()).toBe("2026-12-06T13:00:00.000Z");
});

test("interpreta horários sem fuso como Brasília e preserva fusos explícitos", { tag: "@desktop" }, () => {
  test.setTimeout(90_000);
  const fixture = mkdtempSync(path.join(tmpdir(), "catedral-fuso-"));
  try {
    for (const name of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) cpSync(path.resolve(name), path.join(fixture, name), { recursive: true });
    symlinkSync(path.resolve("node_modules"), path.join(fixture, "node_modules"), "dir");
    const events = path.join(fixture, "src/content/events");
    writeFileSync(path.join(events, "fuso-local.md"), "---\nname: Horário de Brasília\nstart_date: 2026-12-06T10:00:00\nend_date: 2026-12-06T12:30:00\n---\n");
    writeFileSync(path.join(events, "fuso-explicito.md"), "---\nname: Fuso explícito\nstart_date: 2026-12-06T13:00:00Z\nend_date: 2026-12-06T12:30:00-03:00\n---\n");
    writeFileSync(path.join(events, "fuso-meia-noite.md"), "---\nname: Depois da meia-noite\nstart_date: 2026-12-06T00:30:00\n---\n");
    for (const timezone of ["UTC", "America/New_York"]) {
      execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: fixture, stdio: "pipe", env: { ...process.env, TZ: timezone } });
      for (const id of ["fuso-local", "fuso-explicito"]) {
        const html = readFileSync(path.join(fixture, `dist/events/${id}/index.html`), "utf8");
        const ics = readFileSync(path.join(fixture, `dist/events/${id}.ics`), "utf8");
        expect(html).toContain("10:00");
        expect(html).toContain("12:30");
        expect(html).toContain("2026-12-06T13:00:00.000Z");
        expect(html).toContain("2026-12-06T15:30:00.000Z");
        expect(ics).toContain("DTSTART:20261206T130000Z");
        expect(ics).toContain("DTEND:20261206T153000Z");
        expect(html).toContain("dates=20261206T130000Z%2F20261206T153000Z");
      }
      const midnight = readFileSync(path.join(fixture, "dist/events/fuso-meia-noite/index.html"), "utf8");
      expect(midnight).toContain("06/12/2026");
      expect(midnight).toContain("00:30");
      expect(midnight).toContain("2026-12-06T03:30:00.000Z");
      const calendar = readFileSync(path.join(fixture, "dist/events/index.html"), "utf8");
      expect(calendar).toContain('"start":"2026-12-06T03:30:00.000Z"');
    }
    const config = parse(readFileSync(path.join(fixture, "public/admin/config.yml"), "utf8"));
    const eventsConfig = config.collections.find((collection: { name: string }) => collection.name === "events");
    for (const name of ["start_date", "end_date"]) expect(eventsConfig.fields.find((field: { name: string }) => field.name === name).input_timezone).toBe("America/Sao_Paulo");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
