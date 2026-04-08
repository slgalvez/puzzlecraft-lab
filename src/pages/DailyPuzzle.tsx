import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  getTodaysChallenge,
  getDailyCompletion,
  getDailyStreak,
} from "@/lib/dailyChallenge";
import { Calendar, Flame, ArrowLeft } from "lucide-react";
import { StreakShieldBanner } from "@/components/ios/StreakShieldBanner";
import { cn } from "@/lib/utils";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";

import { supabase } from "@/integrations/supabase/client";
import DailyPostSolve from "@/components/daily/DailyPostSolve";

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
  const [searchParams] = useSearchParams();
  const dateOverride = searchParams.get("date") ?? undefined;

  const challenge = useMemo(() => getTodaysChallenge(dateOverride), [dateOverride]);
  const [completion, setCompletion] = useState(() => getDailyCompletion(challenge.dateStr));
  const streak = useMemo(() => getDailyStreak(), []);
  const info = CATEGORY_INFO[challenge.category];

  // Track whether the solve just happened this session (for entrance animation + milestone)
  const [isNewSolve, setIsNewSolve] = useState(false);

  useEffect(() => { setPuzzleOrigin("daily"); }, []);

  // ── Daily score write ──
  const hasWrittenScore = useRef(false);

  const writeDailyScore = useCallback(async (solveTime: number) => {
    if (hasWrittenScore.current) return;
    hasWrittenScore.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let displayName = "Anonymous";
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        displayName = profile?.display_name
          ?? user.email?.split("@")[0]
          ?? "Anonymous";
      }

      await (supabase
        .from("daily_scores" as any)
        .upsert(
          {
            date_str:     challenge.dateStr,
            user_id:      user?.id ?? null,
            display_name: displayName,
            solve_time:   solveTime,
            puzzle_type:  challenge.category,
          },
          { onConflict: "date_str,user_id", ignoreDuplicates: false }
        ) as any);
    } catch {
      // silently fail — score write is non-critical
    }
  }, [challenge.dateStr, challenge.category]);

  // Called by puzzle grids on completion
  const handleNewPuzzle = useCallback(() => {
    const comp = getDailyCompletion(challenge.dateStr);
    if (comp) {
      setCompletion(comp);
      setIsNewSolve(true);
      writeDailyScore(comp.time);
    }
  }, [challenge.dateStr, writeDailyScore]);

  // Generated puzzles (crossword / fill-in types only)
  const generatedPuzzle = useMemo(() => {
    const { seed, difficulty, category, dateStr } = challenge;
    try {
      switch (category) {
        case "crossword": {
          const gen = generateCrossword(seed, difficulty);
          return {
            id: `daily-${dateStr}`, title: "Daily Crossword", type: "crossword" as const,
            difficulty: difficulty as CrosswordPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
          } satisfies CrosswordPuzzle;
        }
        case "word-fill": {
          const gen = generateWordFillIn(seed, difficulty);
          return {
            id: `daily-${dateStr}`, title: "Daily Word Fill-In", type: "word-fill" as const,
            difficulty: difficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
          } satisfies FillInPuzzle;
        }
        case "number-fill": {
          const gen = generateNumberFillIn(seed, difficulty);
          return {
            id: `daily-${dateStr}`, title: "Daily Number Fill-In", type: "number-fill" as const,
            difficulty: difficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
          } satisfies FillInPuzzle;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [challenge]);

  const renderPuzzle = () => {
    const { seed, difficulty, category } = challenge;
    const key = `daily-${challenge.dateStr}`;
    const dailyCode = `daily-${challenge.dateStr}`;

    switch (category) {
      case "sudoku":
        return <SudokuGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />;
      case "word-search":
        return <WordSearchGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />;
      case "kakuro":
        return <KakuroGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />;
      case "nonogram":
        return <NonogramGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />;
      case "cryptogram":
        return <CryptogramPuzzle key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />;
      case "crossword":
        return generatedPuzzle ? (
          <CrosswordGrid key={key} puzzle={generatedPuzzle as CrosswordPuzzle} showControls onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />
        ) : null;
      case "word-fill":
      case "number-fill":
        return generatedPuzzle ? (
          <FillInGrid key={key} puzzle={generatedPuzzle as FillInPuzzle} showControls onNewPuzzle={handleNewPuzzle} dailyCode={dailyCode} />
        ) : null;
      default:
        return null;
    }
  };

  const needsGenerator = ["crossword", "word-fill", "number-fill"].includes(challenge.category);
  const generationFailed = needsGenerator && !generatedPuzzle;

  return (
    <Layout>
       <div className="container py-6 md:py-10">


        {/* Back */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Calendar size={13} />
            <span>{challenge.displayDate}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Daily Challenge
              </h1>
              <p className="mt-1 text-muted-foreground flex items-center gap-2 text-sm">
                {info.name}
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs capitalize font-medium">
                  {challenge.difficulty}
                </span>
              </p>
            </div>
            {streak.current > 0 && (
              <div className="flex items-center gap-1.5 text-sm shrink-0">
                <Flame size={16} className="text-primary" />
                <span className="font-bold text-foreground">{streak.current}</span>
                <span className="text-muted-foreground">day streak</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Two-column layout on desktop ── */}
        <div className={cn(
          "grid gap-8",
          completion
            ? "lg:grid-cols-[1fr_400px] items-start"
            : "max-w-3xl mx-auto"
        )}>
          {/* Left: puzzle */}
          <div>
            {generationFailed ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground mb-4">Puzzle generation failed. Please refresh.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="min-h-[300px]">
                {renderPuzzle()}
              </div>
            )}
          </div>

          {/* Right: post-solve panel (desktop sidebar, full-width below on smaller) */}
          {completion && (
            <div className="lg:sticky lg:top-24">
              <DailyPostSolve
                solveTime={completion.time}
                dateStr={challenge.dateStr}
                displayDate={challenge.displayDate}
                category={challenge.category}
                difficulty={challenge.difficulty}
                streakCount={streak.current}
                isNew={isNewSolve}
              />
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default DailyPuzzle;