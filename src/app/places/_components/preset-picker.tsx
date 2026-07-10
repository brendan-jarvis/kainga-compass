"use client";

import { cn } from "~/lib/utils";
import { PRESETS } from "~/lib/places/presets";
import type { PresetId } from "~/lib/places/types";

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-2.5 py-1 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );

export function PresetPicker({
  value,
  onChange,
}: {
  value: PresetId;
  onChange: (id: PresetId) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Life-stage presets"
      className="flex flex-wrap gap-1.5"
    >
      {PRESETS.map((preset) => {
        const active = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            title={preset.description}
            className={chipClass(active)}
          >
            {preset.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange("custom")}
        title="Balanced starting point — drag the sliders to make it yours."
        className={chipClass(value === "custom")}
      >
        Custom
      </button>
    </div>
  );
}
