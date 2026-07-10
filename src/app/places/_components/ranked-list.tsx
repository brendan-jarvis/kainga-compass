"use client";

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  formatCurrency,
  formatMultiple,
  formatRent,
} from "~/lib/places/format";
import type { ScoredTerritory } from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { MatchScoreBadge } from "./match-score-badge";

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
    <div className="border-border overflow-hidden rounded-xl border">
      <Table className="text-base">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Place</TableHead>
            <TableHead className="text-right">Match</TableHead>
            <TableHead className="text-right hidden sm:table-cell">
              Rent
            </TableHead>
            <TableHead className="text-right hidden md:table-cell">
              Price
            </TableHead>
            <TableHead className="text-right hidden lg:table-cell">
              Multiple
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
                <TableCell className="text-right tabular-nums hidden sm:table-cell">
                  {formatRent(t.metrics.medianRentWeek)}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">
                  {formatCurrency(t.metrics.medianHousePrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell">
                  {formatMultiple(t.metrics.medianMultiple)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="text-muted-foreground border-t px-3 py-2 text-sm">
        Click a row to focus the map · click the place name for the detail page
      </p>
    </div>
  );
}
