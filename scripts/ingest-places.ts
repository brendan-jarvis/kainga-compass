/**
 * Build-time places ingest for Kāinga Compass.
 *
 * - Validates places.json fixtures
 * - Downloads official Stats NZ boundaries (cached under scripts/cache/):
 *     • Territorial Authority 2023 — district view
 *     • Urban Rural Areas 2023 — city/town view
 * - Filters to MVP slugs, simplifies polygons, writes boundaries.json
 *
 * Sources (Stats NZ ArcGIS FeatureServer, public):
 *   https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Territorial_Authority_2023/FeatureServer
 *   https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Urban_Rural_Areas_2023/FeatureServer
 *
 * Usage:
 *   bun run ingest:places
 *   bun run ingest:places -- --force-download   # refresh cache
 *   bun run ingest:places -- --fallback-only    # circles only (offline)
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import places from "../src/data/places/places.json";
import type { Territory } from "../src/lib/places/types";

const OUT_DIR = path.join(import.meta.dir, "../src/data/places");
const CACHE_DIR = path.join(import.meta.dir, "cache");

const TA_URL =
  "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Territorial_Authority_2023/FeatureServer/0/query?where=1%3D1&outFields=TA2023_V1_00,TA2023_V1_00_NAME,TA2023_V1_00_NAME_ASCII&returnGeometry=true&outSR=4326&f=geojson";

const UR_URL =
  "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Urban_Rural_Areas_2023/FeatureServer/0/query?where=1%3D1&outFields=UR2023_V1_00,UR2023_V1_00_NAME,UR2023_V1_00_NAME_ASCII,IUR2023_V1_00,IUR2023_V1_00_NAME&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=2000";

/** Map city/town slug → Stats NZ Urban Rural 2023 ASCII name (exact). */
const CITY_TO_UR_NAME: Record<string, string> = {
  whangarei: "Whangarei",
  auckland: "Auckland",
  hamilton: "Hamilton",
  tauranga: "Tauranga",
  rotorua: "Rotorua",
  napier: "Napier",
  hastings: "Hastings",
  "new-plymouth": "New Plymouth",
  "palmerston-north": "Palmerston North",
  wellington: "Wellington",
  "lower-hutt": "Lower Hutt",
  porirua: "Porirua",
  nelson: "Nelson",
  christchurch: "Christchurch",
  timaru: "Timaru",
  dunedin: "Dunedin",
  palmerston: "Palmerston",
  queenstown: "Queenstown",
  wanaka: "Wanaka",
  invercargill: "Invercargill",
};

/** Map district (region-kind) slug → Stats NZ TA 2023 ASCII name (exact). */
const DISTRICT_TO_TA_NAME: Record<string, string> = {
  "auckland-region": "Auckland",
  "whangarei-district": "Whangarei District",
  "hamilton-city": "Hamilton City",
  "tauranga-city": "Tauranga City",
  "rotorua-district": "Rotorua District",
  "napier-city": "Napier City",
  "hastings-district": "Hastings District",
  "new-plymouth-district": "New Plymouth District",
  "palmerston-north-city": "Palmerston North City",
  "wellington-city": "Wellington City",
  "lower-hutt-city": "Lower Hutt City",
  "christchurch-city": "Christchurch City",
  "dunedin-city": "Dunedin City",
  "waitaki-district": "Waitaki District",
  "queenstown-lakes-district": "Queenstown-Lakes District",
  "invercargill-city": "Invercargill City",
  "nelson-city": "Nelson City",
};

/** Fallback centroids [lng, lat, radius°] if official geometry missing. */
const CENTROIDS: Record<string, [number, number, number]> = {
  whangarei: [174.3237, -35.7251, 0.12],
  auckland: [174.7633, -36.8485, 0.22],
  hamilton: [175.2793, -37.787, 0.12],
  tauranga: [176.1651, -37.6878, 0.12],
  rotorua: [176.2497, -38.1368, 0.1],
  napier: [176.912, -39.4928, 0.09],
  hastings: [176.8392, -39.6396, 0.09],
  "new-plymouth": [174.075, -39.057, 0.1],
  "palmerston-north": [175.611, -40.3523, 0.1],
  wellington: [174.7762, -41.2865, 0.08],
  "lower-hutt": [174.907, -41.209, 0.08],
  porirua: [174.8406, -41.1333, 0.08],
  nelson: [173.284, -41.2706, 0.08],
  christchurch: [172.6362, -43.5321, 0.18],
  timaru: [171.254, -44.3969, 0.08],
  dunedin: [170.5036, -45.8788, 0.12],
  palmerston: [170.7167, -45.4833, 0.06],
  queenstown: [168.6626, -45.0312, 0.08],
  wanaka: [169.1321, -44.6989, 0.08],
  invercargill: [168.3475, -46.4132, 0.1],
  "auckland-region": [174.7633, -36.8485, 0.45],
  "whangarei-district": [174.3237, -35.7251, 0.28],
  "hamilton-city": [175.2793, -37.787, 0.18],
  "tauranga-city": [176.1651, -37.6878, 0.2],
  "rotorua-district": [176.2497, -38.1368, 0.25],
  "napier-city": [176.912, -39.4928, 0.14],
  "hastings-district": [176.8392, -39.6396, 0.22],
  "new-plymouth-district": [174.075, -39.057, 0.22],
  "palmerston-north-city": [175.611, -40.3523, 0.16],
  "wellington-city": [174.7762, -41.2865, 0.18],
  "lower-hutt-city": [174.907, -41.209, 0.12],
  "christchurch-city": [172.6362, -43.5321, 0.35],
  "dunedin-city": [170.5036, -45.8788, 0.28],
  "waitaki-district": [170.9, -44.95, 0.35],
  "queenstown-lakes-district": [168.9, -44.9, 0.4],
  "invercargill-city": [168.3475, -46.4132, 0.16],
  "nelson-city": [173.284, -41.2706, 0.12],
};

type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

function ring(lng: number, lat: number, r: number, n = 24): number[][] {
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

function fallbackFeature(t: Territory): GeoFeature {
  const c = CENTROIDS[t.slug] ?? [174.0, -41.0, 0.12];
  const [lng, lat, rad] = c;
  return {
    type: "Feature",
    properties: {
      slug: t.slug,
      name: t.name,
      kind: t.kind,
      source: "fallback-centroid",
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring(lng, lat, rad)],
    },
  };
}

/** Perpendicular distance from point to segment (degrees, good enough for simplify). */
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

/** Douglas–Peucker simplification. */
function simplifyRing(points: number[][], tolerance: number): number[][] {
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

function simplifyGeometry(
  geometry: GeoFeature["geometry"],
  tolerance = 0.004,
): GeoFeature["geometry"] {
  if (geometry.type === "Polygon") {
    const rings = (geometry.coordinates as number[][][]).map((ringCoords) => {
      const simplified = simplifyRing(ringCoords, tolerance).map((p) => [
        roundCoord(p[0]!),
        roundCoord(p[1]!),
      ]);
      // Ensure closed
      const a = simplified[0]!;
      const b = simplified[simplified.length - 1]!;
      if (a[0] !== b[0] || a[1] !== b[1]) simplified.push([...a]);
      return simplified.length >= 4 ? simplified : ringCoords.map((p) => [roundCoord(p[0]!), roundCoord(p[1]!)]);
    });
    return { type: "Polygon", coordinates: rings };
  }

  // MultiPolygon
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

function indexByAsciiName(
  fc: FeatureCollection,
  nameFields: string[],
): Map<string, GeoFeature> {
  const map = new Map<string, GeoFeature>();
  for (const f of fc.features) {
    for (const field of nameFields) {
      const raw = f.properties[field];
      if (typeof raw === "string" && raw.length > 0) {
        map.set(raw.toLowerCase(), f);
      }
    }
  }
  return map;
}

async function downloadIfNeeded(
  url: string,
  dest: string,
  force: boolean,
): Promise<void> {
  const file = Bun.file(dest);
  if (!force && (await file.exists()) && file.size > 1000) {
    console.log(`  cache hit ${path.basename(dest)} (${file.size} bytes)`);
    return;
  }
  console.log(`  downloading ${path.basename(dest)}…`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  await Bun.write(dest, buf);
  console.log(`  saved ${path.basename(dest)} (${buf.byteLength} bytes)`);
}

function validate(territories: Territory[]) {
  const required = [
    "medianRentWeek",
    "medianHousePrice",
    "medianMultiple",
    "rentYoY",
    "priceYoY",
    "medianIncome",
    "populationDensity",
    "populationGrowthYoY",
    "jobsGrowthYoY",
  ] as const;

  for (const t of territories) {
    if (!t.slug || !t.name || !t.kind || !t.region) {
      throw new Error(`Territory missing fields: ${JSON.stringify(t)}`);
    }
    if (t.kind !== "city" && t.kind !== "region") {
      throw new Error(`${t.slug}: invalid kind ${t.kind}`);
    }
    for (const key of required) {
      if (typeof t.metrics[key] !== "number" || Number.isNaN(t.metrics[key])) {
        throw new Error(`${t.slug}: invalid metric ${key}`);
      }
    }
  }

  const slugs = new Set(territories.map((t) => t.slug));
  if (slugs.size !== territories.length) {
    throw new Error("Duplicate territory slugs");
  }
}

async function buildOfficialBoundaries(
  territories: Territory[],
  forceDownload: boolean,
): Promise<{ features: GeoFeature[]; official: number; fallback: number }> {
  await mkdir(CACHE_DIR, { recursive: true });
  const taPath = path.join(CACHE_DIR, "ta2023.geojson");
  const urPath = path.join(CACHE_DIR, "ur2023.geojson");

  await downloadIfNeeded(TA_URL, taPath, forceDownload);
  await downloadIfNeeded(UR_URL, urPath, forceDownload);

  const ta = (await Bun.file(taPath).json()) as FeatureCollection;
  const ur = (await Bun.file(urPath).json()) as FeatureCollection;

  const taIndex = indexByAsciiName(ta, [
    "TA2023_V1_00_NAME_ASCII",
    "TA2023_V1_00_NAME",
  ]);
  const urIndex = indexByAsciiName(ur, [
    "UR2023_V1_00_NAME_ASCII",
    "UR2023_V1_00_NAME",
  ]);

  let official = 0;
  let fallback = 0;
  const features: GeoFeature[] = [];

  for (const t of territories) {
    let sourceFeature: GeoFeature | undefined;
    let sourceLabel = "fallback-centroid";

    if (t.kind === "city") {
      const urName = CITY_TO_UR_NAME[t.slug];
      if (urName) {
        sourceFeature = urIndex.get(urName.toLowerCase());
        sourceLabel = "stats-nz-ur-2023";
      }
    } else {
      const taName = DISTRICT_TO_TA_NAME[t.slug];
      if (taName) {
        sourceFeature = taIndex.get(taName.toLowerCase());
        sourceLabel = "stats-nz-ta-2023";
      }
    }

    if (sourceFeature?.geometry) {
      features.push({
        type: "Feature",
        properties: {
          slug: t.slug,
          name: t.name,
          kind: t.kind,
          source: sourceLabel,
          officialName:
            sourceFeature.properties.UR2023_V1_00_NAME ??
            sourceFeature.properties.TA2023_V1_00_NAME ??
            t.name,
        },
        geometry: simplifyGeometry(sourceFeature.geometry),
      });
      official += 1;
    } else {
      console.warn(`  ⚠ no official geometry for ${t.slug} — using fallback circle`);
      features.push(fallbackFeature(t));
      fallback += 1;
    }
  }

  return { features, official, fallback };
}

function buildFallbackBoundaries(territories: Territory[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: territories.map(fallbackFeature),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const forceDownload = args.includes("--force-download");
  const fallbackOnly = args.includes("--fallback-only");

  const territories = places as Territory[];
  validate(territories);

  await mkdir(OUT_DIR, { recursive: true });

  const cityCount = territories.filter((t) => t.kind === "city").length;
  const regionCount = territories.filter((t) => t.kind === "region").length;

  let boundaries: FeatureCollection;
  let official = 0;
  let fallback = 0;

  if (fallbackOnly) {
    console.log("Building fallback centroid polygons only…");
    boundaries = buildFallbackBoundaries(territories);
    fallback = territories.length;
  } else {
    console.log("Building official Stats NZ boundaries…");
    try {
      const result = await buildOfficialBoundaries(territories, forceDownload);
      boundaries = { type: "FeatureCollection", features: result.features };
      official = result.official;
      fallback = result.fallback;
    } catch (err) {
      console.error("Official download/filter failed — falling back to circles:", err);
      boundaries = buildFallbackBoundaries(territories);
      fallback = territories.length;
    }
  }

  const metadata = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    sources: [
      "MBIE Tenancy Services — Rental bond data by territorial authority (district view)",
      "MBIE Market Rent API — SA2 / finer areas for future city–town rents",
      "HUD Local Housing Statistics — median sale price & multiple by TA",
      "Stats NZ Urban Rural Areas 2023 (FeatureServer) — city/town outlines",
      "Stats NZ Territorial Authority 2023 (FeatureServer) — district outlines",
      "Stats NZ subnational population estimates (urban rural) — density proxies",
      "Indicative settlement metric splits where TA data alone would mask local markets",
    ],
    cityCount,
    regionCount,
    boundaryOfficial: official,
    boundaryFallback: fallback,
    notes:
      "Cities & towns use Stats NZ Urban Rural 2023 polygons. Districts use Territorial Authority 2023 polygons. Geometry is generalised (Douglas–Peucker) for web size. Metrics for multi-settlement TAs remain curated approximations until SA2/Market Rent pipelines are wired.",
  };

  await Bun.write(
    path.join(OUT_DIR, "places.json"),
    JSON.stringify(territories, null, 2) + "\n",
  );
  await Bun.write(
    path.join(OUT_DIR, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  await Bun.write(
    path.join(OUT_DIR, "boundaries.json"),
    JSON.stringify(boundaries),
  );

  const boundarySize = Bun.file(path.join(OUT_DIR, "boundaries.json")).size;
  console.log(
    `✓ ingest:places — ${cityCount} cities/towns + ${regionCount} districts`,
  );
  console.log(
    `  boundaries: ${official} official, ${fallback} fallback → ${(boundarySize / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
