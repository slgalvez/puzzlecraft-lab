import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InsightsBanner } from "@/components/ios/InsightsBanner";
import { Dices, SlidersHorizontal, Flame, Trophy, Zap, ChevronRight, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { PuzzleTypePicker } from "./PuzzleTypePicker";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { hapticTap } from "@/lib/haptic";
import { getProgressStats } from "@/lib/progressTracker";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor } from "@/lib/solveScoring";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";
import { setBackDestination } from "@/hooks/useBackDestination";
import { StreakShieldBanner } from "@/components/ios/StreakShieldBanner";
import { FriendActivityFeed } from "@/components/ios/FriendActivityFeed";
import { DailyLeaderboard } from "@/components/ios/DailyLeaderboard";
import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];
const ALL_PUZZLE_TYPES = categories.map(([type]) => type);

/** Puzzle types shown first to new users — most approachable */
const BEGINNER_FEATURED: PuzzleCategory[] = ["crossword", "word-search", "cryptogram"];

/** Type labels for display */
const TYPE_LABELS: Record<PuzzleCategory, string> = Object.fromEntries(
  categories.map(([type, info]) => [type, info.name])
) as Record<PuzzleCategory, string>;

const DAILY_TAGLINES = [
  "Can you solve it without hints?",
  "A tricky one today",
  "Test your logic",
  "Think fast, solve faster",
  "How quick can you go?",
  "No hints. No mercy.",
  "Ready for a challenge?",
];

const TYPE_SUBTITLES: Record<PuzzleCategory, string> = {
  crossword: "Classic clue-based word grid",
  "word-fill": "Place words into the pattern",
  "number-fill": "Fit numbers into the grid",
  sudoku: "Fill the 9×9 grid with logic",
  "word-search": "Find hidden words",
  kakuro: "Number crossword with sums",
  nonogram: "Reveal a picture with clues",
  cryptogram: "Decode the secret message",
};

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
      if (!data?.elapsed || data.elapsed < 30) continue;
      if (!data.savedAt || Date.now() - data.savedAt > 48 * 60 * 60 * 1000) continue;
      const puzzleKey = k.replace(prefix, "");
      const typePart = puzzleKey.replace(/^(quick-|daily-)/, "").split("-")[0] as PuzzleCategory;
      if (!CATEGORY_INFO[typePart]) continue;
      return { key: puzzleKey, type: typePart, elapsed: data.elapsed };
    }
  } catch {
    // ignore
  }
  return null;
}

function getBestForType(type: PuzzleCategory, stats: ReturnType<typeof getProgressStats>): number | null {
  return stats.byCategory[type]?.bestTime ?? null;
}

function getBestTimeForType(type: PuzzleCategory): number | null {
  try {
    const stats = getProgressStats();
    return stats.byCategory[type]?.bestTime ?? null;
  } catch { return null; }
}

/** Returns puzzle types sorted by how many times this user has played them */
function getRankedTypes(allTypes: PuzzleCategory[]): {
  ranked: PuzzleCategory[];
  topTwo: PuzzleCategory[];
  isReturningUser: boolean;
} {
  try {
    const records = getSolveRecords();
    if (records.length < 5) {
      return { ranked: allTypes, topTwo: [], isReturningUser: false };
    }
    const counts: Record<string, number> = {};
    for (const r of records) {
      counts[r.puzzleType] = (counts[r.puzzleType] ?? 0) + 1;
    }
    const sorted = [...allTypes].sort(
      (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0)
    );
    const topTwo = sorted.filter((t) => (counts[t] ?? 0) > 0).slice(0, 2);
    return { ranked: sorted, topTwo, isReturningUser: true };
  } catch {
    return { ranked: allTypes, topTwo: [], isReturningUser: false };
  }
}

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pickerType, setPickerType] = useState<PuzzleCategory | null>(null);
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

  // Ranked types for personalised grid
  const { ranked: rankedTypes, topTwo, isReturningUser } = useMemo(
    () => getRankedTypes(ALL_PUZZLE_TYPES),
    []
  );

  // Rating / tier — only show after 5+ solves (matches Stats.tsx threshold)
  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
    const rating = computePlayerRating(recs);
    const tier = getSkillTier(rating);
    return { rating, tier };
  }, []);

  // Daily countdown to midnight
  const countdownStr = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const secs = Math.max(0, Math.floor((midnight.getTime() - now) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [now]);

  const handleSurprise = () => {
    hapticTap();
    setBackDestination("/", "Play");
    navigate("/surprise");
  };

  const handleQuickPlay = (type: PuzzleCategory) => {
    hapticTap();
    setPickerType(type);
  };

  const handleResume = () => {
    if (!inProgress) return;
    hapticTap();
    setBackDestination("/", "Play");
    const key = inProgress.key;
    if (key.startsWith("daily-")) {
      navigate("/daily");
    } else {
      navigate(`/quick-play/${inProgress.type}`);
    }
  };

  const streakAtRisk = streak.current > 0 && !dailyCompletion;
  const hasPlayedToday = !!dailyCompletion;

  return (
    <div className="space-y-4 px-5 pt-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>
        {/* Streak pill — matches primary/10 pattern used throughout codebase */}
        {streak.current > 0 && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              streakAtRisk ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary",
            )}
          >
            <Flame size={12} />
            {streak.current} day{streak.current !== 1 ? "s" : ""}
            {streakAtRisk && " · play today!"}
          </div>
        )}
      </div>

      {/* Resume card — only shown when there's a recent in-progress puzzle */}
      {inProgress && (
        <button
          onClick={handleResume}
          className="w-full flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 transition-all active:scale-[0.97] active:bg-primary/10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Play size={16} className="translate-x-0.5" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Resume</p>
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
            <ChevronRight size={15} className="text-muted-foreground" />
          </div>
        </button>
      )}

      {/* Surprise Me — primary CTA, matches original shadow pattern */}
      <Button
        onClick={handleSurprise}
        size="lg"
        className="w-full text-base font-semibold gap-2 h-12 rounded-xl shadow-[0_0_16px_hsl(var(--primary)/0.35)] active:scale-95 transition-transform duration-150"
      >
        <Dices size={18} className="animate-pulse" />
        Surprise Me
      </Button>

      {/* Daily Challenge — elevated card, matches original border pattern */}
      <Link
        to="/daily"
        onClick={() => hapticTap()}
        className={cn(
          "w-full rounded-xl border px-4 py-4 text-left transition-all active:scale-[0.97] block",
          dailyCompletion ? "border-border bg-card" : "border-primary/20 bg-primary/5 active:bg-primary/10",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Daily Challenge</p>
              {/* Countdown — only when not yet completed */}
              {!dailyCompletion && (
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{countdownStr} left</span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground truncate">{CATEGORY_INFO[challenge.category]?.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 italic">
              {dailyCompletion ? `Solved in ${formatTime(dailyCompletion.time)} ✓` : tagline}
            </p>
          </div>

          {/* Streak stats — matches Index.tsx pattern */}
          <div className="flex gap-4 shrink-0 items-start">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Flame size={10} className="text-primary" />
              </div>
              <p className="font-mono text-lg font-extrabold text-foreground leading-none">{streak.current}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Trophy size={10} className="text-primary" />
              </div>
              <p className="font-mono text-lg font-extrabold text-foreground leading-none">{streak.longest}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">best</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Daily Leaderboard — top solvers today */}
      <DailyLeaderboard hasCompletedToday={hasPlayedToday} />

      {/* Personal insights */}
      <InsightsBanner />

      {/* Weekly Pack */}
      <WeeklyPackCard />

      {/* Streak Shield status */}
      <StreakShieldBanner
        streakLength={streak.current}
        hasPlayedToday={hasPlayedToday}
      />

      {/* Friend activity feed */}
      <FriendActivityFeed />


      {ratingInfo && (
        <button
          onClick={() => {
            hapticTap();
            navigate("/stats");
          }}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-all active:scale-[0.97] active:bg-secondary/50"
        >
          <div className="flex items-center gap-2.5">
            <Zap size={14} className="text-primary shrink-0" />
            <div className="text-left">
              <p className={cn("text-sm font-semibold leading-tight", getTierColor(ratingInfo.tier as any))}>
                {ratingInfo.tier}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{ratingInfo.rating} rating · play to climb</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        </button>
      )}

      {/* ── Puzzle type section ── */}
      <div className="space-y-3">

        {/* Returning users: top 2 "Your favourites" cards */}
        {isReturningUser && topTwo.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
              Your favourites
            </p>
            <div className="flex gap-3">
              {topTwo.map((type) => {
                const best = getBestTimeForType(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleQuickPlay(type)}
                    className={cn(
                      "flex-1 flex flex-col items-start gap-1.5 rounded-2xl border bg-card p-4",
                      "transition-all duration-150 active:scale-[0.97] active:bg-secondary/50",
                      "hover:border-primary/40 hover:shadow-sm"
                    )}
                  >
                    <PuzzleIcon type={type} size={28} />
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {TYPE_LABELS[type]}
                      </p>
                      {best ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          Best: {formatTime(best)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">Play again →</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* New users: 3 featured beginner types */}
        {!isReturningUser && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
              Start here
            </p>
            <div className="flex gap-2">
              {BEGINNER_FEATURED.map((type) => (
                <button
                  key={type}
                  onClick={() => handleQuickPlay(type)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 rounded-2xl border bg-card py-4 px-2",
                    "transition-all duration-150 active:scale-[0.97]",
                    "hover:border-primary/40"
                  )}
                >
                  <PuzzleIcon type={type} size={24} />
                  <p className="text-[11px] font-medium text-foreground text-center leading-tight">
                    {TYPE_LABELS[type]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full grid — all types */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
            {isReturningUser ? "All puzzles" : "All types"}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {rankedTypes.map((type) => {
              const best = getBestTimeForType(type);
              return (
                <button
                  key={type}
                  onClick={() => handleQuickPlay(type)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-card p-3.5",
                    "transition-all duration-150 active:scale-[0.97] active:bg-secondary/50",
                    "text-left"
                  )}
                >
                  <PuzzleIcon type={type} size={22} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {TYPE_LABELS[type]}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {best
                        ? <span className="font-mono">Best: {formatTime(best)}</span>
                        : TYPE_SUBTITLES[type]
                      }
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick stats bar — only shown once user has solved puzzles, matches Index.tsx pattern */}
      {stats.totalSolved > 0 && (
        <button
          onClick={() => {
            hapticTap();
            navigate("/stats");
          }}
          className="w-full flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-all active:scale-[0.97]"
        >
          <div className="flex gap-5">
            <div className="text-center">
              <p className="font-mono text-lg font-extrabold text-foreground leading-none">{stats.totalSolved}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">solved</p>
            </div>
            {stats.bestTime !== null && (
              <div className="text-center">
                <p className="font-mono text-lg font-extrabold text-foreground leading-none">
                  {formatTime(stats.bestTime)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">best</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-mono text-lg font-extrabold text-foreground leading-none">
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

      {/* Customize button — matches original exactly */}
      <button
        onClick={() => {
          hapticTap();
          setCustomizeOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-dashed transition-all duration-150 active:scale-[0.97] active:bg-secondary/50"
      >
        <SlidersHorizontal size={14} />
        Customize
      </button>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      <PuzzleTypePicker type={pickerType} onClose={() => setPickerType(null)} />
    </div>
  );
};

export default IOSPlayTab;
