import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Grid3X3, Hash, Type, Search, Plus, Palette, Lock, Calculator } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dailyPuzzle, allPuzzles, getPuzzleById } from "@/data/puzzles";
import PuzzleCard from "@/components/puzzles/PuzzleCard";
import { seedFromString } from "@/lib/seededRandom";
import { useToast } from "@/hooks/use-toast";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

const PUZZLE_CODE_TYPES: PuzzleCategory[] = [
  "sudoku", "crossword", "word-search", "kakuro", "nonogram", "cryptogram", "word-fill", "number-fill",
];

const Index = () => {
  const featured = allPuzzles.slice(0, 3);
  const [puzzleCode, setPuzzleCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLoadCode = () => {
    const code = puzzleCode.trim();
    if (!code) return;

    // Check if it matches a known puzzle ID
    const existing = getPuzzleById(code);
    if (existing) {
      navigate(`/play/${code}`);
      return;
    }

    // Try parsing as "type-seed" format (e.g., "sudoku-12345")
    const dashIdx = code.lastIndexOf("-");
    if (dashIdx > 0) {
      const typePart = code.slice(0, dashIdx).toLowerCase();
      const seedPart = code.slice(dashIdx + 1);
      if (PUZZLE_CODE_TYPES.includes(typePart as PuzzleCategory) && seedPart) {
        const seed = /^\d+$/.test(seedPart) ? parseInt(seedPart) : seedFromString(seedPart);
        navigate(`/generate/${typePart}?seed=${seed}`);
        return;
      }
    }

    // Try matching just a type name
    const lower = code.toLowerCase().replace(/\s+/g, "-");
    if (PUZZLE_CODE_TYPES.includes(lower as PuzzleCategory)) {
      navigate(`/generate/${lower}`);
      return;
    }

    // Use as a generic seed for sudoku (most common)
    const seed = /^\d+$/.test(code) ? parseInt(code) : seedFromString(code);
    if (seed > 0) {
      navigate(`/generate/sudoku?seed=${seed}`);
      return;
    }

    toast({
      title: "Code not found",
      description: "We couldn't find a puzzle matching that code. Check the code and try again.",
    });
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
              />
              <Button variant="outline" size="sm" onClick={handleLoadCode} disabled={!puzzleCode.trim()}>
                Load
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Have a puzzle code? Enter it above to jump straight to that puzzle.
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
