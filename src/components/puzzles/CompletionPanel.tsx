import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, RefreshCw, Share, CheckCheck, TrendingUp, TrendingDown, Trophy, Flame, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { getPuzzleOrigin, getBackPath, getBackLabel } from "@/lib/puzzleOrigin";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { hapticSuccess, hapticPB, hapticHardComplete } from "@/lib/haptic";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor, computeSolveScore } from "@/lib/solveScoring";
import { getDailyStreak } from "@/lib/dailyChallenge";
import { isNativeApp } from "@/lib/appMode";
import { usePaywallTiming } from "@/hooks/usePaywallTiming";
import { useSolveShareCard } from "@/hooks/useSolveShareCard";
import { maybeRequestRating } from "@/lib/appRating";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/account/UpgradeModal";
import { buildSolveShareText } from "@/lib/shareText";

interface Props {
  time: number;
  difficulty: Difficulty;
  onPlayAgain: () => void;
  accuracy?: number | null;
  assisted?: boolean;
  category?: PuzzleCategory;
  seed?: number;
  dailyCode?: string;
  hintsUsed?: number;
  mistakesCount?: number;
}

// buildShareData removed — now uses buildSolveShareText from shareText.ts

function useRatingDelta() {
  return useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (records.length < 11) return null;
    const currentRating = computePlayerRating(records);
    const previousRating = computePlayerRating(records.slice(1));
    const delta = currentRating - previousRating;
    const latest = records[0];
    if (!latest) return null;
    const factors: string[] = [];
    if (["hard", "extreme", "insane"].includes(latest.difficulty)) {
      factors.push(`${DIFFICULTY_LABELS[latest.difficulty]} difficulty`);
    }
    if (latest.hintsUsed === 0) factors.push("No hints");
    if (latest.mistakesCount <= 1) factors.push("High accuracy");
    return { delta, currentRating, tier: getSkillTier(currentRating, records.length), factors };
  }, []);
}

function usePersonalBest(
  category?: PuzzleCategory,
  difficulty?: Difficulty,
  time?: number,
  assisted?: boolean,
) {
  return useMemo(() => {
    if (!category || !difficulty || !time || assisted) return null;
    const records = getSolveRecords().filter(
      (r) => r.puzzleType === category && r.difficulty === difficulty && r.solveTime >= 10,
    );
    if (records.length < 2) return null;
    const sorted = [...records].sort((a, b) => a.solveTime - b.solveTime);
    const best = sorted[0].solveTime;
    const prev = sorted[1]?.solveTime ?? null;
    const isNewBest = best === time;
    const improvement = prev && isNewBest ? prev - time : null;
    return { isNewBest, best, prev, improvement };
  }, [category, difficulty, time, assisted]);
}

const CompletionPanel = ({
  time,
  difficulty,
  onPlayAgain,
  accuracy,
  assisted,
  category,
  seed,
  dailyCode,
  hintsUsed,
  mistakesCount,
}: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const native = isNativeApp();

  const { shouldShow: paywallOpen, dismiss: dismissPaywall, checkAfterSolve } = usePaywallTiming();

  const origin = getPuzzleOrigin();
  const isDaily = origin === "daily";
  const ratingDelta = useRatingDelta();
  const personalBest = usePersonalBest(category, difficulty, time, assisted);
  const shareData = buildShareData({ category, seed, difficulty, time, isDaily, dailyCode, prevBest: personalBest?.prev });
  const streak = useMemo(() => getDailyStreak(), []);

  const score = useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (!records.length) return null;
    return computeSolveScore(records[0]);
  }, []);

  const isNewBest = personalBest?.isNewBest === true;

  // Visual share card
  const { shareWithCard, sharing } = useSolveShareCard({
    puzzleType: category,
    difficulty,
    time,
    isNewBest,
    streakDays: streak.current,
    isDaily,
    shareUrl: shareData?.url,
  });

  // Daily rank query
  const { data: dailyRank } = useQuery({
    queryKey: ["daily-rank", dailyCode],
    enabled: isDaily && !!dailyCode,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_scores")
        .select("solve_time")
        .eq("date_str", dailyCode!)
        .order("solve_time", { ascending: true });
      if (!data || data.length === 0) return null;
      const rank = data.findIndex((r) => r.solve_time >= time) + 1;
      return { rank: rank || data.length + 1, total: data.length };
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    // Conditional haptics
    if (isNewBest) {
      hapticPB();
    } else if (["hard", "extreme", "insane"].includes(difficulty)) {
      hapticHardComplete();
    } else {
      hapticSuccess();
    }

    const id = requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setStatsVisible(true), 300);

    if (!assisted) {
      checkAfterSolve(difficulty);
    }

    // App rating prompt (fire-and-forget)
    const records = getSolveRecords();
    maybeRequestRating({ solveCount: records.length, isNewBest, streakLength: streak.current });

    if (isNewBest) {
      setShareOpen(true);
      const t2 = setTimeout(() => setShowConfetti(true), 400);
      return () => { cancelAnimationFrame(id); clearTimeout(t1); clearTimeout(t2); };
    }
    return () => { cancelAnimationFrame(id); clearTimeout(t1); };
  }, [isNewBest, difficulty, assisted, checkAfterSolve, streak.current]);

  const handleShare = async () => {
    if (!shareData) return;
    await shareWithCard(shareData.text);
    // Show "copied" state if clipboard was used (sharing is false = no share sheet opened)
    if (!sharing) {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pc-confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(160px) rotate(540deg); opacity: 0; }
        }
        @keyframes pc-pop-in {
          0%   { transform: scale(0.5); opacity: 0; }
          65%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pc-slide-up {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .pc-pop-in   { animation: pc-pop-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .pc-slide-up { animation: pc-slide-up 0.35s ease-out forwards; }
        .pc-confetti { animation: pc-confetti-fall var(--dur) ease-out var(--delay) forwards; opacity: 0; }
      `}</style>

      <div
        className={cn(
          "rounded-xl border bg-card transition-all duration-500 ease-out overflow-hidden",
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.97]",
        )}
      >
        {/* Confetti */}
        {showConfetti && (
          <div className="relative h-0 overflow-visible pointer-events-none" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => {
              const colors = ["bg-primary", "bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-pink-400"];
              return (
                <div
                  key={i}
                  className={cn("absolute top-0 w-2 h-2 rounded-sm pc-confetti", colors[i % colors.length])}
                  style={{
                    left: `${8 + ((i * 19) % 82)}%`,
                    ["--dur" as string]: `${0.75 + ((i * 0.06) % 0.55)}s`,
                    ["--delay" as string]: `${(i * 0.05) % 0.4}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className={cn("p-4 sm:p-5", isNewBest && "bg-primary/5")}>
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-700 ease-out",
                isNewBest ? "bg-amber-400/20" : "bg-primary/15",
                visible ? "pc-pop-in" : "opacity-0 scale-50",
              )}
            >
              {isNewBest
                ? <Trophy size={15} className="text-amber-500" />
                : <Check size={14} className="text-primary" strokeWidth={3} />
              }
            </div>
            <div>
              {isNewBest
                ? <span className="font-display text-base font-semibold text-amber-500">New Personal Best!</span>
                : <span className="font-display text-base font-semibold text-foreground">Solved</span>
              }
              {assisted && (
                <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Assisted
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Time</p>
              <p className={cn(
                "font-mono font-bold leading-none tabular-nums text-3xl",
                isNewBest ? "text-amber-500" : "text-foreground",
              )}>
                {formatTime(time)}
              </p>
            </div>
            {personalBest && !isNewBest && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 mb-0.5">Your best</p>
                <p className="font-mono text-lg font-semibold text-muted-foreground">{formatTime(personalBest.best)}</p>
              </div>
            )}
            {isNewBest && personalBest?.improvement && (
              <div>
                <p className="text-[10px] text-emerald-600 mb-0.5">Faster by</p>
                <p className="font-mono text-lg font-bold text-emerald-500">-{formatTime(personalBest.improvement)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">
              Difficulty: <span className="font-medium text-foreground capitalize">{DIFFICULTY_LABELS[difficulty]}</span>
            </span>
            {accuracy != null && (
              <span className="text-muted-foreground">
                Accuracy: <span className="font-medium text-foreground">{accuracy}%</span>
              </span>
            )}
            {hintsUsed != null && (
              <span className="text-muted-foreground">
                Hints: <span className="font-medium text-foreground">{hintsUsed === 0 ? "None ✓" : hintsUsed}</span>
              </span>
            )}
            {score != null && !assisted && (
              <span className="text-muted-foreground">
                Score: <span className="font-mono font-medium text-foreground">{score.toLocaleString()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Rating delta */}
        {ratingDelta && ratingDelta.delta !== 0 && !assisted && (
          <div className={cn(
            "mx-4 mb-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg transition-all duration-700",
            ratingDelta.delta > 0 ? "bg-emerald-500/10" : "bg-destructive/10",
            statsVisible ? "opacity-100" : "opacity-0",
          )}>
            {ratingDelta.delta > 0
              ? <TrendingUp size={14} className="text-emerald-500" />
              : <TrendingDown size={14} className="text-destructive" />
            }
            <span className={cn(
              "font-mono text-sm font-bold",
              ratingDelta.delta > 0 ? "text-emerald-500" : "text-destructive",
            )}>
              {ratingDelta.delta > 0 ? "+" : ""}{ratingDelta.delta} Rating
            </span>
            <span className={cn("text-xs font-semibold", getTierColor(ratingDelta.tier as any))}>
              {ratingDelta.currentRating} · {ratingDelta.tier}
            </span>
            {ratingDelta.factors.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{ratingDelta.factors.join(" · ")}</span>
            )}
          </div>
        )}

        {/* Daily streak */}
        {isDaily && streak.current > 0 && !assisted && (
          <div className={cn(
            "mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 transition-all duration-700",
            statsVisible ? "opacity-100" : "opacity-0",
          )}>
            <Flame size={14} className="text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {streak.current} day streak
              {streak.current === streak.longest && streak.current > 1 ? " · New record! 🏆" : ""}
            </span>
            <span className="text-xs text-muted-foreground">Best: {streak.longest}</span>
          </div>
        )}

        {/* Daily rank */}
        {isDaily && dailyRank && (
          <div className={cn(
            "mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 transition-all duration-700",
            statsVisible ? "opacity-100" : "opacity-0",
          )}>
            <Trophy size={13} className="text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              You ranked <span className="font-semibold text-foreground">#{dailyRank.rank}</span> of {dailyRank.total} player{dailyRank.total !== 1 ? "s" : ""} today
            </span>
          </div>
        )}

        {assisted && (
          <p className="text-xs text-muted-foreground mx-4 mb-3">
            Hints were used — this solve won't count toward your best time or streak.
          </p>
        )}

        {/* Actions */}
        <div className="p-4 sm:p-5 pt-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onPlayAgain} className="gap-1.5">
              <RefreshCw size={13} /> New Puzzle
            </Button>

            {/* Share button — now generates a visual card on iOS */}
            {shareData && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                disabled={sharing}
                className="gap-1.5"
              >
                {sharing
                  ? <RefreshCw size={13} className="animate-spin" />
                  : copied
                  ? <CheckCheck size={13} />
                  : native
                  ? <ImageIcon size={13} />    /* card icon on iOS — suggests image share */
                  : <Share size={13} />
                }
                {sharing ? "Preparing…" : copied ? "Copied" : "Share"}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(getBackPath(origin))}
              className="gap-1.5"
            >
              <ArrowLeft size={13} />
              {native ? "Home" : `Back to ${getBackLabel(origin)}`}
            </Button>
          </div>

          {shareData && (shareOpen || !isNewBest) && (
            <div className={cn(
              "mt-3 rounded-lg bg-muted/50 px-3 py-2.5 space-y-1 transition-all duration-500",
              statsVisible ? "opacity-100" : "opacity-0",
            )}>
              <p className="text-xs text-muted-foreground truncate">
                Play: <span className="font-medium text-foreground select-all">{shareData.url}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Puzzle Code: <code className="font-mono text-foreground/70 select-all">{shareData.displayCode}</code>
              </p>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal open={paywallOpen} onClose={dismissPaywall} />
    </>
  );
};

export default CompletionPanel;
