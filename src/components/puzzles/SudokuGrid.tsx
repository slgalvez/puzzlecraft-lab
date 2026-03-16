import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { generateSudoku } from "@/lib/generators/sudoku";
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

const SudokuGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const puzzle = useMemo(() => generateSudoku(seed, difficulty), [seed, difficulty]);
  const [grid, setGrid] = useState(() => puzzle.grid.map((r) => [...r]));
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: 9 }, () => Array(9).fill(null))
  );

  const timerKey = `sudoku-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey);

  const isGiven = (r: number, c: number) => puzzle.grid[r][c] !== null;

  const handleInput = (r: number, c: number, value: string) => {
    if (isGiven(r, c) || timer.isSolved) return;
    const digit = value.replace(/[^1-9]/g, "").slice(-1);
    const num = digit ? parseInt(digit) : null;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = num;
      return next;
    });
    setErrors(new Set());
    if (num) {
      const nextCell = findNextEmpty(r, c);
      if (nextCell) inputRefs.current[nextCell[0]][nextCell[1]]?.focus();
    }
  };

  const findNextEmpty = (r: number, c: number): [number, number] | null => {
    for (let i = r * 9 + c + 1; i < 81; i++) {
      const nr = Math.floor(i / 9), nc = i % 9;
      if (!isGiven(nr, nc) && grid[nr][nc] === null) return [nr, nc];
    }
    return null;
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !grid[r][c] && !isGiven(r, c)) {
      for (let i = r * 9 + c - 1; i >= 0; i--) {
        const nr = Math.floor(i / 9), nc = i % 9;
        if (!isGiven(nr, nc)) {
          inputRefs.current[nr][nc]?.focus();
          return;
        }
      }
    }
  };

  const handleReset = () => {
    setGrid(puzzle.grid.map((r) => [...r]));
    setErrors(new Set());
    timer.reset();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === null) filled = false;
        else if (grid[r][c] !== puzzle.solution[r][c]) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Puzzle solved correctly!" });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far — fill in the rest." });
  };

  return (
    <div>
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
      <div
        className="inline-grid border-2 border-foreground"
        style={{ gridTemplateColumns: "repeat(9, 1fr)" }}
      >
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => {
            const given = isGiven(r, c);
            const hasError = errors.has(`${r}-${c}`);
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-9 h-9 sm:w-11 sm:h-11 border border-puzzle-border",
                  c % 3 === 2 && c < 8 && "border-r-2 border-r-foreground",
                  r % 3 === 2 && r < 8 && "border-b-2 border-b-foreground",
                  hasError && "bg-puzzle-cell-error",
                  !hasError && isActive && "bg-puzzle-cell-active",
                  !hasError && !isActive && "bg-puzzle-cell"
                )}
                onClick={() => {
                  if (!given) inputRefs.current[r][c]?.focus();
                  setActiveCell([r, c]);
                }}
              >
                <input
                  ref={(el) => { inputRefs.current[r][c] = el; }}
                  className={cn(
                    "absolute inset-0 w-full h-full bg-transparent text-center text-sm sm:text-lg font-semibold outline-none caret-transparent",
                    given ? "text-foreground" : "text-primary",
                    given && "pointer-events-none"
                  )}
                  value={grid[r][c]?.toString() || ""}
                  readOnly={given}
                  onChange={(e) => handleInput(r, c, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(r, c, e)}
                  onFocus={() => setActiveCell([r, c])}
                  inputMode="numeric"
                  maxLength={1}
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

export default SudokuGrid;
