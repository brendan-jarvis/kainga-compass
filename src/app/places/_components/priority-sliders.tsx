"use client";

import { Slider } from "~/components/ui/slider";
import {
  DIMENSION_HINTS,
  DIMENSION_LABELS,
  percentsToWeights,
  weightsToPercents,
} from "~/lib/places/presets";
import { DIMENSIONS, type Dimension, type Weights } from "~/lib/places/types";
import { cn } from "~/lib/utils";

function snapPercent(value: number): number {
  if (value >= 98) return 100;
  if (value <= 2) return 0;
  return Math.min(100, Math.max(0, Math.round(value / 5) * 5));
}

export function PrioritySliders({
  weights,
  onChange,
  compact = false,
}: {
  weights: Weights;
  onChange: (next: Weights) => void;
  /** Dense multi-column layout for a horizontal toolbar. */
  compact?: boolean;
}) {
  const percents = weightsToPercents(weights);

  const setDimension = (dimension: Dimension, raw: number) => {
    const value = snapPercent(raw);
    const nextPercents = { ...percents, [dimension]: value };

    const others = DIMENSIONS.filter((d) => d !== dimension);
    const remaining = 100 - value;
    const othersSum = others.reduce((s, d) => s + percents[d], 0);

    if (remaining === 0) {
      for (const d of others) nextPercents[d] = 0;
    } else if (othersSum === 0) {
      const base = Math.floor(remaining / others.length);
      let leftover = remaining - base * others.length;
      for (const d of others) {
        nextPercents[d] = base + (leftover > 0 ? 1 : 0);
        leftover -= 1;
      }
    } else {
      let allocated = 0;
      const floored = others.map((d) => {
        const exact = (percents[d] / othersSum) * remaining;
        const floor = Math.floor(exact);
        allocated += floor;
        return { d, floor, frac: exact - floor };
      });
      floored.sort((a, b) => b.frac - a.frac);
      let left = remaining - allocated;
      for (const row of floored) {
        nextPercents[row.d] = row.floor + (left > 0 ? 1 : 0);
        if (left > 0) left -= 1;
      }
    }

    onChange(percentsToWeights(nextPercents));
  };

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-5")}>
      {!compact && (
        <div>
          <p className="text-foreground text-sm font-medium">Priorities</p>
          <p className="text-muted-foreground text-sm">
            Drag a slider — others rebalance so weights always total 100%.
          </p>
        </div>
      )}
      <div
        className={cn(
          compact
            ? "grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            : "space-y-5",
        )}
      >
        {DIMENSIONS.map((dimension) => {
          const pct = percents[dimension];
          return (
            <div key={dimension} className={cn(compact ? "space-y-1.5" : "space-y-2")}>
              <div
                className={cn(
                  "flex items-center justify-between gap-2",
                  compact ? "text-sm" : "text-base",
                )}
              >
                <label
                  htmlFor={`weight-${dimension}`}
                  className="text-foreground font-medium"
                  title={DIMENSION_HINTS[dimension]}
                >
                  {DIMENSION_LABELS[dimension]}
                </label>
                <span className="text-muted-foreground tabular-nums">{pct}%</span>
              </div>
              <Slider
                id={`weight-${dimension}`}
                min={0}
                max={100}
                step={1}
                value={[pct]}
                onValueChange={(vals: number | readonly number[]) => {
                  const next = typeof vals === "number" ? vals : vals[0];
                  if (typeof next === "number") setDimension(dimension, next);
                }}
              />
              {!compact && (
                <p className="text-muted-foreground text-xs">
                  {DIMENSION_HINTS[dimension]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
