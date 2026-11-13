import type { CollectionEntry } from "astro:content";
import { parseGeometry, publicHttpUrl } from "./geometry";

export function locationData(entry: CollectionEntry<"locations">, siteUrl: string) {
  const { name, address, city, map_location } = entry.data;
  const point = parseGeometry(map_location, "Point");
  return {
    "@type": "Place",
    "@id": new URL(`/locations/${entry.id}#local`, siteUrl).href,
    name,
    url: new URL(`/locations/${entry.id}`, siteUrl).href,
    ...(address || city ? { address: { "@type": "PostalAddress", ...(address && { streetAddress: address }), ...(city && { addressLocality: city }) } } : {}),
    ...(point?.type === "Point" ? { geo: { "@type": "GeoCoordinates", latitude: point.coordinates[1], longitude: point.coordinates[0] } } : {}),
  };
}

export function eventLocationData(entry: CollectionEntry<"locations">, siteUrl: string) {
  const { address, city, map_location, online_url } = entry.data;
  const online = publicHttpUrl(online_url);
  const physical = Boolean(address || city || parseGeometry(map_location, "Point"));
  const locations = [
    ...(physical ? [locationData(entry, siteUrl)] : []),
    ...(online ? [{ "@type": "VirtualLocation", url: online }] : []),
  ];
  return locations.length === 1 ? locations[0] : locations.length ? locations : undefined;
}
