import placesData from "~/data/places/places.json";
import metadataData from "~/data/places/metadata.json";
import type { PlaceKind, PlacesMetadata, Territory } from "./types";

export function getTerritories(): Territory[] {
  return placesData as Territory[];
}

export function getTerritoriesByKind(kind: PlaceKind): Territory[] {
  return getTerritories().filter((t) => t.kind === kind);
}

export function getTerritoryBySlug(slug: string): Territory | undefined {
  return getTerritories().find((t) => t.slug === slug);
}

export function getPlacesMetadata(): PlacesMetadata {
  return metadataData;
}

export function getRelatedPlaces(territory: Territory): Territory[] {
  if (territory.kind === "city" && territory.district) {
    return getTerritories().filter(
      (t) => t.kind === "region" && t.name === territory.district,
    );
  }
  if (territory.kind === "region") {
    return getTerritories().filter(
      (t) => t.kind === "city" && t.district === territory.name,
    );
  }
  return [];
}
