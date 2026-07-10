import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

function scoreTone(score: number): string {
  if (score >= 70) return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (score >= 50) return "border-teal-500/30 bg-teal-500/15 text-teal-300";
  if (score >= 35) return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  return "border-rose-500/30 bg-rose-500/15 text-rose-300";
}

export function MatchScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold tabular-nums", scoreTone(score), className)}
    >
      {score}
    </Badge>
  );
}

export function scoreColor(score: number): string {
  if (score >= 70) return "#34d399";
  if (score >= 50) return "#2dd4bf";
  if (score >= 35) return "#fbbf24";
  return "#fb7185";
}

export function scoreFill(score: number): string {
  // Emerald ramp 0–100 for choropleth
  const t = Math.max(0, Math.min(100, score)) / 100;
  const lightness = 28 + t * 32;
  const chroma = 0.08 + t * 0.12;
  return `oklch(${lightness}% ${chroma} 160)`;
}
