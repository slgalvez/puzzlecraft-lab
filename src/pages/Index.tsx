import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Grid3X3, Hash, Type, Search, Plus, Palette, Lock, Calculator, Flame, CheckCircle2, Calendar, Trophy, Clock, Target, Infinity, Dices } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allPuzzles, getPuzzleById } from "@/data/puzzles";
import PuzzleCard from "@/components/puzzles/PuzzleCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { randomSeed } from "@/lib/seededRandom";

const Index = () => {
  const featured = allPuzzles.slice(0, 3);
  const [puzzleCode, setPuzzleCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const dailyStreak = useMemo(() => getDailyStreak(), []);
  const stats = useMemo(() => getProgressStats(), []);
  const challengeInfo = CATEGORY_INFO[challenge.category];

  // Silent status check — only if a private session exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem("private_session");
      if (!raw) return;
      const { token } = JSON.parse(raw);
      if (!token) return;
      const payloadB64 = token.split(".")?.[1];
      if (!payloadB64) return;
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return;

      supabase.functions
        .invoke("messaging", { body: { action: "check-status", token } })
        .then(({ data, error }) => {
          if (error || data?.error) {
            // Session ended or invalid — clear stale token to stop future checks
            localStorage.removeItem("private_session");
            return;
          }
          if (data?.updated) setHasUpdate(true);
        })
        .catch(() => {
          localStorage.removeItem("private_session");
        });
    } catch {
      // silent
    }
  }, []);

  const handleLoadCode = async () => {
    const code = puzzleCode.trim();
    if (!code) return;

    const existing = getPuzzleById(code);
    if (existing) {
      navigate(`/play/${code}`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-code', {
        body: { code },
      });

      if (error) throw error;

      switch (data?.type) {
        case 'unlock':
          navigate(`/p/login?t=${encodeURIComponent(data.ticket)}`);
          break;
        case 'seed':
          navigate(`/generate/sudoku?seed=${data.seed}`);
          break;
        case 'type-seed':
          navigate(`/generate/${data.puzzleType}?seed=${data.seed}`);
          break;
        case 'type-name':
          navigate(`/generate/${data.puzzleType}`);
          break;
        default:
          toast({
            title: "Code not found",
            description: "We couldn't find a puzzle matching that code. Check the code and try again.",
          });
      }
    } catch {
      toast({
        title: "Code not found",
        description: "We couldn't find a puzzle matching that code. Check the code and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="border-b bg-surface-warm">
        <div className="container py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
              {challenge.displayDate}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-foreground">
              Sharpen your mind,{" "}
              <span className="text-primary">one puzzle at a time.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Crosswords, sudoku, word search, and more — unlimited puzzles, beautifully crafted for every skill level.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/daily">Play Today's Puzzle <ArrowRight size={16} /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/generate/sudoku">
                  <Infinity size={16} />
                  Endless Mode
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-1.5"
                onClick={() => {
                  const types = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
                  const type = types[Math.floor(Math.random() * types.length)];
                  const seed = randomSeed();
                  navigate(`/generate/${type}?seed=${seed}`);
                }}
              >
                <Dices size={16} />
                Surprise Me
              </Button>
            </div>

            {/* Puzzle code input */}
            <div className="mt-8 flex items-center gap-2 max-w-sm">
              <Input
                value={puzzleCode}
                onChange={(e) => setPuzzleCode(e.target.value)}
                placeholder="Enter a puzzle code..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleLoadCode()}
                disabled={loading}
              />
              <Button variant="outline" size="sm" onClick={handleLoadCode} disabled={!puzzleCode.trim() || loading}>
                {loading ? "..." : "Load"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-2">
              Have a puzzle code? Enter it above to jump straight to that puzzle.
              {hasUpdate && (
                <span className="inline-flex items-center gap-1 text-primary/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                  Library updated
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Daily Challenge */}
      <section className="border-b">
        <div className="container py-12">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Left: challenge info */}
              <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-3">
                  <Calendar size={14} />
                  Daily Challenge
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {challengeInfo.icon} Today's {challengeInfo.name}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {challengeInfo.description}. Everyone gets the same puzzle — how fast can you solve it?
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                    {challenge.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Seed: <span className="font-mono">{challenge.seed}</span>
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {dailyCompletion ? (
                    <>
                       <div className="flex items-center gap-1.5 rounded-lg border bg-primary/10 border-primary/30 px-3 py-2">
                         <CheckCircle2 size={16} className="text-primary" />
                         <span className="text-sm font-medium text-foreground">
                          Solved in {formatTime(dailyCompletion.time)}
                        </span>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/daily">View Puzzle</Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="lg">
                      <Link to="/daily">
                        Play Now <ArrowRight size={16} />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: streak stats */}
              <div className="border-t md:border-t-0 md:border-l bg-secondary/30 p-6 sm:p-8 md:w-64 flex flex-row md:flex-col gap-6 md:gap-4 justify-center">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                    <Flame size={16} className="text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Streak</span>
                  </div>
                  <p className="font-mono text-2xl font-bold text-foreground">{dailyStreak.current}</p>
                  <p className="text-xs text-muted-foreground">day{dailyStreak.current !== 1 ? "s" : ""}</p>
                </div>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                    <Trophy size={16} className="text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Best</span>
                  </div>
                  <p className="font-mono text-2xl font-bold text-foreground">{dailyStreak.longest}</p>
                  <p className="text-xs text-muted-foreground">day{dailyStreak.longest !== 1 ? "s" : ""}</p>
                </div>
                {stats.totalSolved > 0 && (
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                      <Target size={16} className="text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                    </div>
                    <p className="font-mono text-2xl font-bold text-foreground">{stats.totalSolved}</p>
                    <p className="text-xs text-muted-foreground">solved</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Puzzle types */}
      <section className="container py-16">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Eight ways to play</h2>
          <Link to="/generate/sudoku" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            <Infinity size={14} /> Endless Mode
          </Link>
        </div>
        <p className="text-muted-foreground">Unlimited puzzles with adjustable difficulty — generated fresh every time.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Grid3X3, title: "Crossword", desc: "Classic clue-based word puzzles.", link: "/generate/crossword" },
            { icon: Calculator, title: "Sudoku", desc: "Fill the 9×9 grid with digits 1–9.", link: "/generate/sudoku" },
            { icon: Search, title: "Word Search", desc: "Find hidden words in a letter grid.", link: "/generate/word-search" },
            { icon: Plus, title: "Kakuro", desc: "Cross-sums — a number crossword.", link: "/generate/kakuro" },
            { icon: Palette, title: "Nonogram", desc: "Reveal a picture using number clues.", link: "/generate/nonogram" },
            { icon: Lock, title: "Cryptogram", desc: "Decode the secret message.", link: "/generate/cryptogram" },
            { icon: Hash, title: "Number Fill-In", desc: "Place numbers into the grid pattern.", link: "/generate/number-fill" },
            { icon: Type, title: "Word Fill-In", desc: "Fit words into a crossword-style grid.", link: "/generate/word-fill" },
          ].map(({ icon: Icon, title, desc, link }) => (
            <Link key={title} to={link} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick stats bar */}
      {stats.totalSolved > 0 && (
        <section className="border-t">
          <div className="container py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Your Progress</h2>
              <Link to="/stats" className="text-sm font-medium text-primary hover:underline">
                Full stats →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-4 text-center">
                <Target className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="font-mono text-xl font-bold text-foreground">{stats.totalSolved}</p>
                <p className="text-xs text-muted-foreground">Puzzles Solved</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <Flame className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="font-mono text-xl font-bold text-foreground">{stats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <Clock className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="font-mono text-xl font-bold text-foreground">{formatTime(stats.averageTime)}</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <Trophy className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="font-mono text-xl font-bold text-foreground">
                  {stats.bestTime !== null ? formatTime(stats.bestTime) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Fastest Solve</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured puzzles */}
      <section className="border-t bg-surface-warm">
        <div className="container py-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Featured Puzzles</h2>
            <Link to="/puzzles" className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PuzzleCard key={p.id} puzzle={p} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
