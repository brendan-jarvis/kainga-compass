"use client";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { PRESETS } from "~/lib/places/presets";
import type { PresetId } from "~/lib/places/types";

export function PresetPicker({
  value,
  onChange,
  compact = false,
}: {
  value: PresetId;
  onChange: (id: PresetId) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
      {!compact && (
        <div>
          <p className="text-foreground text-sm font-medium">Presets</p>
          <p className="text-muted-foreground text-sm">
            Life-stage shortcuts — tweak priorities after if you like.
          </p>
        </div>
      )}
      {compact && (
        <p className="text-foreground text-sm font-medium">Presets</p>
      )}
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
              className={cn(
                "rounded-full border px-2.5 py-1 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        {value === "custom" && (
          <Badge
            variant="secondary"
            className="self-center rounded-full px-2.5 py-1 text-sm font-medium"
          >
            Custom
          </Badge>
        )}
      </div>
    </div>
  );
}
