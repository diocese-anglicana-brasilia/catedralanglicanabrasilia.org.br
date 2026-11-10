import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, memoryCache } from "astro/config";

const BASE_URL = process.env.PUBLIC_SITE_URL ?? "https://catedralanglicanabrasilia.org.br";

export default defineConfig({
  site: BASE_URL,
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.catedralanglicanabrasilia.org.br"
      },
      {
        protocol: "https",
        hostname: "**.dab.org.br"
      }
  ],
  }
});
