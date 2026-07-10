/**
 * Fetch Stats NZ SA2 2023 polygons as "suburbs" under each city/town,
 * invent fixture metrics from the parent city, and merge into places + boundaries.
 *
 * Usage: bun run scripts/ingest-suburbs.ts
 *        bun run scripts/ingest-suburbs.ts -- --force
 *
 * Spatial source:
 *   Statistical Area 2 2023 FeatureServer (Stats NZ)
 *   SA2s intersecting each city's Urban Rural 2023 polygon bbox
 */

import { mkdir } from "node:fs/promises";
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

const SA2_QUERY =
  "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Statistical_Area_2_2023/FeatureServer/0/query";

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

/** Cap suburbs per city so Auckland stays usable. */
const MAX_SUBURBS_PER_CITY = 36;

function isUsableSa2Name(name: string): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("inland water")) return false;
  if (n.startsWith("oceanic")) return false;
  if (n.startsWith("inlet")) return false;
  if (n.startsWith("inlets")) return false;
  if (n.includes(" harbour")) return false;
  if (n.startsWith("bay of ")) return false;
  return true;
}

function scaleMetrics(base: TerritoryMetrics, key: string): TerritoryMetrics {
  // ±12% deterministic jitter so suburbs differ but stay near parent city.
  const j = (hash01(key) - 0.5) * 0.24;
  const j2 = (hash01(key + ":b") - 0.5) * 0.2;
  const rent = Math.round(base.medianRentWeek * (1 + j));
  const price = Math.round(base.medianHousePrice * (1 + j * 1.1) / 1000) * 1000;
  const income = Math.round(base.medianIncome * (1 + j2) / 1000) * 1000;
  const medEarn = Math.round(base.medianEarningsAnnual * (1 + j2) / 500) * 500;
  const meanEarn = Math.round(base.meanEarningsAnnual * (1 + j2 * 1.05) / 500) * 500;
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

async function querySa2InBbox(bbox: {
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
      `${SA2_QUERY}?where=1%3D1` +
      `&geometry=${geometry}` +
      `&geometryType=esriGeometryEnvelope&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=SA22023_V1_00,SA22023_V1_00_NAME,SA22023_V1_00_NAME_ASCII,LAND_AREA_SQ_KM` +
      `&returnGeometry=true&outSR=4326&f=geojson` +
      `&resultRecordCount=${pageSize}&resultOffset=${offset}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SA2 query failed: ${res.status} ${res.statusText}`);
    }
    const fc = (await res.json()) as FeatureCollection;
    const batch = fc.features ?? [];
    features.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
    if (offset > 800) break; // safety
  }

  return features;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  if (!(await Bun.file(UR_CACHE).exists())) {
    console.error(
      "Missing UR cache. Run: bun run ingest:places  (downloads Urban Rural first)",
    );
    process.exit(1);
  }

  const ur = (await Bun.file(UR_CACHE).json()) as FeatureCollection;
  const urByName = new Map<string, GeoFeature>();
  for (const f of ur.features) {
    const ascii = String(f.properties.UR2023_V1_00_NAME_ASCII ?? "");
    const name = String(f.properties.UR2023_V1_00_NAME ?? "");
    if (ascii) urByName.set(ascii.toLowerCase(), f);
    if (name) urByName.set(name.toLowerCase(), f);
  }

  const basePlaces = placesSeed as Territory[];
  // Drop any previous suburbs so re-runs stay clean
  const parents = basePlaces.filter((p) => p.kind !== "suburb");
  const cities = parents.filter((p) => p.kind === "city");

  const suburbs: Territory[] = [];
  const suburbFeatures: GeoFeature[] = [];
  const usedSlugs = new Set(parents.map((p) => p.slug));

  for (const city of cities) {
    const urName = CITY_TO_UR_NAME[city.slug];
    if (!urName) {
      console.warn(`  skip ${city.slug}: no UR mapping`);
      continue;
    }
    const urFeat = urByName.get(urName.toLowerCase());
    if (!urFeat?.geometry) {
      console.warn(`  skip ${city.slug}: UR polygon not in cache`);
      continue;
    }

    const bbox = featureBBox(urFeat.geometry);
    // Slight pad so edge suburbs are included
    const pad = 0.02;
    const sa2s = await querySa2InBbox({
      xmin: bbox.xmin - pad,
      ymin: bbox.ymin - pad,
      xmax: bbox.xmax + pad,
      ymax: bbox.ymax + pad,
    });

    const candidates = sa2s
      .map((f) => {
        const name = String(
          f.properties.SA22023_V1_00_NAME_ASCII ??
            f.properties.SA22023_V1_00_NAME ??
            "",
        );
        const area = Number(f.properties.LAND_AREA_SQ_KM ?? 0);
        return { f, name, area };
      })
      .filter((c) => c.name && isUsableSa2Name(c.name))
      // Prefer denser/smaller SA2s as "suburbs"
      .sort((a, b) => a.area - b.area)
      .slice(0, MAX_SUBURBS_PER_CITY);

    console.log(`  ${city.slug}: ${candidates.length} SA2 suburbs`);

    for (const { f, name } of candidates) {
      let slug = `${city.slug}--${slugify(name)}`;
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${String(f.properties.SA22023_V1_00 ?? "")}`;
      }
      usedSlugs.add(slug);

      const metrics = scaleMetrics(city.metrics, slug);
      suburbs.push({
        slug,
        name,
        kind: "suburb",
        region: city.region,
        district: city.district,
        parentSlug: city.slug,
        metrics,
        proxies: city.proxies ? [...city.proxies] : ["career"],
      });

      suburbFeatures.push({
        type: "Feature",
        properties: {
          slug,
          name,
          kind: "suburb",
          source: "stats-nz-sa2-2023",
          parentSlug: city.slug,
          officialName: name,
        },
        geometry: simplifyGeometry(f.geometry, 0.0025),
      });
    }

    // Be polite to the API
    await new Promise((r) => setTimeout(r, 150));
  }

  // Ensure parentSlug on cities pointing at district region slug where possible
  const districtByName = new Map(
    parents
      .filter((p) => p.kind === "region")
      .map((p) => [p.name, p.slug] as const),
  );
  const citiesUpdated = parents.map((p) => {
    if (p.kind !== "city" || !p.district) return p;
    const parentSlug = districtByName.get(p.district);
    return parentSlug ? { ...p, parentSlug } : p;
  });

  const allPlaces = [...citiesUpdated, ...suburbs];

  // Merge boundaries: keep non-suburb features from existing file if present
  let existingBoundaries: FeatureCollection = { type: "FeatureCollection", features: [] };
  const boundsPath = path.join(OUT_DIR, "boundaries.json");
  if (await Bun.file(boundsPath).exists()) {
    existingBoundaries = (await Bun.file(boundsPath).json()) as FeatureCollection;
  }
  const kept = existingBoundaries.features.filter(
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
  if (!sources.some((s) => String(s).includes("SA2"))) {
    sources.push(
      "Stats NZ Statistical Area 2 2023 (FeatureServer) — suburb/neighbourhood outlines under cities",
    );
  }
  meta.sources = sources;
  meta.notes =
    String(meta.notes ?? "") +
    " Suburbs are SA2 units spatially linked to each Urban Rural city polygon; metrics are parent-city fixtures with local variation until finer housing series are wired.";

  await Bun.write(
    path.join(OUT_DIR, "places.json"),
    JSON.stringify(allPlaces, null, 2) + "\n",
  );
  await Bun.write(boundsPath, JSON.stringify(boundaries));
  await Bun.write(metadataPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `✓ ingest-suburbs — ${suburbs.length} suburbs under ${cities.length} cities → places + boundaries`,
  );
  console.log(
    `  boundaries total features: ${boundaries.features.length} (${(Bun.file(boundsPath).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
