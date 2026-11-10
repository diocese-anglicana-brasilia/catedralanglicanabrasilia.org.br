import { expect, test } from "@playwright/test";
import { parseGeometry, publicHttpUrl } from "../src/utils/geometry";

test("valida pontos e polígonos GeoJSON e rejeita dados inválidos", () => {
  expect(parseGeometry('{"type":"Point","coordinates":[-47.9,-15.8]}', "Point"))
    .toEqual({ type: "Point", coordinates: [-47.9, -15.8] });
  expect(parseGeometry('{"type":"Polygon","coordinates":[[[-48,-16],[-47,-16],[-47,-15],[-48,-16]]]}', "Polygon")?.type)
    .toBe("Polygon");
  expect(parseGeometry('{"type":"Point","coordinates":[200,0]}', "Point")).toBeNull();
  expect(parseGeometry('{"type":"Point","coordinates":[0,0]}', "Polygon")).toBeNull();
  expect(parseGeometry('{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1]]]}', "Polygon")).toBeNull();
  expect(parseGeometry("não é JSON", "Point")).toBeNull();
  expect(parseGeometry(null, "Point")).toBeNull();
});

test("aceita apenas links web válidos para locais online", () => {
  expect(publicHttpUrl("https://example.com/reuniao")).toBe("https://example.com/reuniao");
  expect(publicHttpUrl("javascript:alert(1)")).toBeNull();
  expect(publicHttpUrl("não é uma URL")).toBeNull();
});

test("abre o endereço físico e carrega seu mapa", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/locations/");
  await expect(page.getByRole("heading", { level: 1, name: "Endereços" })).toBeVisible();
  await expect(page.getByText("EQS 309/310, Asa Sul — Brasília")).toBeVisible();
  const map = page.getByRole("region", { name: "Mapa do endereço" });
  await expect(map).toHaveClass(/leaflet-container/);
  await expect(map.locator(".leaflet-interactive")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Abrir endereço no OpenStreetMap/ })).toHaveAttribute("href", /mlat=-15\.817964&mlon=-47\.9091572/);
  await page.getByRole("link", { name: "Catedral Anglicana da Ressurreição" }).click();
  await expect(page.getByRole("region", { name: "Mapa do endereço" })).toHaveClass(/leaflet-container/);
});

test("inicializa um segundo mapa com a região poligonal", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.route("**/locations/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const polygon = JSON.stringify({
      type: "Polygon",
      coordinates: [[[-47.92, -15.82], [-47.90, -15.82], [-47.90, -15.80], [-47.92, -15.82]]],
    });
    const fixture = `<div class="location-map" role="region" aria-label="Mapa da região" data-geometry='${polygon}' style="width: 400px; height: 300px"></div>`;
    await route.fulfill({ response, body: html.replace("</body>", `${fixture}</body>`) });
  });
  await page.goto("/locations/");
  await expect(page.getByRole("region", { name: "Mapa do endereço" })).toHaveClass(/leaflet-container/);
  const region = page.getByRole("region", { name: "Mapa da região" });
  await expect(region).toHaveClass(/leaflet-container/);
  await expect(region.locator(".leaflet-interactive")).toHaveCount(1);
});
