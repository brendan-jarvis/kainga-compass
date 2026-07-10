/**
 * Expand cities & towns from Stats NZ Urban Rural 2023.
 * Includes all Major, Large, and Medium urban areas (official IUR classes).
 *
 * Usage: bun run scripts/expand-cities.ts
 * Prerequisite: scripts/cache/ur2023.geojson + ta2023.geojson
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
const UR_CACHE = path.join(import.meta.dir, "cache/ur2023.geojson");
const TA_CACHE = path.join(import.meta.dir, "cache/ta2023.geojson");

const URBAN_CLASSES = new Set([
  "Major urban area",
  "Large urban area",
  "Medium urban area",
]);

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
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
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i]!)) return false;
    }
    return true;
  }
  for (const poly of geometry.coordinates as number[][][][]) {
    if (!poly[0] || !pointInRing(lng, lat, poly[0])) continue;
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

function defaultMetrics(key: string, base?: TerritoryMetrics): TerritoryMetrics {
  if (base) {
    const j = (hash01(key) - 0.5) * 0.12;
    const j2 = (hash01(key + ":m") - 0.5) * 0.1;
    const rent = Math.round(base.medianRentWeek * (1 + j));
    const price =
      Math.round((base.medianHousePrice * (1 + j * 1.05)) / 1000) * 1000;
    const income = Math.round((base.medianIncome * (1 + j2)) / 1000) * 1000;
    const medEarn =
      Math.round((base.medianEarningsAnnual * (1 + j2)) / 500) * 500;
    const meanEarn =
      Math.round((base.meanEarningsAnnual * (1 + j2 * 1.05)) / 500) * 500;
    const earningsByAge: EarningsAgeBand[] = base.earningsByAge.map((b) => ({
      label: b.label,
      medianAnnual: Math.round((b.medianAnnual * (1 + j2)) / 500) * 500,
      meanAnnual: Math.round((b.meanAnnual * (1 + j2)) / 500) * 500,
    }));
    return {
      medianRentWeek: rent,
      medianHousePrice: price,
      medianMultiple: Math.round((price / Math.max(income, 1)) * 10) / 10,
      rentYoY: base.rentYoY + j * 0.015,
      priceYoY: base.priceYoY + j * 0.015,
      medianIncome: income,
      medianEarningsAnnual: medEarn,
      meanEarningsAnnual: meanEarn,
      earningsByAge,
      populationDensity: Math.max(
        30,
        Math.round(base.populationDensity * (0.85 + hash01(key) * 0.5)),
      ),
      populationGrowthYoY: base.populationGrowthYoY + j * 0.008,
      jobsGrowthYoY: base.jobsGrowthYoY + j2 * 0.008,
    };
  }

  const h = hash01(key);
  const h2 = hash01(key + ":x");
  const rent = Math.round(400 + h * 250);
  const price = Math.round((480_000 + h * 600_000) / 5000) * 5000;
  const income = Math.round((72_000 + h2 * 35_000) / 1000) * 1000;
  const medEarn = Math.round((income * 0.72) / 500) * 500;
  const meanEarn = Math.round((medEarn * 1.12) / 500) * 500;
  const earningsByAge: EarningsAgeBand[] = [
    { label: "15–24 years", factor: 0.55 },
    { label: "25–34 years", factor: 0.88 },
    { label: "35–44 years", factor: 1.05 },
    { label: "45–54 years", factor: 1.12 },
    { label: "55–64 years", factor: 1.0 },
  ].map((b) => ({
    label: b.label,
    medianAnnual: Math.round((medEarn * b.factor) / 500) * 500,
    meanAnnual: Math.round((meanEarn * b.factor) / 500) * 500,
  }));
  return {
    medianRentWeek: rent,
    medianHousePrice: price,
    medianMultiple: Math.round((price / income) * 10) / 10,
    rentYoY: -0.01 + h * 0.06,
    priceYoY: -0.02 + h2 * 0.07,
    medianIncome: income,
    medianEarningsAnnual: medEarn,
    meanEarningsAnnual: meanEarn,
    earningsByAge,
    populationDensity: Math.round(80 + h * 1200),
    populationGrowthYoY: -0.002 + h * 0.028,
    jobsGrowthYoY: -0.002 + h2 * 0.03,
  };
}

function displayName(ascii: string, official: string): string {
  // Prefer official macron form when present
  return official || ascii;
}

async function main() {
  for (const p of [UR_CACHE, TA_CACHE]) {
    if (!(await Bun.file(p).exists())) {
      console.error(`Missing ${p}. Run: bun run ingest:places`);
      process.exit(1);
    }
  }

  const ur = (await Bun.file(UR_CACHE).json()) as FeatureCollection;
  const ta = (await Bun.file(TA_CACHE).json()) as FeatureCollection;
  const places = placesSeed as Territory[];

  const regions = places.filter((p) => p.kind === "region");
  const suburbs = places.filter((p) => p.kind === "suburb");
  const existingCities = new Map(
    places
      .filter((p) => p.kind === "city")
      .map((p) => {
        const key = p.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return [key, p] as const;
      }),
  );

  const taFeatures = ta.features.filter((f) => {
    const n = String(f.properties.TA2023_V1_00_NAME_ASCII ?? "");
    return n && !n.includes("Outside");
  });

  function findTa(lng: number, lat: number): {
    name: string;
    ascii: string;
    slug: string;
  } | null {
    for (const f of taFeatures) {
      if (pointInFeature(lng, lat, f.geometry)) {
        const ascii = String(f.properties.TA2023_V1_00_NAME_ASCII);
        const name = String(f.properties.TA2023_V1_00_NAME ?? ascii);
        const region = regions.find(
          (r) =>
            r.name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase() === ascii.toLowerCase() ||
            r.name === name,
        );
        return {
          name,
          ascii,
          slug: region?.slug ?? (ascii === "Auckland" ? "auckland-region" : slugify(ascii)),
        };
      }
    }
    return null;
  }

  const cityPlaces: Territory[] = [];
  const cityFeatures: GeoFeature[] = [];
  const usedSlugs = new Set(regions.map((r) => r.slug));

  const urbanFeatures = ur.features.filter((f) =>
    URBAN_CLASSES.has(String(f.properties.IUR2023_V1_00_NAME ?? "")),
  );

  console.log(
    `Urban Rural major/large/medium: ${urbanFeatures.length} settlements`,
  );

  for (const f of urbanFeatures) {
    const ascii = String(f.properties.UR2023_V1_00_NAME_ASCII ?? "");
    const official = String(f.properties.UR2023_V1_00_NAME ?? ascii);
    if (!ascii) continue;

    const nameKey = ascii
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const existing = existingCities.get(nameKey);

    let slug = existing?.slug ?? slugify(ascii);
    // Avoid collisions with district slugs (e.g. napier vs napier-city region)
    if (!existing && usedSlugs.has(slug)) {
      slug = `${slug}-urban`;
    }
    usedSlugs.add(slug);

    const [clng, clat] = featureCentroid(f.geometry);
    const taHit = findTa(clng, clat);
    const parentRegion = taHit
      ? regions.find((r) => r.slug === taHit.slug)
      : undefined;

    const metrics =
      existing?.metrics ??
      defaultMetrics(slug, parentRegion?.metrics);

    const city: Territory = {
      slug,
      name: displayName(ascii, official),
      kind: "city",
      region: parentRegion?.region ?? existing?.region ?? "New Zealand",
      district: taHit?.name ?? existing?.district,
      parentSlug: taHit?.slug ?? existing?.parentSlug,
      metrics,
      proxies: existing?.proxies ?? [
        "career",
        "housingGrowth",
        "jobGrowth",
        "populationGrowth",
      ],
    };

    cityPlaces.push(city);
    cityFeatures.push({
      type: "Feature",
      properties: {
        slug: city.slug,
        name: city.name,
        kind: "city",
        source: "stats-nz-ur-2023",
        officialName: official,
        urbanClass: f.properties.IUR2023_V1_00_NAME,
      },
      geometry: simplifyGeometry(f.geometry, 0.0025),
    });
  }

  // Keep suburbs only if parent city still exists
  const citySlugSet = new Set(cityPlaces.map((c) => c.slug));
  const keptSuburbs = suburbs.filter(
    (s) => s.parentSlug && citySlugSet.has(s.parentSlug),
  );

  const allPlaces = [...regions, ...cityPlaces, ...keptSuburbs];

  const boundsPath = path.join(OUT_DIR, "boundaries.json");
  const existingBounds = (await Bun.file(boundsPath).json()) as FeatureCollection;
  const nonCityBounds = existingBounds.features.filter(
    (f) => f.properties?.kind !== "city",
  );
  // Drop orphan suburb bounds
  const keptSuburbBounds = nonCityBounds.filter((f) => {
    if (f.properties?.kind !== "suburb") return true;
    return citySlugSet.has(String(f.properties.parentSlug ?? ""));
  });
  const boundaries: FeatureCollection = {
    type: "FeatureCollection",
    features: [...keptSuburbBounds, ...cityFeatures],
  };

  const metaPath = path.join(OUT_DIR, "metadata.json");
  const meta = (await Bun.file(metaPath).json()) as Record<string, unknown>;
  meta.cityCount = cityPlaces.length;
  meta.regionCount = regions.length;
  meta.suburbCount = keptSuburbs.length;
  meta.lastUpdated = new Date().toISOString().slice(0, 10);
  meta.notes =
    "Districts: all 67 TA 2023. Cities & towns: all Major, Large, and Medium urban areas from Stats NZ Urban Rural 2023. Suburbs: SA3 under cities (re-run ingest:suburbs after expanding cities). Metrics: curated where present, else seeded from parent TA or national baseline.";

  const sources = Array.isArray(meta.sources) ? [...meta.sources] : [];
  const withoutOldCity = sources.filter(
    (s) => !String(s).includes("selected city/town"),
  );
  if (!withoutOldCity.some((s) => String(s).includes("Major, Large, and Medium"))) {
    withoutOldCity.splice(
      1,
      0,
      "Stats NZ Urban Rural Areas 2023 — all Major, Large, and Medium urban areas (city/town explorer set)",
    );
  }
  meta.sources = withoutOldCity;

  await Bun.write(
    path.join(OUT_DIR, "places.json"),
    JSON.stringify(allPlaces, null, 2) + "\n",
  );
  await Bun.write(boundsPath, JSON.stringify(boundaries));
  await Bun.write(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `✓ expand-cities — ${cityPlaces.length} urban areas (major/large/medium)`,
  );
  console.log(
    `  kept suburbs: ${keptSuburbs.length} (re-run bun run ingest:suburbs for new cities)`,
  );
  console.log(
    `  boundaries: ${boundaries.features.length} features, ${(Bun.file(boundsPath).size / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
