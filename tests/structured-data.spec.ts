import { expect, test } from "@playwright/test";

async function dataAt(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  return JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
}

test("representa a organização, sua sede e a hierarquia na página inicial", async ({ page }) => {
  const data = await dataAt(page, "/");
  const org = data["@graph"].find((x: any) => x["@id"]?.endsWith("#catedral"));
  const location = data["@graph"].find((x: any) => x["@id"]?.endsWith("#local"));
  expect(org).toMatchObject({ "@type": "Organization", name: "Catedral Anglicana da Ressurreição", parentOrganization: { "@id": expect.stringContaining("#diocese") }, location: { "@id": location["@id"] } });
  expect(location).toMatchObject({ "@type": "Church", address: { "@type": "PostalAddress", streetAddress: "EQS 309/310, Asa Sul", addressLocality: "Brasília" }, geo: { "@type": "GeoCoordinates", latitude: -15.817964, longitude: -47.9091572 } });
  expect(JSON.stringify(data)).not.toContain("ReligiousOrganization");
});

test("descreve notícias, eventos, locais e páginas com tipos adequados", async ({ page }) => {
  const news = await dataAt(page, "/news/2026-11-11-reverendissima-tatiana-ribeiro-e-reconduzida-para-um-novo-mandato-a-frente-da-catedral-anglicana-de-brasilia");
  expect(news).toMatchObject({ "@type": "NewsArticle", headline: expect.stringContaining("Tatiana Ribeiro"), datePublished: expect.any(String), publisher: { "@type": "Organization" }, image: expect.stringContaining("20261113-8be6b98bcc30.webp") });
  const event = await dataAt(page, "/events/reconducao-da-rev-tati-como-dea-da-catedral");
  expect(event).toMatchObject({ "@type": "Event", name: expect.stringContaining("Recondução"), startDate: expect.any(String), endDate: expect.any(String), location: { "@type": "Place", name: "Catedral Anglicana da Ressurreição", address: { "@type": "PostalAddress" } } });
  const location = await dataAt(page, "/locations/catedral-anglicana-da-ressurreicao");
  expect(location).toMatchObject({ "@type": "Place", name: "Catedral Anglicana da Ressurreição", geo: { latitude: -15.817964, longitude: -47.9091572 } });
  const other = await dataAt(page, "/pages/about");
  expect(other).toMatchObject({ "@type": "WebPage", name: expect.stringContaining("Sobre"), inLanguage: "pt-BR" });
});
