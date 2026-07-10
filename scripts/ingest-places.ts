/**
 * Build-time places ingest for Kāinga Compass MVP.
 *
 * Currently validates / rewrites the committed fixture set and regenerates
 * simplified boundary GeoJSON. Wire live HUD/MBIE parsers here when ready:
 *   - MBIE ta-median-rents CSV
 *   - HUD Local Housing Statistics XLSX
 *
 * Usage: bun run ingest:places
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import regions from "../src/data/places/regions.json";
import type { Territory } from "../src/lib/places/types";

const OUT_DIR = path.join(import.meta.dir, "../src/data/places");

/** Approximate centroids [lng, lat, radius°] for simplified choropleth polygons. */
const CENTROIDS: Record<string, [number, number, number]> = {
  auckland: [174.7633, -36.8485, 0.45],
  "wellington-city": [174.7762, -41.2865, 0.18],
  "christchurch-city": [172.6362, -43.5321, 0.35],
  "hamilton-city": [175.2793, -37.787, 0.18],
  "tauranga-city": [176.1651, -37.6878, 0.2],
  "dunedin-city": [170.5036, -45.8788, 0.28],
  "palmerston-north-city": [175.611, -40.3523, 0.16],
  "napier-city": [176.912, -39.4928, 0.14],
  "nelson-city": [173.284, -41.2706, 0.12],
  "invercargill-city": [168.3475, -46.4132, 0.16],
  "lower-hutt-city": [174.907, -41.209, 0.12],
  "upper-hutt-city": [175.0708, -41.1244, 0.14],
  "porirua-city": [174.8406, -41.1333, 0.12],
  "new-plymouth-district": [174.075, -39.057, 0.22],
  "rotorua-district": [176.2497, -38.1368, 0.25],
  "whangarei-district": [174.3237, -35.7251, 0.28],
  "hastings-district": [176.8392, -39.6396, 0.22],
  "queenstown-lakes-district": [168.6626, -45.0312, 0.35],
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

function buildBoundaries(territories: Territory[]) {
  return {
    type: "FeatureCollection" as const,
    features: territories.map((t) => {
      const c = CENTROIDS[t.slug] ?? [174.0, -41.0, 0.15];
      const [lng, lat, r] = c;
      return {
        type: "Feature" as const,
        properties: {
          slug: t.slug,
          name: t.name,
          TA2023_V1_: t.name,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring(lng, lat, r)],
        },
      };
    }),
  };
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
  ] as const;

  for (const t of territories) {
    if (!t.slug || !t.name) {
      throw new Error(`Territory missing slug/name: ${JSON.stringify(t)}`);
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

async function main() {
  const territories = regions as Territory[];
  validate(territories);

  await mkdir(OUT_DIR, { recursive: true });

  const metadata = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    sources: [
      "MBIE Tenancy Services — Rental bond data (median weekly rent by TA)",
      "HUD Local Housing Statistics — median sale price, median multiple",
      "Stats NZ / regional income estimates (career metric; flagged as regional proxy where noted)",
      "Stats NZ Census-derived population density estimates",
    ],
    cityCount: territories.length,
    notes:
      "MVP fixture figures are indicative and rounded for demo ranking. Career income is a regional proxy for most TAs. Replace with live HUD/MBIE parsers when available.",
  };

  await Bun.write(
    path.join(OUT_DIR, "regions.json"),
    JSON.stringify(territories, null, 2) + "\n",
  );
  await Bun.write(
    path.join(OUT_DIR, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
  await Bun.write(
    path.join(OUT_DIR, "boundaries.json"),
    JSON.stringify(buildBoundaries(territories)),
  );

  console.log(
    `✓ ingest:places — ${territories.length} territories → src/data/places/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
