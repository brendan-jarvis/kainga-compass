"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import type { FeatureCollection } from "geojson";
import { ArrowLeft } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  formatCurrency,
  formatMultiple,
  formatPercent,
  formatRent,
  formatSalary,
} from "~/lib/places/format";
import {
  getAgeGroup,
  getRelevantEarnings,
  AGE_GROUP_IDS,
  type AgeGroupId,
} from "~/lib/places/age-groups";
import {
  DEFAULT_WEIGHTS,
  DIMENSION_LABELS,
  getPresetWeights,
  matchPresetId,
  normalizeWeights,
} from "~/lib/places/presets";
import { parseWeights, scoreTerritories, serializeWeights } from "~/lib/places/scoring";
import {
  DIMENSIONS,
  PRESET_IDS,
  type Dimension,
  type PlaceKind,
  type PlacesMetadata,
  type PresetId,
  type Territory,
  type Weights,
} from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { AgeGroupPicker } from "./age-group-picker";
import { MatchScoreBadge } from "./match-score-badge";
import { NestedPlacesPanel } from "./nested-places-panel";
import { PresetPicker } from "./preset-picker";
import { PrioritySliders } from "./priority-sliders";

function resolveInitialWeights(
  preset: PresetId,
  weightsParam: string | null,
): Weights {
  const fromUrl = parseWeights(weightsParam);
  if (fromUrl) return fromUrl;
  if (preset !== "custom") return getPresetWeights(preset);
  return { ...DEFAULT_WEIGHTS };
}

function kindLabel(kind: PlaceKind): string {
  if (kind === "city") return "City / town";
  if (kind === "region") return "District (territorial authority)";
  return "Suburb (SA3)";
}

function peerLabel(kind: PlaceKind): string {
  if (kind === "city") return "cities & towns";
  if (kind === "region") return "districts";
  return "suburbs";
}

function DimensionBar({
  label,
  score,
  isProxy,
}: {
  label: string;
  score: number;
  isProxy?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-2">
          {label}
          {isProxy && (
            <Badge variant="outline" className="text-[10px]">
              Regional proxy
            </Badge>
          )}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(score)}
        </span>
      </div>
      <div className="bg-muted h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-orange-500 transition-all dark:bg-orange-400"
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

export function PlaceDetailView({
  territory,
  peers,
  parent,
  childrenPlaces,
  boundaries,
  metadata,
}: {
  territory: Territory;
  peers: Territory[];
  parent: Territory | null | undefined;
  childrenPlaces: Territory[];
  boundaries: FeatureCollection;
  metadata: PlacesMetadata;
}) {
  const [params, setParams] = useQueryStates(
    {
      preset: parseAsStringLiteral(PRESET_IDS).withDefault("laid-back"),
      weights: parseAsString,
      age: parseAsStringLiteral(AGE_GROUP_IDS).withDefault("all"),
    },
    { history: "replace", shallow: true },
  );

  const ageGroup: AgeGroupId = params.age;
  const ageDef = getAgeGroup(ageGroup);

  const [weights, setWeights] = useState<Weights>(() =>
    resolveInitialWeights(params.preset, params.weights),
  );
  const [, startTransition] = useTransition();

  const scored = useMemo(
    () => scoreTerritories(peers, weights, ageGroup),
    [peers, weights, ageGroup],
  );

  const ranked = useMemo(
    () => scored.find((t) => t.slug === territory.slug) ?? scored[0]!,
    [scored, territory.slug],
  );
  const rank = useMemo(
    () => scored.findIndex((t) => t.slug === territory.slug) + 1,
    [scored, territory.slug],
  );

  const ageEarnings = useMemo(
    () => getRelevantEarnings(territory, ageGroup),
    [territory, ageGroup],
  );

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    // Explorer only uses city|region; suburbs open with city view context
    p.set(
      "view",
      territory.kind === "suburb"
        ? "city"
        : territory.kind === "region"
          ? "region"
          : "city",
    );
    p.set("preset", params.preset);
    p.set("weights", serializeWeights(weights));
    if (ageGroup !== "all") p.set("age", ageGroup);
    return p.toString();
  }, [territory.kind, params.preset, weights, ageGroup]);

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

  const handlePreset = (id: PresetId) => {
    const next = getPresetWeights(id);
    setWeights(next);
    syncUrl(id, next);
  };

  const handleWeights = (next: Weights) => {
    const normalised = normalizeWeights(next);
    setWeights(normalised);
    syncUrl(matchPresetId(normalised), normalised);
  };

  const handleAge = (id: AgeGroupId) => {
    startTransition(() => {
      void setParams({ age: id });
    });
  };

  const proxySet = useMemo(
    () => new Set<Dimension>(territory.proxies ?? []),
    [territory.proxies],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href={`/places?${queryString}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to explorer
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-normal">{territory.name}</h1>
          <MatchScoreBadge score={ranked.matchScore} className="text-sm" />
          <Badge variant="secondary">{kindLabel(territory.kind)}</Badge>
        </div>
        <p className="text-muted-foreground">
          {parent && (
            <>
              <Link
                href={`/places/${parent.slug}?${queryString}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {parent.name}
              </Link>
              {" · "}
            </>
          )}
          {territory.region}
          {territory.district && territory.kind === "suburb"
            ? ` · ${territory.district}`
            : ""}{" "}
          · Rank #{rank} of {scored.length} {peerLabel(territory.kind)} for your
          current weights
          {ageGroup !== "all" ? ` · ${ageDef.label} earnings` : ""}
        </p>
      </div>

      <section className="border-border bg-card/60 rounded-xl border px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-foreground text-sm font-medium">Your priorities</p>
            <p className="text-muted-foreground text-sm">
              Change presets, age band, or sliders — match score, ranking, and
              nested places update live. Same weights sync back to the explorer.
            </p>
          </div>
          <PresetPicker value={params.preset} onChange={handlePreset} compact />
          <AgeGroupPicker value={ageGroup} onChange={handleAge} />
          <PrioritySliders
            weights={weights}
            onChange={handleWeights}
            compact
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median rent</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatRent(territory.metrics.medianRentWeek)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            YoY {formatPercent(territory.metrics.rentYoY)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median house price</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(territory.metrics.medianHousePrice)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            YoY {formatPercent(territory.metrics.priceYoY)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median multiple</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMultiple(territory.metrics.medianMultiple)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            House price ÷ household income (
            {formatSalary(territory.metrics.medianIncome)})
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {ageGroup === "all"
                ? "Average salary (mean earnings)"
                : `Mean earnings · ${ageDef.label}`}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatSalary(ageEarnings.meanAnnual)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Median {formatSalary(ageEarnings.medianAnnual)}
            {proxySet.has("career") ? " · regional proxy" : ""}
          </CardContent>
        </Card>
      </div>

      {(territory.kind === "region" || territory.kind === "city") && (
        <NestedPlacesPanel
          childrenPlaces={childrenPlaces}
          allBoundaries={boundaries}
          weights={weights}
          ageGroup={ageGroup}
          queryString={queryString}
          title={
            territory.kind === "region"
              ? "Cities & towns in this district"
              : "Suburbs in this area"
          }
          description={
            territory.kind === "region"
              ? "Settlements inside this territorial authority — map and ranking use the same weights and age filter as above."
              : "Stats NZ Statistical Area 3 units (designed to approximate suburbs in urban areas). Metrics are parent-city fixtures with local variation until finer series are wired."
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Earnings detail</CardTitle>
            <CardDescription>
              Mean and median annual earnings for filled jobs (LEED-style). Age
              bands proxy career stage — Stats NZ does not publish years of
              experience by place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-muted/40 rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Mean (average)</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatSalary(territory.metrics.meanEarningsAnnual)}
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Median</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatSalary(territory.metrics.medianEarningsAnnual)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Age group</th>
                    <th className="py-2 pr-3 text-right font-medium">Median</th>
                    <th className="py-2 text-right font-medium">Mean</th>
                  </tr>
                </thead>
                <tbody>
                  {territory.metrics.earningsByAge.map((band) => {
                    const isActive =
                      ageGroup !== "all" && ageDef.dataLabel === band.label;
                    return (
                      <tr
                        key={band.label}
                        className={cn(
                          "border-b last:border-0",
                          isActive && "bg-primary/10 font-medium",
                        )}
                      >
                        <td className="py-2 pr-3">
                          {band.label}
                          {isActive && (
                            <span className="text-primary ml-2 text-xs">
                              your age
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatSalary(band.medianAnnual)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatSalary(band.meanAnnual)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimension breakdown</CardTitle>
            <CardDescription>
              Percentile scores (0–100) within the {peerLabel(territory.kind)}{" "}
              peer set — recalculated for your current weights and age band.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DIMENSIONS.map((d) => (
              <DimensionBar
                key={d}
                label={DIMENSION_LABELS[d]}
                score={ranked.dimensionScores[d]}
                isProxy={proxySet.has(d)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-sm">
        Figures are indicative MVP fixtures (updated {metadata.lastUpdated}
        {metadata.suburbCount ? ` · ${metadata.suburbCount} suburbs` : ""}
        ).{" "}
        <Link
          href="/places/methodology"
          className="text-primary underline-offset-2 hover:underline"
        >
          Sources and limitations
        </Link>
      </p>
    </div>
  );
}
