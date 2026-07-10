"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import type { Feature, FeatureCollection } from "geojson";
import { Link2, Check } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DEFAULT_WEIGHTS,
  getPresetWeights,
  matchPresetId,
  normalizeWeights,
} from "~/lib/places/presets";
import { parseWeights, scoreTerritories, serializeWeights } from "~/lib/places/scoring";
import type {
  PlaceKind,
  PlacesMetadata,
  PresetId,
  Territory,
  Weights,
} from "~/lib/places/types";
import { PLACE_KINDS, PRESET_IDS } from "~/lib/places/types";
import { PlaceScopeToggle } from "./place-scope-toggle";
import { PresetPicker } from "./preset-picker";
import { PrioritySliders } from "./priority-sliders";
import { RankedList } from "./ranked-list";

const NzChoroplethMap = dynamic(
  () =>
    import("./nz-choropleth-map").then((m) => m.NzChoroplethMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 flex h-[360px] items-center justify-center rounded-xl border sm:h-[420px] lg:min-h-[480px]">
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

  const scope: PlaceKind = params.view;

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

  const handleScope = (kind: PlaceKind) => {
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

  const countLabel =
    scope === "city"
      ? `${metadata.cityCount} cities & towns`
      : `${metadata.regionCount} districts`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
            Explore places
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            Set what matters to you — match scores update live across{" "}
            {countLabel}. Compare settlements (Queenstown vs Wānaka) or whole
            council districts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copyShareLink()}
          className="self-start sm:self-auto"
        >
          {copied ? (
            <>
              <Check data-icon="inline-start" />
              Copied
            </>
          ) : (
            <>
              <Link2 data-icon="inline-start" />
              Copy share link
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="border-primary/10 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your priorities</CardTitle>
            <CardDescription>
              Pick geography, a life-stage preset, or drag the sliders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PlaceScopeToggle value={scope} onChange={handleScope} />
            <PresetPicker value={params.preset} onChange={handlePreset} />
            <PrioritySliders weights={weights} onChange={handleWeights} />
            <p className="text-muted-foreground text-sm">
              Data as of {metadata.lastUpdated}.{" "}
              <Link
                href="/places/methodology"
                className="text-primary underline-offset-2 hover:underline"
              >
                How scores work
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-6">
          <div id="places-map">
            <NzChoroplethMap
              territories={scored}
              boundaries={scopedBoundaries}
              highlightedSlug={highlightedSlug}
              focusedSlug={focusedSlug}
              queryString={queryString}
            />
          </div>
          <div>
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
    </div>
  );
}
