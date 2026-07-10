"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { useRouter } from "next/navigation";

import type { ScoredTerritory } from "~/lib/places/types";
import { scoreFill } from "./match-score-badge";

import "leaflet/dist/leaflet.css";

type Props = {
  territories: ScoredTerritory[];
  boundaries: FeatureCollection;
  highlightedSlug?: string | null;
  queryString?: string;
};

function FitBounds({ boundaries }: { boundaries: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    // NZ mainland approximate bounds
    map.fitBounds(
      [
        [-47.5, 166.0],
        [-34.0, 179.0],
      ],
      { padding: [20, 20] },
    );
  }, [map, boundaries]);
  return null;
}

export function NzChoroplethMap({
  territories,
  boundaries,
  highlightedSlug,
  queryString,
}: Props) {
  const router = useRouter();
  const scoreBySlug = useMemo(() => {
    const map = new Map<string, ScoredTerritory>();
    for (const t of territories) map.set(t.slug, t);
    return map;
  }, [territories]);

  const styleFeature = (feature?: Feature): PathOptions => {
    const slug = feature?.properties?.slug as string | undefined;
    const scored = slug ? scoreBySlug.get(slug) : undefined;
    const score = scored?.matchScore ?? 0;
    const isHighlighted = slug && slug === highlightedSlug;
    return {
      fillColor: scoreFill(score),
      weight: isHighlighted ? 2.5 : 1,
      opacity: 1,
      color: isHighlighted ? "#a7f3d0" : "#064e3b",
      fillOpacity: isHighlighted ? 0.9 : 0.75,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const slug = feature.properties?.slug as string | undefined;
    const name = (feature.properties?.name as string | undefined) ?? slug;
    const scored = slug ? scoreBySlug.get(slug) : undefined;
    const score = scored?.matchScore ?? "—";

    layer.bindTooltip(
      `<strong>${name}</strong><br/>Match score: ${score}`,
      { sticky: true },
    );

    layer.on({
      click: (e: LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        if (!slug) return;
        const qs = queryString ? `?${queryString}` : "";
        router.push(`/places/${slug}${qs}`);
      },
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as { setStyle: (s: PathOptions) => void };
        target.setStyle({ weight: 2.5, fillOpacity: 0.95 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target as {
          setStyle: (s: PathOptions) => void;
        };
        target.setStyle(styleFeature(feature));
      },
    });
  };

  return (
    <div className="border-border relative h-[360px] w-full overflow-hidden rounded-xl border sm:h-[420px] lg:h-full lg:min-h-[480px]">
      <MapContainer
        center={[-41.2, 174.5]}
        zoom={5}
        scrollWheelZoom={false}
        className="bg-emerald-950/40 z-0 h-full w-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds boundaries={boundaries} />
        <GeoJSON
          key={territories.map((t) => `${t.slug}:${t.matchScore}`).join("|")}
          data={boundaries}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}
