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
import { DIMENSION_LABELS } from "~/lib/places/presets";

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
            Each dimension is a 0–100 percentile across the MVP territorial
            authority set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <pre className="bg-muted/50 overflow-x-auto rounded-lg border p-4 font-mono text-xs">
            {`matchScore = Σ (weight[d] × dimensionScore[d])
weights are normalised so Σ weight = 1`}
          </pre>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">
                {DIMENSION_LABELS.affordability}
              </strong>{" "}
              — lower median rent, house price, and median multiple score
              higher (inverted percentiles, averaged).
            </li>
            <li>
              <strong className="text-foreground">
                {DIMENSION_LABELS.growth}
              </strong>{" "}
              — higher year-on-year rent and price change score higher
              (averaged). Investors weight this heavily; lifestyle movers often
              do not.
            </li>
            <li>
              <strong className="text-foreground">
                {DIMENSION_LABELS.career}
              </strong>{" "}
              — higher median income scores higher. For most TAs this is a{" "}
              <em>regional proxy</em> and is labelled in the UI.
            </li>
            <li>
              <strong className="text-foreground">
                {DIMENSION_LABELS.lifestyle}
              </strong>{" "}
              — lower population density scores higher in the MVP model
              (proxy for space / lower intensity). This is a deliberate
              simplification, not a full amenity index.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
          <CardDescription>
            Last fixture update: {meta.lastUpdated} · {meta.cityCount} cities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            {meta.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            Live ingestion from HUD XLSX / MBIE CSV is scaffolded via{" "}
            <code className="text-foreground">bun run ingest:places</code>.
            Current committed numbers are curated MVP fixtures for ranking
            demos — validate against primary sources before financial decisions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geography</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <p>
            The unit of analysis is the{" "}
            <strong className="text-foreground">Territorial Authority</strong>{" "}
            (city or district council area). Towns that sit inside a larger
            district (e.g. Queenstown within Queenstown-Lakes) inherit district
            metrics.
          </p>
          <p>
            Map polygons in the MVP are simplified illustrative shapes centred
            on each TA, not official Stats NZ cadastral boundaries. They are
            enough to show relative score colouring; a future release can swap
            in generalised official GeoJSON.
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
              MVP covers {meta.cityCount} main urban centres, not all 67 TAs.
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
              Percentile ranks are relative to the MVP set only — adding more
              TAs will change scores.
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
