/**
 * PuzzleLibrary.tsx
 * Personal best on every card, "New" badge, play-frequency sorting,
 * always-visible difficulty pills, Endless Mode feature card, daily nudge.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SavedPuzzlesSection from "@/components/puzzles/SavedPuzzlesSection";
import {
  CATEGORY_INFO,
  DIFFICULTY_LABELS,
  type PuzzleCategory,
  type Difficulty,
  isDifficultyDisabled,
} from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import HowToPlay from "@/components/puzzles/HowToPlay";
import UpgradeModal from "@/components/account/UpgradeModal";
import { usePremiumAccess, PLUS_DIFFICULTIES } from "@/lib/premiumAccess";
import { getProgressStats } from "@/lib/progressTracker";
import { getSolveRecords } from "@/lib/solveTracker";
import { getTodaysChallenge, getDailyCompletion } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  Infinity, ChevronDown, Lock, Crown,
  Flame, TrendingUp, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Difficulty persistence ─────────────────────────────────────────────────────

function loadDifficulties(): Record<string, Difficulty> {
  try { return JSON.parse(localStorage.getItem("play_difficulties") || "{}"); }
  catch { return {}; }
}

function saveDifficulty(type: string, d: Difficulty) {
  try {
    const stored = loadDifficulties();
    stored[type] = d;
    localStorage.setItem("play_difficulties", JSON.stringify(stored));
  } catch {}
}

// ── Per-type stats from local history ─────────────────────────────────────────

interface TypeStats {
  solveCount: number;
  bestTime: number | null;
  isNew: boolean;
}

function buildTypeStats(): Record<string, TypeStats> {
  try {
    const records = getSolveRecords();
    const stats = getProgressStats();
    const result: Record<string, TypeStats> = {};

    for (const type of Object.keys(CATEGORY_INFO)) {
      const count = records.filter((r) => r.puzzleType === type).length;
      const best = (stats.byCategory as any)?.[type]?.bestTime ?? null;
      result[type] = { solveCount: count, bestTime: best, isNew: count === 0 };
    }
    return result;
  } catch {
    return {};
  }
}

// ── Sort order: most-played types first for returning users ───────────────────

function getSortedCategories(
  typeStats: Record<string, TypeStats>
): [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][] {
  const entries = Object.entries(CATEGORY_INFO) as [
    PuzzleCategory,
    typeof CATEGORY_INFO[PuzzleCategory]
  ][];

  const totalSolves = Object.values(typeStats).reduce((s, t) => s + t.solveCount, 0);
  if (totalSolves < 5) return entries;

  return [...entries].sort(([a], [b]) => {
    const ca = typeStats[a]?.solveCount ?? 0;
    const cb = typeStats[b]?.solveCount ?? 0;
    return cb - ca;
  });
}

// ── Main component ────────────────────────────────────────────────────────────

const PuzzleLibrary = () => {
  const navigate = useNavigate();
  const { isDiffLocked } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [perTypeDifficulty, setPerTypeDifficulty] = useState<Record<string, Difficulty>>(
    loadDifficulties
  );
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const typeStats = useMemo(buildTypeStats, []);
  const sortedCategories = useMemo(() => getSortedCategories(typeStats), [typeStats]);

  const todayChallenge = useMemo(() => getTodaysChallenge(), []);
  const dailyDone = useMemo(
    () => !!getDailyCompletion(todayChallenge.dateStr),
    [todayChallenge.dateStr]
  );

  const isReturningUser = useMemo(
    () => Object.values(typeStats).reduce((s, t) => s + t.solveCount, 0) >= 5,
    [typeStats]
  );

  const getDifficulty = (type: PuzzleCategory): Difficulty => {
    const stored = perTypeDifficulty[type] ?? "medium";
    if (isDiffLocked(stored)) return "hard";
    return stored;
  };

  const handlePlay = (type: PuzzleCategory) => {
    const d = getDifficulty(type);
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=${d}`);
  };

  const handleDifficultyChange = (type: PuzzleCategory, d: Difficulty) => {
    if (isDiffLocked(d)) { setUpgradeOpen(true); return; }
    setPerTypeDifficulty((prev) => ({ ...prev, [type]: d }));
    saveDifficulty(type, d);
  };

  const toggleExpanded = (type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedType((prev) => (prev === type ? null : type));
  };

  return (
    <Layout>
      <div className="container py-6 md:py-12 pb-20 md:pb-28">

        {/* ── Page header ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Play</h1>
            <p className="mt-1.5 text-muted-foreground text-sm">
              {isReturningUser ? "Your favorites, sorted by play frequency." : "Eight puzzle types. Pick one and start solving."}
            </p>
          </div>
        </div>

        {/* ── Daily challenge nudge ── */}
        {!dailyDone && (
          <Link
            to="/daily"
            className="flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 mb-6 hover:bg-primary/8 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Flame size={15} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Today's daily challenge is waiting
                </p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_INFO[todayChallenge.category].name} · {todayChallenge.difficulty} · Everyone plays the same puzzle
                </p>
              </div>
            </div>
            <ArrowRight size={14} className="text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* ── Saved puzzles ── */}
        <SavedPuzzlesSection />

        <WeeklyPackSection />

        {/* ── Endless Mode feature card ── */}
        <div className="mt-8 mb-6 rounded-2xl border-2 border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group">
          <div className="grid sm:grid-cols-[1fr_auto] gap-0">
            <button
              onClick={() => navigate("/quick-play/sudoku?mode=endless")}
              className="flex items-center gap-5 p-5 text-left w-full"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Infinity size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Endless Mode
                  </h3>
                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Adaptive
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  Cycles through all 8 puzzle types. Gets harder when you win, easier when you struggle — automatically.
                </p>
              </div>
            </button>
            <div className="flex items-center px-5 border-t sm:border-t-0 sm:border-l border-border/60">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 whitespace-nowrap"
                onClick={() => navigate("/quick-play/sudoku?mode=endless")}
              >
                Start <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Puzzle type section header ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {isReturningUser ? "Puzzle types" : "All puzzles"}
          </h2>
          {isReturningUser && (
            <p className="text-xs text-muted-foreground/60">sorted by your play frequency</p>
          )}
        </div>

        {/* ── Puzzle type grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sortedCategories.map(([type, info]) => {
            const currentDiff = getDifficulty(type);
            const isExpanded = expandedType === type;
            const ts = typeStats[type] ?? { solveCount: 0, bestTime: null, isNew: true };

            return (
              <div
                key={type}
                className="relative flex flex-col rounded-xl border-2 border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* How to play */}
                <div className="absolute top-3 right-3 z-10">
                  <HowToPlay type={type} />
                </div>

                {/* "New" badge */}
                {ts.isNew && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      New
                    </span>
                  </div>
                )}

                {/* Main clickable area */}
                <button
                  onClick={() => handlePlay(type)}
                  className="group flex flex-1 flex-col items-start p-5 pb-3 text-left active:scale-[0.98] transition-transform"
                >
                  {/* Icon */}
                  <div className={cn("flex h-9 items-center", ts.isNew && "mt-4")}>
                    <PuzzleIcon
                      type={type}
                      size={34}
                      className="text-foreground opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  {/* Name */}
                  <h3 className="mt-3 font-display text-[1.05rem] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {info.name}
                  </h3>

                  {/* Personal best OR description */}
                  {!ts.isNew && ts.bestTime !== null ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <TrendingUp size={11} className="text-primary/70 shrink-0" />
                      <span className="text-xs font-mono font-semibold text-primary/80">
                        Best: {formatTime(ts.bestTime)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        · {ts.solveCount} solve{ts.solveCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground/80 leading-snug line-clamp-2">
                      {info.description}
                    </p>
                  )}

                  {/* Bottom: difficulty label + play CTA */}
                  <div className="mt-auto pt-3 flex items-center justify-between w-full">
                    <span className="text-[11px] text-muted-foreground/60 font-medium capitalize">
                      {DIFFICULTY_LABELS[currentDiff]}
                    </span>
                    <span className="text-sm font-semibold text-primary group-hover:underline">
                      Play →
                    </span>
                  </div>
                </button>

                {/* Difficulty strip — always visible pills */}
                <div className="border-t border-border/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/50 shrink-0">Difficulty</span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {PLUS_DIFFICULTIES.map((val) => {
                        const label = DIFFICULTY_LABELS[val];
                        const structDisabled = isDifficultyDisabled(type, val);
                        const premLocked = isDiffLocked(val);
                        const isActive = currentDiff === val && !structDisabled;

                        if (structDisabled) return null;

                        return (
                          <button
                            key={val}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDifficultyChange(type, val);
                            }}
                            className={cn(
                              "relative flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                              premLocked
                                ? "text-muted-foreground/40 cursor-pointer"
                                : isActive
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title={premLocked ? `${label} requires Puzzlecraft+` : label}
                          >
                            {premLocked && <Lock size={8} className="shrink-0" />}
                            {val === "extreme" ? "Ext" : val === "insane" ? "Ins" : label}
                            {premLocked && (
                              <span className="absolute -top-1.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary">
                                <Crown size={6} className="text-primary-foreground" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Surprise Me footer row ── */}
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={() => {
              const types = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
              const type = types[Math.floor(Math.random() * types.length)];
              const diff: Difficulty = "medium";
              navigate(`/quick-play/${type}?d=${diff}&mode=surprise`);
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Sparkles size={14} />
            Surprise me — random type &amp; difficulty
          </button>
        </div>

      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
};

export default PuzzleLibrary;
