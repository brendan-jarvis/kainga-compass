import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getPlacesMetadata } from "~/lib/places/get-territories";
import { DIMENSION_HINTS, DIMENSION_LABELS } from "~/lib/places/presets";
import { DIMENSIONS } from "~/lib/places/types";

export const metadata: Metadata = {
  title: "Methodology | Kāinga Compass",
  description:
    "How Match Scores are calculated — sources, formulas, and known limitations.",
};

export default function MethodologyPage() {
  const meta = getPlacesMetadata();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-3">
        <p className="text-primary text-sm font-medium tracking-wide uppercase">
          Transparency
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Methodology</h1>
        <p className="text-muted-foreground text-lg">
          Kāinga Compass is a personalised explorer, not an official ranking of
          the “best” places to live. Scores re-rank the same public-ish
          indicators under your weights.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match Score formula</CardTitle>
          <CardDescription>
            Each dimension is a 0–100 percentile within the active geography
            peer set (cities & towns, or districts) — never mixed together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <pre className="bg-muted/50 overflow-x-auto rounded-lg border p-4 font-mono text-xs">
            {`matchScore = Σ (weight[d] × dimensionScore[d])
weights are normalised so Σ weight = 1`}
          </pre>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5">
            {DIMENSIONS.map((d) => (
              <li key={d}>
                <strong className="text-foreground">{DIMENSION_LABELS[d]}</strong>{" "}
                — {DIMENSION_HINTS[d]}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            “Growth” is no longer a single slider:{" "}
            <strong className="text-foreground">housing growth</strong> (price &
            rent momentum), <strong className="text-foreground">job growth</strong>,
            and{" "}
            <strong className="text-foreground">population growth</strong> are
            separate so investor vs expanding-town intent is unambiguous.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
          <CardDescription>
            Last fixture update: {meta.lastUpdated} · {meta.cityCount} cities &
            towns · {meta.regionCount} districts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            {meta.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            Live ingestion is scaffolded via{" "}
            <code className="text-foreground">bun run ingest:places</code>.
            District metrics align with public TA series; settlement splits
            (Queenstown vs Wānaka) are curated approximations until SA2 / Market
            Rent pipelines are wired. Validate against primary sources before
            financial decisions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geography: cities & towns vs districts</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">Cities & towns</strong> are
            settlement-scale places people actually choose between (aligned with
            Stats NZ urban areas / main towns). Example: Queenstown and Wānaka
            are separate, even though both sit in Queenstown-Lakes District.
          </p>
          <p>
            <strong className="text-foreground">Districts</strong> are
            territorial authorities (city or district councils) — the level where
            HUD and MBIE bond CSVs are published most reliably.
          </p>
          <p>
            Toggle in the explorer re-scores only within that peer set. Map
            polygons are simplified illustrative shapes, not official Stats NZ
            boundaries.
          </p>
          <p>
            Planned finer sources:{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://portal.api.business.govt.nz/api/market-rent"
              target="_blank"
              rel="noreferrer"
            >
              MBIE Market Rent API
            </a>{" "}
            (down to SA2),{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/"
              target="_blank"
              rel="noreferrer"
            >
              MBIE bond CSVs
            </a>
            ,{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://www.hud.govt.nz/stats-and-insights/local-housing-statistics/key-data"
              target="_blank"
              rel="noreferrer"
            >
              HUD Local Housing Statistics
            </a>
            , and{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://datafinder.stats.govt.nz/layer/120965-urban-rural-2025/"
              target="_blank"
              rel="noreferrer"
            >
              Stats NZ Urban Rural 2025
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              MVP covers {meta.cityCount} settlements and {meta.regionCount}{" "}
              districts — not every NZ place.
            </li>
            <li>
              Settlement-level prices for multi-town districts are indicative
              splits, not official bond medians.
            </li>
            <li>
              Education and social/wellbeing dimensions are out of scope for
              MVP.
            </li>
            <li>
              Industry-filtered earnings (e.g. nursing vs tech) are not yet
              available.
            </li>
            <li>
              Percentile ranks are relative to the active peer set only —
              switching cities ↔ districts changes scores.
            </li>
            <li>
              This is not financial, housing, or immigration advice. Cross-check
              primary data and local context.
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm">
        <Link
          href="/places"
          className="text-primary underline-offset-2 hover:underline"
        >
          ← Back to explorer
        </Link>
      </p>
    </div>
  );
}
