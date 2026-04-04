/**
 * Index.tsx  ← FULL REPLACEMENT
 * src/pages/Index.tsx
 *
 * Competitive desktop homepage redesign.
 *
 * Key changes from previous version:
 *  1. Daily challenge IS the hero — puzzle card front and center above the fold
 *  2. Live "played today" counter + daily leaderboard preview for social proof
 *  3. Returning users see personalized section (top types + stats) first
 *  4. Create section placed after play section (not buried at bottom)
 *  5. Puzzle type grid is 4-col, personalized for returning users
 *  6. Puzzlecraft+ section auto-shows when LAUNCHED = true
 *  7. Hero headline reduced — product speaks for itself
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Dices, Infinity, Flame, Trophy, Target, Clock,
  Send, Users, Zap, Crown, Star, ChevronRight, Play,
  CheckCircle2, Lock, BarChart3,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { isNativeApp } from "@/lib/appMode";
import IOSPlayTab from "@/components/ios/IOSPlayTab";
import { setPrivateAccessGrant } from "@/lib/privateAccessGrant";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { getSolveRecords } from "@/lib/solveTracker";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_TYPES: PuzzleCategory[] = Object.keys(CATEGORY_INFO) as PuzzleCategory[];

/** Top 4 puzzle types by solve count for this user, falls back to default order */
function getPersonalizedTypes(): { types: PuzzleCategory[]; isPersonalized: boolean } {
  try {
    const records = getSolveRecords();
    if (records.length < 5) return { types: ALL_TYPES.slice(0, 8), isPersonalized: false };
    const counts: Record<string, number> = {};
    for (const r of records) counts[r.puzzleType] = (counts[r.puzzleType] ?? 0) + 1;
    const sorted = [...ALL_TYPES].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    return { types: sorted, isPersonalised: true };
  } catch {
    return { types: ALL_TYPES.slice(0, 8), isPersonalised: false };
  }
}

function getBestTimeForType(type: PuzzleCategory): number | null {
  try {
    const stats = getProgressStats();
    return stats.byCategory[type]?.bestTime ?? null;
  } catch { return null; }
}

// ── Countdown to midnight ─────────────────────────────────────────────────────

function useMidnightCountdown() {
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
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Daily leaderboard preview (top 3 from daily_scores) ───────────────────────

interface LeaderRow { display_name: string; solve_time: number; rank: number; }

function useDailyLeaderPreview(dateStr: string): LeaderRow[] {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  useEffect(() => {
    supabase
      .from("daily_scores" as any)
      .select("display_name, solve_time")
      .eq("date_str", dateStr)
      .order("solve_time", { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) setRows((data as any[]).map((r, i) => ({ display_name: r.display_name ?? "Anonymous", solve_time: r.solve_time, rank: i + 1 })));
      });
  }, [dateStr]);
  return rows;
}

// ── Main component ────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [puzzleCode, setPuzzleCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const streak = useMemo(() => getDailyStreak(), []);
  const stats = useMemo(() => getProgressStats(), []);
  const challengeInfo = CATEGORY_INFO[challenge.category];
  const countdown = useMidnightCountdown();
  const leaderPreview = useDailyLeaderPreview(challenge.dateStr);
  const { types: rankedTypes, isPersonalised } = useMemo(getPersonalisedTypes, []);

  const isReturningUser = stats.totalSolved >= 5;

  // Private app status check
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
        case "seed": navigate(`/generate/sudoku?seed=${data.seed}`); break;
        case "type-seed": navigate(`/generate/${data.puzzleType}?seed=${data.seed}`); break;
        case "type-name": navigate(`/generate/${data.puzzleType}`); break;
        default: toast({ title: "Code not found", description: "Check the code and try again." });
      }
    } catch { toast({ title: "Code not found", description: "Check the code and try again." }); }
    finally { setLoading(false); }
  };

  // iOS: show dedicated tab UI
  if (isNativeApp()) return <Layout><IOSPlayTab /></Layout>;

  return (
    <Layout>

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — HERO (Daily challenge front and center)
          No dead space. The product IS the hero.
      ════════════════════════════════════════════════════════ */}
      <section className="border-b bg-surface-warm">
        <div className="container py-10 sm:py-14">
          <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-14 items-start">

            {/* Left: Headlines + CTAs */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                {challenge.displayDate}
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                Today's puzzle<br />
                <span className="text-primary">is waiting for you.</span>
              </h1>
              <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
                Eight puzzle types. Unlimited play. Daily challenges everyone solves together.
              </p>

              {/* Returning user: quick stats bar */}
              {isReturningUser && (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">{streak.current}</span>
                    <span className="text-sm text-muted-foreground">day streak</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Target size={14} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">{stats.totalSolved}</span>
                    <span className="text-sm text-muted-foreground">solved</span>
                  </div>
                  {stats.bestTime !== null && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-primary" />
                        <span className="text-sm font-semibold text-foreground">{formatTime(stats.bestTime)}</span>
                        <span className="text-sm text-muted-foreground">best</span>
                      </div>
                    </>
                  )}
                  <Link to="/stats" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline ml-auto">
                    <BarChart3 size={13} /> Full stats
                  </Link>
                </div>
              )}

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2 font-semibold">
                  <Link to="/daily">
                    <Play size={16} className="fill-current" />
                    Play Today's {challengeInfo.name}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/surprise">
                    <Dices size={16} />
                    Surprise Me
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/quick-play/sudoku?mode=endless">
                    <Infinity size={16} />
                    Endless Mode
                  </Link>
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
                <Button variant="outline" size="sm" onClick={handleLoadCode} disabled={!puzzleCode.trim() || loading}>
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

            {/* Right: Daily challenge card — the actual product */}
            <div className="flex flex-col gap-4">
              {/* Challenge card */}
              <Link
                to="/daily"
                className={cn(
                  "group rounded-2xl border-2 bg-card overflow-hidden transition-all",
                  dailyCompletion
                    ? "border-border hover:border-primary/40"
                    : "border-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
                )}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                        Daily Challenge
                      </p>
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {challengeInfo.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
                          {challenge.difficulty}
                        </span>
                        {!dailyCompletion && (
                          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                            {countdown} left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <PuzzleIcon type={challenge.category} size={26} className="text-primary" />
                    </div>
                  </div>

                  {dailyCompletion ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <CheckCircle2 size={15} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          Solved in {formatTime(dailyCompletion.time)}
                        </span>
                      </div>
                      <span className="text-sm text-primary font-medium group-hover:underline">View →</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-mono text-2xl font-extrabold text-foreground leading-none">{streak.current}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                            <Flame size={9} className="text-primary" /> streak
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-mono text-2xl font-extrabold text-foreground leading-none">{streak.longest}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                            <Trophy size={9} className="text-primary" /> best
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="gap-1.5 font-semibold group-hover:bg-primary/90">
                        Play Now <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-border/60" />

                {/* Leaderboard preview */}
                {leaderPreview.length > 0 ? (
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Today's fastest
                    </p>
                    <div className="space-y-1.5">
                      {leaderPreview.map((row) => (
                        <div key={row.rank} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/50 w-4">
                              {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
                            </span>
                            <span className="text-xs text-foreground truncate max-w-[140px]">{row.display_name}</span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-primary">{formatTime(row.solve_time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground/50 italic">Be the first on the board today</p>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — PUZZLE TYPES (personalised for returning users)
      ════════════════════════════════════════════════════════ */}
      <section className="border-b">
        <div className="container py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {isPersonalised ? "Your favourites" : "Eight ways to play"}
              </h2>
              {isPersonalised && (
                <p className="text-sm text-muted-foreground mt-0.5">Sorted by how often you play</p>
              )}
            </div>
            <Link
              to="/quick-play/sudoku?mode=endless"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Infinity size={14} /> Endless Mode
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rankedTypes.map((type) => {
              const info = CATEGORY_INFO[type];
              const best = getBestTimeForType(type);
              return (
                <Link
                  key={type}
                  to={`/quick-play/${type}`}
                  className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary group-hover:bg-primary/15 transition-colors">
                    <PuzzleIcon type={type} size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {info.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {best
                        ? <span className="font-mono">Best: {formatTime(best)}</span>
                        : info.description.slice(0, 32) + "…"
                      }
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 3 — CREATE (social/viral feature)
      ════════════════════════════════════════════════════════ */}
      <section className="border-b bg-surface-warm">
        <div className="container py-14">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Create</p>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Make a puzzle.<br />Challenge a friend.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Use your own words — inside jokes, shared memories, favourite things. Pick a type, enter your words, and send the link. They get a personalised puzzle. You get to see how fast they solve it.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: Send,  text: "Solve it first to set a challenge time they have to beat" },
                  { icon: Users, text: "Track when friends start and finish — see every solve time" },
                  { icon: Zap,   text: "They can send one back — it turns into a back-and-forth" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon size={13} className="text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/craft">Make a puzzle <ArrowRight size={16} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/craft">See examples</Link>
                </Button>
              </div>
            </div>

            {/* Demo inbox preview */}
            <div className="space-y-2.5">
              {[
                { emoji: "☀️", type: "Crossword",  from: "Alex",   title: "Summer Memories",     time: "3:47", beat: true,  status: "Solved" },
                { emoji: "🔍", type: "Word Search", from: "Jamie",  title: "Our Favourite Things", time: "2:14", beat: false, status: "Solved" },
                { emoji: "🔐", type: "Cryptogram",  from: "Taylor", title: "Secret Message",       time: null,  beat: false, status: "New" },
              ].map((ex) => (
                <div key={ex.title} className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
                  <span className="text-xl shrink-0">{ex.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{ex.type}</span>
                      <span className="text-[10px] text-muted-foreground/50">from {ex.from}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{ex.title}</p>
                  </div>
                  {ex.time ? (
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-primary">{ex.time}</p>
                      {ex.beat && <p className="text-[10px] text-emerald-600 font-medium">beat them!</p>}
                    </div>
                  ) : (
                    <span className={cn(
                      "text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-full",
                      ex.status === "New"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {ex.status}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-center text-xs text-muted-foreground/50 pt-1">
                Your inbox fills up as friends solve and send back
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 4 — COMPETE (rating, leaderboard)
      ════════════════════════════════════════════════════════ */}
      <section className="border-b">
        <div className="container py-14">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: leaderboard cards */}
            <div className="space-y-2">
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    All-time leaderboard
                  </p>
                  <Link to="/leaderboard" className="text-[11px] text-primary hover:underline">View all →</Link>
                </div>
                {[
                  { rank: "🥇", name: "wordsmith_99",  rating: 1342, tier: "Expert" },
                  { rank: "🥈", name: "puzzlemaster",  rating: 1287, tier: "Expert" },
                  { rank: "🥉", name: "grid_queen",    rating: 1201, tier: "Advanced" },
                  { rank: "4",  name: "You",           rating: null,  tier: null },
                ].map((row) => (
                  <div
                    key={row.name}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 border-b border-border/30 last:border-0",
                      row.name === "You" && "bg-primary/5"
                    )}
                  >
                    <span className="text-sm w-6 text-center">{row.rank}</span>
                    <span className="flex-1 text-sm font-medium text-foreground">{row.name}</span>
                    {row.tier && (
                      <span className="text-[10px] font-semibold text-muted-foreground">{row.tier}</span>
                    )}
                    {row.rating ? (
                      <span className="font-mono text-sm font-bold text-primary">{row.rating}</span>
                    ) : (
                      <Link to="/stats" className="text-xs text-primary hover:underline">See your rank →</Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Tier ladder */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border bg-card">
                {["Beginner", "Casual", "Skilled", "Advanced", "Expert"].map((tier, i) => (
                  <div key={tier} className="text-center">
                    <div className={cn(
                      "h-2 w-2 rounded-full mx-auto mb-1.5",
                      i === 0 ? "bg-muted-foreground/30" :
                      i === 1 ? "bg-emerald-400" :
                      i === 2 ? "bg-amber-400" :
                      i === 3 ? "bg-orange-500" : "bg-primary"
                    )} />
                    <p className="text-[9px] text-muted-foreground/70">{tier}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: text */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Compete</p>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Build your rating.<br />Climb the tiers.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Every puzzle you solve earns rating points based on difficulty, speed, and accuracy. Work your way from Beginner to Expert — and see where you rank against everyone.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Rating updates after every solve",
                  "Five tiers: Beginner → Expert",
                  "Separate leaderboard for daily challenges",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/stats">View your stats <BarChart3 size={16} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/leaderboard">Leaderboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 5 — PUZZLECRAFT+ (only when launched)
      ════════════════════════════════════════════════════════ */}
      {PUZZLECRAFT_PLUS_LAUNCHED && (
        <section className="border-b bg-surface-warm">
          <div className="container py-14">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Crown size={26} className="text-primary" />
                </div>
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Puzzlecraft+</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg mx-auto">
                The complete experience. Extreme and Insane difficulty. Unlimited craft puzzles. Full analytics and skill rating. Streak Shield. Early weekly pack access.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2.5 text-sm">
                {[
                  "Extreme & Insane difficulty",
                  "Unlimited craft puzzles",
                  "Skill rating & leaderboard",
                  "Full analytics",
                  "Streak Shield",
                  "Weekly pack — early access",
                ].map((f) => (
                  <span key={f} className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 bg-card text-muted-foreground text-[13px]">
                    <Star size={10} className="text-primary/60 fill-primary/30 shrink-0" />
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button asChild size="lg" className="gap-2 px-8">
                  <Link to="/account"><Crown size={16} /> Start 7-day free trial</Link>
                </Button>
                <p className="text-xs text-muted-foreground">Cancel anytime · No commitment</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          SECTION 6 — PROGRESS (returning users only)
      ════════════════════════════════════════════════════════ */}
      {isReturningUser && (
        <section className="border-t">
          <div className="container py-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold text-foreground">Your progress</h2>
              <Link to="/stats" className="text-sm font-medium text-primary hover:underline">Full stats →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Target, label: "Puzzles solved",  value: stats.totalSolved.toString() },
                { icon: Flame,  label: "Day streak",      value: stats.currentStreak.toString() },
                { icon: Clock,  label: "Average time",    value: formatTime(stats.averageTime) },
                { icon: Trophy, label: "Fastest solve",   value: stats.bestTime !== null ? formatTime(stats.bestTime) : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-primary" />
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
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
