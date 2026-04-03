import { useEffect, useState } from "react";
import { Trophy, Clock, Users, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SolveEntry {
  solver_name: string | null;
  solve_time: number;
  completed_at: string;
}

interface CraftAnalytics {
  shareId: string;
  totalSent: number;
  totalStarted: number;
  totalCompleted: number;
  completionRate: number;
  avgSolveTime: number | null;
  fastestTime: number | null;
  slowestTime: number | null;
  creatorTime: number | null;
  entries: SolveEntry[];
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

async function fetchCraftAnalytics(shareId: string): Promise<CraftAnalytics | null> {
  try {
    // Read the main shared puzzle + its recipients
    const { data: puzzle } = await supabase
      .from("shared_puzzles")
      .select("solve_time, completed_at, started_at, creator_solve_time")
      .eq("id", shareId)
      .maybeSingle();

    const { data: recipients } = await supabase
      .from("craft_recipients")
      .select("display_name, solve_time, completed_at, started_at")
      .eq("puzzle_id", shareId);

    if (!puzzle && (!recipients || recipients.length === 0)) return null;

    const allRecipients = recipients ?? [];
    const completed = allRecipients.filter((r) => r.completed_at && r.solve_time);
    const started   = allRecipients.filter((r) => r.started_at);

    const solveTimes = completed.map((r) => r.solve_time as number).filter(Boolean);
    const avgTime = solveTimes.length > 0
      ? Math.round(solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length)
      : null;

    return {
      shareId,
      totalSent: allRecipients.length,
      totalStarted: started.length,
      totalCompleted: completed.length,
      completionRate: allRecipients.length > 0 ? completed.length / allRecipients.length : 0,
      avgSolveTime: avgTime,
      fastestTime: solveTimes.length > 0 ? Math.min(...solveTimes) : null,
      slowestTime: solveTimes.length > 0 ? Math.max(...solveTimes) : null,
      creatorTime: puzzle?.creator_solve_time ?? null,
      entries: completed.map((r) => ({
        solver_name: r.display_name,
        solve_time: r.solve_time!,
        completed_at: r.completed_at!,
      })),
    };
  } catch {
    return null;
  }
}

interface CraftAnalyticsCardProps {
  shareId: string;
  puzzleTitle?: string;
  className?: string;
}

export function CraftAnalyticsCard({
  shareId,
  puzzleTitle,
  className,
}: CraftAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<CraftAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCraftAnalytics(shareId).then((data) => {
      setAnalytics(data);
      setLoading(false);
    });
  }, [shareId]);

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-card p-4 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[0,1,2,3].map((i) => <div key={i} className="h-14 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const statCards = [
    {
      icon: Users,
      label: "Recipients",
      value: analytics.totalSent,
      sub: `${analytics.totalStarted} started`,
    },
    {
      icon: Trophy,
      label: "Completed",
      value: `${Math.round(analytics.completionRate * 100)}%`,
      sub: `${analytics.totalCompleted} of ${analytics.totalSent}`,
      highlight: analytics.completionRate > 0.7,
    },
    {
      icon: Clock,
      label: "Avg time",
      value: analytics.avgSolveTime ? formatTime(analytics.avgSolveTime) : "—",
      sub: analytics.creatorTime
        ? `You: ${formatTime(analytics.creatorTime)}`
        : "No solves yet",
    },
    {
      icon: TrendingUp,
      label: "Fastest",
      value: analytics.fastestTime ? formatTime(analytics.fastestTime) : "—",
      sub: analytics.creatorTime && analytics.fastestTime
        ? analytics.fastestTime < analytics.creatorTime
          ? "Beat your time 🏆"
          : "Yours is fastest"
        : "",
      highlight: !!(analytics.fastestTime && analytics.creatorTime && analytics.fastestTime < analytics.creatorTime),
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Star size={14} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">
          {puzzleTitle ? `"${puzzleTitle}" analytics` : "Puzzle analytics"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/30">
        {statCards.map(({ icon: Icon, label, value, sub, highlight }) => (
          <div
            key={label}
            className={cn(
              "flex flex-col gap-0.5 bg-card p-3.5",
              highlight && "bg-emerald-50/50 dark:bg-emerald-950/20"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon size={12} className={highlight ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <p className={cn(
              "text-lg font-bold leading-none font-mono",
              highlight ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
            )}>
              {value}
            </p>
            {sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {analytics.entries.length > 0 && (
        <div className="border-t border-border/40">
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Solvers
          </p>
          {[...analytics.entries]
            .sort((a, b) => a.solve_time - b.solve_time)
            .slice(0, 5)
            .map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  i < analytics.entries.length - 1 && "border-b border-border/30"
                )}
              >
                <span className="text-sm w-4 text-center text-muted-foreground/60 font-bold">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">
                  {entry.solver_name ?? "Anonymous"}
                </span>
                <span className="font-mono text-sm font-medium text-foreground">
                  {formatTime(entry.solve_time)}
                </span>
                {analytics.creatorTime && entry.solve_time < analytics.creatorTime && (
                  <span className="text-[10px] text-emerald-600 font-medium">beat you</span>
                )}
              </div>
            ))}
        </div>
      )}

      {analytics.entries.length === 0 && (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">No solves yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Share the puzzle link to get solvers on the board
          </p>
        </div>
      )}
    </div>
  );
}
