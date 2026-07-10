/**
 * Fetch Stats NZ Statistical Area 3 (SA3) 2023 polygons as suburbs under each city.
 *
 * SA3 is designed to approximate suburbs in major/medium urban areas.
 * SA2 is too fine in CBDs (e.g. "Queen Street", "Shortland Street") — not usable as suburbs.
 *
 * Usage: bun run ingest:suburbs
 * Prerequisite: scripts/cache/ur2023.geojson (from bun run ingest:places)
 */

import path from "node:path";

import placesSeed from "../src/data/places/places.json";
import type {
  EarningsAgeBand,
  Territory,
  TerritoryMetrics,
} from "../src/lib/places/types";
import {
  featureBBox,
  hash01,
  simplifyGeometry,
  slugify,
  type FeatureCollection,
  type GeoFeature,
} from "./lib/geo";

const OUT_DIR = path.join(import.meta.dir, "../src/data/places");
const CACHE_DIR = path.join(import.meta.dir, "cache");
const UR_CACHE = path.join(CACHE_DIR, "ur2023.geojson");

const SA3_QUERY =
  "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Statistical_Area_3_2023/FeatureServer/0/query";

/** Cap per city so large metros stay usable. */
const MAX_SUBURBS_PER_CITY = 48;

/** Drop huge rural SA3s that only clip the urban bbox (km²). */
const MAX_SUBURB_AREA_KM2 = 45;

function isUsableSa3Name(name: string): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("inland water")) return false;
  if (n.startsWith("oceanic")) return false;
  if (n.startsWith("inlet")) return false;
  if (n.includes(" harbour")) return false;
  // Rural SA3 naming patterns we don't want as "suburbs"
  if (n.endsWith(" rural")) return false;
  if (n.includes(" rural ")) return false;
  return true;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  // Ray casting
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function featureCentroid(geometry: GeoFeature["geometry"]): [number, number] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const visit = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      sx += c[0] as number;
      sy += c[1] as number;
      n += 1;
      return;
    }
    for (const child of c) visit(child);
  };
  visit(geometry.coordinates);
  return n ? [sx / n, sy / n] : [0, 0];
}

function pointInFeature(
  lng: number,
  lat: number,
  geometry: GeoFeature["geometry"],
): boolean {
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as number[][][];
    if (!rings[0] || !pointInRing(lng, lat, rings[0])) return false;
    // holes
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i]!)) return false;
    }
    return true;
  }
  const polys = geometry.coordinates as number[][][][];
  for (const poly of polys) {
    if (!poly[0]) continue;
    if (!pointInRing(lng, lat, poly[0])) continue;
    let inHole = false;
    for (let i = 1; i < poly.length; i++) {
      if (pointInRing(lng, lat, poly[i]!)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function scaleMetrics(base: TerritoryMetrics, key: string): TerritoryMetrics {
  const j = (hash01(key) - 0.5) * 0.24;
  const j2 = (hash01(key + ":b") - 0.5) * 0.2;
  const rent = Math.round(base.medianRentWeek * (1 + j));
  const price = Math.round((base.medianHousePrice * (1 + j * 1.1)) / 1000) * 1000;
  const income = Math.round((base.medianIncome * (1 + j2)) / 1000) * 1000;
  const medEarn = Math.round((base.medianEarningsAnnual * (1 + j2)) / 500) * 500;
  const meanEarn =
    Math.round((base.meanEarningsAnnual * (1 + j2 * 1.05)) / 500) * 500;
  const multiple = Math.round((price / Math.max(income, 1)) * 10) / 10;

  const earningsByAge: EarningsAgeBand[] = base.earningsByAge.map((band) => ({
    label: band.label,
    medianAnnual: Math.round((band.medianAnnual * (1 + j2)) / 500) * 500,
    meanAnnual: Math.round((band.meanAnnual * (1 + j2)) / 500) * 500,
  }));

  return {
    medianRentWeek: rent,
    medianHousePrice: price,
    medianMultiple: multiple,
    rentYoY: base.rentYoY + j * 0.02,
    priceYoY: base.priceYoY + j * 0.02,
    medianIncome: income,
    medianEarningsAnnual: medEarn,
    meanEarningsAnnual: meanEarn,
    earningsByAge,
    populationDensity: Math.max(
      20,
      Math.round(base.populationDensity * (0.7 + hash01(key + ":d") * 1.2)),
    ),
    populationGrowthYoY: base.populationGrowthYoY + j * 0.01,
    jobsGrowthYoY: base.jobsGrowthYoY + j2 * 0.01,
  };
}

async function querySa3InBbox(bbox: {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}): Promise<GeoFeature[]> {
  const geometry = encodeURIComponent(
    JSON.stringify({
      xmin: bbox.xmin,
      ymin: bbox.ymin,
      xmax: bbox.xmax,
      ymax: bbox.ymax,
      spatialReference: { wkid: 4326 },
    }),
  );

  const features: GeoFeature[] = [];
  let offset = 0;
  const pageSize = 100;

  for (;;) {
    const url =
      `${SA3_QUERY}?where=1%3D1` +
      `&geometry=${geometry}` +
      `&geometryType=esriGeometryEnvelope&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=SA32023_V1_00,SA32023_V1_00_NAME,SA32023_V1_00_NAME_ASCII,LAND_AREA_SQ_KM` +
      `&returnGeometry=true&outSR=4326&f=geojson` +
      `&resultRecordCount=${pageSize}&resultOffset=${offset}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SA3 query failed: ${res.status} ${res.statusText}`);
    }
    const fc = (await res.json()) as FeatureCollection;
    const batch = fc.features ?? [];
    features.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
    if (offset > 600) break;
  }

  return features;
}

async function main() {
  if (!(await Bun.file(UR_CACHE).exists())) {
    console.error(
      "Missing UR cache. Run: bun run ingest:places  (downloads Urban Rural first)",
    );
    process.exit(1);
  }

  const ur = (await Bun.file(UR_CACHE).json()) as FeatureCollection;
  const urByName = new Map<string, GeoFeature>();
  const urBySlug = new Map<string, GeoFeature>();
  for (const f of ur.features) {
    const ascii = String(f.properties.UR2023_V1_00_NAME_ASCII ?? "");
    const name = String(f.properties.UR2023_V1_00_NAME ?? "");
    if (ascii) {
      urByName.set(ascii.toLowerCase(), f);
      urBySlug.set(slugify(ascii), f);
    }
    if (name) urByName.set(name.toLowerCase(), f);
  }

  const basePlaces = placesSeed as Territory[];
  const parents = basePlaces.filter((p) => p.kind !== "suburb");
  const cities = parents.filter((p) => p.kind === "city");

  const suburbs: Territory[] = [];
  const suburbFeatures: GeoFeature[] = [];
  const usedSlugs = new Set(parents.map((p) => p.slug));

  for (const city of cities) {
    const nameKey = city.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const urFeat =
      urBySlug.get(city.slug) ??
      urByName.get(nameKey) ??
      urByName.get(city.name.toLowerCase());
    if (!urFeat?.geometry) {
      console.warn(`  skip ${city.slug}: UR polygon not in cache`);
      continue;
    }

    const bbox = featureBBox(urFeat.geometry);
    const pad = 0.01;
    const sa3s = await querySa3InBbox({
      xmin: bbox.xmin - pad,
      ymin: bbox.ymin - pad,
      xmax: bbox.xmax + pad,
      ymax: bbox.ymax + pad,
    });

    const candidates = sa3s
      .map((f) => {
        const name = String(
          f.properties.SA32023_V1_00_NAME_ASCII ??
            f.properties.SA32023_V1_00_NAME ??
            "",
        );
        const area = Number(f.properties.LAND_AREA_SQ_KM ?? 0);
        const [clng, clat] = featureCentroid(f.geometry);
        const inside = pointInFeature(clng, clat, urFeat.geometry);
        return { f, name, area, inside };
      })
      .filter(
        (c) =>
          c.name &&
          isUsableSa3Name(c.name) &&
          c.inside &&
          c.area > 0.15 &&
          c.area <= MAX_SUBURB_AREA_KM2,
      )
      // Prefer typical suburb sizes, then name
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_SUBURBS_PER_CITY);

    console.log(`  ${city.slug}: ${candidates.length} SA3 suburbs`);

    for (const { f, name } of candidates) {
      let slug = `${city.slug}--${slugify(name)}`;
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${String(f.properties.SA32023_V1_00 ?? "")}`;
      }
      usedSlugs.add(slug);

      suburbs.push({
        slug,
        name: name.replace(/ \(Auckland\)$/i, "").replace(/ \(.*?\)\s*$/, ""),
        kind: "suburb",
        region: city.region,
        district: city.district,
        parentSlug: city.slug,
        metrics: scaleMetrics(city.metrics, slug),
        proxies: city.proxies ? [...city.proxies] : ["career"],
      });

      suburbFeatures.push({
        type: "Feature",
        properties: {
          slug,
          name,
          kind: "suburb",
          source: "stats-nz-sa3-2023",
          parentSlug: city.slug,
          officialName: name,
        },
        geometry: simplifyGeometry(f.geometry, 0.002),
      });
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  const allPlaces = [...parents, ...suburbs];

  const boundsPath = path.join(OUT_DIR, "boundaries.json");
  const existingBounds = (await Bun.file(boundsPath).json()) as FeatureCollection;
  const kept = existingBounds.features.filter(
    (f) => f.properties?.kind !== "suburb",
  );
  const boundaries: FeatureCollection = {
    type: "FeatureCollection",
    features: [...kept, ...suburbFeatures],
  };

  const metadataPath = path.join(OUT_DIR, "metadata.json");
  const meta = (await Bun.file(metadataPath).json()) as Record<string, unknown>;
  meta.suburbCount = suburbs.length;
  meta.lastUpdated = new Date().toISOString().slice(0, 10);
  const sources = Array.isArray(meta.sources) ? [...meta.sources] : [];
  // Replace SA2 suburb source note with SA3
  const filtered = sources.filter(
    (s) => !String(s).includes("SA2") && !String(s).includes("suburb"),
  );
  filtered.push(
    "Stats NZ Statistical Area 3 2023 (FeatureServer) — suburb-scale units under cities (SA3 approximates suburbs; SA2 is too fine in CBDs)",
  );
  meta.sources = filtered;
  meta.notes =
    "Districts: all 67 Stats NZ TA 2023. Cities: selected Urban Rural 2023 settlements. Suburbs: SA3 2023 units whose centroid falls inside each city urban area (not SA2 street-block units). Metrics for many places remain fixtures until HUD/MBIE live ingest.";

  await Bun.write(
    path.join(OUT_DIR, "places.json"),
    JSON.stringify(allPlaces, null, 2) + "\n",
  );
  await Bun.write(boundsPath, JSON.stringify(boundaries));
  await Bun.write(metadataPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `✓ ingest-suburbs — ${suburbs.length} SA3 suburbs under ${cities.length} cities`,
  );
  console.log(
    `  boundaries: ${boundaries.features.length} features, ${(Bun.file(boundsPath).size / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
