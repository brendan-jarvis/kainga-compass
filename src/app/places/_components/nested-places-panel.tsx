"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";

import { scoreTerritories } from "~/lib/places/scoring";
import type { Territory, Weights } from "~/lib/places/types";
import { RankedList } from "./ranked-list";

const NzChoroplethMap = dynamic(
  () => import("./nz-choropleth-map").then((m) => m.NzChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 flex h-[420px] w-full items-center justify-center rounded-xl border">
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    ),
  },
);

export function NestedPlacesPanel({
  childrenPlaces,
  allBoundaries,
  weights,
  queryString,
  title,
  description,
}: {
  childrenPlaces: Territory[];
  allBoundaries: FeatureCollection;
  weights: Weights;
  queryString: string;
  title: string;
  description: string;
}) {
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const scored = useMemo(
    () => scoreTerritories(childrenPlaces, weights),
    [childrenPlaces, weights],
  );

  const childBoundaries = useMemo(() => {
    const slugs = new Set(childrenPlaces.map((c) => c.slug));
    const features = allBoundaries.features.filter((f: Feature) =>
      slugs.has(String(f.properties?.slug ?? "")),
    );
    return { type: "FeatureCollection" as const, features };
  }, [allBoundaries, childrenPlaces]);

  if (childrenPlaces.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border px-4 py-6 text-sm">
        No nested places available for this area yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <NzChoroplethMap
            territories={scored}
            boundaries={childBoundaries}
            highlightedSlug={highlightedSlug}
            focusedSlug={focusedSlug}
            queryString={queryString}
            className="h-[min(60vh,520px)] w-full max-w-none"
          />
        </div>
        <div className="min-w-0">
          <RankedList
            territories={scored}
            queryString={queryString}
            focusedSlug={focusedSlug}
            onHover={setHighlightedSlug}
            onFocus={setFocusedSlug}
          />
        </div>
      </div>
    </div>
  );
}
