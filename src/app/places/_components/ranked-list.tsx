"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  formatCurrency,
  formatMultiple,
  formatRent,
  formatSalary,
} from "~/lib/places/format";
import type { ScoredTerritory } from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { MatchScoreBadge } from "./match-score-badge";

const COLUMN_HELP = {
  rank: "Position in the list for your current priority weights — #1 is the best match among the places shown.",
  place:
    "City, town, or district name. Tap the name for a full detail page; tap the row to focus it on the map.",
  match:
    "Personalised Match Score (0–100) from your priority weights across affordability, growth, earnings, and lifestyle. Higher is a better fit for you — not an official ranking of the best places to live.",
  salary:
    "Mean (average) annual earnings for filled jobs in this area — a LEED-style average salary indicator. Mean is often higher than the median because high earners pull the average up.",
  rent: "Median weekly rent from tenancy bond data (or fixture estimates). Lower usually means more affordable housing costs.",
  price:
    "Median house sale price for the area. Used with income to gauge how expensive ownership is relative to local pay.",
  multiple:
    "Median house price ÷ median household income. A common affordability rule of thumb: lower multiples are generally more affordable for buyers.",
} as const;

function HeaderTip({
  label,
  tip,
  align = "left",
}: {
  label: string;
  tip: string;
  align?: "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "text-muted-foreground hover:text-foreground inline-flex cursor-help items-center gap-1 border-0 bg-transparent p-0 text-inherit font-medium",
          align === "right" && "ml-auto",
        )}
      >
        <span>{label}</span>
        <HelpCircle className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="sr-only"> — more info</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function RankedList({
  territories,
  queryString,
  focusedSlug,
  onHover,
  onFocus,
}: {
  territories: ScoredTerritory[];
  queryString?: string;
  focusedSlug?: string | null;
  onHover?: (slug: string | null) => void;
  /** Zoom/highlight this place on the map without leaving the explorer. */
  onFocus?: (slug: string) => void;
}) {
  const qs = queryString ? `?${queryString}` : "";

  return (
    <div className="border-border rounded-xl border">
      {/*
        Dedicated scrollport: all columns stay visible; swipe sideways on mobile.
        min-w forces overflow so touch-pan-x has something to scroll.
      */}
      <div
        className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y]"
        role="region"
        aria-label="Ranked matches table — swipe sideways for more columns"
      >
        <Table className="min-w-[44rem] text-base">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <HeaderTip label="#" tip={COLUMN_HELP.rank} />
              </TableHead>
              <TableHead className="min-w-[9rem]">
                <HeaderTip label="Place" tip={COLUMN_HELP.place} />
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <HeaderTip
                    label="Match"
                    tip={COLUMN_HELP.match}
                    align="right"
                  />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <HeaderTip
                    label="Avg salary"
                    tip={COLUMN_HELP.salary}
                    align="right"
                  />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <HeaderTip
                    label="Rent"
                    tip={COLUMN_HELP.rent}
                    align="right"
                  />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <HeaderTip
                    label="Price"
                    tip={COLUMN_HELP.price}
                    align="right"
                  />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <HeaderTip
                    label="Multiple"
                    tip={COLUMN_HELP.multiple}
                    align="right"
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {territories.map((t, i) => {
              const isFocused = focusedSlug === t.slug;
              return (
                <TableRow
                  key={t.slug}
                  data-state={isFocused ? "selected" : undefined}
                  className={cn(
                    "cursor-pointer",
                    isFocused && "bg-primary/5",
                  )}
                  onMouseEnter={() => onHover?.(t.slug)}
                  onMouseLeave={() => onHover?.(null)}
                  onClick={() => onFocus?.(t.slug)}
                >
                  <TableCell className="text-muted-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/places/${t.slug}${qs}`}
                      className="hover:text-primary font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.name}
                    </Link>
                    <div className="text-muted-foreground text-sm">
                      {t.region}
                      {t.kind === "city" && t.district
                        ? ` · ${t.district}`
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <MatchScoreBadge score={t.matchScore} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatSalary(t.metrics.meanEarningsAnnual)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRent(t.metrics.medianRentWeek)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(t.metrics.medianHousePrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMultiple(t.metrics.medianMultiple)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground border-t px-3 py-2 text-sm">
        Swipe sideways for more columns · tap a row to focus the map · place
        name opens the detail page
      </p>
    </div>
  );
}
