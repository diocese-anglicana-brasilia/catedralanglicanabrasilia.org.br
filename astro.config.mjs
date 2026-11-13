import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, memoryCache } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const BASE_URL = process.env.PUBLIC_SITE_URL ?? "https://catedralanglicanabrasilia.org.br";

export default defineConfig({
  site: BASE_URL,
  vite: { plugins: [tailwindcss()] },
  integrations: [
		mdx(),
		sitemap({
			filter: (page) => page !== `${BASE_URL}/admin/`,
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
