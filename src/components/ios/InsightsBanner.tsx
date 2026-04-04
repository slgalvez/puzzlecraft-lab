/**
 * InsightsBanner.tsx
 * src/components/ios/InsightsBanner.tsx
 *
 * Renders 1–3 dynamic insights derived from the user's solve history.
 */

import { TrendingUp, Flame, Zap, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonalInsights, type Insight } from "@/hooks/usePersonalInsights";

const ICONS = {
  "trending-up": TrendingUp,
  "flame":       Flame,
  "zap":         Zap,
  "target":      Target,
  "clock":       Clock,
} as const;

function InsightRow({ insight }: { insight: Insight }) {
  const Icon = ICONS[insight.icon];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3.5 py-3",
        insight.urgent
          ? "border-destructive/20 bg-destructive/5"
          : "border-border/50 bg-card"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        insight.urgent ? "bg-destructive/10" : "bg-primary/10"
      )}>
        <Icon
          size={13}
          className={insight.urgent ? "text-destructive" : "text-primary"}
        />
      </div>
      <p className={cn(
        "text-[12px] leading-snug",
        insight.urgent ? "text-destructive font-medium" : "text-foreground"
      )}>
        {insight.text}
      </p>
    </div>
  );
}

export function InsightsBanner({ className }: { className?: string }) {
  const insights = usePersonalInsights();

  if (insights.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {insights.map((insight) => (
        <InsightRow key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
