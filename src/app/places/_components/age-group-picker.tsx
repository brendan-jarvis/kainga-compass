"use client";

import { cn } from "~/lib/utils";
import { AGE_GROUPS, type AgeGroupId } from "~/lib/places/age-groups";

export function AgeGroupPicker({
  value,
  onChange,
}: {
  value: AgeGroupId;
  onChange: (id: AgeGroupId) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Age group for earnings ranking"
      className="flex flex-wrap gap-1.5"
    >
      {AGE_GROUPS.map((group) => {
        const active = value === group.id;
        return (
          <button
            key={group.id}
            type="button"
            title={group.description}
            onClick={() => onChange(group.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
