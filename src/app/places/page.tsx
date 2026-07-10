import { Suspense } from "react";
import type { Metadata } from "next";
import type { FeatureCollection } from "geojson";

import boundariesData from "~/data/places/boundaries.json";
import { getPlacesMetadata, getTerritories } from "~/lib/places/get-territories";
import { PlacesExplorer } from "./_components/places-explorer";

export const metadata: Metadata = {
  title: "Explore places | Kāinga Compass",
  description:
    "Weight affordability, growth, career, and lifestyle — compare cities & towns or council districts across Aotearoa.",
};

export default function PlacesPage() {
  const territories = getTerritories();
  const metadata = getPlacesMetadata();
  const boundaries = boundariesData as unknown as FeatureCollection;

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground mx-auto max-w-7xl px-4 py-16 text-center text-sm">
          Loading explorer…
        </div>
      }
    >
      <PlacesExplorer
        territories={territories}
        boundaries={boundaries}
        metadata={metadata}
      />
    </Suspense>
  );
}
