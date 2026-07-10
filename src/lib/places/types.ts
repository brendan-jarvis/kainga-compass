export const DIMENSIONS = [
  "affordability",
  "growth",
  "career",
  "lifestyle",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/** City/town settlement vs council district (TA) aggregate. */
export type PlaceKind = "city" | "region";

export const PLACE_KINDS = ["city", "region"] as const;

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
  /** Settlement (city/town) or territorial authority district. */
  kind: PlaceKind;
  /** Regional council area (e.g. Otago, Wellington). */
  region: string;
  /** Parent TA name when kind is city (for cross-links / context). */
  district?: string;
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
  regionCount: number;
  notes?: string;
};
