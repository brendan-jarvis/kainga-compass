import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { FeatureCollection } from "geojson";

import boundariesData from "~/data/places/boundaries.json";
import {
  getChildPlaces,
  getParentPlace,
  getPlacesMetadata,
  getTerritories,
  getTerritoriesByKind,
  getTerritoryBySlug,
} from "~/lib/places/get-territories";
import { PlaceDetailView } from "../_components/place-detail-view";

type PageProps = {
  params: Promise<{ slug: string }>;
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

export default async function TerritoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const territory = getTerritoryBySlug(slug);
  if (!territory) notFound();

  const parent = getParentPlace(territory);
  const peers =
    territory.kind === "suburb" && parent
      ? getChildPlaces(parent)
      : getTerritoriesByKind(territory.kind);
  const childrenPlaces = getChildPlaces(territory);
  const boundaries = boundariesData as unknown as FeatureCollection;
  const metadata = getPlacesMetadata();

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-16 text-center text-sm">
          Loading place…
        </div>
      }
    >
      <PlaceDetailView
        territory={territory}
        peers={peers}
        parent={parent}
        childrenPlaces={childrenPlaces}
        boundaries={boundaries}
        metadata={metadata}
      />
    </Suspense>
  );
}
