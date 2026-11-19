import { spawnSync } from "node:child_process";

// A suíte usa um build isolado de credenciais e serviços reais; os testes de
// envio interceptam as requisições e fornecem seus próprios dados.
const result = spawnSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], {
  stdio: "inherit",
  env: { ...process.env, PUBLIC_CONTACT_API_URL: "", PUBLIC_PRAYER_API_URL: "", PUBLIC_TURNSTILE_SITE_KEY: "" },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
