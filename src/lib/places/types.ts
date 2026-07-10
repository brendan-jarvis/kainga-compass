export const DIMENSIONS = [
  "affordability",
  "growth",
  "career",
  "lifestyle",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export type PresetId = "laid-back" | "career" | "investor" | "custom";

export type Weights = Record<Dimension, number>;

export type TerritoryMetrics = {
  medianRentWeek: number;
  medianHousePrice: number;
  medianMultiple: number;
  rentYoY: number;
  priceYoY: number;
  medianIncome: number;
  populationDensity: number;
};

export type Territory = {
  slug: string;
  name: string;
  region: string;
  metrics: TerritoryMetrics;
  proxies?: Dimension[];
};

export type DimensionScores = Record<Dimension, number>;

export type ScoredTerritory = Territory & {
  dimensionScores: DimensionScores;
  matchScore: number;
};

export type PlacesMetadata = {
  lastUpdated: string;
  sources: string[];
  cityCount: number;
};
