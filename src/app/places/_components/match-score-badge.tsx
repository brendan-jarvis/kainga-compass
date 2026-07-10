import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

function scoreTone(score: number): string {
  if (score >= 70)
    return "border-emerald-600/35 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300";
  if (score >= 50)
    return "border-lime-600/30 bg-lime-500/12 text-lime-800 dark:border-lime-400/30 dark:bg-lime-400/15 dark:text-lime-300";
  if (score >= 35)
    return "border-amber-600/30 bg-amber-500/12 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300";
  return "border-rose-600/35 bg-rose-500/12 text-rose-700 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-300";
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
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#84cc16";
  if (score >= 35) return "#f59e0b";
  return "#f43f5e";
}
