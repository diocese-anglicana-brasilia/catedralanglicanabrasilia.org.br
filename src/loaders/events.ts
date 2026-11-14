import { glob } from "astro/loaders";
import type { Loader } from "astro/loaders";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

// O parser padrão converte timestamps YAML em Date antes da validação e perde o fuso original.
export function eventsLoader(): Loader {
  const loader = glob({ pattern: "**/*.md", base: "./src/content/events" });
  return {
    name: "events-brasilia-loader",
    async load(context) {
      await loader.load({
        ...context,
        async parseData(options) {
          if (!options.filePath) return context.parseData(options);
          const source = await readFile(options.filePath, "utf8");
          const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
          const raw = frontmatter ? parse(frontmatter[1]) : {};
          return context.parseData({ ...options, data: { ...options.data, start_date: raw?.start_date, end_date: raw?.end_date } });
        },
      });
    },
  };
}
