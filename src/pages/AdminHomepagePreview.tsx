/**
 * AdminHomepagePreview.tsx
 *
 * Full admin preview of the homepage with all data-driven features
 * populated with realistic mock data — shows what a returning user
 * with real engagement data would see.
 *
 * Route: /admin-preview/homepage
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Flame, CheckCircle2, Trophy, Clock,
  Target, Infinity, Dices, Send, Users, Zap,
  ChevronRight, TrendingUp, Star, Eye, EyeOff,
  Crown, Shield, Sparkles,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { MONTHLY_PRICE } from "@/lib/pricing";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DATE_DISPLAY = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric",
});

const MOCK_CHALLENGE = {
  category: "crossword" as PuzzleCategory,
  difficulty: "medium" as const,
  displayDate: MOCK_DATE_DISPLAY,
};

const MOCK_STREAK = { current: 12, longest: 19 };

const MOCK_STATS = {
  totalSolved: 247,
  currentStreak: 12,
  averageTime: 234,
  bestTime: 67,
};

const MOCK_LEADERBOARD = [
  { display_name: "Alex M.",   solve_time: 94,  is_mock: false },
  { display_name: "Jordan L.", solve_time: 127, is_mock: false },
  { display_name: "Sam W.",    solve_time: 183, is_mock: false },
];

const MOCK_PLAYER_COUNT = 42;

const MOCK_TYPE_STATS: Record<string, { solveCount: number; bestTime: number | null; isNew: boolean }> = {
  crossword:    { solveCount: 73, bestTime: 94,  isNew: false },
  sudoku:       { solveCount: 58, bestTime: 67,  isNew: false },
  "word-search": { solveCount: 41, bestTime: 112, isNew: false },
  "word-fill":   { solveCount: 29, bestTime: 148, isNew: false },
  "number-fill": { solveCount: 22, bestTime: 176, isNew: false },
  kakuro:       { solveCount: 14, bestTime: 213, isNew: false },
  cryptogram:   { solveCount: 8,  bestTime: 267, isNew: false },
  nonogram:     { solveCount: 0,  bestTime: null, isNew: true },
};

const MOCK_SORTED_TYPES: PuzzleCategory[] = [
  "crossword", "sudoku", "word-search", "word-fill",
  "number-fill", "kakuro", "cryptogram", "nonogram",
];

const MEDAL = ["🥇", "🥈", "🥉"];

type PreviewMode = "returning-unsolved" | "returning-solved" | "new-user";

const MODE_LABELS: { value: PreviewMode; label: string }[] = [
  { value: "returning-unsolved", label: "Returning — Daily unsolved" },
  { value: "returning-solved",   label: "Returning — Daily solved" },
  { value: "new-user",           label: "New user" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminHomepagePreview() {
  const [mode, setMode] = useState<PreviewMode>("returning-unsolved");
  const [countdown, setCountdown] = useState("—");

  // Real midnight countdown — mirrors production timer pattern
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setCountdown(`${h}h ${m}m left`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const isReturning    = mode !== "new-user";
  const dailySolved    = mode === "returning-solved";
  const streakAtRisk   = isReturning && !dailySolved && MOCK_STREAK.current > 0;
  const challengeInfo  = CATEGORY_INFO[MOCK_CHALLENGE.category];

  return (
    <Layout>
      {/* Preview controls bar */}
      <div className="sticky top-16 z-40 border-b bg-card/95 backdrop-blur-md px-4 py-2.5">
        <div className="container flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Eye size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Homepage Preview</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-1.5 flex-wrap">
            {MODE_LABELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
                  mode === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[10px] text-muted-foreground/50">
            All data is mock — no DB calls
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="border-b bg-surface-warm">
        <div className="container py-10 sm:py-14">
          <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-start">

            {/* Left */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                {MOCK_CHALLENGE.displayDate}
              </p>

              {/* Streak nudge */}
              {streakAtRisk && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                  <Flame size={16} className="text-destructive shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {MOCK_STREAK.current}-day streak at risk
                    </p>
                    <p className="text-xs text-muted-foreground">Play today to keep it alive</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
                    Play now
                  </Button>
                </div>
              )}

              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.1rem]">
                {isReturning ? (
                  <>Welcome back.<br /><span className="text-primary">Your puzzles await.</span></>
                ) : (
                  <>Today's puzzle is<br /><span className="text-primary">waiting for you.</span></>
                )}
              </h1>

              <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
                {isReturning
                  ? "Eight puzzle types. Daily challenges. Compete, create, and track your best times."
                  : "Eight puzzle types. Daily challenges. Compete, create, and track your best times."
                }
              </p>

              {/* Returning user: inline stats bar */}
              {isReturning && (
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Flame size={13} className="text-primary" />
                    <span className="text-sm font-bold text-foreground">{MOCK_STREAK.current}</span>
                    <span className="text-sm text-muted-foreground">day streak</span>
                  </div>
                  <div className="h-3.5 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Target size={13} className="text-primary" />
                    <span className="text-sm font-bold text-foreground">{MOCK_STATS.totalSolved}</span>
                    <span className="text-sm text-muted-foreground">solved</span>
                  </div>
                  <div className="h-3.5 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-primary" />
                    <span className="text-sm font-bold text-foreground">{formatTime(MOCK_STATS.bestTime)}</span>
                    <span className="text-sm text-muted-foreground">best</span>
                  </div>
                  <span className="text-xs font-medium text-primary ml-auto">
                    Full stats →
                  </span>
                </div>
              )}

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" className="gap-2 font-semibold">
                  Play Today's {challengeInfo.name} <ArrowRight size={15} />
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                  <Dices size={15} /> Surprise Me
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                  <Infinity size={15} /> Endless
                </Button>
              </div>

              {/* Puzzle code */}
              <div className="mt-6 flex items-center gap-2 max-w-sm">
                <Input placeholder="Enter a puzzle code..." className="text-sm h-9" disabled />
                <Button variant="outline" size="sm" className="shrink-0" disabled>Load</Button>
              </div>
            </div>

            {/* Right: Daily challenge card */}
            <div>
              <div
                className={cn(
                  "group block rounded-2xl border-2 bg-card overflow-hidden transition-all",
                  dailySolved
                    ? "border-border"
                    : "border-primary/30 shadow-lg shadow-primary/10"
                )}
              >
                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                        Daily Challenge
                      </p>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {challengeInfo.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
                          {MOCK_CHALLENGE.difficulty}
                        </span>
                        {!dailySolved && (
                          <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                            {countdown}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <PuzzleIcon type={MOCK_CHALLENGE.category} size={24} className="text-primary" />
                    </div>
                  </div>

                  {/* Solved state */}
                  {dailySolved ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          Solved in {formatTime(127)}
                        </span>
                      </div>
                      <span className="text-sm text-primary font-medium">
                        View →
                      </span>
                    </div>
                  ) : (
                    /* Unsolved state */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isReturning && MOCK_STREAK.current > 0 && (
                          <div className="text-center">
                            <p className="font-mono text-2xl font-extrabold text-foreground leading-none">
                              {MOCK_STREAK.current}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 justify-center">
                              <Flame size={9} className="text-primary" /> streak
                            </p>
                          </div>
                        )}
                        {isReturning && MOCK_STREAK.longest > 0 && (
                          <div className="text-center">
                            <p className="font-mono text-2xl font-extrabold text-foreground leading-none">
                              {MOCK_STREAK.longest}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 justify-center">
                              <Trophy size={9} className="text-primary" /> best
                            </p>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="gap-1.5 font-semibold">
                        Play Now <ArrowRight size={13} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Leaderboard strip */}
                <div className="border-t border-border/60 bg-secondary/20 px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Today's fastest
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {MOCK_PLAYER_COUNT} players today
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {MOCK_LEADERBOARD.map((row, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm w-5 text-center shrink-0 leading-none">{MEDAL[i]}</span>
                          <span className="text-xs truncate text-foreground">
                            {row.display_name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums shrink-0 text-primary">
                          {formatTime(row.solve_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — PUZZLE TYPES
      ═══════════════════════════════════════════════════════ */}
      <section className="border-b">
        <div className="container py-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {isReturning ? "Your favorites" : "Eight ways to play"}
              </h2>
              {isReturning && (
                <p className="text-sm text-muted-foreground mt-0.5">Sorted by how often you play</p>
              )}
            </div>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              All puzzles <ChevronRight size={14} />
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MOCK_SORTED_TYPES.map((type) => {
              const info = CATEGORY_INFO[type];
              const ts   = MOCK_TYPE_STATS[type] ?? { solveCount: 0, bestTime: null, isNew: true };
              // New users see all as "new"
              const showNew = mode === "new-user" || ts.isNew;
              const showBest = isReturning && !ts.isNew && ts.bestTime !== null;
              return (
                <div
                  key={type}
                  className="group relative flex items-center gap-3.5 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm cursor-pointer"
                >
                  {showNew && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      New
                    </span>
                  )}

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 group-hover:bg-primary/15 transition-colors">
                    <PuzzleIcon type={type} size={20} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {info.name}
                    </p>
                    {showBest ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <TrendingUp size={10} className="text-primary/60 shrink-0" />
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Best: {formatTime(ts.bestTime!)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {info.description.slice(0, 36)}{info.description.length > 36 ? "…" : ""}
                      </p>
                    )}
                  </div>

                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-primary/50 shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW: WEEKLY PACK + STREAK SHIELD STRIP (returning users)
      ═══════════════════════════════════════════════════════ */}
      {isReturning && (
        <section className="border-b">
          <div className="container py-8 grid gap-4 lg:grid-cols-2">
            {/* Weekly Pack mock */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">This week</p>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">🌊 Ocean Voyage</h3>
              <p className="text-xs text-muted-foreground mt-1">Six puzzles, one curated theme.</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "50%" }} />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">3/6</span>
              </div>
              <Button size="sm" variant="outline" className="mt-3 gap-1 w-full">
                Continue pack <ArrowRight size={12} />
              </Button>
            </div>

            {/* Streak Shield */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
              <Shield size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Streak Shield ready</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your {MOCK_STREAK.current}-day streak is protected if you miss tomorrow. 1 shield remaining.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — CREATE
      ═══════════════════════════════════════════════════════ */}
      <section className="border-b bg-surface-warm">
        <div className="container py-14">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Create</p>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Make a puzzle.<br />Challenge someone.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Use your own words — inside jokes, shared memories, names they'll recognize. Send the link. They get a personalized puzzle. You get to see exactly how fast they solve it.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: Zap,   text: "Solve it yourself first to set a challenge time to beat" },
                  { icon: Users, text: "See when friends start, when they finish, every solve time" },
                  { icon: Send,  text: "They can send one back — it turns into a back-and-forth" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon size={13} className="text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button size="lg" className="gap-2">
                  Make a puzzle <ArrowRight size={15} />
                </Button>
              </div>
            </div>

            {/* Demo inbox */}
            <div className="space-y-2.5">
              {[
                { emoji: "☀️", type: "Crossword",  from: "Alex",   title: "Summer Memories",      time: "3:47", beat: true,  status: null },
                { emoji: "🔍", type: "Word Search", from: "Jamie",  title: "Our Favorite Things",  time: "2:14", beat: false, status: null },
                { emoji: "🔐", type: "Cryptogram",  from: "Taylor", title: "Secret Message",        time: null,  beat: false, status: "New" },
              ].map((ex) => (
                <div key={ex.title} className="flex items-center gap-3.5 rounded-xl border bg-card px-4 py-3.5">
                  <span className="text-xl shrink-0">{ex.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{ex.type}</span>
                      <span className="text-[10px] text-muted-foreground/40">from {ex.from}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{ex.title}</p>
                  </div>
                  {ex.time ? (
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-primary">{ex.time}</p>
                      {ex.beat && <p className="text-[10px] text-emerald-600 font-medium">beat them!</p>}
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {ex.status}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-center text-[11px] text-muted-foreground/40 pt-1">
                Your inbox fills up as friends solve and send back
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — PROGRESS (returning users only)
      ═══════════════════════════════════════════════════════ */}
      {isReturning && (
        <section className="border-t">
          <div className="container py-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold text-foreground">Your progress</h2>
              <span className="text-sm font-medium text-primary">
                Full stats →
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Target, label: "Puzzles solved", value: MOCK_STATS.totalSolved.toString() },
                { icon: Flame,  label: "Day streak",     value: MOCK_STATS.currentStreak.toString() },
                { icon: Clock,  label: "Average time",   value: formatTime(MOCK_STATS.averageTime) },
                { icon: Trophy, label: "Fastest solve",  value: formatTime(MOCK_STATS.bestTime) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border bg-card p-4 text-center">
                  <Icon className="mx-auto h-4 w-4 text-primary mb-2" />
                  <p className="font-mono text-xl font-bold text-foreground">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </Layout>
  );
}
