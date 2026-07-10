/**
 * Ensure every Stats NZ Territorial Authority 2023 appears as a `region`
 * place with an official polygon in boundaries.json.
 *
 * Preserves curated metrics for known TAs; seeds fixtures for the rest.
 *
 * Usage: bun run scripts/expand-districts.ts
 * Prerequisite: scripts/cache/ta2023.geojson (from bun run ingest:places)
 */

import path from "node:path";

import placesSeed from "../src/data/places/places.json";
import type {
  EarningsAgeBand,
  Territory,
  TerritoryMetrics,
} from "../src/lib/places/types";
import {
  hash01,
  simplifyGeometry,
  slugify,
  type FeatureCollection,
  type GeoFeature,
} from "./lib/geo";

const OUT_DIR = path.join(import.meta.dir, "../src/data/places");
const TA_CACHE = path.join(import.meta.dir, "cache/ta2023.geojson");

/** Rough regional council for labeling (not used for scoring). */
const TA_TO_REGION: Record<string, string> = {
  Auckland: "Auckland",
  "Far North District": "Northland",
  "Kaipara District": "Northland",
  "Whangarei District": "Northland",
  "Hamilton City": "Waikato",
  "Hauraki District": "Waikato",
  "Matamata-Piako District": "Waikato",
  "Otorohanga District": "Waikato",
  "South Waikato District": "Waikato",
  "Taupo District": "Waikato",
  "Thames-Coromandel District": "Waikato",
  "Waikato District": "Waikato",
  "Waipa District": "Waikato",
  "Waitomo District": "Waikato",
  "Kawerau District": "Bay of Plenty",
  "Opotiki District": "Bay of Plenty",
  "Rotorua District": "Bay of Plenty",
  "Tauranga City": "Bay of Plenty",
  "Western Bay of Plenty District": "Bay of Plenty",
  "Whakatane District": "Bay of Plenty",
  "Gisborne District": "Gisborne",
  "Central Hawke's Bay District": "Hawke's Bay",
  "Hastings District": "Hawke's Bay",
  "Napier City": "Hawke's Bay",
  "Wairoa District": "Hawke's Bay",
  "New Plymouth District": "Taranaki",
  "South Taranaki District": "Taranaki",
  "Stratford District": "Taranaki",
  "Horowhenua District": "Manawatū-Whanganui",
  "Manawatu District": "Manawatū-Whanganui",
  "Palmerston North City": "Manawatū-Whanganui",
  "Rangitikei District": "Manawatū-Whanganui",
  "Ruapehu District": "Manawatū-Whanganui",
  "Tararua District": "Manawatū-Whanganui",
  "Whanganui District": "Manawatū-Whanganui",
  "Carterton District": "Wellington",
  "Kapiti Coast District": "Wellington",
  "Lower Hutt City": "Wellington",
  "Masterton District": "Wellington",
  "Porirua City": "Wellington",
  "South Wairarapa District": "Wellington",
  "Upper Hutt City": "Wellington",
  "Wellington City": "Wellington",
  "Marlborough District": "Marlborough",
  "Nelson City": "Nelson",
  "Tasman District": "Tasman",
  "Buller District": "West Coast",
  "Grey District": "West Coast",
  "Westland District": "West Coast",
  "Ashburton District": "Canterbury",
  "Christchurch City": "Canterbury",
  "Hurunui District": "Canterbury",
  "Kaikoura District": "Canterbury",
  "Mackenzie District": "Canterbury",
  "Selwyn District": "Canterbury",
  "Timaru District": "Canterbury",
  "Waimakariri District": "Canterbury",
  "Waimate District": "Canterbury",
  "Central Otago District": "Otago",
  "Clutha District": "Otago",
  "Dunedin City": "Otago",
  "Queenstown-Lakes District": "Otago",
  "Waitaki District": "Otago",
  "Gore District": "Southland",
  "Invercargill City": "Southland",
  "Southland District": "Southland",
  "Chatham Islands Territory": "Chatham Islands",
};

function defaultMetrics(taAscii: string): TerritoryMetrics {
  // National-ish baseline with mild TA-level variation
  const h = hash01(taAscii);
  const h2 = hash01(taAscii + ":x");
  const rent = Math.round(380 + h * 280);
  const price = Math.round((420_000 + h * 700_000) / 5000) * 5000;
  const income = Math.round((68_000 + h2 * 40_000) / 1000) * 1000;
  const medEarn = Math.round(income * 0.72 / 500) * 500;
  const meanEarn = Math.round(medEarn * 1.12 / 500) * 500;
  const multiple = Math.round((price / income) * 10) / 10;
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
    medianMultiple: multiple,
    rentYoY: -0.01 + h * 0.06,
    priceYoY: -0.03 + h2 * 0.08,
    medianIncome: income,
    medianEarningsAnnual: medEarn,
    meanEarningsAnnual: meanEarn,
    earningsByAge,
    populationDensity: Math.round(5 + h * 400),
    populationGrowthYoY: -0.005 + h * 0.03,
    jobsGrowthYoY: -0.005 + h2 * 0.035,
  };
}

function regionSlug(taAscii: string): string {
  if (taAscii === "Auckland") return "auckland-region";
  return slugify(taAscii);
}

async function main() {
  if (!(await Bun.file(TA_CACHE).exists())) {
    console.error("Missing TA cache. Run: bun run ingest:places");
    process.exit(1);
  }

  const taFc = (await Bun.file(TA_CACHE).json()) as FeatureCollection;
  const places = placesSeed as Territory[];

  const nonRegions = places.filter((p) => p.kind !== "region");
  const existingRegions = new Map(
    places.filter((p) => p.kind === "region").map((p) => {
      // Index by ascii-ish key
      const key = p.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return [key, p] as const;
    }),
  );

  const regionPlaces: Territory[] = [];
  const regionFeatures: GeoFeature[] = [];

  for (const f of taFc.features) {
    const ascii = String(f.properties.TA2023_V1_00_NAME_ASCII ?? "");
    const official = String(f.properties.TA2023_V1_00_NAME ?? ascii);
    if (!ascii || ascii.includes("Outside Territorial Authority")) continue;

    const key = ascii.toLowerCase();
    const existing = existingRegions.get(key);
    // Also try without macrons mismatch
    const slug = existing?.slug ?? regionSlug(ascii);
    const regionLabel = TA_TO_REGION[ascii] ?? "New Zealand";

    const place: Territory = existing
      ? {
          ...existing,
          name: official, // prefer official macron form
          kind: "region",
          region: existing.region || regionLabel,
        }
      : {
          slug,
          name: official,
          kind: "region",
          region: regionLabel,
          metrics: defaultMetrics(ascii),
          proxies: ["career", "housingGrowth", "jobGrowth", "populationGrowth"],
        };

    regionPlaces.push(place);
    regionFeatures.push({
      type: "Feature",
      properties: {
        slug: place.slug,
        name: place.name,
        kind: "region",
        source: "stats-nz-ta-2023",
        officialName: official,
      },
      geometry: simplifyGeometry(f.geometry, 0.0035),
    });
  }

  // Re-link cities → district parentSlug by name (ascii fold)
  const regionByName = new Map(
    regionPlaces.map((r) => [
      r.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
      r,
    ]),
  );

  const updatedRest = nonRegions.map((p) => {
    if (p.kind !== "city" || !p.district) return p;
    const key = p.district
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    // Auckland special case
    const parent =
      key === "auckland"
        ? regionByName.get("auckland")
        : regionByName.get(key);
    if (!parent) return p;
    return {
      ...p,
      parentSlug: parent.slug,
      district: parent.name,
    };
  });

  // Suburbs keep parentSlug to city; re-link district name if present
  const citiesBySlug = new Map(
    updatedRest.filter((p) => p.kind === "city").map((p) => [p.slug, p]),
  );
  const withSuburbs = updatedRest.map((p) => {
    if (p.kind !== "suburb" || !p.parentSlug) return p;
    const city = citiesBySlug.get(p.parentSlug);
    if (!city) return p;
    return {
      ...p,
      district: city.district,
      region: city.region,
    };
  });

  const allPlaces = [...regionPlaces, ...withSuburbs];

  // Boundaries: keep city + suburb features; replace all region features
  const boundsPath = path.join(OUT_DIR, "boundaries.json");
  const existingBounds = (await Bun.file(boundsPath).json()) as FeatureCollection;
  const nonRegionBounds = existingBounds.features.filter(
    (f) => f.properties?.kind !== "region",
  );
  const boundaries: FeatureCollection = {
    type: "FeatureCollection",
    features: [...regionFeatures, ...nonRegionBounds],
  };

  const metaPath = path.join(OUT_DIR, "metadata.json");
  const meta = (await Bun.file(metaPath).json()) as Record<string, unknown>;
  meta.regionCount = regionPlaces.length;
  meta.cityCount = withSuburbs.filter((p) => p.kind === "city").length;
  meta.suburbCount = withSuburbs.filter((p) => p.kind === "suburb").length;
  meta.boundaryOfficial = boundaries.features.filter(
    (f) => String(f.properties?.source ?? "").startsWith("stats-nz"),
  ).length;
  meta.lastUpdated = new Date().toISOString().slice(0, 10);
  meta.notes =
    "Districts: all 67 Stats NZ Territorial Authorities 2023 (full coverage). Cities/towns: selected Urban Rural 2023 settlements. Suburbs: SA2 2023 under each city. Boundaries generalised for web. Metrics for non-curated TAs are seeded fixtures until HUD/MBIE ingest is complete.";

  await Bun.write(
    path.join(OUT_DIR, "places.json"),
    JSON.stringify(allPlaces, null, 2) + "\n",
  );
  await Bun.write(boundsPath, JSON.stringify(boundaries));
  await Bun.write(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `✓ expand-districts — ${regionPlaces.length} TAs (all), cities ${meta.cityCount}, suburbs ${meta.suburbCount}`,
  );
  console.log(
    `  boundaries: ${boundaries.features.length} features, ${(Bun.file(boundsPath).size / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
