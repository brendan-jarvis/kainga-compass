/** Percentile rank 0–100. Higher raw value = higher score when `higherIsBetter`. */
export function percentileRank(
  value: number,
  allValues: number[],
  higherIsBetter = true,
): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);
  const rank = index === -1 ? sorted.length - 1 : index;
  const percentile = (rank / Math.max(sorted.length - 1, 1)) * 100;
  return higherIsBetter ? percentile : 100 - percentile;
}

/** Average percentile across multiple inverted metrics (lower raw = better). */
export function invertedPercentile(
  value: number,
  allValues: number[],
): number {
  return percentileRank(value, allValues, false);
}

export function averageScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
