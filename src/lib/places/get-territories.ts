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

/** Parent district for a city, or parent city for a suburb. */
export function getParentPlace(territory: Territory): Territory | undefined {
  if (territory.parentSlug) {
    return getTerritoryBySlug(territory.parentSlug);
  }
  if (territory.kind === "city" && territory.district) {
    return getTerritories().find(
      (t) => t.kind === "region" && t.name === territory.district,
    );
  }
  return undefined;
}

/**
 * Children for drill-down:
 * - district → cities/towns in that TA
 * - city/town → SA2 suburbs
 */
export function getChildPlaces(territory: Territory): Territory[] {
  if (territory.kind === "region") {
    return getTerritories().filter(
      (t) =>
        t.kind === "city" &&
        (t.parentSlug === territory.slug || t.district === territory.name),
    );
  }
  if (territory.kind === "city") {
    return getTerritories().filter(
      (t) => t.kind === "suburb" && t.parentSlug === territory.slug,
    );
  }
  return [];
}

/** @deprecated use getParentPlace / getChildPlaces */
export function getRelatedPlaces(territory: Territory): Territory[] {
  if (territory.kind === "city") {
    const parent = getParentPlace(territory);
    return parent ? [parent] : [];
  }
  if (territory.kind === "region") {
    return getChildPlaces(territory);
  }
  if (territory.kind === "suburb") {
    const parent = getParentPlace(territory);
    return parent ? [parent] : [];
  }
  return [];
}
