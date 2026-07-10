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
import { cn } from "~/lib/utils";

import "leaflet/dist/leaflet.css";

type Props = {
  territories: ScoredTerritory[];
  boundaries: FeatureCollection;
  /** Hover highlight from ranked list */
  highlightedSlug?: string | null;
  /** Focus/zoom target from ranked list click */
  focusedSlug?: string | null;
  queryString?: string;
  className?: string;
};

/** Mainland NZ — slightly tighter than full EEZ so fitBounds zooms in. */
const NZ_BOUNDS: L.LatLngBoundsExpression = [
  [-47.4, 166.2],
  [-34.2, 178.8],
];

const STROKE_DEFAULT = "rgba(100, 100, 100, 0.4)";
const STROKE_HOVER = "rgba(60, 60, 60, 0.7)";
const STROKE_TOP = "#ea580c";
const STROKE_FOCUS = "#c2410c";

/** Linear RGB mix: orange (weaker) → emerald (stronger). */
function rankHeatFill(rank: number, total: number, isDark: boolean): string {
  if (total <= 0) {
    return isDark ? "rgba(234,88,12,0.2)" : "rgba(234,88,12,0.18)";
  }
  const t = total === 1 ? 1 : 1 - (rank - 1) / (total - 1); // 0 weak → 1 strong
  // orange-600 #ea580c → emerald-500 #10b981
  const r = Math.round(234 + t * (16 - 234));
  const g = Math.round(88 + t * (185 - 88));
  const b = Math.round(12 + t * (129 - 12));
  const a = isDark ? 0.28 + t * 0.5 : 0.32 + t * 0.48;
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

    const fit = () => {
      if (boundaries.features.length === 0) {
        map.fitBounds(NZ_BOUNDS, { padding: [12, 12], maxZoom: 6 });
        return;
      }
      try {
        const layer = L.geoJSON(boundaries);
        map.fitBounds(layer.getBounds().pad(0.04), {
          padding: [16, 16],
          maxZoom: 7,
          animate: true,
        });
      } catch {
        map.fitBounds(NZ_BOUNDS, { padding: [12, 12], maxZoom: 6 });
      }
    };

    // Allow container size to settle (tall layout) before fitting.
    requestAnimationFrame(() => {
      map.invalidateSize();
      fit();
    });
  }, [map, boundaries, focusedSlug]);

  // Refit when container is resized (layout breakpoints).
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

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
        padding: [36, 36],
        maxZoom: 11,
        animate: true,
        duration: 0.55,
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
  className,
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
      weight = 2.5;
    }

    return {
      fillColor: rankHeatFill(rank, total, isDark),
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
        target.setStyle({ weight: 2.5, color: STROKE_HOVER });
        const path = e.target as L.Path;
        if (typeof path.bringToFront === "function") path.bringToFront();
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target as { setStyle: (s: PathOptions) => void };
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
    <div
      className={cn(
        // Tall portrait map — NZ is north–south, not a wide landscape panel
        "border-border relative h-[min(72vh,640px)] w-full overflow-hidden rounded-xl border sm:h-[min(75vh,720px)]",
        className,
      )}
    >
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

      <div className="bg-background/90 border-border absolute bottom-3 left-3 z-[1000] max-w-[200px] rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
        <p className="text-foreground mb-1.5 font-medium">Match heatmap</p>
        <div
          className="mb-1 h-2.5 w-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(234,88,12,0.9), rgba(16,185,129,0.9))",
          }}
        />
        <div className="text-muted-foreground flex justify-between">
          <span>Weaker</span>
          <span>Stronger</span>
        </div>
        <p className="text-muted-foreground mt-1.5 leading-snug">
          Orange → emerald by rank. Outline = top match
          {focusedSlug ? " or focused place" : ""}.
        </p>
      </div>
    </div>
  );
}
