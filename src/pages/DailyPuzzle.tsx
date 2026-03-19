import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type Difficulty } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  getTodaysChallenge,
  getDailyCompletion,
  recordDailyCompletion,
  getDailyStreak,
  type DailyChallenge,
} from "@/lib/dailyChallenge";
import { Calendar, CheckCircle2, Clock, Flame, Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";

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

const DailyPuzzle = () => {
  const challenge = useMemo(() => getTodaysChallenge(), []);
  const [completion, setCompletion] = useState(() => getDailyCompletion(challenge.dateStr));
  const streak = useMemo(() => getDailyStreak(), []);
  const info = CATEGORY_INFO[challenge.category];

  useEffect(() => { setPuzzleOrigin("daily"); }, []);

  // Track completion from puzzle timer callback
  const handleNewPuzzle = useCallback(() => {
    // Daily puzzle doesn't regenerate - just refresh completion state
    setCompletion(getDailyCompletion(challenge.dateStr));
  }, [challenge.dateStr]);

  const renderPuzzle = () => {
    const { seed, difficulty, category } = challenge;
    const key = `daily-${challenge.dateStr}`;

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
          id: `daily-${challenge.dateStr}`, title: "Daily Crossword", type: "crossword",
          difficulty: difficulty as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `daily-${challenge.dateStr}`, title: "Daily Word Fill-In", type: "word-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `daily-${challenge.dateStr}`, title: "Daily Number Fill-In", type: "number-fill",
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
      <div className="container py-6 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar size={14} />
            <span>{challenge.displayDate}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Daily Challenge
              </h1>
              <p className="mt-1 text-muted-foreground flex items-center gap-2">
                <span className="text-lg">{info.icon}</span>
                Today's puzzle: <span className="font-medium text-foreground">{info.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                  {challenge.difficulty}
                </span>
              </p>
            </div>

            {/* Streak and completion */}
            <div className="flex items-center gap-4">
              {streak.current > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Flame size={16} className="text-primary" />
                  <span className="font-medium text-foreground">{streak.current}</span>
                  <span className="text-muted-foreground">day streak</span>
                </div>
              )}
              {completion && (
                <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2">
                  <CheckCircle2 size={16} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Solved in {formatTime(completion.time)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completion banner */}
        {completion && (
          <div className="mb-8 rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">Challenge Complete!</p>
                <p className="text-sm text-muted-foreground">
                  You solved today's {info.name} in {formatTime(completion.time)}.
                  Come back tomorrow for a new challenge.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/generate/${challenge.category}`}>
                  Play More {info.name} <ArrowRight size={14} />
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/quick-play/sudoku?mode=endless">
                  Endless Mode <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Puzzle */}
        <div className="min-h-[300px]">{renderPuzzle()}</div>
      </div>
    </Layout>
  );
};

export default DailyPuzzle;
