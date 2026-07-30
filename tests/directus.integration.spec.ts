import { expect, test } from "@playwright/test";
import process from "node:process";

const endpoint = process.env.DIRECTUS_CONTACT_ENDPOINT;
const siteOrigin = process.env.DIRECTUS_SITE_ORIGIN ?? "http://localhost:4321";

test.skip(
  !process.env.RUN_DIRECTUS_INTEGRATION_TESTS || !endpoint,
  "Defina RUN_DIRECTUS_INTEGRATION_TESTS e DIRECTUS_CONTACT_ENDPOINT para executar esta verificação.",
);

test("o webhook do Directus aceita o preflight do site", async ({ request }) => {
  const response = await request.fetch(endpoint!, {
    method: "OPTIONS",
    headers: {
      Origin: siteOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  expect(response.status()).toBe(204);
  expect(response.headers()["access-control-allow-methods"]?.toUpperCase()).toContain("POST");
  expect([siteOrigin, "*"]).toContain(response.headers()["access-control-allow-origin"]);
});
