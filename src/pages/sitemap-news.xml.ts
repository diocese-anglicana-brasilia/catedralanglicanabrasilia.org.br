import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { newsSitemap } from "../utils/sitemap-content";
export async function GET({ site }: APIContext) {
  if (!site) throw new Error("Configure o endereço do site.");
  return new Response(newsSitemap(await getCollection("news"), site.href), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
