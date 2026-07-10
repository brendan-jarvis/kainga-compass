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
    <div className="space-y-2">
      <div>
        <p className="text-foreground text-sm font-medium">Presets</p>
        <p className="text-muted-foreground text-sm">
          Life-stage shortcuts — tweak priorities after if you like.
        </p>
      </div>
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
                "rounded-full border px-3 py-1.5 text-base transition-colors",
                active
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
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
    </div>
  );
}
