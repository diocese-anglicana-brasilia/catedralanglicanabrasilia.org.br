import { mkdirSync, readdirSync, symlinkSync } from "node:fs";
import path from "node:path";

// Compartilha os pacotes instalados, mas não o diretório de cache do Astro.
export function linkFixtureDependencies(fixture) {
  const source = path.resolve("node_modules");
  const target = path.join(fixture, "node_modules");
  mkdirSync(target);
  for (const name of readdirSync(source)) {
    if (name === ".astro" || name === ".vite") continue;
    symlinkSync(path.join(source, name), path.join(target, name));
  }
}
