"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import type { Feature, FeatureCollection } from "geojson";
import { Check, Share2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DEFAULT_WEIGHTS,
  getPresetWeights,
  matchPresetId,
  normalizeWeights,
} from "~/lib/places/presets";
import { parseWeights, scoreTerritories, serializeWeights } from "~/lib/places/scoring";
import type {
  PlacesMetadata,
  PresetId,
  Territory,
  Weights,
} from "~/lib/places/types";
import { PLACE_KINDS, PRESET_IDS } from "~/lib/places/types";
import {
  PlaceScopeToggle,
  type ExplorerScope,
} from "./place-scope-toggle";
import { PresetPicker } from "./preset-picker";
import { PrioritySliders } from "./priority-sliders";
import { RankedList } from "./ranked-list";

const NzChoroplethMap = dynamic(
  () =>
    import("./nz-choropleth-map").then((m) => m.NzChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 flex h-[min(78vh,800px)] w-full items-center justify-center rounded-xl border">
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    ),
  },
);

function resolveInitialWeights(
  preset: PresetId,
  weightsParam: string | null,
): Weights {
  const fromUrl = parseWeights(weightsParam);
  if (fromUrl) return fromUrl;
  if (preset !== "custom") return getPresetWeights(preset);
  return { ...DEFAULT_WEIGHTS };
}

export function PlacesExplorer({
  territories,
  boundaries,
  metadata,
}: {
  territories: Territory[];
  boundaries: FeatureCollection;
  metadata: PlacesMetadata;
}) {
  const [params, setParams] = useQueryStates(
    {
      preset: parseAsStringLiteral(PRESET_IDS).withDefault("laid-back"),
      weights: parseAsString,
      view: parseAsStringLiteral(PLACE_KINDS).withDefault("city"),
    },
    { history: "replace", shallow: true },
  );

  const scope: ExplorerScope = params.view;

  const [weights, setWeights] = useState<Weights>(() =>
    resolveInitialWeights(params.preset, params.weights),
  );
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const scopedTerritories = useMemo(
    () => territories.filter((t) => t.kind === scope),
    [territories, scope],
  );

  const scopedBoundaries = useMemo(() => {
    const features = boundaries.features.filter((f: Feature) => {
      const slug = f.properties?.slug as string | undefined;
      return scopedTerritories.some((t) => t.slug === slug);
    });
    return { type: "FeatureCollection" as const, features };
  }, [boundaries, scopedTerritories]);

  const scored = useMemo(
    () => scoreTerritories(scopedTerritories, weights),
    [scopedTerritories, weights],
  );

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("view", scope);
    p.set("preset", params.preset);
    p.set("weights", serializeWeights(weights));
    return p.toString();
  }, [scope, params.preset, weights]);

  const syncUrl = useCallback(
    (preset: PresetId, nextWeights: Weights) => {
      startTransition(() => {
        void setParams({
          preset,
          weights: serializeWeights(nextWeights),
        });
      });
    },
    [setParams],
  );

  const handleScope = (kind: ExplorerScope) => {
    setHighlightedSlug(null);
    setFocusedSlug(null);
    startTransition(() => {
      void setParams({ view: kind });
    });
  };

  const handleFocusPlace = (slug: string) => {
    setFocusedSlug(slug);
    setHighlightedSlug(slug);
    // Scroll map into view on smaller screens
    document
      .getElementById("places-map")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handlePreset = (id: PresetId) => {
    if (id === "custom") {
      void setParams({ preset: "custom" });
      return;
    }
    const next = getPresetWeights(id);
    setWeights(next);
    syncUrl(id, next);
  };

  const handleWeights = (next: Weights) => {
    const normalised = normalizeWeights(next);
    setWeights(normalised);
    syncUrl(matchPresetId(normalised), normalised);
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/places?${queryString}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:py-5">
      {/* Horizontal priorities bar above map + table */}
      <section className="border-border bg-card/60 relative rounded-xl border px-4 py-3 shadow-sm sm:px-5">
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={copied ? "Link copied" : "Copy share link"}
                  onClick={() => void copyShareLink()}
                />
              }
            >
              {copied ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <Share2 className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {copied ? "Copied!" : "Copy shareable link with your weights"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-3 pr-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
            <PlaceScopeToggle
              value={scope}
              onChange={handleScope}
              compact
            />
            <PresetPicker
              value={params.preset}
              onChange={handlePreset}
              compact
            />
          </div>
          <PrioritySliders
            weights={weights}
            onChange={handleWeights}
            compact
          />
          <p className="text-muted-foreground text-xs">
            Sliders total 100% · data as of {metadata.lastUpdated}
          </p>
        </div>
      </section>

      {/* Map + ranked list 50:50 — NZ needs vertical room in a wide half-panel */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div id="places-map" className="min-w-0 lg:sticky lg:top-16">
          <NzChoroplethMap
            territories={scored}
            boundaries={scopedBoundaries}
            highlightedSlug={highlightedSlug}
            focusedSlug={focusedSlug}
            queryString={queryString}
            className="h-[min(78vh,800px)] w-full max-w-none"
          />
        </div>

        <div className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold tracking-normal">
            Ranked matches
            <span className="text-muted-foreground ml-2 text-base font-normal">
              · {scope === "city" ? "Cities & towns" : "Districts"}
            </span>
          </h2>
          <RankedList
            territories={scored}
            queryString={queryString}
            focusedSlug={focusedSlug}
            onHover={setHighlightedSlug}
            onFocus={handleFocusPlace}
          />
        </div>
      </div>
    </div>
  );
}
