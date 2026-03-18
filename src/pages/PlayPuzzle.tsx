import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";
import { getPuzzleById } from "@/data/puzzles";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";

const typeLabels = {
  crossword: "Crossword",
  "number-fill": "Number Fill-In",
  "word-fill": "Word Fill-In",
};

const PlayPuzzle = () => {
  const { id } = useParams<{ id: string }>();
  const puzzle = getPuzzleById(id || "");

  if (!puzzle) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Puzzle not found</h1>
          <p className="mt-2 text-muted-foreground">
            This puzzle doesn't exist or isn't available yet.
          </p>
          <Link to="/puzzles" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to library
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <Link to="/puzzles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to library
        </Link>
        <div className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {typeLabels[puzzle.type]}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">{puzzle.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {puzzle.type === "crossword"
              ? "Click a cell and start typing — press Tab to switch direction."
              : `Place each ${puzzle.type === "number-fill" ? "number" : "word"} into the grid. Click entries to mark them as used.`}
          </p>
        </div>

        {puzzle.type === "crossword" ? (
          <CrosswordGrid puzzle={puzzle as CrosswordPuzzle} />
        ) : (
          <FillInGrid puzzle={puzzle as FillInPuzzle} />
        )}
      </div>
    </Layout>
  );
};

export default PlayPuzzle;
