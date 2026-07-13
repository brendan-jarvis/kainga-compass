"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChoroplethCanvas } from "@nivo/geo";
import type { Feature, FeatureCollection } from "geojson";
import { geoMercator } from "d3-geo";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import type { ScoredTerritory } from "~/lib/places/types";
import { cn } from "~/lib/utils";

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

type ChoroplethDatum = {
  id: string;
  value: number;
  name: string;
  rank: number;
};

/**
 * Chatham Islands sit near lng −176. Including them with mainland +166…+179
 * makes fitExtent span the whole globe. Keep them drawn; omit from framing.
 */
function isMainlandNzFeature(feature: Feature): boolean {
  let saw = false;
  let xmin = Infinity;
  let xmax = -Infinity;
  const visit = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      const lng = c[0];
      saw = true;
      xmin = Math.min(xmin, lng);
      xmax = Math.max(xmax, lng);
      return;
    }
    for (const child of c) visit(child);
  };
  visit(
    feature.geometry && "coordinates" in feature.geometry
      ? feature.geometry.coordinates
      : null,
  );
  if (!saw) return false;
  return xmin > 160 && xmax < 180;
}

function fitProjectionParams(
  features: Feature[],
  width: number,
  height: number,
  pad = 16,
): { scale: number; translation: [number, number]; rotation: [number, number, number] } {
  const mainland = features.filter(isMainlandNzFeature);
  const toFit = mainland.length > 0 ? mainland : features;
  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: toFit,
  };

  const projection = geoMercator();
  projection.fitExtent(
    [
      [pad, pad],
      [Math.max(pad + 1, width - pad), Math.max(pad + 1, height - pad)],
    ],
    collection,
  );

  const scale = projection.scale();
  const [tx, ty] = projection.translate();
  const [rx, ry, rz] = projection.rotate();

  return {
    scale,
    translation: [tx / width, ty / height],
    rotation: [rx, ry, rz],
  };
}

/** Nivo bound features include geo id + our datum; types omit id. */
type BoundMapFeature = {
  id?: string | number;
  label?: string | number;
  formattedValue?: string | number;
  color?: string;
  value?: number;
  data?: ChoroplethDatum;
  properties?: { name?: string; slug?: string };
};

function asBoundFeature(feature: unknown): BoundMapFeature {
  return feature as BoundMapFeature;
}

function featureId(feature: unknown): string {
  const f = asBoundFeature(feature);
  return String(f.data?.id ?? f.id ?? f.properties?.slug ?? "");
}

function MatchTooltip({ feature }: { feature: BoundMapFeature }) {
  if (feature.value === undefined && !feature.data) return null;
  const name =
    feature.data?.name ??
    feature.properties?.name ??
    (typeof feature.label === "string" || typeof feature.label === "number"
      ? String(feature.label)
      : "Place");
  const rank = feature.data?.rank;
  const score = feature.formattedValue ?? feature.value ?? "—";

  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-2.5 py-1.5 text-sm shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <span
          className="inline-block size-2.5 shrink-0 rounded-sm"
          style={{ background: feature.color ?? "#999" }}
        />
        {name}
      </div>
      <div className="text-muted-foreground mt-0.5 text-xs">
        {rank != null ? `Rank #${rank} · ` : ""}
        Match {score}
      </div>
    </div>
  );
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const features = useMemo(
    () =>
      boundaries.features.map((f) => ({
        ...f,
        id: String(f.properties?.slug ?? f.id ?? ""),
      })),
    [boundaries],
  );

  const data: ChoroplethDatum[] = useMemo(
    () =>
      territories.map((t, i) => ({
        id: t.slug,
        value: t.matchScore,
        name: t.name,
        rank: i + 1,
      })),
    [territories],
  );

  const domain = useMemo((): [number, number] => {
    if (data.length === 0) return [0, 100];
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      min = Math.min(min, d.value);
      max = Math.max(max, d.value);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
    if (min === max) {
      const pad = min === 0 ? 1 : Math.abs(min) * 0.05;
      return [min - pad, max + pad];
    }
    return [min, max];
  }, [data]);

  const projection = useMemo(() => {
    if (size.width < 32 || size.height < 32 || features.length === 0) {
      return {
        scale: 100,
        translation: [0.5, 0.5] as [number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    }

    let fitFeatures: Feature[] = features;
    if (focusedSlug) {
      const focused = features.filter((f) => f.id === focusedSlug);
      if (focused.length > 0) fitFeatures = focused;
    }

    try {
      return fitProjectionParams(fitFeatures, size.width, size.height, 20);
    } catch {
      return {
        scale: 1000,
        translation: [0.5, 0.5] as [number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
    }
  }, [features, focusedSlug, size.height, size.width]);

  const bySlug = useMemo(() => {
    const map = new Map<string, ChoroplethDatum>();
    for (const d of data) map.set(d.id, d);
    return map;
  }, [data]);

  const unknownColor = isDark ? "#3f3f46" : "#e4e4e7";
  const defaultBorder = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const accentBorder = isDark ? "#fafafa" : "#171717";
  const focusBorder = isDark ? "#a7f3d0" : "#047857";

  return (
    <div
      ref={containerRef}
      className={cn(
        "border-border bg-card relative h-[min(78vh,800px)] w-full overflow-hidden rounded-xl border",
        className,
      )}
    >
      {size.width > 0 && size.height > 0 && features.length > 0 ? (
        <ChoroplethCanvas
          width={size.width}
          height={size.height}
          features={features}
          data={data}
          match="id"
          label={(feature) => {
            const f = asBoundFeature(feature);
            return (
              f.properties?.name ??
              f.data?.name ??
              String(f.id ?? f.properties?.slug ?? "Place")
            );
          }}
          value="value"
          valueFormat=".0f"
          domain={domain}
          // Nivo choropleth default sequential scheme
          colors="PuBuGn"
          unknownColor={unknownColor}
          projectionType="mercator"
          projectionScale={projection.scale}
          projectionTranslation={projection.translation}
          projectionRotation={projection.rotation}
          borderWidth={(feature) => {
            const id = featureId(feature);
            if (id && id === focusedSlug) return 2.5;
            if (id && id === highlightedSlug) return 2;
            return 0.6;
          }}
          // nivo types incorrectly type borderColor accessor as number
          borderColor={
            ((feature: unknown) => {
              const id = featureId(feature);
              if (id && id === focusedSlug) return focusBorder;
              if (id && id === highlightedSlug) return accentBorder;
              return defaultBorder;
            }) as unknown as string
          }
          isInteractive
          onClick={(feature) => {
            const id = featureId(feature);
            if (!id || !bySlug.has(id)) return;
            const qs = queryString ? `?${queryString}` : "";
            router.push(`/places/${id}${qs}`);
          }}
          tooltip={({ feature }) => {
            const f = asBoundFeature(feature);
            const id = featureId(f);
            const datum = bySlug.get(id);
            return (
              <MatchTooltip
                feature={{
                  ...f,
                  data: datum ?? f.data,
                  label: datum?.name ?? String(f.label ?? ""),
                }}
              />
            );
          }}
          theme={{
            background: "transparent",
            text: {
              fill: isDark ? "#e4e4e7" : "#27272a",
            },
            tooltip: {
              container: {
                background: "transparent",
                boxShadow: "none",
                padding: 0,
              },
            },
          }}
        />
      ) : (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center text-sm">
          {features.length === 0 ? "No map features for this view." : "Loading map…"}
        </div>
      )}
    </div>
  );
}
