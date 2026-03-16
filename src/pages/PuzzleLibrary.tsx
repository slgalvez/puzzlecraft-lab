import { useState } from "react";
import Layout from "@/components/layout/Layout";
import PuzzleCard from "@/components/puzzles/PuzzleCard";
import { allPuzzles, PuzzleType, Difficulty } from "@/data/puzzles";
import { cn } from "@/lib/utils";

const types: { value: PuzzleType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "crossword", label: "Crossword" },
  { value: "number-fill", label: "Number Fill-In" },
  { value: "word-fill", label: "Word Fill-In" },
];

const PuzzleLibrary = () => {
  const [typeFilter, setTypeFilter] = useState<PuzzleType | "all">("all");

  const filtered = typeFilter === "all"
    ? allPuzzles
    : allPuzzles.filter((p) => p.type === typeFilter);

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Puzzle Library</h1>
        <p className="mt-2 text-muted-foreground">Browse our collection and find your next challenge.</p>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                typeFilter === t.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PuzzleCard key={p.id} puzzle={p} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PuzzleLibrary;
