import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { generateKakuro } from "@/lib/generators/kakuro";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

const KakuroGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const puzzle = useMemo(() => generateKakuro(seed, difficulty), [seed, difficulty]);
  const { size, isBlack, solution, clues } = puzzle;

  const [grid, setGrid] = useState(() =>
    Array.from({ length: size }, () => Array(size).fill(""))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: size }, () => Array(size).fill(null))
  );

  const timerKey = `kakuro-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "kakuro", difficulty });

  const clueMap = useMemo(() => {
    const map = new Map<string, { across?: number; down?: number }>();
    for (const c of clues) map.set(`${c.row}-${c.col}`, { across: c.across, down: c.down });
    return map;
  }, [clues]);

  const handleInput = (r: number, c: number, value: string) => {
    if (timer.isSolved) return;
    const digit = value.replace(/[^1-9]/g, "").slice(-1);
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = digit;
      return next;
    });
    setErrors(new Set());
  };

  const handleReset = () => {
    setGrid(Array.from({ length: size }, () => Array(size).fill("")));
    setErrors(new Set());
    timer.reset();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isBlack[r][c]) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (parseInt(grid[r][c]) !== solution[r][c]) errs.add(`${r}-${c}`);
      }
    }
    setErrors(errs);
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Puzzle solved correctly!" });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  return (
    <div>
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
      <div
        className="inline-grid border-2 border-foreground"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const black = isBlack[r][c];
            const clue = clueMap.get(`${r}-${c}`);
            const hasError = errors.has(`${r}-${c}`);

            if (black) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="relative w-10 h-10 sm:w-12 sm:h-12 bg-puzzle-cell-black border border-puzzle-border overflow-hidden"
                >
                  {clue && (
                    <>
                      <div
                        className="absolute inset-0"
                        style={{
                          background: (clue.across && clue.down)
                            ? "linear-gradient(to top right, transparent calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% + 0.5px), transparent calc(50% + 0.5px))"
                            : undefined,
                        }}
                      />
                      {clue.down != null && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-primary-foreground/90">
                          {clue.down}
                        </span>
                      )}
                      {clue.across != null && (
                        <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-primary-foreground/90">
                          {clue.across}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border",
                  hasError ? "bg-puzzle-cell-error" : "bg-puzzle-cell"
                )}
              >
                <input
                  ref={(el) => { inputRefs.current[r][c] = el; }}
                  className="absolute inset-0 w-full h-full bg-transparent text-center text-lg sm:text-xl font-semibold text-foreground outline-none caret-transparent"
                  value={grid[r][c]}
                  maxLength={1}
                  inputMode="numeric"
                  onChange={(e) => handleInput(r, c, e.target.value)}
                  onFocus={() => setErrors(new Set())}
                />
              </div>
            );
          })
        )}
      </div>
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default KakuroGrid;
