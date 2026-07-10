import { averageScores, invertedPercentile, percentileRank } from "./normalize";
import { normalizeWeights } from "./presets";
import type {
  Dimension,
  DimensionScores,
  ScoredTerritory,
  Territory,
  Weights,
} from "./types";

function computeDimensionScores(territories: Territory[]): Map<string, DimensionScores> {
  const rents = territories.map((t) => t.metrics.medianRentWeek);
  const multiples = territories.map((t) => t.metrics.medianMultiple);
  const prices = territories.map((t) => t.metrics.medianHousePrice);
  const rentYoY = territories.map((t) => t.metrics.rentYoY);
  const priceYoY = territories.map((t) => t.metrics.priceYoY);
  const incomes = territories.map((t) => t.metrics.medianIncome);
  const densities = territories.map((t) => t.metrics.populationDensity);

  const result = new Map<string, DimensionScores>();

  for (const territory of territories) {
    const m = territory.metrics;
    const affordability = averageScores([
      invertedPercentile(m.medianRentWeek, rents),
      invertedPercentile(m.medianMultiple, multiples),
      invertedPercentile(m.medianHousePrice, prices),
    ]);
    const growth = averageScores([
      percentileRank(m.rentYoY, rentYoY, true),
      percentileRank(m.priceYoY, priceYoY, true),
    ]);
    const career = percentileRank(m.medianIncome, incomes, true);
    const lifestyle = invertedPercentile(m.populationDensity, densities);

    result.set(territory.slug, {
      affordability,
      growth,
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
  const score =
    w.affordability * dimensionScores.affordability +
    w.growth * dimensionScores.growth +
    w.career * dimensionScores.career +
    w.lifestyle * dimensionScores.lifestyle;
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

const DIMENSIONS: Dimension[] = [
  "affordability",
  "growth",
  "career",
  "lifestyle",
];

export function serializeWeights(weights: Weights): string {
  return DIMENSIONS.map((d) => Math.round(weights[d] * 100)).join(",");
}

export function parseWeights(raw: string | null | undefined): Weights | null {
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const total = parts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return normalizeWeights({
    affordability: parts[0]! / total,
    growth: parts[1]! / total,
    career: parts[2]! / total,
    lifestyle: parts[3]! / total,
  });
}
