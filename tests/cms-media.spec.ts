import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

test("o CMS usa o R2 sem habilitar armazenamento de mídia no Git", () => {
  const config = parse(readFileSync("public/admin/config.yml", "utf8"));
  expect(config.media_libraries.cloudflare_r2).toMatchObject({
    bucket: "dab-site-catedral",
    public_url: "https://cdn.catedralanglicanabrasilia.org.br",
  });
  expect(config).not.toHaveProperty("media_folder");
  expect(config).not.toHaveProperty("public_folder");
  expect(config.media_libraries).not.toHaveProperty("default");
  const findMediaFolders = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, child]) => key === "media_folder" || findMediaFolders(child));
  };
  expect(findMediaFolders(config.collections)).toBe(false);
});
