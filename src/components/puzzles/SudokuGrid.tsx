import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateSudoku } from "@/lib/generators/sudoku";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import MobileNumberPad from "./MobileNumberPad";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import { saveProgress, loadProgress, clearProgress } from "@/lib/puzzleProgress";
import type { Difficulty } from "@/lib/puzzleTypes";
import type { PuzzlePerformance } from "@/lib/endlessDifficulty";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
  onSolve?: (perf: PuzzlePerformance) => void;
}

interface SudokuState {
  grid: (number | null)[][];
}

const SudokuGrid = ({ seed, difficulty, onNewPuzzle, onSolve }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateSudoku(seed, difficulty), [seed, difficulty]);
  const timerKey = `sudoku-${seed}-${difficulty}`;

  const saved = useMemo(() => loadProgress<SudokuState>(timerKey), [timerKey]);

  const [grid, setGrid] = useState(() =>
    saved?.state.grid ?? puzzle.grid.map((r) => [...r])
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<[number, number] | null>([0, 0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: "sudoku", difficulty, initialElapsed: saved?.elapsed ?? 0 });

  const isGiven = (r: number, c: number) => puzzle.grid[r][c] !== null;

  // Auto-save on grid changes
  useEffect(() => {
    if (!timer.isSolved) {
      saveProgress<SudokuState>(timerKey, { grid }, timer.elapsed);
    }
  }, [grid, timer.elapsed, timer.isSolved, timerKey]);

  useEffect(() => {
    containerRef.current?.focus();
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9;
      if (!isGiven(r, c)) { setActiveCell([r, c]); return; }
    }
  }, [seed, difficulty]);

  const enterNumber = useCallback((num: number) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    if (isGiven(r, c)) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = num;
      return next;
    });
    setErrors(new Set());
    for (let i = r * 9 + c + 1; i < 81; i++) {
      const nr = Math.floor(i / 9), nc = i % 9;
      if (!isGiven(nr, nc) && grid[nr][nc] === null) {
        setActiveCell([nr, nc]);
        return;
      }
    }
  }, [activeCell, timer.isSolved, grid, puzzle.grid]);

  const deleteCell = useCallback(() => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    if (isGiven(r, c)) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = null;
      return next;
    });
    setErrors(new Set());
    for (let i = r * 9 + c - 1; i >= 0; i--) {
      const nr = Math.floor(i / 9), nc = i % 9;
      if (!isGiven(nr, nc)) { setActiveCell([nr, nc]); return; }
    }
  }, [activeCell, timer.isSolved, puzzle.grid]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); if (r > 0) setActiveCell([r - 1, c]); break;
      case "ArrowDown": e.preventDefault(); if (r < 8) setActiveCell([r + 1, c]); break;
      case "ArrowLeft": e.preventDefault(); if (c > 0) setActiveCell([r, c - 1]); break;
      case "ArrowRight": e.preventDefault(); if (c < 8) setActiveCell([r, c + 1]); break;
      case "Tab": {
        e.preventDefault();
        const dir = e.shiftKey ? -1 : 1;
        let idx = r * 9 + c + dir;
        while (idx >= 0 && idx < 81) {
          const nr = Math.floor(idx / 9), nc = idx % 9;
          if (!isGiven(nr, nc)) { setActiveCell([nr, nc]); return; }
          idx += dir;
        }
        break;
      }
      case "Backspace":
      case "Delete":
        e.preventDefault();
        deleteCell();
        break;
      default: {
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault();
          enterNumber(parseInt(e.key));
        }
      }
    }
  }, [activeCell, timer.isSolved, grid, puzzle.grid, enterNumber, deleteCell]);

  const handleReset = () => {
    setGrid(puzzle.grid.map((r) => [...r]));
    setErrors(new Set());
    resetCount.current++;
    timer.reset();
    clearProgress(timerKey);
    containerRef.current?.focus();
  };

  const handleCheck = () => {
    checkCount.current++;
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === null) filled = false;
        else if (grid[r][c] !== puzzle.solution[r][c]) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size > 0) errorCheckCount.current++;
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve();
      clearProgress(timerKey);
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Puzzle solved correctly!" });
      onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far — fill in the rest." });
  };

  const getHighlightSet = (): Set<string> => {
    if (!activeCell) return new Set();
    const [ar, ac] = activeCell;
    const cells = new Set<string>();
    for (let i = 0; i < 9; i++) { cells.add(`${ar}-${i}`); cells.add(`${i}-${ac}`); }
    const br = Math.floor(ar / 3) * 3, bc = Math.floor(ac / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.add(`${br + i}-${bc + j}`);
    return cells;
  };

  const highlightSet = getHighlightSet();

  return (
    <div>
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} countdown={timer.countdown} onPause={timer.pause} onResume={timer.resume} />
      {!isMobile && (
        <p className="mb-2 text-xs text-muted-foreground">
          Arrow keys to move • 1–9 to enter • Delete to clear
        </p>
      )}
      <div className="max-w-full overflow-x-auto">
      <div
        ref={containerRef}
        tabIndex={0}
        className="inline-grid border-2 border-foreground outline-none"
        style={{ gridTemplateColumns: "repeat(9, 1fr)" }}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => {
            const given = isGiven(r, c);
            const hasError = errors.has(`${r}-${c}`);
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
            const isHighlighted = highlightSet.has(`${r}-${c}`);

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-8 h-8 sm:w-11 sm:h-11 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation active:animate-cell-pop",
                  c % 3 === 2 && c < 8 && "border-r-2 border-r-foreground",
                  r % 3 === 2 && r < 8 && "border-b-2 border-b-foreground",
                  hasError && "bg-puzzle-cell-error",
                  !hasError && isActive && "bg-puzzle-cell-active",
                  !hasError && !isActive && isHighlighted && "bg-puzzle-cell-highlight",
                  !hasError && !isActive && !isHighlighted && "bg-puzzle-cell"
                )}
                onClick={() => {
                  setActiveCell([r, c]);
                  if (isMobile) haptic();
                  if (!isMobile) containerRef.current?.focus();
                }}
              >
                <span className={cn("text-sm sm:text-lg font-semibold", given ? "text-foreground" : "text-primary")}>
                  {grid[r][c]?.toString() || ""}
                </span>
              </div>
            );
          })
        )}
      </div>
      </div>
      <MobileNumberPad
        visible={isMobile && !!activeCell && !timer.isSolved}
        onNumber={enterNumber}
        onDelete={deleteCell}
      />
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} puzzleCode={`sudoku-${seed}`} />
    </div>
  );
};

export default SudokuGrid;
