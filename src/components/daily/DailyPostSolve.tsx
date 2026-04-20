/**
 * DailyPostSolve.tsx
 * src/components/daily/DailyPostSolve.tsx
 *
 * The post-solve screen shown after completing the daily challenge.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Trophy, Flame, Clock, ArrowRight,
  CheckCircle2, BarChart3, Users, Star,
} from "lucide-react";
import { ShareButton } from "@/components/ui/ShareButton";
import { executeShare } from "@/lib/shareUtils";
import { cn } from "@/lib/utils";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PuzzleCategory } from "@/lib/puzzleTypes";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty } from "@/lib/puzzleTypes";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  solveTime: number;
  dateStr: string;
  displayDate: string;
  category: PuzzleCategory;
  difficulty: Difficulty;
  streakCount: number;
  /** True only when the user just finished — false if they're revisiting */
  isNew: boolean;
}

interface LeaderRow {
  display_name: string;
  solve_time: number;
  is_me: boolean;
  rank: number;
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useMidnightCountdown() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      setSecs(Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

// ── Streak milestone helper ───────────────────────────────────────────────────

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

function getMilestone(streak: number): { label: string; emoji: string } | null {
  if (!MILESTONES.includes(streak)) return null;
  if (streak >= 365) return { label: "One full year!", emoji: "🏆" };
  if (streak >= 100) return { label: `${streak}-day legend`, emoji: "💎" };
  if (streak >= 50)  return { label: `${streak}-day champion`, emoji: "🥇" };
  if (streak >= 30)  return { label: `${streak}-day streak`, emoji: "🔥" };
  if (streak >= 14)  return { label: "Two-week streak!", emoji: "⚡" };
  if (streak >= 7)   return { label: "One week straight!", emoji: "🌟" };
  return { label: "3 days in a row!", emoji: "✨" };
}

// ── Ordinal formatter ─────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DailyPostSolve({
  solveTime,
  dateStr,
  displayDate,
  category,
  difficulty,
  streakCount,
  isNew,
}: Props) {
  const { toast } = useToast();
  const countdown = useMidnightCountdown();
  const info = CATEGORY_INFO[category];
  const milestone = getMilestone(streakCount);

  // ── Leaderboard state ──
  const [rank, setRank] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [leaderRows, setLeaderRows] = useState<LeaderRow[]>([]);
  const [leaderLoading, setLeaderLoading] = useState(true);

  // ── Entrance animation ──
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), isNew ? 300 : 0);
    return () => clearTimeout(t);
  }, [isNew]);

  // ── Fetch rank + leaderboard ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Total solvers today
        const { count: totalCount } = await supabase
          .from("daily_scores" as any)
          .select("*", { count: "exact", head: true })
          .eq("date_str", dateStr) as any;

        // 2. How many solved faster (rank = faster_count + 1)
        const { count: fasterCount } = await supabase
          .from("daily_scores" as any)
          .select("*", { count: "exact", head: true })
          .eq("date_str", dateStr)
          .lt("solve_time", solveTime) as any;

        // 3. Top 5 scores
        const { data: topScores } = await supabase
          .from("daily_scores" as any)
          .select("display_name, solve_time")
          .eq("date_str", dateStr)
          .order("solve_time", { ascending: true })
          .limit(5) as any;

        if (cancelled) return;

        const myRank = (fasterCount ?? 0) + 1;
        const myTotal = totalCount ?? 1;
        setRank(myRank);
        setTotal(myTotal);

        // Build leaderboard rows
        const rows: LeaderRow[] = (topScores ?? []).map((s: any, i: number) => ({
          display_name: s.display_name ?? "Anonymous",
          solve_time:   s.solve_time,
          is_me:        s.solve_time === solveTime,
          rank:         i + 1,
        }));

        // If user isn't in top 5, append their row
        const meInTop5 = rows.some((r) => r.solve_time === solveTime);
        if (!meInTop5 && myRank > 0) {
          rows.push({
            display_name: "You",
            solve_time:   solveTime,
            is_me:        true,
            rank:         myRank,
          });
        }

        setLeaderRows(rows);
      } catch {
        // silently fail — leaderboard is non-critical
      } finally {
        if (!cancelled) setLeaderLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dateStr, solveTime]);

  // ── Share handler ──
  const percentile = rank !== null && total !== null && total > 1
    ? Math.round((1 - rank / total) * 100)
    : null;

  const handleShare = useCallback(async () => {
    const rankStr = rank ? `${ordinal(rank)} today` : "";
    const pctStr = percentile !== null && percentile > 0 ? ` · beat ${percentile}% of players` : "";
    const streakStr = streakCount > 1 ? `\n🔥 ${streakCount}-day streak` : "";
    const text = [
      `Puzzlecraft Daily · ${displayDate}`,
      `${info.name} · ${DIFFICULTY_LABELS[difficulty]} · ${formatTime(solveTime)}`,
      rankStr ? `${rankStr}${pctStr}` : "",
      streakStr,
      "",
      `${window.location.origin}/daily`,
    ].filter((l, i) => l !== "" || i === 4).join("\n");

    const result = await executeShare(text);
    if (result === "copied") {
      toast({ title: "Copied to clipboard!" });
    } else if (result === "error") {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  }, [rank, percentile, streakCount, displayDate, info.name, difficulty, solveTime, toast]);

  // ── Render ────────────────────────────────────────────────────────────────

  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div
      className={cn(
        "transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
    >
      {/* ── Streak milestone banner (only on new solve + milestone hit) ── */}
      {isNew && milestone && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <span className="text-2xl">{milestone.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{milestone.label}</p>
            <p className="text-xs text-muted-foreground">Keep going — your streak is building</p>
          </div>
        </div>
      )}

      {/* ── Main result card ── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-primary" />

        <div className="p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <CheckCircle2 size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
                  Challenge Complete
                </p>
                <p className="text-xl font-display font-bold text-foreground">
                  {info.name} · {DIFFICULTY_LABELS[difficulty]}
                </p>
              </div>
            </div>
            {/* Solve time — large and prominent */}
            <div className="text-right shrink-0">
              <p className="font-mono text-3xl font-extrabold text-foreground leading-none">
                {formatTime(solveTime)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">your time</p>
            </div>
          </div>

          {/* Rank + percentile row */}
          {!leaderLoading && rank !== null && total !== null && (
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 rounded-xl bg-secondary/60 px-4 py-3 flex items-center gap-3">
                <Trophy size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Your rank today</p>
                  <p className="text-lg font-bold font-mono text-foreground leading-tight">
                    {ordinal(rank)}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">
                      of {total} solver{total !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              </div>
              {percentile !== null && percentile > 0 && (
                <div className="flex-1 rounded-xl bg-secondary/60 px-4 py-3 flex items-center gap-3">
                  <Users size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Better than</p>
                    <p className="text-lg font-bold font-mono text-foreground leading-tight">
                      {percentile}%
                      <span className="text-sm font-normal text-muted-foreground ml-1.5">of players</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Streak row */}
          {streakCount > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <Flame size={15} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">{streakCount}-day streak</span>
              {streakCount >= 3 && (
                <span className="text-xs text-muted-foreground">
                  · {streakCount < 7 ? `${7 - streakCount} days to a week` : streakCount < 30 ? `${30 - streakCount} to 30` : "keep it going"}
                </span>
              )}
            </div>
          )}

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <ShareButton
              onShare={handleShare}
              variant="outline"
              size="sm"
              label="Share result"
              iconSize={13}
            />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/puzzles`}>
                Play more <ArrowRight size={13} />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Link to="/stats">
                <BarChart3 size={13} />
                Your stats
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Leaderboard preview ── */}
        {leaderRows.length > 0 && (
          <div className="border-t border-border/60">
            <div className="px-5 py-2.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Today's leaderboard
              </p>
              <p className="text-[10px] text-muted-foreground/50">{displayDate}</p>
            </div>
            <div className="pb-3">
              {leaderRows.map((row, i) => {
                const isGap = i > 0 && row.rank - leaderRows[i - 1].rank > 1;
                return (
                  <div key={i}>
                    {isGap && (
                      <div className="px-5 py-1">
                        <div className="border-t border-dashed border-border/40" />
                      </div>
                    )}
                    <div className={cn(
                      "flex items-center gap-3 px-5 py-2 transition-colors",
                      row.is_me && "bg-primary/5"
                    )}>
                      <span className="text-sm w-6 text-center shrink-0 leading-none">
                        {row.rank <= 3 ? MEDAL[row.rank - 1] : (
                          <span className="text-xs font-mono text-muted-foreground/60">{row.rank}</span>
                        )}
                      </span>
                      <span className={cn(
                        "flex-1 text-sm truncate",
                        row.is_me ? "font-semibold text-primary" : "text-foreground"
                      )}>
                        {row.is_me ? "You" : row.display_name}
                      </span>
                      <span className={cn(
                        "font-mono text-sm font-semibold tabular-nums shrink-0",
                        row.is_me ? "text-primary" : "text-foreground"
                      )}>
                        {formatTime(row.solve_time)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tomorrow countdown ── */}
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between bg-secondary/20">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Next puzzle in</span>
          </div>
          <span className="font-mono text-sm font-bold text-foreground tabular-nums">
            {countdown}
          </span>
        </div>
      </div>
    </div>
  );
}