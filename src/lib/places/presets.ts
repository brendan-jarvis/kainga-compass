import { DIMENSIONS, type Dimension, type PresetId, type Weights } from "./types";

export type PresetDefinition = {
  id: Exclude<PresetId, "custom">;
  label: string;
  description: string;
  weights: Weights;
};

export const PRESETS: PresetDefinition[] = [
  {
    id: "laid-back",
    label: "Laid-back & affordable",
    description: "Low cost of living and a relaxed pace over hustle.",
    weights: {
      affordability: 0.4,
      housingGrowth: 0.05,
      jobGrowth: 0.05,
      populationGrowth: 0.05,
      career: 0.1,
      lifestyle: 0.35,
    },
  },
  {
    id: "career",
    label: "Career & earnings",
    description: "Strong pay and job market growth for working life.",
    weights: {
      affordability: 0.15,
      housingGrowth: 0.05,
      jobGrowth: 0.25,
      populationGrowth: 0.1,
      career: 0.35,
      lifestyle: 0.1,
    },
  },
  {
    id: "family",
    label: "Family",
    description: "Affordable living with room to breathe and stable growth.",
    weights: {
      affordability: 0.3,
      housingGrowth: 0.05,
      jobGrowth: 0.15,
      populationGrowth: 0.15,
      career: 0.15,
      lifestyle: 0.2,
    },
  },
  {
    id: "first-home",
    label: "First home buyer",
    description: "Prioritise lower prices and rent while still getting work.",
    weights: {
      affordability: 0.5,
      housingGrowth: 0.05,
      jobGrowth: 0.1,
      populationGrowth: 0.05,
      career: 0.2,
      lifestyle: 0.1,
    },
  },
  {
    id: "property-investor",
    label: "Property investor",
    description:
      "Housing market momentum (price & rent growth) plus local demand signals.",
    weights: {
      affordability: 0.1,
      housingGrowth: 0.4,
      jobGrowth: 0.15,
      populationGrowth: 0.2,
      career: 0.1,
      lifestyle: 0.05,
    },
  },
  {
    id: "growing-town",
    label: "Growing town",
    description:
      "Places where people and jobs are expanding — not just house prices.",
    weights: {
      affordability: 0.15,
      housingGrowth: 0.1,
      jobGrowth: 0.3,
      populationGrowth: 0.3,
      career: 0.1,
      lifestyle: 0.05,
    },
  },
  {
    id: "remote",
    label: "Remote-friendly",
    description: "Lifestyle and affordability first; career less critical.",
    weights: {
      affordability: 0.3,
      housingGrowth: 0.05,
      jobGrowth: 0.05,
      populationGrowth: 0.05,
      career: 0.1,
      lifestyle: 0.45,
    },
  },
  {
    id: "retiree",
    label: "Retiree",
    description: "Affordable, lower-intensity places with calmer growth.",
    weights: {
      affordability: 0.4,
      housingGrowth: 0.05,
      jobGrowth: 0.05,
      populationGrowth: 0.05,
      career: 0.05,
      lifestyle: 0.4,
    },
  },
];

export const DEFAULT_WEIGHTS: Weights = PRESETS[0]!.weights;

export const DIMENSION_LABELS: Record<Dimension, string> = {
  affordability: "Affordability",
  housingGrowth: "Housing growth",
  jobGrowth: "Job growth",
  populationGrowth: "Population growth",
  career: "Earnings",
  lifestyle: "Lifestyle",
};

export const DIMENSION_HINTS: Record<Dimension, string> = {
  affordability: "Lower rent, house prices, and price-to-income multiple.",
  housingGrowth: "Year-on-year rent and house price increases (market momentum).",
  jobGrowth: "Employment / filled-jobs growth in the local market.",
  populationGrowth: "How fast the resident population is expanding.",
  career: "Median annual earnings for filled jobs (LEED-style).",
  lifestyle: "Lower density as a simple space / pace proxy.",
};

export function getPresetWeights(id: PresetId): Weights {
  if (id === "custom") return { ...DEFAULT_WEIGHTS };
  return { ...PRESETS.find((p) => p.id === id)?.weights ?? DEFAULT_WEIGHTS };
}

export function normalizeWeights(weights: Weights): Weights {
  const sum = DIMENSIONS.reduce((acc, d) => acc + (weights[d] ?? 0), 0);
  if (sum === 0) return { ...DEFAULT_WEIGHTS };
  const next = {} as Weights;
  for (const d of DIMENSIONS) {
    next[d] = (weights[d] ?? 0) / sum;
  }
  return next;
}

/** Integer 0–100 percents that always sum to 100 (largest remainder). */
export function weightsToPercents(weights: Weights): Record<Dimension, number> {
  const w = normalizeWeights(weights);
  const raw = DIMENSIONS.map((d) => ({
    d,
    exact: w[d] * 100,
    floor: Math.floor(w[d] * 100),
  }));
  let used = raw.reduce((s, r) => s + r.floor, 0);
  const ranked = [...raw].sort(
    (a, b) => b.exact - b.floor - (a.exact - a.floor),
  );
  const result = {} as Record<Dimension, number>;
  for (const r of raw) result[r.d] = r.floor;
  let i = 0;
  while (used < 100 && i < ranked.length) {
    result[ranked[i]!.d] += 1;
    used += 1;
    i += 1;
  }
  return result;
}

export function percentsToWeights(
  percents: Record<Dimension, number>,
): Weights {
  const next = {} as Weights;
  for (const d of DIMENSIONS) {
    next[d] = (percents[d] ?? 0) / 100;
  }
  return normalizeWeights(next);
}

export function weightsEqual(a: Weights, b: Weights, eps = 0.03): boolean {
  return DIMENSIONS.every((d) => Math.abs(a[d] - b[d]) < eps);
}

export function matchPresetId(weights: Weights): PresetId {
  const match = PRESETS.find((p) => weightsEqual(weights, p.weights));
  return match?.id ?? "custom";
}
