import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

test("todos os conteúdos do CMS recebem data automática de atualização", () => {
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  for (const collection of config.collections) {
    for (const entry of collection.files || [collection]) {
      expect(entry.fields.find((field: { name: string }) => field.name === "updated_at"), `${collection.name}/${entry.name}`).toMatchObject({ widget: "datetime", auto_now: true });
    }
  }
});

test("atualização é mostrada apenas quando diferente da publicação", async () => {
  const { showNewsUpdate } = await import("../src/utils/news-date");
  const published = new Date("2026-11-20T12:00:00Z");
  expect(showNewsUpdate(published, undefined)).toBe(false);
  expect(showNewsUpdate(published, new Date(published))).toBe(false);
  expect(showNewsUpdate(published, new Date("2026-11-21T12:00:00Z"))).toBe(true);
});
