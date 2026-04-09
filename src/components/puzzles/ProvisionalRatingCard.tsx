/**
 * ProvisionalRatingCard.tsx
 * src/components/puzzles/ProvisionalRatingCard.tsx
 *
 * A unified rating card that renders correctly for every user state:
 *
 *   hasNoData      → motivating "solve your first puzzle" prompt
 *   isProvisional  → rating shown with provisional badge + progress bar toward confirmation
 *   confirmed      → full rating card (used in Stats.tsx hero and PremiumStats)
 *   onLeaderboard  → adds leaderboard rank if available
 */

import { cn } from "@/lib/utils";
import { Zap, Lock, ChevronRight, Trophy, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PlayerRatingInfo } from "@/lib/solveScoring";
import { Link } from "react-router-dom";

// ── Sub-states ────────────────────────────────────────────────────────────

/** Shown when user has zero qualifying solves. */
function NoDataState({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Zap size={13} className="text-muted-foreground/40" />
          Solve a puzzle to start ranking
        </span>
        <Link to="/puzzles" className="flex items-center gap-1 text-xs font-medium text-primary">
          Play <ChevronRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/15 bg-card px-6 py-8 text-center">
      <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-xl bg-primary/10">
        <Target size={22} className="text-primary" />
      </div>
      <p className="font-display text-base font-semibold text-foreground mb-1">
        Your ranking starts here
      </p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Solve your first puzzle to get a provisional rating. Your rank improves with every solve.
      </p>
    </div>
  );
}

/** Progress indicator: X more solves to unlock next state */
function ProgressPips({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: target }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-all duration-300",
              i < current ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface ProvisionalRatingCardProps {
  info: PlayerRatingInfo;
  /** Leaderboard rank if known (from Supabase query). Null until onLeaderboard. */
  leaderboardRank?: number | null;
  /** Compact single-row variant for IOSPlayTab stats link */
  compact?: boolean;
  /** Called when user clicks the card / CTA */
  onClick?: () => void;
  className?: string;
}

export function ProvisionalRatingCard({
  info,
  leaderboardRank,
  compact = false,
  onClick,
  className,
}: ProvisionalRatingCardProps) {
  const {
    rating, tier, tierColor, tierProgress,
    isProvisional, hasNoData,
    solveCount, solvesUntilConfirmed, solvesUntilLeaderboard,
    onLeaderboard,
  } = info;

  // ── No data ──
  if (hasNoData) return <NoDataState compact={compact} />;

  // ── Compact variant (IOSPlayTab stats row) ──────────────────────────────
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-2 px-1 text-sm text-muted-foreground transition-colors active:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {solveCount} puzzle{solveCount !== 1 ? "s" : ""} solved
          {isProvisional ? (
            <span className="text-[10px] font-semibold text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5">
              Provisional
            </span>
          ) : (
            <span className={cn("text-xs font-semibold", tierColor)}>
              · {tier}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          Stats <ChevronRight size={13} />
        </span>
      </button>
    );
  }

  // ── Full card ────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 sm:p-6",
        isProvisional ? "border-border" : "border-primary/20",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">

        {/* Left: rating number + tier */}
        <div className="sm:w-48 shrink-0">
          {/* Label row */}
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={14} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Player Rating
            </span>
            {leaderboardRank && onLeaderboard && (
              <span className="font-mono font-bold text-xs text-primary">#{leaderboardRank}</span>
            )}
          </div>

          {/* Rating number */}
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-5xl font-bold text-foreground leading-none">
              {rating}
            </p>
            {isProvisional && (
              <span className="text-[10px] font-semibold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
                Provisional
              </span>
            )}
          </div>

          {/* Tier name */}
          <p className={cn("mt-1.5 text-sm font-semibold", tierColor)}>{tier}</p>

          {/* Tier progress bar */}
          <div className="mt-2.5 space-y-1">
            <Progress value={tierProgress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Progress to next rank</p>
          </div>
        </div>

        {/* Right: status message + progress */}
        <div className="flex-1 space-y-4">
          {isProvisional ? (
            <>
              {/* Motivating message */}
              <div className="rounded-xl bg-secondary/50 px-4 py-3">
                <p className="text-sm font-medium text-foreground mb-0.5">
                  {solvesUntilConfirmed === 1
                    ? "One more solve to confirm your rank"
                    : `${solvesUntilConfirmed} more solves to confirm your rank`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Your rating is live — it updates after every puzzle. Solve more to lock it in.
                </p>
              </div>

              {/* Progress pips toward confirmation */}
              <ProgressPips
                current={solveCount}
                target={5}
                label={`${solveCount} of 5 solves · confirmed after 5`}
              />

              {/* Leaderboard unlock */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={11} className="shrink-0" />
                <span>
                  Leaderboard unlocks after {solvesUntilLeaderboard} more solve{solvesUntilLeaderboard !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Confirmed rating — show solve count + leaderboard status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                  <p className="font-mono text-xl font-bold text-foreground">{solveCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Puzzles solved</p>
                </div>
                <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                  {onLeaderboard ? (
                    <>
                      <p className="font-mono text-xl font-bold text-foreground">
                        {leaderboardRank ? `#${leaderboardRank}` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Global rank</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground/60">{solvesUntilLeaderboard} more</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">To leaderboard</p>
                    </>
                  )}
                </div>
              </div>

              {/* Leaderboard progress if not yet on it */}
              {!onLeaderboard && (
                <ProgressPips
                  current={solveCount}
                  target={10}
                  label={`${solveCount} of 10 solves · leaderboard after 10`}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}