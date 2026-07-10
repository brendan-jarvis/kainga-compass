export const DIMENSIONS = [
  "affordability",
  "housingGrowth",
  "jobGrowth",
  "populationGrowth",
  "career",
  "lifestyle",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/** City/town settlement vs council district (TA) aggregate. */
export type PlaceKind = "city" | "region";

export const PLACE_KINDS = ["city", "region"] as const;

export const PRESET_IDS = [
  "laid-back",
  "career",
  "family",
  "first-home",
  "property-investor",
  "growing-town",
  "remote",
  "retiree",
  "custom",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export type Weights = Record<Dimension, number>;

/** Age-band earnings — LEED-style proxy for experience (Stats NZ publishes age, not years of service). */
export type EarningsAgeBand = {
  label: string;
  medianAnnual: number;
  meanAnnual: number;
};

export type TerritoryMetrics = {
  medianRentWeek: number;
  medianHousePrice: number;
  medianMultiple: number;
  rentYoY: number;
  priceYoY: number;
  /** Household income estimate (used with house-price multiple). */
  medianIncome: number;
  /** LEED-style median annual earnings for filled jobs. */
  medianEarningsAnnual: number;
  /** LEED-style mean annual earnings for filled jobs (average salary). */
  meanEarningsAnnual: number;
  /** Earnings by age group — best public proxy for career stage / experience. */
  earningsByAge: EarningsAgeBand[];
  populationDensity: number;
  /** Approximate annual population change (0.02 = +2%). */
  populationGrowthYoY: number;
  /** Approximate annual filled-jobs / employment change. */
  jobsGrowthYoY: number;
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
  /** Features matched to Stats NZ official polygons. */
  boundaryOfficial?: number;
  /** Features using fallback centroid circles. */
  boundaryFallback?: number;
};
