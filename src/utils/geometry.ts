type Position = [number, number] | [number, number, number];
export type MapGeometry =
  | { type: "Point"; coordinates: Position }
  | { type: "Polygon"; coordinates: Position[][] };

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && (value.length === 2 || value.length === 3)
    && value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
    && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

export function parseGeometry(raw: string | null | undefined, expected: "Point" | "Polygon"): MapGeometry | null {
  if (!raw) return null;
  try {
    const geometry: unknown = JSON.parse(raw);
    if (!geometry || typeof geometry !== "object" || !("type" in geometry) || !("coordinates" in geometry)) return null;
    if (geometry.type !== expected) return null;
    if (geometry.type === "Point" && isPosition(geometry.coordinates)) {
      return { type: "Point", coordinates: geometry.coordinates };
    }
    if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0
      && geometry.coordinates.every((ring: unknown) => Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition)
        && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1])) {
      return { type: "Polygon", coordinates: geometry.coordinates };
    }
    return null;
  } catch {
    return null;
  }
}

export function publicHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
