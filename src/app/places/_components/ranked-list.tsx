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
import { MatchScoreBadge } from "./match-score-badge";

export function RankedList({
  territories,
  queryString,
  onHover,
}: {
  territories: ScoredTerritory[];
  queryString?: string;
  onHover?: (slug: string | null) => void;
}) {
  const qs = queryString ? `?${queryString}` : "";

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <Table>
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
          {territories.map((t, i) => (
            <TableRow
              key={t.slug}
              className="cursor-pointer"
              onMouseEnter={() => onHover?.(t.slug)}
              onMouseLeave={() => onHover?.(null)}
            >
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={`/places/${t.slug}${qs}`}
                  className="hover:text-primary font-medium"
                >
                  {t.name}
                </Link>
                <div className="text-muted-foreground text-xs">{t.region}</div>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
