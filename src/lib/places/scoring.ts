import { averageScores, invertedPercentile, percentileRank } from "./normalize";
import { normalizeWeights } from "./presets";
import {
  DIMENSIONS,
  type Dimension,
  type DimensionScores,
  type ScoredTerritory,
  type Territory,
  type Weights,
} from "./types";

function computeDimensionScores(
  territories: Territory[],
): Map<string, DimensionScores> {
  const rents = territories.map((t) => t.metrics.medianRentWeek);
  const multiples = territories.map((t) => t.metrics.medianMultiple);
  const prices = territories.map((t) => t.metrics.medianHousePrice);
  const rentYoY = territories.map((t) => t.metrics.rentYoY);
  const priceYoY = territories.map((t) => t.metrics.priceYoY);
  const earnings = territories.map((t) => t.metrics.medianEarningsAnnual);
  const densities = territories.map((t) => t.metrics.populationDensity);
  const popGrowth = territories.map((t) => t.metrics.populationGrowthYoY);
  const jobsGrowth = territories.map((t) => t.metrics.jobsGrowthYoY);

  const result = new Map<string, DimensionScores>();

  for (const territory of territories) {
    const m = territory.metrics;
    const affordability = averageScores([
      invertedPercentile(m.medianRentWeek, rents),
      invertedPercentile(m.medianMultiple, multiples),
      invertedPercentile(m.medianHousePrice, prices),
    ]);
    const housingGrowth = averageScores([
      percentileRank(m.rentYoY, rentYoY, true),
      percentileRank(m.priceYoY, priceYoY, true),
    ]);
    const jobGrowth = percentileRank(m.jobsGrowthYoY, jobsGrowth, true);
    const populationGrowth = percentileRank(
      m.populationGrowthYoY,
      popGrowth,
      true,
    );
    // Career/earnings dimension: median filled-job earnings (LEED-style)
    const career = percentileRank(m.medianEarningsAnnual, earnings, true);
    const lifestyle = invertedPercentile(m.populationDensity, densities);

    result.set(territory.slug, {
      affordability,
      housingGrowth,
      jobGrowth,
      populationGrowth,
      career,
      lifestyle,
    });
  }

  return result;
}

export function computeMatchScore(
  dimensionScores: DimensionScores,
  weights: Weights,
): number {
  const w = normalizeWeights(weights);
  let score = 0;
  for (const d of DIMENSIONS) {
    score += w[d] * dimensionScores[d];
  }
  return Math.round(score);
}

export function scoreTerritories(
  territories: Territory[],
  weights: Weights,
): ScoredTerritory[] {
  const dimensionScoreMap = computeDimensionScores(territories);
  const scored = territories.map((territory) => {
    const dimensionScores = dimensionScoreMap.get(territory.slug)!;
    return {
      ...territory,
      dimensionScores,
      matchScore: computeMatchScore(dimensionScores, weights),
    };
  });
  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

export function serializeWeights(weights: Weights): string {
  const w = normalizeWeights(weights);
  return DIMENSIONS.map((d) => Math.round(w[d] * 100)).join(",");
}

export function parseWeights(raw: string | null | undefined): Weights | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;

  // New format: 6 dimensions
  if (parts.length === DIMENSIONS.length) {
    const total = parts.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const weights = {} as Weights;
    DIMENSIONS.forEach((d, i) => {
      weights[d] = parts[i]! / total;
    });
    return normalizeWeights(weights);
  }

  // Legacy 4-dim: affordability, growth, career, lifestyle
  // Map old "growth" into housingGrowth primarily.
  if (parts.length === 4) {
    const total = parts.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return normalizeWeights({
      affordability: parts[0]! / total,
      housingGrowth: parts[1]! / total,
      jobGrowth: (parts[1]! / total) * 0.25,
      populationGrowth: (parts[1]! / total) * 0.25,
      career: parts[2]! / total,
      lifestyle: parts[3]! / total,
    });
  }

  return null;
}

export function emptyWeights(): Weights {
  return Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Weights;
}

export type { Dimension };
