"use client";

import { Slider } from "~/components/ui/slider";
import {
  DIMENSION_HINTS,
  DIMENSION_LABELS,
  percentsToWeights,
  weightsToPercents,
} from "~/lib/places/presets";
import { DIMENSIONS, type Dimension, type Weights } from "~/lib/places/types";

function snapPercent(value: number): number {
  // Force true 0 and 100 at the ends; snap to 5% steps in between.
  if (value >= 98) return 100;
  if (value <= 2) return 0;
  return Math.min(100, Math.max(0, Math.round(value / 5) * 5));
}

export function PrioritySliders({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (next: Weights) => void;
}) {
  // Integer percents that always sum to 100 — avoids 99%/0%/0% display bugs.
  const percents = weightsToPercents(weights);

  const setDimension = (dimension: Dimension, raw: number) => {
    const value = snapPercent(raw);
    const nextPercents = { ...percents, [dimension]: value };

    // Keep other dimensions' relative share of the remaining budget.
    const others = DIMENSIONS.filter((d) => d !== dimension);
    const remaining = 100 - value;
    const othersSum = others.reduce((s, d) => s + percents[d], 0);

    if (remaining === 0) {
      for (const d of others) nextPercents[d] = 0;
    } else if (othersSum === 0) {
      // Spread evenly when everything else was zero.
      const base = Math.floor(remaining / others.length);
      let leftover = remaining - base * others.length;
      for (const d of others) {
        nextPercents[d] = base + (leftover > 0 ? 1 : 0);
        leftover -= 1;
      }
    } else {
      // Redistribute remaining proportional to current other weights.
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
    <div className="space-y-5">
      <div>
        <p className="text-foreground text-sm font-medium">Priorities</p>
        <p className="text-muted-foreground text-sm">
          Drag a slider — others rebalance so weights always total 100%.
        </p>
      </div>
      {DIMENSIONS.map((dimension) => {
        const pct = percents[dimension];
        return (
          <div key={dimension} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-base">
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
            <p className="text-muted-foreground text-xs">
              {DIMENSION_HINTS[dimension]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
