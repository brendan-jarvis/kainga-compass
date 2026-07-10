import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { FeatureCollection } from "geojson";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import boundariesData from "~/data/places/boundaries.json";
import {
  formatCurrency,
  formatMultiple,
  formatPercent,
  formatRent,
  formatSalary,
} from "~/lib/places/format";
import {
  getChildPlaces,
  getParentPlace,
  getPlacesMetadata,
  getTerritories,
  getTerritoriesByKind,
  getTerritoryBySlug,
} from "~/lib/places/get-territories";
import {
  AGE_GROUP_IDS,
  getAgeGroup,
  getRelevantEarnings,
  type AgeGroupId,
} from "~/lib/places/age-groups";
import { DIMENSION_LABELS, DEFAULT_WEIGHTS } from "~/lib/places/presets";
import { parseWeights, scoreTerritories } from "~/lib/places/scoring";
import { DIMENSIONS, type Dimension, type PlaceKind } from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { MatchScoreBadge } from "../_components/match-score-badge";
import { NestedPlacesPanel } from "../_components/nested-places-panel";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    weights?: string;
    preset?: string;
    view?: string;
    age?: string;
  }>;
};

function parseAgeParam(raw: string | undefined): AgeGroupId {
  if (raw && (AGE_GROUP_IDS as readonly string[]).includes(raw)) {
    return raw as AgeGroupId;
  }
  return "all";
}

export function generateStaticParams() {
  return getTerritories().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const territory = getTerritoryBySlug(slug);
  if (!territory) return { title: "Place not found | Kāinga Compass" };
  return {
    title: `${territory.name} | Kāinga Compass`,
    description: `Affordability, growth, career, and lifestyle metrics for ${territory.name}, ${territory.region}.`,
  };
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

export default async function TerritoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const territory = getTerritoryBySlug(slug);
  if (!territory) notFound();

  const weights = parseWeights(sp.weights) ?? DEFAULT_WEIGHTS;
  const ageGroup = parseAgeParam(sp.age);
  const ageDef = getAgeGroup(ageGroup);
  const parent = getParentPlace(territory);
  const peers =
    territory.kind === "suburb" && parent
      ? getChildPlaces(parent)
      : getTerritoriesByKind(territory.kind);
  const scored = scoreTerritories(peers, weights, ageGroup);
  const ranked = scored.find((t) => t.slug === slug)!;
  const rank = scored.findIndex((t) => t.slug === slug) + 1;
  const metadata = getPlacesMetadata();
  const children = getChildPlaces(territory);
  const boundaries = boundariesData as unknown as FeatureCollection;
  const ageEarnings = getRelevantEarnings(territory, ageGroup);

  const qs = new URLSearchParams();
  // Explorer only uses city|region; suburbs open with city view context
  qs.set(
    "view",
    territory.kind === "suburb" ? "city" : territory.kind === "region" ? "region" : "city",
  );
  if (sp.preset) qs.set("preset", sp.preset);
  if (sp.weights) qs.set("weights", sp.weights);
  if (ageGroup !== "all") qs.set("age", ageGroup);
  const backQs = `?${qs.toString()}`;
  const childQs = qs.toString();

  const proxySet = new Set<Dimension>(territory.proxies ?? []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href={`/places${backQs}`}
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
                href={`/places/${parent.slug}?${childQs}`}
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
          childrenPlaces={children}
          allBoundaries={boundaries}
          weights={weights}
          ageGroup={ageGroup}
          queryString={childQs}
          title={
            territory.kind === "region"
              ? "Cities & towns in this district"
              : "Suburbs in this area"
          }
          description={
            territory.kind === "region"
              ? "Settlements inside this territorial authority — map and ranking use the same weights and age filter as the explorer."
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
              peer set.
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
        {metadata.suburbCount
          ? ` · ${metadata.suburbCount} suburbs`
          : ""}
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
