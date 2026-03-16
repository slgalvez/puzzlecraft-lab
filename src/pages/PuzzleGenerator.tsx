import { useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import DifficultySelector from "@/components/puzzles/DifficultySelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed, seedFromString } from "@/lib/seededRandom";

// Puzzle components
import SudokuGrid from "@/components/puzzles/SudokuGrid";
import WordSearchGrid from "@/components/puzzles/WordSearchGrid";
import KakuroGrid from "@/components/puzzles/KakuroGrid";
import NonogramGrid from "@/components/puzzles/NonogramGrid";
import CryptogramPuzzle from "@/components/puzzles/CryptogramPuzzle";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";

// Generators for crossword / fill-in (they produce puzzle-compatible data)
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateWordFillIn, generateNumberFillIn } from "@/lib/generators/fillGen";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";

const PuzzleGenerator = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const category = type as PuzzleCategory;
  const info = CATEGORY_INFO[category];

  const initialSeed = searchParams.get("seed");

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [seed, setSeed] = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [seedInput, setSeedInput] = useState(initialSeed || "");
  const [puzzleKey, setPuzzleKey] = useState(0);

  if (!info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <Link to="/puzzles" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to library
          </Link>
        </div>
      </Layout>
    );
  }

  const handleNewPuzzle = () => {
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  };

  const handleLoadSeed = () => {
    if (seedInput.trim()) {
      setSeed(seedFromString(seedInput.trim()));
      setPuzzleKey((k) => k + 1);
    }
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  };

  const renderPuzzle = () => {
    const key = `${seed}-${difficulty}-${puzzleKey}`;

    switch (category) {
      case "sudoku":
        return <SudokuGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "word-search":
        return <WordSearchGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "kakuro":
        return <KakuroGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "nonogram":
        return <NonogramGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "cryptogram":
        return <CryptogramPuzzle key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "crossword": {
        const gen = generateCrossword(seed, difficulty);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: difficulty as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container py-12">
        <Link to="/puzzles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to library
        </Link>

        <div className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{info.name}</h1>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-4 rounded-lg border bg-card p-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Difficulty
            </label>
            <DifficultySelector value={difficulty} onChange={handleDifficultyChange} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Puzzle Seed / Code (optional)
              </label>
              <Input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter a seed code..."
                onKeyDown={(e) => e.key === "Enter" && handleLoadSeed()}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadSeed} disabled={!seedInput.trim()}>
              Load Seed
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current seed: <span className="font-mono text-foreground">{seed}</span>
          </p>
        </div>

        {/* Puzzle */}
        <div className="min-h-[300px]">{renderPuzzle()}</div>
      </div>
    </Layout>
  );
};

export default PuzzleGenerator;
