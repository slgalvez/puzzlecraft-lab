import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];
const ALL_PUZZLE_TYPES = categories.map(([type]) => type);

const BEGINNER_FEATURED: PuzzleCategory[] = ["crossword", "word-search", "cryptogram"];

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

function getBestTimeForType(type: PuzzleCategory): number | null {
  try {
    const stats = getProgressStats();
    return stats.byCategory[type]?.bestTime ?? null;
  } catch { return null; }
}

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

  const { ranked: rankedTypes, topTwo, isReturningUser } = useMemo(
    () => getRankedTypes(ALL_PUZZLE_TYPES),
    []
  );

  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
    const rating = computePlayerRating(recs);
    const tier = getSkillTier(rating);
    return { rating, tier };
  }, []);

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
    <div className="space-y-3 px-5 pt-4 pb-2">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>
        {streak.current > 0 && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              streakAtRisk
                ? "bg-destructive/10 text-destructive animate-pulse"
                : "bg-primary/10 text-primary",
            )}
          >
            <Flame size={12} />
            {streak.current} day{streak.current !== 1 ? "s" : ""}
            {streakAtRisk && " · play today!"}
          </div>
        )}
      </div>

      {/* Resume card */}
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

      {/* ── DAILY CHALLENGE — PRIMARY HERO ────────────────────────────────────
          Promoted from a compact secondary card to the screen's primary action.
          Larger padding, larger type, "Play now →" CTA at the bottom, and the
          streak/best numbers brought inline rather than stacked on the right.
          When already completed today, the card settles to a neutral state with
          the solve time confirmed. */}
      <Link
        to="/daily"
        onClick={() => hapticTap()}
        className={cn(
          "w-full rounded-2xl border px-5 py-5 text-left transition-all active:scale-[0.97] block",
          dailyCompletion
            ? "border-border bg-card"
            : "border-primary/25 bg-primary/5 active:bg-primary/10",
        )}
      >
        {/* Top row: label + countdown */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Daily Challenge
          </p>
          {!dailyCompletion && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {countdownStr} left
            </span>
          )}
        </div>

        {/* Puzzle type — hero-size type */}
        <p className="text-2xl font-bold text-foreground leading-tight">
          {CATEGORY_INFO[challenge.category]?.name}
        </p>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground italic mt-1 mb-4">
          {dailyCompletion
            ? `Solved in ${formatTime(dailyCompletion.time)} ✓`
            : tagline}
        </p>

        {/* Bottom row: streak + best + play CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame size={13} className="text-primary" />
              <span className="font-mono text-base font-extrabold text-foreground leading-none">
                {streak.current}
              </span>
              <span className="text-[10px] text-muted-foreground/60">streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy size={13} className="text-primary" />
              <span className="font-mono text-base font-extrabold text-foreground leading-none">
                {streak.longest}
              </span>
              <span className="text-[10px] text-muted-foreground/60">best</span>
            </div>
          </div>

          {!dailyCompletion && (
            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
              Play now <ChevronRight size={15} className="shrink-0" />
            </div>
          )}
        </div>
      </Link>

      {/* ── SURPRISE ME — SECONDARY ───────────────────────────────────────────
          Demoted from the primary glowing button to a clean secondary outline
          action. Still prominent and tappable, but clearly a tier below the
          Daily Challenge hero above. No glow shadow. */}
      <Button
        onClick={handleSurprise}
        variant="outline"
        className="w-full font-medium gap-2 h-11 rounded-xl"
      >
        <Dices size={16} />
        Surprise Me
      </Button>

      {/* Weekly Pack */}
      <WeeklyPackCard />

      {/* Streak Shield */}
      <StreakShieldBanner
        streakLength={streak.current}
        hasPlayedToday={hasPlayedToday}
      />

      {/* Rating / tier */}
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
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ratingInfo.rating} rating · play to climb
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        </button>
      )}

      {/* ── Puzzle browse section ─────────────────────────────────────────── */}
      <div className="space-y-3 mt-5">

        {/* Returning users — top 2 favourites */}
        {isReturningUser && topTwo.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
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

        {/* New users — 3 beginner types */}
        {!isReturningUser && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
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

        {/* All puzzle types */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
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

      {/* Quick stats bar */}
      {stats.totalSolved > 0 && (
        <button
          onClick={() => {
            hapticTap();
            navigate("/stats");
          }}
          className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-secondary/30 px-4 py-3 transition-all active:scale-[0.97]"
        >
          <div className="flex gap-5">
            <div className="text-center">
              <p className="font-mono text-lg font-extrabold text-foreground leading-none">
                {stats.totalSolved}
              </p>
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

      {/* Customize button */}
      <button
        onClick={() => {
          hapticTap();
          setCustomizeOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-border/50 transition-all duration-150 active:scale-[0.97] active:bg-secondary/50"
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
