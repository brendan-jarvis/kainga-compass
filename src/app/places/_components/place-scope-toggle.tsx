"use client";

import { cn } from "~/lib/utils";

export type ExplorerScope = "city" | "region";

const OPTIONS: { id: ExplorerScope; label: string; description: string }[] = [
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
  compact = false,
}: {
  value: ExplorerScope;
  onChange: (kind: ExplorerScope) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2")}>
      {!compact && (
        <p className="text-foreground text-sm font-medium">Geography</p>
      )}
      <div
        role="group"
        aria-label="Place geography scope"
        className="bg-muted inline-grid grid-cols-2 gap-1 rounded-lg p-1"
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={opt.description}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="text-muted-foreground text-sm">
          {OPTIONS.find((o) => o.id === value)?.description}
        </p>
      )}
    </div>
  );
}
