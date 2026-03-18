import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { ArrowLeft, RefreshCw } from "lucide-react";

// Puzzle components
import SudokuGrid from "@/components/puzzles/SudokuGrid";
import WordSearchGrid from "@/components/puzzles/WordSearchGrid";
import KakuroGrid from "@/components/puzzles/KakuroGrid";
import NonogramGrid from "@/components/puzzles/NonogramGrid";
import CryptogramPuzzle from "@/components/puzzles/CryptogramPuzzle";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";

// Generators
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateWordFillIn, generateNumberFillIn } from "@/lib/generators/fillGen";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";

const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

const QuickPlay = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = type as PuzzleCategory;
  const info = CATEGORY_INFO[category];

  const initialDifficulty = (searchParams.get("d") as Difficulty) || "medium";
  const initialSeed = searchParams.get("seed");

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [seed, setSeed] = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [puzzleKey, setPuzzleKey] = useState(0);

  const handleNewPuzzle = useCallback(() => {
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  }, []);

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    // Save preference
    try {
      const stored = JSON.parse(localStorage.getItem("play_difficulties") || "{}");
      stored[category] = d;
      localStorage.setItem("play_difficulties", JSON.stringify(stored));
    } catch { /* ignore */ }
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  };

  if (!info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <button onClick={() => navigate("/puzzles")} className="mt-4 text-sm font-medium text-primary hover:underline">
            ← Back to Play
          </button>
        </div>
      </Layout>
    );
  }

  const renderPuzzle = () => {
    const key = `${seed}-${difficulty}-${puzzleKey}`;
    switch (category) {
      case "sudoku": return <SudokuGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "word-search": return <WordSearchGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "kakuro": return <KakuroGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "nonogram": return <NonogramGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "cryptogram": return <CryptogramPuzzle key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "crossword": {
        const gen = generateCrossword(seed, difficulty);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: difficulty as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        {/* Minimal header */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/puzzles")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Play</span>
          </button>
        </div>

        {/* Puzzle identity + difficulty strip */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <PuzzleIcon type={category} size={28} className="text-foreground" />
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">{info.name}</h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {difficulties.map(([val, label]) => (
              <button
                key={val}
                onClick={() => handleDifficultyChange(val)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  difficulty === val
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Puzzle */}
        <div className="min-h-[300px]">
          {renderPuzzle()}
        </div>
      </div>
    </Layout>
  );
};

export default QuickPlay;
