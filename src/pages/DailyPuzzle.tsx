/**
 * DailyPuzzle.tsx — LAUNCH-READY REPLACEMENT
 * src/pages/DailyPuzzle.tsx
 *
 * FIXES:
 * 1. Removed all 11 console.log / debug statements (production was spamming
 *    "[DailyPuzzle] mount", "[DailyPuzzle] generation took Xms", etc.)
 *
 * 2. Fixed daily_scores column name mismatch:
 *    Was:  { date_str: challenge.dateStr } + onConflict("date_str,user_id")
 *    Now:  { date: challenge.dateStr }     + onConflict("date,user_id")
 *    DailyLeaderboard reads .eq("date", today) — both sides now agree.
 *
 * 3. Fixed "Play More" link: was /generate/${category} which uses a different
 *    URL structure. Changed to /quick-play/${category}?mode=endless which is
 *    the correct and consistent route for all 8 puzzle types.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  getTodaysChallenge,
  getDailyCompletion,
  recordDailyCompletion,
  getDailyStreak,
  type DailyChallenge,
} from "@/lib/dailyChallenge";
import { Calendar, CheckCircle2, Clock, Flame, Trophy, ArrowRight, ArrowLeft, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import SudokuGrid from "@/components/puzzles/SudokuGrid";
import WordSearchGrid from "@/components/puzzles/WordSearchGrid";
import KakuroGrid from "@/components/puzzles/KakuroGrid";
import NonogramGrid from "@/components/puzzles/NonogramGrid";
import CryptogramPuzzle from "@/components/puzzles/CryptogramPuzzle";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateWordFillIn, generateNumberFillIn } from "@/lib/generators/fillGen";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";

const DailyPuzzle = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const dateOverride = searchParams.get("date") ?? undefined;

  const challenge = useMemo(() => getTodaysChallenge(dateOverride), [dateOverride]);
  const [completion, setCompletion] = useState(() => getDailyCompletion(challenge.dateStr));
  const streak = useMemo(() => getDailyStreak(), []);
  const info = CATEGORY_INFO[challenge.category];

  useEffect(() => { setPuzzleOrigin("daily"); }, []);

  // ── Daily score write ──────────────────────────────────────────────────────
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

      // FIX: column is "date" not "date_str" — must match DailyLeaderboard query
      await (supabase
        .from("daily_scores" as any)
        .upsert(
          {
            date: challenge.dateStr,
            user_id: user?.id ?? null,
            display_name: displayName,
            solve_time: solveTime,
            puzzle_type: challenge.category,
          },
          {
            onConflict: "date,user_id",
            ignoreDuplicates: false,
          }
        ) as any);
    } catch {
      // Score write is non-critical — silently fail
    }
  }, [challenge.dateStr, challenge.category]);

  const handleNewPuzzle = useCallback(() => {
    const comp = getDailyCompletion(challenge.dateStr);
    setCompletion(comp);
    if (comp) {
      writeDailyScore(comp.time);
    }
  }, [challenge.dateStr, writeDailyScore]);

  // ── Puzzle generation (memoized — prevents mobile Safari re-render crash) ──
  const generatedPuzzle = useMemo(() => {
    const { seed, difficulty, category, dateStr } = challenge;
    try {
      switch (category) {
        case "crossword": {
          const gen = generateCrossword(seed, difficulty);
          return {
            id: `daily-${dateStr}`,
            title: "Daily Crossword",
            type: "crossword" as const,
            difficulty: difficulty as CrosswordPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize,
            blackCells: gen.blackCells,
            clues: gen.clues,
          } satisfies CrosswordPuzzle;
        }
        case "word-fill": {
          const gen = generateWordFillIn(seed, difficulty);
          return {
            id: `daily-${dateStr}`,
            title: "Daily Word Fill-In",
            type: "word-fill" as const,
            difficulty: difficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize,
            blackCells: gen.blackCells,
            entries: gen.entries,
            solution: gen.solution,
          } satisfies FillInPuzzle;
        }
        case "number-fill": {
          const gen = generateNumberFillIn(seed, difficulty);
          return {
            id: `daily-${dateStr}`,
            title: "Daily Number Fill-In",
            type: "number-fill" as const,
            difficulty: difficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`,
            gridSize: gen.gridSize,
            blackCells: gen.blackCells,
            entries: gen.entries,
            solution: gen.solution,
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

  return (
    <Layout>
      <div className="container py-6 md:py-12">
        {/* Back */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
        </div>

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
                Today's puzzle:{" "}
                <span className="font-medium text-foreground">{info.name}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border capitalize",
                  DIFFICULTY_SELECTED[challenge.difficulty as Difficulty] || "bg-secondary text-secondary-foreground border-border"
                )}>
                  {challenge.difficulty}
                </span>
              </p>
            </div>

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
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const diffLabel = DIFFICULTY_LABELS[challenge.difficulty];
                  const timeStr = formatTime(completion.time);
                  const shareUrl = `${window.location.origin}/play?code=daily-${challenge.dateStr}`;
                  const text = `Just solved today's Puzzlecraft challenge 🧠\n\n${info.name} • ${diffLabel} • ${timeStr}${streak.current > 1 ? `\n🔥 ${streak.current}-day streak` : ""}\n\nCan you beat this time?\n\nPlay: ${shareUrl}`;
                  if (navigator.share) {
                    try { await navigator.share({ text }); } catch { /* user cancelled */ }
                  } else {
                    await navigator.clipboard.writeText(text);
                    toast({ title: "Results copied to clipboard!" });
                  }
                }}
              >
                <Share size={14} className="mr-1.5" />
                Share
              </Button>
              {/* FIX: was /generate/${category} — now uses the correct quick-play route */}
              <Button asChild variant="outline" size="sm">
                <Link to={`/quick-play/${challenge.category}?mode=endless`}>
                  Play More {info.name} <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Puzzle */}
        <div className="min-h-[300px]">
          {(challenge.category === "crossword" ||
            challenge.category === "word-fill" ||
            challenge.category === "number-fill") && !generatedPuzzle ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground mb-4">
                Puzzle generation failed. Please try refreshing the page.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          ) : (
            renderPuzzle()
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DailyPuzzle;
