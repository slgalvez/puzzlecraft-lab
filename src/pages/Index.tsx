import { Link } from "react-router-dom";
import { ArrowRight, Grid3X3, Hash, Type, Search, Plus, Palette, Lock, Calculator } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { dailyPuzzle, allPuzzles } from "@/data/puzzles";
import PuzzleCard from "@/components/puzzles/PuzzleCard";

const Index = () => {
  const featured = allPuzzles.slice(0, 3);

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
              Crosswords, number fill-ins, and word fill-ins — fresh puzzles every day, beautifully crafted for every skill level.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/daily">Play Today's Puzzle <ArrowRight size={16} /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/puzzles">Browse Library</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Puzzle types */}
      <section className="container py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Three ways to play</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Grid3X3, title: "Crossword", desc: "Classic clue-based word puzzles in a variety of grid sizes." },
            { icon: Hash, title: "Number Fill-In", desc: "Place numbers into the grid so every entry fits perfectly." },
            { icon: Type, title: "Word Fill-In", desc: "Fit all the given words into the crossword-style grid." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
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
