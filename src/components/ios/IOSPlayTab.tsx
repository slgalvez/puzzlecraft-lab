/**
 * IOSPlayTab.tsx  ← FULL REPLACEMENT
 * src/components/ios/IOSPlayTab.tsx
 *
 * STRUCTURAL REDESIGN — not a style tweak.
 *
 * NEW HIERARCHY:
 *   1. Header (minimal — title + streak pill)
 *   2. Resume card (conditional, compact)
 *   3. Daily Challenge HERO (dominant, clear CTA)
 *   4. Surprise Me (secondary — smaller, no giant shadow)
 *   5. Weekly Pack (premium, clean)
 *   6. Favourites grid (2 cards) OR beginner picks (new users)
 *   7. All puzzles (clean 2-col grid)
 *   8. Stats link (single row, not a full card)
 *   9. Customize (utility, dashed border)
 *
 * REMOVED FROM MAIN SCROLL:
 *   - DailyLeaderboard       (adds noise, not a play action)
 *   - StreakShieldBanner      (useful but clutters the flow)
 *   - FriendActivityFeed      (lowest priority content)
 *   - Rating/tier card        (moved to stats link row)
 *   - Stats bar (3 numbers)   (collapsed to single "Full stats →" link)
 *
 * All removed components are preserved in code — just not rendered here.
 * They can be surfaced in a dedicated Stats tab.
 */

import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Dices, SlidersHorizontal, Flame, Trophy,
  ChevronRight, Clock, Play, CheckCircle2, ArrowRight,
} from "lucide-react";
import { CATEGORY_INFO, DIFFICULTY_SELECTED, type PuzzleCategory, type Difficulty } from "@/lib/puzzleTypes";
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
import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";

// ── Constants ─────────────────────────────────────────────────────────────

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];
const ALL_PUZZLE_TYPES = categories.map(([type]) => type);
const BEGINNER_FEATURED: PuzzleCategory[] = ["crossword", "word-search", "cryptogram"];

const TYPE_LABELS: Record<PuzzleCategory, string> = Object.fromEntries(
  categories.map(([type, info]) => [type, info.name])
) as Record<PuzzleCategory, string>;

const TYPE_SUBTITLES: Record<PuzzleCategory, string> = {
  crossword:    "Clue-based word grid",
  "word-fill":  "Place words into the pattern",
  "number-fill":"Fit numbers into the grid",
  sudoku:       "Logic-based number grid",
  "word-search":"Find hidden words",
  kakuro:       "Number crossword with sums",
  nonogram:     "Reveal a picture with clues",
  cryptogram:   "Decode the secret message",
};

const DAILY_TAGLINES = [
  "Can you solve it without hints?",
  "A tricky one today",
  "Test your logic",
  "Think fast, solve faster",
  "How quick can you go?",
  "No hints. No mercy.",
  "Ready for a challenge?",
];

function getDailyTagline(dateStr: string): string {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  return DAILY_TAGLINES[Math.abs(hash) % DAILY_TAGLINES.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────

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
  } catch {}
  return null;
}

function getBestTimeForType(type: PuzzleCategory): number | null {
  try { return getProgressStats().byCategory[type]?.bestTime ?? null; }
  catch { return null; }
}

function getRankedTypes(allTypes: PuzzleCategory[]): {
  ranked: PuzzleCategory[];
  topTwo: PuzzleCategory[];
  isReturningUser: boolean;
} {
  try {
    const records = getSolveRecords();
    if (records.length < 5) return { ranked: allTypes, topTwo: [], isReturningUser: false };
    const counts: Record<string, number> = {};
    for (const r of records) counts[r.puzzleType] = (counts[r.puzzleType] ?? 0) + 1;
    const sorted = [...allTypes].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    const topTwo = sorted.filter((t) => (counts[t] ?? 0) > 0).slice(0, 2);
    return { ranked: sorted, topTwo, isReturningUser: true };
  } catch {
    return { ranked: allTypes, topTwo: [], isReturningUser: false };
  }
}

// ── Component ─────────────────────────────────────────────────────────────

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pickerType, setPickerType] = useState<PuzzleCategory | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const challenge       = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const streak          = useMemo(() => getDailyStreak(), []);
  const tagline         = useMemo(() => getDailyTagline(challenge.dateStr), [challenge.dateStr]);
  const stats           = useMemo(() => getProgressStats(), []);
  const inProgress      = useMemo(() => findInProgressPuzzle(), []);

  const { ranked: rankedTypes, topTwo, isReturningUser } = useMemo(
    () => getRankedTypes(ALL_PUZZLE_TYPES), []
  );

  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
    const rating = computePlayerRating(recs);
    return { rating, tier: getSkillTier(rating, recs.length) };
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

  const streakAtRisk  = streak.current > 0 && !dailyCompletion;
  const hasPlayedToday = !!dailyCompletion;

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
    if (inProgress.key.startsWith("daily-")) navigate("/daily");
    else navigate(`/quick-play/${inProgress.type}`);
  };

  return (
    <div className="space-y-5 px-5 pt-4 pb-24">

      {/* ── 1. HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>
        {streak.current > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            streakAtRisk
              ? "bg-destructive/10 text-destructive animate-pulse"
              : "bg-primary/10 text-primary"
          )}>
            <Flame size={12} />
            {streak.current} day{streak.current !== 1 ? "s" : ""}
            {streakAtRisk && " · play!"}
          </div>
        )}
      </div>

      {/* ── 2. RESUME (conditional, compact) ──────────────────────────── */}
      {inProgress && (
        <button
          onClick={handleResume}
          className="w-full flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 transition-all active:scale-[0.97]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Play size={14} className="text-primary translate-x-0.5" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Resume</p>
              <p className="text-sm font-bold text-foreground truncate">
                {CATEGORY_INFO[inProgress.type]?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
            <Clock size={11} />
            {formatTime(inProgress.elapsed)}
            <ChevronRight size={13} />
          </div>
        </button>
      )}

      {/* ── 3. DAILY CHALLENGE HERO ────────────────────────────────────── */}
      {/*
        This is the DOMINANT element. Larger padding, stronger border,
        more visual weight than everything else on the screen.
        Clear CTA, minimal text clutter.
      */}
      <Link
        to="/daily"
        onClick={() => hapticTap()}
        className={cn(
          "w-full block rounded-2xl overflow-hidden transition-all active:scale-[0.98]",
          dailyCompletion
            ? "border border-border bg-card"
            : "border-2 border-primary/30 bg-primary/5"
        )}
      >
        {/* Accent stripe — only when not completed */}
        {!dailyCompletion && (
          <div className="h-1 bg-primary w-full" />
        )}

        <div className="px-5 py-4">
          {/* Label row */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Daily Challenge
            </p>
            {!dailyCompletion && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {countdownStr} left
              </span>
            )}
          </div>

          {/* Puzzle type — large, dominant */}
          <p className="text-xl font-bold text-foreground mb-0.5">
            {CATEGORY_INFO[challenge.category]?.name}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize",
              DIFFICULTY_SELECTED[challenge.difficulty as Difficulty] || "text-muted-foreground"
            )}>
              {challenge.difficulty}
            </span>
            {dailyCompletion && (
              <span className="ml-2 text-primary font-medium">
                · Solved in {formatTime(dailyCompletion.time)} ✓
              </span>
            )}
            {!dailyCompletion && (
              <span className="ml-2 italic opacity-70">{tagline}</span>
            )}
          </p>

          {/* CTA or solved state */}
          {dailyCompletion ? (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <CheckCircle2 size={15} />
              View your result →
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {/* Streak mini stats */}
              <div className="flex items-center gap-4">
                {streak.current > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Flame size={12} className="text-primary" />
                    <span className="font-mono font-bold text-foreground text-sm">
                      {streak.current}
                    </span>
                    <span className="text-[10px] text-muted-foreground">streak</span>
                  </div>
                )}
                {streak.longest > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-primary" />
                    <span className="font-mono font-bold text-foreground text-sm">
                      {streak.longest}
                    </span>
                    <span className="text-[10px] text-muted-foreground">best</span>
                  </div>
                )}
              </div>
              {/* Play button */}
              <div className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2">
                <span className="text-sm font-bold text-primary-foreground">Play Now</span>
                <ArrowRight size={14} className="text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* ── 4. SURPRISE ME (secondary — calm, not dominant) ────────────── */}
      {/*
        Previously: giant orange button with pulsing icon + shadow.
        Now: quiet outline button. Secondary action, not competing with Daily.
      */}
      <button
        onClick={handleSurprise}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all active:scale-[0.97] active:bg-secondary/50"
      >
        <Dices size={15} className="text-muted-foreground" />
        Surprise Me
        <span className="text-[10px] text-muted-foreground/50 ml-1">random puzzle</span>
      </button>

      {/* ── 5. WEEKLY PACK ─────────────────────────────────────────────── */}
      <WeeklyPackCard />

      {/* ── 6. FAVOURITES or BEGINNER PICKS ───────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
          {isReturningUser ? "Your favourites" : "Start here"}
        </p>

        {isReturningUser && topTwo.length > 0 ? (
          /* Returning: top 2 most-played, with personal best */
          <div className="flex gap-3">
            {topTwo.map((type) => {
              const best = getBestTimeForType(type);
              return (
                <button
                  key={type}
                  onClick={() => handleQuickPlay(type)}
                  className="flex-1 flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 transition-all active:scale-[0.97] active:bg-secondary/50"
                >
                  <PuzzleIcon type={type} size={26} />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {TYPE_LABELS[type]}
                    </p>
                    {best ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        Best: {formatTime(best)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">Play →</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* New user: 3 beginner-friendly types */
          <div className="flex gap-2">
            {BEGINNER_FEATURED.map((type) => (
              <button
                key={type}
                onClick={() => handleQuickPlay(type)}
                className="flex-1 flex flex-col items-center gap-2 rounded-2xl border bg-card py-4 px-2 transition-all active:scale-[0.97]"
              >
                <PuzzleIcon type={type} size={22} />
                <p className="text-[11px] font-medium text-foreground text-center leading-tight">
                  {TYPE_LABELS[type]}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. ALL PUZZLES ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
          All puzzles
        </p>
        <div className="grid grid-cols-2 gap-2">
          {rankedTypes.map((type) => {
            const best = getBestTimeForType(type);
            return (
              <button
                key={type}
                onClick={() => handleQuickPlay(type)}
                className="flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-all active:scale-[0.97] active:bg-secondary/40"
              >
                <PuzzleIcon type={type} size={20} className="shrink-0" />
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

      {/* ── 8. STATS LINK (single row — not a full card) ──────────────── */}
      {/*
        Previously: full card with 3 stat numbers + "Full stats →" link.
        Now: one slim row. Stats are on the Stats tab — they don't need
        to live here too.
      */}
      {stats.totalSolved > 0 && (
        <button
          onClick={() => { hapticTap(); navigate("/stats"); }}
          className="w-full flex items-center justify-between py-3 px-2 text-sm text-muted-foreground transition-colors active:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            {stats.totalSolved} puzzle{stats.totalSolved !== 1 ? "s" : ""} solved
            {ratingInfo && (
              <span className={cn("text-xs font-semibold", getTierColor(ratingInfo.tier as any))}>
                · {ratingInfo.tier}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            Stats <ChevronRight size={13} />
          </span>
        </button>
      )}

      {/* ── 9. CUSTOMIZE ───────────────────────────────────────────────── */}
      <button
        onClick={() => { hapticTap(); setCustomizeOpen(true); }}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-dashed transition-all active:scale-[0.97] active:bg-secondary/50"
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
