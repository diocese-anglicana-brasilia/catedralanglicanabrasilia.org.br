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

export default defineConfig({
  site: BASE_URL,
  vite: { plugins: [tailwindcss()] },
  integrations: [
		mdx(),
		sitemap({
			filter: includeInSitemap,
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
