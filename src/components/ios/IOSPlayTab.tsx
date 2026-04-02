import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dices, SlidersHorizontal, Flame, Trophy, Zap, ChevronRight, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { hapticTap } from "@/lib/haptic";
import { getProgressStats } from "@/lib/progressTracker";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor } from "@/lib/solveScoring";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];

const DAILY_TAGLINES = [
  "Can you beat your best?",
  "A tricky one today",
  "Test your logic",
  "Think fast, solve faster",
  "How quick can you go?",
  "No hints. No mercy.",
  "Ready for a challenge?",
];

function getDailyTagline(dateStr: string): string {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return DAILY_TAGLINES[Math.abs(hash) % DAILY_TAGLINES.length];
}

// Find any in-progress puzzle saved in localStorage
function findInProgressPuzzle(): { key: string; type: PuzzleCategory; elapsed: number } | null {
  try {
    const prefix = "puzzlecraft-progress-";
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const data = JSON.parse(raw);
      // Must have elapsed time > 30s to count as "in progress"
      if (!data?.elapsed || data.elapsed < 30) continue;
      // Must be recent (within 48h)
      if (!data.savedAt || Date.now() - data.savedAt > 48 * 60 * 60 * 1000) continue;
      const puzzleKey = k.replace(prefix, "");
      // Parse type from key like "crossword-medium-12345" or "quick-crossword-..."
      const typePart = puzzleKey.replace(/^(quick-|daily-)/, "").split("-")[0] as PuzzleCategory;
      if (!CATEGORY_INFO[typePart]) continue;
      return { key: puzzleKey, type: typePart, elapsed: data.elapsed };
    }
  } catch {
    // ignore
  }
  return null;
}

// Get personal best for a puzzle type
function getBestForType(type: PuzzleCategory, stats: ReturnType<typeof getProgressStats>): number | null {
  return stats.byCategory[type]?.bestTime ?? null;
}

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Refresh countdown every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const streak = useMemo(() => getDailyStreak(), []);
  const tagline = useMemo(() => getDailyTagline(challenge.dateStr), [challenge.dateStr]);
  const stats = useMemo(() => getProgressStats(), []);
  const inProgress = useMemo(() => findInProgressPuzzle(), []);

  // Rating / tier
  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
    const rating = computePlayerRating(recs);
    const tier = getSkillTier(rating);
    return { rating, tier };
  }, []);

  // Daily countdown to midnight
  const secondsUntilMidnight = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now) / 1000));
  }, [now]);

  const countdownStr = useMemo(() => {
    const h = Math.floor(secondsUntilMidnight / 3600);
    const m = Math.floor((secondsUntilMidnight % 3600) / 60);
    const s = secondsUntilMidnight % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [secondsUntilMidnight]);

  const handleSurprise = () => {
    hapticTap();
    navigate("/surprise");
  };

  const handleQuickPlay = (type: PuzzleCategory) => {
    hapticTap();
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=medium`);
  };

  const handleResume = () => {
    if (!inProgress) return;
    hapticTap();
    // Navigate based on key structure
    const key = inProgress.key;
    if (key.startsWith("daily-")) {
      navigate("/daily");
    } else {
      navigate(`/quick-play/${inProgress.type}`);
    }
  };

  const streakAtRisk = streak.current > 0 && !dailyCompletion;

  return (
    <div className="space-y-4 px-4 pt-4 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">Puzzlecraft</h1>
        {/* Streak pill */}
        {streak.current > 0 && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
              streakAtRisk ? "bg-orange-500/15 text-orange-500 animate-pulse" : "bg-primary/10 text-primary",
            )}
          >
            <Flame size={12} className={streakAtRisk ? "text-orange-500" : "text-primary"} />
            {streak.current} day{streak.current !== 1 ? "s" : ""}
            {streakAtRisk && " · play today!"}
          </div>
        )}
      </div>

      {/* Resume card — only shown when there's an in-progress puzzle */}
      {inProgress && (
        <button
          onClick={handleResume}
          className="w-full flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 transition-all active:scale-[0.97] active:bg-primary/10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Play size={16} className="text-primary translate-x-0.5" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Resume</p>
              <p className="text-sm font-bold text-foreground truncate mt-0.5">
                {CATEGORY_INFO[inProgress.type]?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {formatTime(inProgress.elapsed)}
            </span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </button>
      )}

      {/* Surprise Me CTA */}
      <Button
        onClick={handleSurprise}
        size="lg"
        className="w-full text-base font-semibold gap-2 h-13 rounded-2xl shadow-[0_0_20px_hsl(var(--primary)/0.25)] active:scale-[0.97] transition-all duration-150"
      >
        <Dices size={18} />
        Surprise Me
      </Button>

      {/* Daily Challenge card */}
      <button
        onClick={() => {
          hapticTap();
          navigate("/daily");
        }}
        className={cn(
          "w-full rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.97]",
          dailyCompletion ? "border-border bg-secondary/40" : "border-primary/25 bg-primary/5 active:bg-primary/10",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Daily Challenge</p>
              {/* Countdown */}
              {!dailyCompletion && (
                <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                  {countdownStr} left
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground truncate">{CATEGORY_INFO[challenge.category]?.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 italic">
              {dailyCompletion ? `Solved in ${formatTime(dailyCompletion.time)} ✓` : tagline}
            </p>
          </div>

          {/* Right: streak stats */}
          <div className="flex gap-3 shrink-0 items-start">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Flame size={10} className="text-primary" />
              </div>
              <p className="font-mono text-base font-bold text-foreground leading-none">{streak.current}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Trophy size={10} className="text-primary" />
              </div>
              <p className="font-mono text-base font-bold text-foreground leading-none">{streak.longest}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">best</p>
            </div>
          </div>
        </div>
      </button>

      {/* Rating nudge — shown only when user has a rating */}
      {ratingInfo && (
        <button
          onClick={() => {
            hapticTap();
            navigate("/stats");
          }}
          className="w-full flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3 transition-all active:scale-[0.97] active:bg-secondary/60"
        >
          <div className="flex items-center gap-2.5">
            <Zap size={15} className="text-primary shrink-0" />
            <div className="text-left">
              <p className={cn("text-sm font-bold leading-tight", getTierColor(ratingInfo.tier as any))}>
                {ratingInfo.tier}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{ratingInfo.rating} rating · play to climb</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-muted-foreground shrink-0" />
        </button>
      )}

      {/* Puzzle type grid */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">
          Choose a Puzzle
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(([type, info]) => {
            const best = getBestForType(type, stats);
            return (
              <button
                key={type}
                onClick={() => handleQuickPlay(type)}
                className="rounded-2xl border bg-card px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.95] active:shadow-md active:border-primary/30 group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0 text-muted-foreground group-active:text-primary transition-colors">
                    <PuzzleIcon type={type} size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{info.name}</p>
                    {best !== null ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Trophy size={9} className="text-primary/60 shrink-0" />
                        <span className="font-mono">{formatTime(best)}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">Not played yet</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick stats row — only shown once user has data */}
      {stats.totalSolved > 0 && (
        <button
          onClick={() => {
            hapticTap();
            navigate("/stats");
          }}
          className="w-full flex items-center justify-between rounded-2xl border bg-card px-4 py-3 transition-all active:scale-[0.97]"
        >
          <div className="flex gap-5">
            <div>
              <p className="font-mono text-base font-bold text-foreground leading-none">{stats.totalSolved}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">solved</p>
            </div>
            {stats.bestTime !== null && (
              <div>
                <p className="font-mono text-base font-bold text-foreground leading-none">
                  {formatTime(stats.bestTime)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">best</p>
              </div>
            )}
            <div>
              <p className="font-mono text-base font-bold text-foreground leading-none">
                {stats.totalSolved > 0 ? formatTime(stats.averageTime) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">avg</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            Full stats <ChevronRight size={14} />
          </div>
        </button>
      )}

      {/* Customize button */}
      <button
        onClick={() => {
          hapticTap();
          setCustomizeOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-3 rounded-2xl border border-dashed transition-all duration-150 active:scale-[0.97] active:bg-secondary/50"
      >
        <SlidersHorizontal size={14} />
        Customize Puzzle
      </button>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
