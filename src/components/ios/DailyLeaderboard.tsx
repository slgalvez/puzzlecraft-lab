import { useEffect, useState } from "react";
import { Trophy, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DailyScore {
  rank: number;
  display_name: string;
  solve_time: number;
  user_id: string | null;
  is_me: boolean;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const MEDAL_COLORS = ["text-amber-400", "text-zinc-400", "text-amber-700"];

interface DailyLeaderboardProps {
  hasCompletedToday: boolean;
  className?: string;
}

export function DailyLeaderboard({
  hasCompletedToday,
  className,
}: DailyLeaderboardProps) {
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data } = await (supabase
          .from("daily_scores" as any)
          .select("display_name, solve_time, user_id")
          .eq("date_str", todayDateStr())
          .order("solve_time", { ascending: true })
          .limit(10) as any);

        if (data) {
          const ranked: DailyScore[] = data.map((row: any, i: number) => ({
            rank: i + 1,
            display_name: row.display_name ?? "Anonymous",
            solve_time: row.solve_time,
            user_id: row.user_id,
            is_me: !!(user && row.user_id === user.id),
          }));
          setScores(ranked);

          if (user && !ranked.some((r) => r.is_me)) {
            const { count } = await (supabase
              .from("daily_scores" as any)
              .select("*", { count: "exact", head: true })
              .eq("date_str", todayDateStr())
              .lt("solve_time", (
                await (supabase
                  .from("daily_scores" as any)
                  .select("solve_time")
                  .eq("date_str", todayDateStr())
                  .eq("user_id", user.id)
                  .single() as any)
              ).data?.solve_time ?? 0) as any);
            if (count !== null) setMyRank(count + 1);
          }
        }
      } catch {}
      setLoading(false);
    };

    fetchScores();
  }, []);

  if (loading && scores.length === 0) return null;

  const displayScores = hasCompletedToday ? scores.slice(0, 5) : scores.slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Trophy size={13} className="text-amber-400" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today's leaderboard
          </p>
        </div>
        {scores.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {scores.length === 10 ? "Top 10" : `${scores.length} solver${scores.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 overflow-hidden">
        {scores.length === 0 && !loading && (
          <div className="flex flex-col items-center py-5">
            <p className="text-sm font-medium text-foreground">No solves yet today</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first on the board</p>
          </div>
        )}

        {displayScores.map((score, i) => (
          <div
            key={`${score.user_id}-${i}`}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5",
              i < displayScores.length - 1 && "border-b border-border/30",
              score.is_me && "bg-primary/5"
            )}
          >
            <span className={cn(
              "w-5 text-center text-sm font-bold leading-none",
              score.rank <= 3 ? MEDAL_COLORS[score.rank - 1] : "text-muted-foreground/60"
            )}>
              {score.rank <= 3 ? ["🥇","🥈","🥉"][score.rank - 1] : score.rank}
            </span>

            <span className={cn(
              "flex-1 text-sm truncate",
              score.is_me ? "font-semibold text-foreground" : "text-foreground"
            )}>
              {score.is_me ? "You" : score.display_name}
            </span>

            <span className={cn(
              "font-mono text-sm font-medium",
              score.is_me ? "text-primary" : "text-foreground"
            )}>
              {formatTime(score.solve_time)}
            </span>
          </div>
        ))}

        {!hasCompletedToday && scores.length > 3 && (
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border/30 bg-muted/20">
            <Lock size={13} className="text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground flex-1">
              Complete today's puzzle to see the full board
            </p>
            <ChevronRight size={13} className="text-muted-foreground/40" />
          </div>
        )}

        {hasCompletedToday && myRank && myRank > 10 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border/40 bg-muted/20">
            <span className="w-5 text-center text-sm text-muted-foreground/60 font-bold">
              {myRank}
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">You</span>
          </div>
        )}
      </div>
    </div>
  );
}
