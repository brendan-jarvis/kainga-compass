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
} from "~/lib/places/format";
import {
  getPlacesMetadata,
  getTerritories,
  getTerritoryBySlug,
} from "~/lib/places/get-territories";
import { DIMENSION_LABELS, DEFAULT_WEIGHTS } from "~/lib/places/presets";
import { parseWeights, scoreTerritories } from "~/lib/places/scoring";
import { DIMENSIONS, type Dimension } from "~/lib/places/types";
import { cn } from "~/lib/utils";
import { MatchScoreBadge } from "../_components/match-score-badge";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ weights?: string; preset?: string }>;
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
  const scored = scoreTerritories(getTerritories(), weights);
  const ranked = scored.find((t) => t.slug === slug)!;
  const rank = scored.findIndex((t) => t.slug === slug) + 1;
  const metadata = getPlacesMetadata();

  const qs = new URLSearchParams();
  if (sp.preset) qs.set("preset", sp.preset);
  if (sp.weights) qs.set("weights", sp.weights);
  const backQs = qs.toString() ? `?${qs.toString()}` : "";

  const proxySet = new Set<Dimension>(territory.proxies ?? []);

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
          <h1 className="text-3xl font-bold tracking-tight">{territory.name}</h1>
          <MatchScoreBadge score={ranked.matchScore} className="text-sm" />
        </div>
        <p className="text-muted-foreground">
          {territory.region} · Rank #{rank} of {scored.length} for your current
          weights
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
          <CardContent className="text-muted-foreground text-xs">
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
          <CardContent className="text-muted-foreground text-xs">
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
          <CardContent className="text-muted-foreground text-xs">
            House price ÷ household income
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Median income</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(territory.metrics.medianIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {proxySet.has("career")
              ? "Regional proxy — see methodology"
              : "Household income estimate"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension breakdown</CardTitle>
          <CardDescription>
            Percentile scores (0–100) across the MVP city set for your weights.
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

      <p className="text-muted-foreground text-xs">
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
