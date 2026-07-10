/** Shared geometry helpers for place ingest scripts. */

export type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

export function ring(lng: number, lat: number, r: number, n = 24): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    coords.push([
      +(lng + r * Math.cos(a)).toFixed(5),
      +(lat + r * 0.75 * Math.sin(a)).toFixed(5),
    ]);
  }
  return coords;
}

function perpDist(p: number[], a: number[], b: number[]): number {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

export function simplifyRing(points: number[][], tolerance: number): number[][] {
  if (points.length <= 4) return points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i]!, first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplifyRing(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyRing(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function roundCoord(c: number): number {
  return Math.round(c * 1e5) / 1e5;
}

export function simplifyGeometry(
  geometry: GeoFeature["geometry"],
  tolerance = 0.004,
): GeoFeature["geometry"] {
  if (geometry.type === "Polygon") {
    const rings = (geometry.coordinates as number[][][]).map((ringCoords) => {
      const simplified = simplifyRing(ringCoords, tolerance).map((p) => [
        roundCoord(p[0]!),
        roundCoord(p[1]!),
      ]);
      const a = simplified[0]!;
      const b = simplified[simplified.length - 1]!;
      if (a[0] !== b[0] || a[1] !== b[1]) simplified.push([...a]);
      return simplified.length >= 4
        ? simplified
        : ringCoords.map((p) => [roundCoord(p[0]!), roundCoord(p[1]!)]);
    });
    return { type: "Polygon", coordinates: rings };
  }

  const polys = (geometry.coordinates as number[][][][]).map((poly) =>
    poly.map((ringCoords) => {
      const simplified = simplifyRing(ringCoords, tolerance).map((p) => [
        roundCoord(p[0]!),
        roundCoord(p[1]!),
      ]);
      const a = simplified[0]!;
      const b = simplified[simplified.length - 1]!;
      if (a[0] !== b[0] || a[1] !== b[1]) simplified.push([...a]);
      return simplified.length >= 4
        ? simplified
        : ringCoords.map((p) => [roundCoord(p[0]!), roundCoord(p[1]!)]);
    }),
  );
  return { type: "MultiPolygon", coordinates: polys };
}

export function featureBBox(geometry: GeoFeature["geometry"]): {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
} {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;

  const visit = (coords: number[] | number[][] | number[][][] | number[][][][]) => {
    if (typeof coords[0] === "number") {
      const c = coords as number[];
      xmin = Math.min(xmin, c[0]!);
      ymin = Math.min(ymin, c[1]!);
      xmax = Math.max(xmax, c[0]!);
      ymax = Math.max(ymax, c[1]!);
      return;
    }
    for (const child of coords as unknown[]) {
      visit(child as number[] | number[][] | number[][][] | number[][][][]);
    }
  };

  visit(geometry.coordinates);
  return { xmin, ymin, xmax, ymax };
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Deterministic 0–1 hash from string. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}
