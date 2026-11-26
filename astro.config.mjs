import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, memoryCache } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const BASE_URL = process.env.PUBLIC_SITE_URL ?? "https://catedralanglicanabrasilia.org.br";
function includeInSitemap(page) {
  const pathname = new URL(page).pathname;
  if (pathname === "/admin/") return false;
  const match = pathname.match(/^\/board-members\/(.+?)\/?$/);
  if (!match) return true;
  try {
    const id = decodeURIComponent(match[1]);
    if (id.split("/").some((part) => part === ".." || part === ".")) return false;
    const content = readFileSync(new URL(`./src/content/board-members/${id}.md`, import.meta.url), "utf8");
    const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    const data = frontmatter ? parse(frontmatter[1]) : {};
    return data.indexable === true && data.is_active !== false;
  } catch {
    return false;
  }
}

function contentLastModified(page) {
  const parts = new URL(page).pathname.split("/").filter(Boolean);
  const folders = { news: "news", events: "events", pages: "pages", programs: "programs", locations: "locations", reverends: "reverends", authors: "authors", "board-members": "board-members" };
  if (parts.length !== 2 || !Object.hasOwn(folders, parts[0]) || !/^[a-zA-Z0-9_-]+$/.test(parts[1])) return undefined;
  try {
    const content = readFileSync(new URL(`./src/content/${folders[parts[0]]}/${parts[1]}.md`, import.meta.url), "utf8");
    const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    const data = frontmatter && parse(frontmatter[1]);
    const value = data && (data.updated_at || (parts[0] === "news" ? data.date : undefined));
    if (!value) return undefined;
    if (typeof value === "string" && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch { return undefined; }
}

export default defineConfig({
  site: BASE_URL,
  vite: { plugins: [tailwindcss()] },
  integrations: [
		mdx(),
		sitemap({
			filter: includeInSitemap,
			serialize: (item) => ({ ...item, ...(contentLastModified(item.url) ? { lastmod: contentLastModified(item.url) } : {}) }),
			customSitemaps: [new URL("/sitemap-news.xml", BASE_URL).href, new URL("/sitemap-images.xml", BASE_URL).href],
		})
	],
  cache: {
    provider: memoryCache()
  },
  image: {
    // As imagens do CDN da Catedral são entregues diretamente, sem download no build.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.dab.org.br"
      }
  ],
  }
});
