import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const distDirectory = path.resolve(process.cwd(), "dist");

const extractAttributes = (html: string, attribute: "href" | "src") =>
  Array.from(html.matchAll(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "g")), (match) => match[1]);

const extractResourceUrls = (html: string) =>
  Array.from(
    html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:href|src)=["']([^"']+)["']/g),
    (match) => match[1],
  );

const localAssetPath = (url: string) => {
  const pathname = url.split(/[?#]/, 1)[0];
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;

  return path.join(distDirectory, pathname);
};

test("gera os arquivos públicos de rastreamento", async () => {
  const [robots, sitemap] = await Promise.all([
    readFile(path.join(distDirectory, "robots.txt"), "utf8"),
    readFile(path.join(distDirectory, "sitemap.xml"), "utf8"),
  ]);

  expect(robots).toContain("Sitemap: https://catedralanglicanabrasilia.org.br/sitemap.xml");
  expect(sitemap).toContain("https://catedralanglicanabrasilia.org.br/");
});

test("não gera referências quebradas para arquivos internos", async () => {
  const indexHtml = await readFile(path.join(distDirectory, "index.html"), "utf8");
  const localAssets = extractResourceUrls(indexHtml)
    .map(localAssetPath)
    .filter((assetPath): assetPath is string => Boolean(assetPath));

  expect(localAssets).not.toEqual([]);
  await Promise.all(localAssets.map((assetPath) => expect(access(assetPath)).resolves.toBeUndefined()));
});

test("mantém âncoras apontando para seções geradas", async () => {
  const indexHtml = await readFile(path.join(distDirectory, "index.html"), "utf8");
  const ids = new Set(
    Array.from(indexHtml.matchAll(/\bid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g), (match) =>
      match[1] ?? match[2] ?? match[3],
    ),
  );
  const anchors = extractAttributes(indexHtml, "href").filter(
    (href) => href.startsWith("#") && href.length > 1,
  );

  expect(anchors).not.toEqual([]);
  expect(anchors.filter((anchor) => !ids.has(anchor.slice(1)))).toEqual([]);
});
