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
  if (score >= 70) return "#ea580c";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#a3a3a3";
  return "#d4d4d4";
}
