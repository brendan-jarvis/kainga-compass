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

/** Light grey outlines — structure without competing with the heatmap. */
const STROKE_DEFAULT = "rgba(120, 120, 120, 0.45)";
const STROKE_HOVER = "rgba(80, 80, 80, 0.75)";
const STROKE_TOP = "rgba(234, 88, 12, 0.85)"; // orange-600 — top match
const STROKE_FOCUS = "#ea580c"; // orange-600 solid focus

/**
 * Heatmap fill by rank (1 = best match).
 * Communicates: hotter = better personalised match; cool grey = weaker.
 */
function rankHeatFill(rank: number, total: number, isDark: boolean): string {
  if (total <= 0) return isDark ? "rgba(100,100,100,0.2)" : "rgba(160,160,160,0.15)";
  const t = total === 1 ? 1 : 1 - (rank - 1) / (total - 1); // 1 top → 0 bottom
  // Warm orange ramp; bottom ranks stay pale grey so boundaries don't dominate.
  if (isDark) {
    const r = Math.round(100 + t * 151);
    const g = Math.round(100 + t * 46);
    const b = Math.round(100 - t * 40);
    const a = 0.18 + t * 0.52;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  const r = Math.round(180 + t * 54);
  const g = Math.round(180 - t * 92);
  const b = Math.round(180 - t * 148);
  const a = 0.12 + t * 0.48;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function FitScopeBounds({
  boundaries,
  focusedSlug,
}: {
  boundaries: FeatureCollection;
  focusedSlug?: string | null;
}) {
  const map = useMap();
  const lastScopeKey = useRef<string>("");

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

  const total = territories.length;

  const bySlug = useMemo(() => {
    const map = new Map<
      string,
      { territory: ScoredTerritory; rank: number }
    >();
    // territories already sorted best → worst by matchScore
    territories.forEach((t, i) => {
      map.set(t.slug, { territory: t, rank: i + 1 });
    });
    return map;
  }, [territories]);

  const topSlug = territories[0]?.slug ?? null;

  const styleFeature = (feature?: Feature): PathOptions => {
    const slug = feature?.properties?.slug as string | undefined;
    const entry = slug ? bySlug.get(slug) : undefined;
    const rank = entry?.rank ?? total;
    const isFocused = Boolean(slug && slug === focusedSlug);
    const isHovered = Boolean(slug && slug === highlightedSlug && !isFocused);
    const isTop = Boolean(slug && slug === topSlug);

    // Heatmap = personalised rank; outlines stay quiet grey unless top/focus.
    let color = STROKE_DEFAULT;
    let weight = 1;

    if (isFocused) {
      color = STROKE_FOCUS;
      weight = 3;
    } else if (isHovered) {
      color = STROKE_HOVER;
      weight = 2;
    } else if (isTop) {
      color = STROKE_TOP;
      weight = 2.25;
    }

    return {
      fillColor: rankHeatFill(rank, total, isDark),
      // Alpha lives in rgba fill; keep Leaflet fillOpacity at 1
      fillOpacity: 1,
      weight,
      opacity: 1,
      color,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const slug = feature.properties?.slug as string | undefined;
    const name = (feature.properties?.name as string | undefined) ?? slug;
    const entry = slug ? bySlug.get(slug) : undefined;
    const score = entry?.territory.matchScore ?? "—";
    const rank = entry?.rank ?? "—";
    const isTop = slug === topSlug;

    layer.bindTooltip(
      `<strong>${name}</strong><br/>` +
        `Rank #${rank}${isTop ? " · top match" : ""}<br/>` +
        `Match score: ${score}`,
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
        target.setStyle({
          weight: 2.5,
          color: STROKE_HOVER,
        });
        target.setStyle({
          // bring to front
        });
        // Leaflet path bringToFront if available
        const path = e.target as L.Path;
        if (typeof path.bringToFront === "function") path.bringToFront();
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

      {/* Legend: what the map is trying to say */}
      <div className="bg-background/90 border-border absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
        <p className="text-foreground mb-1.5 font-medium">Match heatmap</p>
        <div
          className="mb-1 h-2 w-full rounded-full"
          style={{
            background: isDark
              ? "linear-gradient(90deg, rgba(100,100,100,0.35), rgba(251,146,60,0.85))"
              : "linear-gradient(90deg, rgba(180,180,180,0.35), rgba(234,88,12,0.75))",
          }}
        />
        <div className="text-muted-foreground flex justify-between">
          <span>Weaker</span>
          <span>Stronger</span>
        </div>
        <p className="text-muted-foreground mt-1.5 leading-snug">
          Warm fill = higher rank for your weights. Orange outline = top match
          {focusedSlug ? " or focused place" : ""}.
        </p>
      </div>
    </div>
  );
}
