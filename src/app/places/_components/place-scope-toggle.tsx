"use client";

import { cn } from "~/lib/utils";
import type { PlaceKind } from "~/lib/places/types";

const OPTIONS: { id: PlaceKind; label: string; description: string }[] = [
  {
    id: "city",
    label: "Cities & towns",
    description: "Settlements people move between (e.g. Queenstown vs Wānaka)",
  },
  {
    id: "region",
    label: "Districts",
    description: "Territorial authority council areas (official housing stats)",
  },
];

export function PlaceScopeToggle({
  value,
  onChange,
}: {
  value: PlaceKind;
  onChange: (kind: PlaceKind) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-foreground text-sm font-medium">Geography</p>
      <div
        role="group"
        aria-label="Place geography scope"
        className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={opt.description}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-sm">
        {OPTIONS.find((o) => o.id === value)?.description}
      </p>
    </div>
  );
}
