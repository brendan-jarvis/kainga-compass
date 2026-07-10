"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import type { ScoredTerritory } from "~/lib/places/types";
import { scoreFill } from "./match-score-badge";

import "leaflet/dist/leaflet.css";

type Props = {
  territories: ScoredTerritory[];
  boundaries: FeatureCollection;
  /** Hover highlight from ranked list */
  highlightedSlug?: string | null;
  /** Focus/zoom target from ranked list click */
  focusedSlug?: string | null;
  queryString?: string;
};

const NZ_BOUNDS: L.LatLngBoundsExpression = [
  [-47.5, 166.0],
  [-34.0, 179.0],
];

function FitScopeBounds({
  boundaries,
  focusedSlug,
}: {
  boundaries: FeatureCollection;
  focusedSlug?: string | null;
}) {
  const map = useMap();
  const lastScopeKey = useRef<string>("");

  // When geography set changes (and nothing is focused), show whole NZ peer set.
  useEffect(() => {
    const key = boundaries.features
      .map((f) => f.properties?.slug as string)
      .filter(Boolean)
      .sort()
      .join("|");
    if (key === lastScopeKey.current) return;
    lastScopeKey.current = key;
    if (focusedSlug) return;
    if (boundaries.features.length === 0) {
      map.fitBounds(NZ_BOUNDS, { padding: [20, 20] });
      return;
    }
    try {
      const layer = L.geoJSON(boundaries);
      map.fitBounds(layer.getBounds().pad(0.08), {
        padding: [28, 28],
        maxZoom: 8,
        animate: true,
      });
    } catch {
      map.fitBounds(NZ_BOUNDS, { padding: [20, 20] });
    }
  }, [map, boundaries, focusedSlug]);

  return null;
}

function FocusPlace({
  boundaries,
  focusedSlug,
}: {
  boundaries: FeatureCollection;
  focusedSlug?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedSlug) return;
    const feature = boundaries.features.find(
      (f) => f.properties?.slug === focusedSlug,
    );
    if (!feature) return;
    try {
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();
      if (!bounds.isValid()) return;
      map.fitBounds(bounds.pad(0.35), {
        padding: [40, 40],
        maxZoom: 11,
        animate: true,
        duration: 0.6,
      });
    } catch {
      // ignore invalid geometry
    }
  }, [map, boundaries, focusedSlug]);

  return null;
}

export function NzChoroplethMap({
  territories,
  boundaries,
  highlightedSlug,
  focusedSlug,
  queryString,
}: Props) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const scoreBySlug = useMemo(() => {
    const map = new Map<string, ScoredTerritory>();
    for (const t of territories) map.set(t.slug, t);
    return map;
  }, [territories]);

  const activeSlug = focusedSlug ?? highlightedSlug;

  const styleFeature = (feature?: Feature): PathOptions => {
    const slug = feature?.properties?.slug as string | undefined;
    const scored = slug ? scoreBySlug.get(slug) : undefined;
    const score = scored?.matchScore ?? 0;
    const isFocused = Boolean(slug && slug === focusedSlug);
    const isHighlighted = Boolean(slug && slug === activeSlug);
    return {
      fillColor: scoreFill(score),
      weight: isFocused ? 3 : isHighlighted ? 2.5 : 1,
      opacity: 1,
      color: isFocused
        ? isDark
          ? "#fbbf24"
          : "#ea580c"
        : isHighlighted
          ? isDark
            ? "#6ee7b7"
            : "#047857"
          : isDark
            ? "#134e4a"
            : "#99f6e4",
      fillOpacity: isFocused ? 0.95 : isHighlighted ? 0.9 : 0.72,
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

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const geoKey = [
    isDark ? "dark" : "light",
    focusedSlug ?? "",
    highlightedSlug ?? "",
    territories.map((t) => `${t.slug}:${t.matchScore}`).join("|"),
  ].join(";");

  return (
    <div className="border-border relative h-[360px] w-full overflow-hidden rounded-xl border sm:h-[420px] lg:h-full lg:min-h-[480px]">
      <MapContainer
        center={[-41.2, 174.5]}
        zoom={5}
        scrollWheelZoom={true}
        className="bg-muted z-0 h-full w-full"
        attributionControl
      >
        <TileLayer
          key={isDark ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        <FitScopeBounds boundaries={boundaries} focusedSlug={focusedSlug} />
        <FocusPlace boundaries={boundaries} focusedSlug={focusedSlug} />
        <GeoJSON
          key={geoKey}
          data={boundaries}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}
