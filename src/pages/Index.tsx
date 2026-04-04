/**
 * Index.tsx  ← FULL REPLACEMENT
 * src/pages/Index.tsx
 *
 * Changes from previous version:
 *
 * STRUCTURE: 6 sections → 4
 *   1. Hero  — two-column: headline + CTAs left, daily challenge card right
 *   2. Types — puzzle grid, personalized for returning users
 *   3. Create — social/viral differentiator
 *   4. Progress — only shown to returning users (≥5 solves)
 *
 * REMOVED:
 *   - Generic "Sharpen your mind" hero (passive, not product-first)
 *   - Separate Daily Challenge section (moved into hero column)
 *   - "Compete" section (used fake hardcoded data permanently)
 *   - Endless Mode as a standalone section (already on Play page)
 *
 * ADDED:
 *   - Live "X players solved today" counter from daily_scores
 *   - Leaderboard preview inside daily card (real data, seeded mock fallback)
 *   - Puzzle type cards sorted by play frequency for returning users
 *   - Personal best time on each type card you've played
 *   - "New" badge on types never tried
 *   - Streak-at-risk nudge in hero if daily not done
 *   - PuzzleIcon used throughout (consistent with app icons)
 *
 * PRESERVED:
 *   - All private session / checkPrivateStatus logic (unchanged)
 *   - handleLoadCode with all switch cases (unchanged)
 *   - Puzzle code input + "have a code?" copy
 *   - challenge.displayDate in header
 *   - hasUpdate indicator
 *   - isNativeApp() → IOSPlayTab (unchanged)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Flame, CheckCircle2, Trophy, Clock,
  Target, Infinity, Dices, Send, Users, Zap,
  ChevronRight, TrendingUp, Star, Crown,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { getSolveRecords } from "@/lib/solveTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { isNativeApp } from "@/lib/appMode";
import IOSPlayTab from "@/components/ios/IOSPlayTab";
import { setPrivateAccessGrant } from "@/lib/privateAccessGrant";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";

// ── Seeded mock leaderboard (fallback until real data exists) ─────────────────

const MOCK_NAMES = [
  "Alex M.", "Jordan L.", "Sam W.", "Morgan P.", "Taylor K.",
  "Casey R.", "Riley B.", "Quinn A.", "Avery C.", "Blake F.",
];

function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
}

function getMockLeaderboard(dateStr: string, count = 3): { display_name: string; solve_time: number; is_mock: true }[] {
  const dateSeed = dateStr.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const base = [90, 140, 200]; // fast times in seconds
  return Array.from({ length: count }, (_, i) => ({
    display_name: MOCK_NAMES[seededInt(dateSeed + i * 97, 0, MOCK_NAMES.length - 1)],
    solve_time:   base[i] + seededInt(dateSeed + i * 113, -10, 20),
    is_mock:      true as const,
  }));
}

// ── Midnight countdown ────────────────────────────────────────────────────────

function useMidnightCountdown(): string {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => {
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      setSecs(Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

// ── Live daily player count + leaderboard preview ─────────────────────────────

interface LeaderRow { display_name: string; solve_time: number; is_mock?: boolean; }

function useDailyBoard(dateStr: string) {
  const [rows, setRows] = useState<LeaderRow[]>(() => getMockLeaderboard(dateStr));
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ count }, { data: top }] = await Promise.all([
          supabase.from("daily_scores" as any).select("*", { count: "exact", head: true }).eq("date_str", dateStr) as any,
          supabase.from("daily_scores" as any).select("display_name, solve_time").eq("date_str", dateStr).order("solve_time", { ascending: true }).limit(3) as any,
        ]);
        if (cancelled) return;
        if (count != null) setPlayerCount(count);
        if (top && (top as any[]).length > 0) {
          setRows((top as any[]).map((r: any) => ({ display_name: r.display_name ?? "Anonymous", solve_time: r.solve_time })));
        }
      } catch { /* keep mock */ }
    })();
    return () => { cancelled = true; };
  }, [dateStr]);

  return { rows, playerCount };
}

// ── Type stats helpers ─────────────────────────────────────────────────────────

function buildTypeStats() {
  try {
    const records = getSolveRecords();
    const stats   = getProgressStats();
    const result: Record<string, { solveCount: number; bestTime: number | null; isNew: boolean }> = {};
    for (const type of Object.keys(CATEGORY_INFO)) {
      const count = records.filter((r) => r.puzzleType === type).length;
      const best  = (stats.byCategory as any)?.[type]?.bestTime ?? null;
      result[type] = { solveCount: count, bestTime: best, isNew: count === 0 };
    }
    return result;
  } catch { return {}; }
}

function getSortedTypes(typeStats: Record<string, { solveCount: number }>) {
  const entries = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
  const total   = Object.values(typeStats).reduce((s, t) => s + t.solveCount, 0);
  if (total < 5) return entries;
  return [...entries].sort((a, b) => (typeStats[b]?.solveCount ?? 0) - (typeStats[a]?.solveCount ?? 0));
}

// ── Component ─────────────────────────────────────────────────────────────────

const MEDAL = ["🥇", "🥈", "🥉"];

const Index = () => {
  const [puzzleCode, setPuzzleCode] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [hasUpdate,  setHasUpdate]  = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const countdown = useMidnightCountdown();

  const challenge      = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const dailyStreak    = useMemo(() => getDailyStreak(), []);
  const stats          = useMemo(() => getProgressStats(), []);
  const challengeInfo  = CATEGORY_INFO[challenge.category];

  const { rows: leaderRows, playerCount } = useDailyBoard(challenge.dateStr);

  const typeStats     = useMemo(buildTypeStats, []);
  const sortedTypes   = useMemo(() => getSortedTypes(typeStats), [typeStats]);
  const isReturning   = useMemo(() => Object.values(typeStats).reduce((s, t) => s + t.solveCount, 0) >= 5, [typeStats]);

  const streakAtRisk  = useMemo(() => {
    if (!dailyStreak.current) return false;
    return !dailyCompletion;
  }, [dailyStreak.current, dailyCompletion]);

  // ── Private session check (unchanged) ──
  const checkPrivateStatus = useCallback(() => {
    if (isNativeApp()) return;
    try {
      const raw = localStorage.getItem("private_session");
      if (!raw) return;
      const { token } = JSON.parse(raw);
      if (!token) return;
      const payloadB64 = token.split(".")?.[1];
      if (!payloadB64) return;
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return;
      supabase.functions.invoke("messaging", { body: { action: "check-status", token } })
        .then(({ data, error }) => {
          if (error || data?.error) { localStorage.removeItem("private_session"); return; }
          setHasUpdate(data?.updated === true);
        })
        .catch(() => localStorage.removeItem("private_session"));
    } catch {}
  }, []);

  useEffect(() => { checkPrivateStatus(); }, [checkPrivateStatus]);
  useEffect(() => {
    const fn = () => { if (document.visibilityState === "visible") checkPrivateStatus(); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [checkPrivateStatus]);

  // ── Code loader (unchanged) ──
  const handleLoadCode = async () => {
    const code = puzzleCode.trim();
    if (!code) return;
    const existing = getPuzzleById(code);
    if (existing) { navigate(`/play/${code}`); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-code", { body: { code } });
      if (error) throw error;
      switch (data?.type) {
        case "unlock":
          if (isNativeApp()) { toast({ title: "Code not found" }); break; }
          setPrivateAccessGrant(Math.floor(Date.now() / 1000) + 1800);
          localStorage.setItem("private_last_active", String(Date.now()));
          navigate("/p/login"); break;
        case "seed":       navigate(`/generate/sudoku?seed=${data.seed}`); break;
        case "type-seed":  navigate(`/generate/${data.puzzleType}?seed=${data.seed}`); break;
        case "type-name":  navigate(`/generate/${data.puzzleType}`); break;
        default: toast({ title: "Code not found", description: "Check the code and try again." });
      }
    } catch { toast({ title: "Code not found", description: "Check the code and try again." }); }
    finally { setLoading(false); }
  };

  // iOS: dedicated tab UI
  if (isNativeApp()) return <Layout><IOSPlayTab /></Layout>;

  return (
    <Layout>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          Left: headlines, CTAs, code input
          Right: daily challenge card with live leaderboard
      ═══════════════════════════════════════════════════════ */}
      <section className="border-b bg-surface-warm">
        <div className="container py-10 sm:py-14">
          <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-14 items-start">

            {/* Left */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                {challenge.displayDate}
              </p>

              {/* Streak nudge — replaces generic headline hook when streak is at risk */}
              {streakAtRisk ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                  <Flame size={16} className="text-destructive shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {dailyStreak.current}-day streak at risk
                    </p>
                    <p className="text-xs text-muted-foreground">Play today to keep it alive</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <Link to="/daily">Play now</Link>
                  </Button>
                </div>
              ) : null}

              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.1rem]">
                {isReturning ? (
                  <>Welcome back.<br /><span className="text-primary">Your puzzles await.</span></>
                ) : (
                  <>Sharpen your mind,<br /><span className="text-primary">one puzzle at a time.</span></>
                )}
              </h1>

              <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
                {isReturning
                  ? "Eight puzzle types. Daily challenges. Compete, create, and track your best times."
                  : "Crosswords, sudoku, word search, and more — unlimited puzzles, beautifully crafted for every skill level."
                }
              </p>

              {/* Returning user: inline stats bar */}
              {isReturning && (
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  {dailyStreak.current > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Flame size={13} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">{dailyStreak.current}</span>
                      <span className="text-sm text-muted-foreground">day streak</span>
                    </div>
                  )}
                  {dailyStreak.current > 0 && stats.totalSolved > 0 && (
                    <div className="h-3.5 w-px bg-border" />
                  )}
                  {stats.totalSolved > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Target size={13} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">{stats.totalSolved}</span>
                      <span className="text-sm text-muted-foreground">solved</span>
                    </div>
                  )}
                  {stats.bestTime !== null && (
                    <>
                      <div className="h-3.5 w-px bg-border" />
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-primary" />
                        <span className="text-sm font-bold text-foreground">{formatTime(stats.bestTime)}</span>
                        <span className="text-sm text-muted-foreground">best</span>
                      </div>
                    </>
                  )}
                  <Link to="/stats" className="text-xs font-medium text-primary hover:underline ml-auto">
                    Full stats →
                  </Link>
                </div>
              )}

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2 font-semibold">
                  <Link to="/daily">
                    Play Today's {challengeInfo.name} <ArrowRight size={15} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/surprise"><Dices size={15} /> Surprise Me</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/quick-play/sudoku?mode=endless"><Infinity size={15} /> Endless</Link>
                </Button>
              </div>

              {/* Puzzle code */}
              <div className="mt-6 flex items-center gap-2 max-w-sm">
                <Input
                  value={puzzleCode}
                  onChange={(e) => setPuzzleCode(e.target.value)}
                  placeholder="Enter a puzzle code..."
                  className="text-sm h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleLoadCode()}
                  disabled={loading}
                />
                <Button variant="outline" size="sm" onClick={handleLoadCode}
                  disabled={!puzzleCode.trim() || loading} className="shrink-0">
                  {loading ? "..." : "Load"}
                </Button>
              </div>
              {hasUpdate && (
                <p className="mt-1.5 text-xs text-primary/70 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                  Library updated
                </p>
              )}
            </div>

            {/* Right: Daily challenge card */}
            <div>
              <Link
                to="/daily"
                className={cn(
                  "group block rounded-2xl border-2 bg-card overflow-hidden transition-all",
                  dailyCompletion
                    ? "border-border hover:border-primary/40"
                    : "border-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
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
                          {challenge.difficulty}
                        </span>
                        {!dailyCompletion && (
                          <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                            {countdown} left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <PuzzleIcon type={challenge.category} size={24} className="text-primary" />
                    </div>
                  </div>

                  {/* Solved state */}
                  {dailyCompletion ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <CheckCircle2 size={14} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          Solved in {formatTime(dailyCompletion.time)}
                        </span>
                      </div>
                      <span className="text-sm text-primary font-medium group-hover:underline">
                        View →
                      </span>
                    </div>
                  ) : (
                    /* Unsolved state */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {dailyStreak.current > 0 && (
                          <div className="text-center">
                            <p className="font-mono text-2xl font-extrabold text-foreground leading-none">
                              {dailyStreak.current}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 justify-center">
                              <Flame size={9} className="text-primary" /> streak
                            </p>
                          </div>
                        )}
                        {dailyStreak.longest > 0 && (
                          <div className="text-center">
                            <p className="font-mono text-2xl font-extrabold text-foreground leading-none">
                              {dailyStreak.longest}
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
                    {playerCount !== null && playerCount > 0 && (
                      <p className="text-[10px] text-muted-foreground/60">
                        {playerCount} player{playerCount !== 1 ? "s" : ""} today
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {leaderRows.map((row, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm w-5 text-center shrink-0 leading-none">{MEDAL[i]}</span>
                          <span className={cn(
                            "text-xs truncate",
                            (row as any).is_mock ? "text-muted-foreground/40" : "text-foreground"
                          )}>
                            {row.display_name}
                          </span>
                        </div>
                        <span className={cn(
                          "font-mono text-xs font-semibold tabular-nums shrink-0",
                          (row as any).is_mock ? "text-muted-foreground/30" : "text-primary"
                        )}>
                          {formatTime(row.solve_time)}
                        </span>
                      </div>
                    ))}
                    {!playerCount && (
                      <p className="text-[10px] text-muted-foreground/40 italic pt-0.5">
                        Be the first on the board today
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — PUZZLE TYPES
          Sorted by frequency for returning users.
          Personal bests shown instead of descriptions.
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
            <Link
              to="/puzzles"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              All puzzles <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sortedTypes.map((type) => {
              const info = CATEGORY_INFO[type];
              const ts   = typeStats[type] ?? { solveCount: 0, bestTime: null, isNew: true };
              return (
                <Link
                  key={type}
                  to={`/quick-play/${type}`}
                  className="group relative flex items-center gap-3.5 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  {/* "New" badge */}
                  {ts.isNew && (
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
                    {!ts.isNew && ts.bestTime !== null ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <TrendingUp size={10} className="text-primary/60 shrink-0" />
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Best: {formatTime(ts.bestTime)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {info.description.slice(0, 36)}{info.description.length > 36 ? "…" : ""}
                      </p>
                    )}
                  </div>

                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-primary/50 shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — CREATE
          Social / viral differentiator.
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
                <Button asChild size="lg" className="gap-2">
                  <Link to="/craft">Make a puzzle <ArrowRight size={15} /></Link>
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
              <Link to="/stats" className="text-sm font-medium text-primary hover:underline">
                Full stats →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Target, label: "Puzzles solved", value: stats.totalSolved.toString() },
                { icon: Flame,  label: "Day streak",     value: stats.currentStreak.toString() },
                { icon: Clock,  label: "Average time",   value: stats.totalSolved > 0 ? formatTime(stats.averageTime) : "—" },
                { icon: Trophy, label: "Fastest solve",  value: stats.bestTime !== null ? formatTime(stats.bestTime) : "—" },
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
};

export default Index;
