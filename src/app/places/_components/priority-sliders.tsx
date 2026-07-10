"use client";

import { Slider } from "~/components/ui/slider";
import { DIMENSION_LABELS } from "~/lib/places/presets";
import { DIMENSIONS, type Dimension, type Weights } from "~/lib/places/types";

export function PrioritySliders({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (next: Weights) => void;
}) {
  const setDimension = (dimension: Dimension, value: number) => {
    onChange({ ...weights, [dimension]: value / 100 });
  };

  return (
    <div className="space-y-5">
      {DIMENSIONS.map((dimension) => {
        const pct = Math.round(weights[dimension] * 100);
        return (
          <div key={dimension} className="space-y-2">
            <div className="flex items-center justify-between text-base">
              <label
                htmlFor={`weight-${dimension}`}
                className="text-foreground font-medium"
              >
                {DIMENSION_LABELS[dimension]}
              </label>
              <span className="text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <Slider
              id={`weight-${dimension}`}
              min={0}
              max={100}
              step={5}
              value={[pct]}
              onValueChange={(vals: number | readonly number[]) => {
                const next = typeof vals === "number" ? vals : vals[0];
                if (typeof next === "number") setDimension(dimension, next);
              }}
            />
          </div>
        );
      })}
      <p className="text-muted-foreground text-sm">
        Weights are normalised so they always sum to 100% when scoring.
      </p>
    </div>
  );
}
