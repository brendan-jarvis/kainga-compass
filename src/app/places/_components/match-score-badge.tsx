import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

function scoreTone(score: number): string {
  if (score >= 70)
    return "border-primary/30 bg-primary/15 text-primary";
  if (score >= 50)
    return "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-300";
  if (score >= 35)
    return "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300";
  return "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-300";
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
  // Nature-green ramp 0–100 for choropleth (hue ~166 matches primary)
  const t = Math.max(0, Math.min(100, score)) / 100;
  const lightness = 32 + t * 28;
  const chroma = 0.07 + t * 0.1;
  return `oklch(${lightness}% ${chroma} 166)`;
}
