import type { Dimension, PresetId, Weights } from "./types";

export type PresetDefinition = {
  id: PresetId;
  label: string;
  description: string;
  weights: Weights;
};

export const PRESETS: PresetDefinition[] = [
  {
    id: "laid-back",
    label: "Laid-back & affordable",
    description: "Low cost of living and relaxed pace over career hustle.",
    weights: {
      affordability: 0.4,
      growth: 0.05,
      career: 0.15,
      lifestyle: 0.4,
    },
  },
  {
    id: "career",
    label: "Career & social",
    description: "Strong earnings and job market opportunities.",
    weights: {
      affordability: 0.15,
      growth: 0.15,
      career: 0.45,
      lifestyle: 0.25,
    },
  },
  {
    id: "investor",
    label: "Investor",
    description: "Housing momentum and growth potential.",
    weights: {
      affordability: 0.1,
      growth: 0.5,
      career: 0.25,
      lifestyle: 0.15,
    },
  },
];

export const DEFAULT_WEIGHTS: Weights = PRESETS[0]!.weights;

export const DIMENSION_LABELS: Record<
  Dimension,
  string
> = {
  affordability: "Affordability",
  growth: "Growth",
  career: "Career",
  lifestyle: "Lifestyle",
};

export function getPresetWeights(id: PresetId): Weights {
  if (id === "custom") return { ...DEFAULT_WEIGHTS };
  return { ...PRESETS.find((p) => p.id === id)?.weights ?? DEFAULT_WEIGHTS };
}

export function normalizeWeights(weights: Weights): Weights {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return { ...DEFAULT_WEIGHTS };
  return {
    affordability: weights.affordability / sum,
    growth: weights.growth / sum,
    career: weights.career / sum,
    lifestyle: weights.lifestyle / sum,
  };
}
