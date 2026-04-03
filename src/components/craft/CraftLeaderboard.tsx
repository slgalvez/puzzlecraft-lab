/**
 * CraftLeaderboard
 *
 * Mini-leaderboard shown on the SharedCraftPuzzle solve completion screen.
 * Queries craft_recipients for all solvers of this puzzle, ranked by solve_time.
 * Shows the current solver's rank with a highlight.
 *
 * Also handles registering a new solve entry — called from SharedCraftPuzzle
 * after the puzzle is completed.
 */

import { useEffect, useState } from "react";
import { Trophy, Medal, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  solve_time: number;
  completed_at: string;
}

interface Props {
  puzzleId: string;
  /** The solve entry ID for the current solver — used to highlight their row */
  currentEntryId: string | null;
  /** Whether to show the leaderboard (only after solve) */
  visible: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function rankEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CraftLeaderboard({ puzzleId, currentEntryId, visible }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !puzzleId) return;

    const load = async () => {
      const { data } = await supabase
        .from("craft_recipients" as any)
        .select("id, display_name, solve_time, completed_at")
        .eq("puzzle_id", puzzleId)
        .not("solve_time", "is", null)
        .not("completed_at", "is", null)
        .order("solve_time", { ascending: true })
        .limit(10);

      if (data) {
        setEntries(data as LeaderboardEntry[]);
      }
      setLoading(false);
    };

    load();
  }, [puzzleId, visible]);

  if (!visible || loading) return null;
  if (entries.length < 2) return null; // only show once 2+ people have solved

  const currentRank = currentEntryId
    ? entries.findIndex((e) => e.id === currentEntryId) + 1
    : null;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Leaderboard</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users size={11} />
          {entries.length} solver{entries.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Current solver's rank callout */}
      {currentRank !== null && currentRank > 0 && (
        <div className={cn(
          "px-4 py-2.5 text-sm font-semibold border-b border-border/40",
          currentRank === 1
            ? "bg-amber-400/10 text-amber-600"
            : currentRank <= 3
              ? "bg-primary/8 text-primary"
              : "bg-secondary/50 text-foreground"
        )}>
          {currentRank === 1
            ? "🏆 You're in first place!"
            : currentRank === 2
              ? "🥈 You're in second place"
              : currentRank === 3
                ? "🥉 You're in third place"
                : `You ranked #${currentRank} of ${entries.length}`
          }
        </div>
      )}

      {/* Leaderboard rows */}
      <div className="divide-y divide-border/40">
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const isCurrent = entry.id === currentEntryId;

          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-colors",
                isCurrent && "bg-primary/5"
              )}
            >
              {/* Rank */}
              <span className={cn(
                "text-sm font-bold w-7 text-center shrink-0",
                rank === 1 ? "text-amber-500" :
                rank === 2 ? "text-slate-400" :
                rank === 3 ? "text-amber-700/70" :
                "text-muted-foreground"
              )}>
                {rank <= 3 ? rankEmoji(rank) : `#${rank}`}
              </span>

              {/* Name */}
              <span className={cn(
                "flex-1 text-sm truncate min-w-0",
                isCurrent ? "font-semibold text-foreground" : "text-foreground/80"
              )}>
                {entry.display_name}
                {isCurrent && (
                  <span className="ml-1.5 text-[10px] font-normal text-primary">you</span>
                )}
              </span>

              {/* Time */}
              <div className="flex items-center gap-1 shrink-0">
                <Clock size={10} className="text-muted-foreground/60" />
                <span className={cn(
                  "font-mono text-xs tabular-nums",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {formatTime(entry.solve_time)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helper: register a solve in craft_recipients ───────────────────────────

/**
 * Called from SharedCraftPuzzle after puzzle completion.
 * Creates a new row in craft_recipients for this solve.
 * Returns the entry ID so CraftLeaderboard can highlight the current solver.
 */
export async function registerCraftSolve(
  puzzleId: string,
  solveTime: number,
  displayName: string
): Promise<string | null> {
  try {
    // Generate a unique ID for this solve entry
    const entryId = `${puzzleId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase
      .from("craft_recipients" as any)
      .insert({
        id: entryId,
        puzzle_id: puzzleId,
        display_name: displayName.trim() || "Anonymous",
        solve_time: solveTime,
        started_at: new Date(Date.now() - solveTime * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      } as any);

    if (error) return null;
    return entryId;
  } catch {
    return null;
  }
}
