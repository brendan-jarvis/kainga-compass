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
          the “best” places to live. Scores re-rank public-data-style indicators
          under your weights.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match Score formula</CardTitle>
          <CardDescription>
            Each dimension is a 0–100 percentile within the active geography
            peer set (cities & towns, or all districts) — never mixed together.
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
            Housing growth, job growth, and population growth are separate
            sliders so investor vs expanding-town intent stays clear.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map boundaries (official classifications)</CardTitle>
          <CardDescription>
            Outlines are Stats NZ open geographic data, generalised for the web.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm leading-relaxed">
          <div>
            <p className="text-foreground mb-1 font-medium">
              Districts view — full coverage
            </p>
            <p>
              Every territorial authority in{" "}
              <strong className="text-foreground">
                Stats NZ Territorial Authority 2023
              </strong>{" "}
              is in the map and ranked table (
              {meta.regionCount} areas, matching the national TA set excluding
              “Area Outside Territorial Authority”). Source layer:{" "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://datafinder.stats.govt.nz/layer/111194-territorial-authority-2023-generalised/"
                target="_blank"
                rel="noreferrer"
              >
                Territorial Authority 2023 (generalised)
              </a>
              , served via the Stats NZ ArcGIS FeatureServer used by{" "}
              <code className="text-foreground">bun run ingest:places</code> /{" "}
              <code className="text-foreground">expand-districts</code>.
            </p>
          </div>
          <div>
            <p className="text-foreground mb-1 font-medium">
              Cities & towns view
            </p>
            <p>
              Settlements from{" "}
              <strong className="text-foreground">
                Stats NZ Urban Rural Areas 2023
              </strong>{" "}
              classified as <em>Major</em>, <em>Large</em>, or{" "}
              <em>Medium</em> urban areas ({meta.cityCount} places — excludes
              small urban areas and rural settlements for now). Layer:{" "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://datafinder.stats.govt.nz/layer/111196-urban-rural-2023-clipped-generalised/"
                target="_blank"
                rel="noreferrer"
              >
                Urban Rural 2023 clipped generalised
              </a>
              . Refresh with{" "}
              <code className="text-foreground">bun run ingest:cities</code>.
            </p>
          </div>
          <div>
            <p className="text-foreground mb-1 font-medium">
              Suburbs on city detail pages
            </p>
            <p>
              Suburb-scale polygons from{" "}
              <strong className="text-foreground">
                Stats NZ Statistical Area 3 (SA3) 2023
              </strong>
              . SA3 is designed to approximate suburbs in major and medium urban
              areas. We previously tried SA2, but in dense CBDs SA2 often
              fragments into street-block units (e.g. Queen Street, Shortland
              Street) rather than named suburbs. Each suburb’s centroid must fall
              inside the parent city’s Urban Rural 2023 outline (
              {meta.suburbCount ?? "—"} suburbs). Refresh with{" "}
              <code className="text-foreground">bun run ingest:suburbs</code>.
            </p>
          </div>
          <p>
            All boundaries are simplified (Douglas–Peucker) for performance.
            They are for choropleth visualisation — not legal cadastral
            boundaries. Attribution: Stats NZ Tatauranga Aotearoa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indicator data sources</CardTitle>
          <CardDescription>
            Last fixture update: {meta.lastUpdated} · {meta.cityCount} cities &
            towns · {meta.regionCount} districts
            {meta.suburbCount != null ? ` · ${meta.suburbCount} suburbs` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            {meta.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            District-level housing stats should track{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://www.hud.govt.nz/stats-and-insights/local-housing-statistics/key-data"
              target="_blank"
              rel="noreferrer"
            >
              HUD Local Housing Statistics
            </a>{" "}
            and{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/"
              target="_blank"
              rel="noreferrer"
            >
              MBIE rental bond CSVs
            </a>{" "}
            once live parsers replace fixtures. Settlement and suburb metrics
            are still curated/seeded estimates where fine-grain public series
            are not yet wired. Validate against primary sources before financial
            decisions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geography levels</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">Districts</strong> — all 67
            territorial authorities (city and district councils). Explorer
            “Districts” toggle shows every TA on the map and in the table.
          </p>
          <p>
            <strong className="text-foreground">Cities & towns</strong> —
            settlement-scale places people choose between (Urban Rural
            settlements). Example: Queenstown and Wānaka are separate even
            though both sit in Queenstown-Lakes District.
          </p>
          <p>
            <strong className="text-foreground">Suburbs</strong> — SA2 units on
            a city detail page (map + ranked table of neighbourhoods).
          </p>
          <p>
            Toggle in the explorer re-scores only within that peer set. Opening
            a district drills into its towns; opening a town drills into its
            SA2 suburbs.
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
              District map/table covers all {meta.regionCount} TAs. Cities &amp;
              towns include all major/large/medium urban areas (
              {meta.cityCount}); small urban areas and rural settlements are
              not yet in the explorer. Suburbs: {meta.suburbCount ?? "—"} SA3
              units under those cities.
            </li>
            <li>
              Many TA and suburb metrics remain seeded fixtures until HUD/MBIE
              (and SA2-capable rent series) are fully ingested.
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
