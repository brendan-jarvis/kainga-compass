import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  getPlacesMetadata,
  getRelatedPlaces,
  getTerritories,
  getTerritoriesByKind,
  getTerritoryBySlug,
} from "~/lib/places/get-territories";
import { DIMENSION_LABELS, DEFAULT_WEIGHTS } from "~/lib/places/presets";
import { parseWeights, scoreTerritories } from "~/lib/places/scoring";
import { DIMENSIONS, type Dimension } from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { MatchScoreBadge } from "../_components/match-score-badge";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ weights?: string; preset?: string; view?: string }>;
};

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
  const peers = getTerritoriesByKind(territory.kind);
  const scored = scoreTerritories(peers, weights);
  const ranked = scored.find((t) => t.slug === slug)!;
  const rank = scored.findIndex((t) => t.slug === slug) + 1;
  const metadata = getPlacesMetadata();
  const related = getRelatedPlaces(territory);

  const qs = new URLSearchParams();
  qs.set("view", territory.kind);
  if (sp.preset) qs.set("preset", sp.preset);
  if (sp.weights) qs.set("weights", sp.weights);
  const backQs = `?${qs.toString()}`;

  const proxySet = new Set<Dimension>(territory.proxies ?? []);
  const kindLabel =
    territory.kind === "city" ? "City / town" : "District (territorial authority)";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
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
          <Badge variant="secondary">{kindLabel}</Badge>
        </div>
        <p className="text-muted-foreground">
          {territory.region}
          {territory.district ? ` · ${territory.district}` : ""} · Rank #{rank}{" "}
          of {scored.length}{" "}
          {territory.kind === "city" ? "cities & towns" : "districts"} for your
          current weights
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            <CardDescription>Average salary (mean earnings)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatSalary(territory.metrics.meanEarningsAnnual)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Median earnings{" "}
            {formatSalary(territory.metrics.medianEarningsAnnual)}
            {proxySet.has("career") ? " · regional proxy" : ""}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earnings detail</CardTitle>
          <CardDescription>
            Mean and median annual earnings for filled jobs (LEED-style). Stats
            NZ does not publish “years of experience” by place — age bands are
            the best public proxy for career stage.
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
                {territory.metrics.earningsByAge.map((band) => (
                  <tr key={band.label} className="border-b last:border-0">
                    <td className="py-2 pr-3">{band.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatSalary(band.medianAnnual)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatSalary(band.meanAnnual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-sm">
            Household income used for the price multiple:{" "}
            {formatSalary(territory.metrics.medianIncome)}. Age-band figures are
            fixture estimates shaped like LEED age breakdowns — replace with live
            Stats NZ series when ingest is wired.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension breakdown</CardTitle>
          <CardDescription>
            Percentile scores (0–100) within the{" "}
            {territory.kind === "city" ? "cities & towns" : "districts"} peer
            set.
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

      {related.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {territory.kind === "city"
                ? "Parent district"
                : "Towns in this district"}
            </CardTitle>
            <CardDescription>
              {territory.kind === "city"
                ? "District view aggregates the wider council area."
                : "Settlements can differ a lot inside one district (e.g. Queenstown vs Wānaka)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {related.map((r) => {
              const relatedQs = new URLSearchParams(qs);
              relatedQs.set("view", r.kind);
              return (
                <Link
                  key={r.slug}
                  href={`/places/${r.slug}?${relatedQs.toString()}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  {r.name}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-sm">
        Figures are indicative MVP fixtures (updated {metadata.lastUpdated}).{" "}
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
