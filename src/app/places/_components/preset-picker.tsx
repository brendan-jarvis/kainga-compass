"use client";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { PRESETS } from "~/lib/places/presets";
import type { PresetId } from "~/lib/places/types";

export function PresetPicker({
  value,
  onChange,
}: {
  value: PresetId;
  onChange: (id: PresetId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => {
        const active = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            title={preset.description}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                : "border-border bg-card text-muted-foreground hover:border-emerald-500/30 hover:text-foreground",
            )}
          >
            {preset.label}
          </button>
        );
      })}
      {value === "custom" && (
        <Badge variant="secondary" className="self-center">
          Custom weights
        </Badge>
      )}
    </div>
  );
}
