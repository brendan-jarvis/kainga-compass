import regionsData from "~/data/places/regions.json";
import metadataData from "~/data/places/metadata.json";
import type { PlacesMetadata, Territory } from "./types";

export function getTerritories(): Territory[] {
  return regionsData as Territory[];
}

export function getTerritoryBySlug(slug: string): Territory | undefined {
  return getTerritories().find((t) => t.slug === slug);
}

export function getPlacesMetadata(): PlacesMetadata {
  return metadataData;
}
