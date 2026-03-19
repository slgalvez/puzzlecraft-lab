import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { ArrowLeft, Infinity, Trophy, Clock, Target, TrendingUp, TrendingDown, Minus, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { saveEndlessSession } from "@/lib/endlessHistory";

export interface EndlessSolveRecord {
  type: PuzzleCategory;
  difficulty: Difficulty;
  elapsed: number;
  diffChange: "up" | "down" | "stay";
}

interface Props {
  solves: EndlessSolveRecord[];
  diffMap: Record<PuzzleCategory, Difficulty>;
  onPlayAgain: () => void;
}

const EndlessSummary = ({ solves, diffMap, onPlayAgain }: Props) => {
  const savedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Save session to localStorage on first render
  useEffect(() => {
    if (savedRef.current || solves.length === 0) return;
    savedRef.current = true;

    const totalTime = solves.reduce((sum, s) => sum + s.elapsed, 0);
    const fastestSolve = Math.min(...solves.map((s) => s.elapsed));
    const typesPlayed = [...new Set(solves.map((s) => s.type))];

    // Only persist types whose difficulty changed
    const finalDifficulties: Partial<Record<PuzzleCategory, Difficulty>> = {};
    for (const t of typesPlayed) {
      finalDifficulties[t] = diffMap[t];
    }

    saveEndlessSession({
      totalSolved: solves.length,
      totalTime,
      fastestSolve,
      typesPlayed,
      solves: solves.map((s) => ({
        type: s.type,
        difficulty: s.difficulty,
        elapsed: s.elapsed,
        diffChange: s.diffChange,
      })),
      finalDifficulties,
    });
  }, [solves, diffMap]);

  const totalTime = solves.reduce((sum, s) => sum + s.elapsed, 0);
  const avgTime = solves.length > 0 ? Math.round(totalTime / solves.length) : 0;
  const fastestSolve = solves.length > 0 ? Math.min(...solves.map((s) => s.elapsed)) : 0;

  // Group solves by type
  const byType = new Map<PuzzleCategory, EndlessSolveRecord[]>();
  for (const s of solves) {
    if (!byType.has(s.type)) byType.set(s.type, []);
    byType.get(s.type)!.push(s);
  }

  // Types that changed from starting "medium"
  const changedTypes = Object.entries(diffMap).filter(
    ([, d]) => d !== "medium"
  ) as [PuzzleCategory, Difficulty][];

  return (
    <Layout>
      <div className={cn(
        "container py-10 md:py-16 max-w-2xl transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.97]"
      )}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Infinity size={20} className="text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-primary">Session Complete</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Endless Mode Summary
          </h1>
          <p className="mt-2 text-muted-foreground">
            {solves.length === 0
              ? "No puzzles were completed this session."
              : `You solved ${solves.length} puzzle${solves.length !== 1 ? "s" : ""} across ${byType.size} type${byType.size !== 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* Stats grid */}
        {solves.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="rounded-xl border bg-card p-4 text-center">
              <Target className="mx-auto h-5 w-5 text-primary mb-2" />
              <p className="font-mono text-2xl font-bold text-foreground">{solves.length}</p>
              <p className="text-xs text-muted-foreground">Solved</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-primary mb-2" />
              <p className="font-mono text-2xl font-bold text-foreground">{formatTime(totalTime)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <Trophy className="mx-auto h-5 w-5 text-primary mb-2" />
              <p className="font-mono text-2xl font-bold text-foreground">{formatTime(fastestSolve)}</p>
              <p className="text-xs text-muted-foreground">Fastest</p>
            </div>
          </div>
        )}

        {/* Per-type breakdown */}
        {solves.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Puzzle Breakdown</h2>
            <div className="space-y-3">
              {Array.from(byType.entries()).map(([pType, records]) => {
                const typeAvg = Math.round(records.reduce((s, r) => s + r.elapsed, 0) / records.length);
                const ups = records.filter((r) => r.diffChange === "up").length;
                const downs = records.filter((r) => r.diffChange === "down").length;
                const currentDiff = diffMap[pType];

                return (
                  <div key={pType} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <PuzzleIcon type={pType} size={20} className="text-foreground" />
                        <span className="font-medium text-foreground">{CATEGORY_INFO[pType].name}</span>
                        <span className="text-xs text-muted-foreground">×{records.length}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                        {DIFFICULTY_LABELS[currentDiff]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Avg: {formatTime(typeAvg)}</span>
                      {ups > 0 && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <TrendingUp size={10} /> {ups} up
                        </span>
                      )}
                      {downs > 0 && (
                        <span className="flex items-center gap-0.5 text-destructive">
                          <TrendingDown size={10} /> {downs} down
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Difficulty progression */}
        {changedTypes.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Difficulty Progression</h2>
            <p className="text-sm text-muted-foreground mb-3">Types that moved from the starting Medium difficulty:</p>
            <div className="flex flex-wrap gap-2">
              {changedTypes.map(([pType, diff]) => {
                const diffIdx = ["easy", "medium", "hard", "extreme", "insane"].indexOf(diff);
                const startIdx = 1; // medium
                const isUp = diffIdx > startIdx;
                return (
                  <div key={pType} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs">
                    <PuzzleIcon type={pType as PuzzleCategory} size={12} className="text-foreground" />
                    <span className="font-medium text-foreground">{CATEGORY_INFO[pType as PuzzleCategory].name}</span>
                    {isUp ? <TrendingUp size={10} className="text-primary" /> : <TrendingDown size={10} className="text-destructive" />}
                    <span className="capitalize text-muted-foreground">{DIFFICULTY_LABELS[diff]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={onPlayAgain} className="gap-1.5">
            <RotateCcw size={16} /> New Puzzle
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">
              <ArrowLeft size={16} /> Home
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default EndlessSummary;
