import type { EarningsAgeBand, Territory } from "./types";

/** Stable URL/id keys for age filters. */
export const AGE_GROUP_IDS = [
  "all",
  "15-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
] as const;

export type AgeGroupId = (typeof AGE_GROUP_IDS)[number];

export type AgeGroupDefinition = {
  id: AgeGroupId;
  /** Chip label in the UI */
  label: string;
  /** Matches `earningsByAge[].label` when not "all" */
  dataLabel?: string;
  description: string;
};

export const AGE_GROUPS: AgeGroupDefinition[] = [
  {
    id: "all",
    label: "All ages",
    description: "Overall mean/median earnings for all filled jobs.",
  },
  {
    id: "15-24",
    label: "15–24",
    dataLabel: "15–24 years",
    description: "Early career — rank places by earnings in this age band.",
  },
  {
    id: "25-34",
    label: "25–34",
    dataLabel: "25–34 years",
    description: "Rank places by earnings typical for this age band.",
  },
  {
    id: "35-44",
    label: "35–44",
    dataLabel: "35–44 years",
    description: "Rank places by earnings typical for this age band.",
  },
  {
    id: "45-54",
    label: "45–54",
    dataLabel: "45–54 years",
    description: "Rank places by earnings typical for this age band.",
  },
  {
    id: "55-64",
    label: "55–64",
    dataLabel: "55–64 years",
    description: "Late-career band — rank places by earnings here.",
  },
];

export function getAgeGroup(id: AgeGroupId): AgeGroupDefinition {
  return AGE_GROUPS.find((g) => g.id === id) ?? AGE_GROUPS[0]!;
}

export function getEarningsBand(
  territory: Territory,
  ageGroup: AgeGroupId,
): EarningsAgeBand | null {
  if (ageGroup === "all") return null;
  const def = getAgeGroup(ageGroup);
  if (!def.dataLabel) return null;
  return (
    territory.metrics.earningsByAge.find((b) => b.label === def.dataLabel) ??
    null
  );
}

/** Earnings used for career scoring and salary display. */
export function getRelevantEarnings(
  territory: Territory,
  ageGroup: AgeGroupId = "all",
): { medianAnnual: number; meanAnnual: number; bandLabel: string | null } {
  const band = getEarningsBand(territory, ageGroup);
  if (band) {
    return {
      medianAnnual: band.medianAnnual,
      meanAnnual: band.meanAnnual,
      bandLabel: band.label,
    };
  }
  return {
    medianAnnual: territory.metrics.medianEarningsAnnual,
    meanAnnual: territory.metrics.meanEarningsAnnual,
    bandLabel: null,
  };
}
