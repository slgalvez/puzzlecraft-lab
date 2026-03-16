import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Grid3X3, Hash, Type, Search, Plus, Palette, Lock, Calculator } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dailyPuzzle, allPuzzles, getPuzzleById } from "@/data/puzzles";
import PuzzleCard from "@/components/puzzles/PuzzleCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const featured = allPuzzles.slice(0, 3);
  const [puzzleCode, setPuzzleCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Silent status check — only if a private session exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem("private_session");
      if (!raw) return;
      const { token } = JSON.parse(raw);
      if (!token) return;
      // Verify token not expired
      const payloadB64 = token.split(".")?.[1];
      if (!payloadB64) return;
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return;

      supabase.functions
        .invoke("messaging", { body: { action: "check-status", token } })
        .then(({ data }) => {
          if (data?.updated) setHasUpdate(true);
        })
        .catch(() => {});
    } catch {
      // silent
    }
  }, []);

  const handleLoadCode = async () => {
    const code = puzzleCode.trim();
    if (!code) return;

    // Check if it matches a known puzzle ID first (no backend needed)
    const existing = getPuzzleById(code);
    if (existing) {
      navigate(`/play/${code}`);
      return;
    }

    // Validate via backend
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
              {dailyPuzzle.date}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-foreground">
              Sharpen your mind,{" "}
              <span className="text-primary">one puzzle at a time.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Crosswords, sudoku, word search, and more — unlimited procedurally generated puzzles, beautifully crafted for every skill level.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/daily">Play Today's Puzzle <ArrowRight size={16} /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/puzzles">Browse Library</Link>
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
                  Updated
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Puzzle types */}
      <section className="container py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Eight ways to play</h2>
        <p className="mt-2 text-muted-foreground">Unlimited puzzles with adjustable difficulty — generated fresh every time.</p>
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
