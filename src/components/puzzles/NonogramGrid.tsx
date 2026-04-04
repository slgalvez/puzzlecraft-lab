import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateNonogram } from "@/lib/generators/nonogram";
import PuzzleControls from "./PuzzleControls";
import { PuzzleHeader } from "./PuzzleHeader";
import { PuzzleToolbar } from "./PuzzleToolbar";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { usePuzzleSession } from "@/hooks/usePuzzleSession";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import { loadProgress, clearProgress } from "@/lib/puzzleProgress";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Difficulty } from "@/lib/puzzleTypes";
import type { PuzzlePerformance } from "@/lib/endlessDifficulty";

function computeLineClue(line: boolean[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell) count++;
    else if (count > 0) { clues.push(count); count = 0; }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}

function arrEq(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
  onSolve?: (perf: PuzzlePerformance) => void;
  timeLimit?: number;
  isEndless?: boolean;
  dailyCode?: string;
  showHints?: boolean;
  showReveal?: boolean;
  maxHints?: number | null;
}

type CellState = "empty" | "filled" | "marked";

interface NonogramState {
  grid: CellState[][];
}

const NonogramGrid = ({ seed, difficulty, onNewPuzzle, onSolve, timeLimit, isEndless, dailyCode, showHints = true, showReveal = true, maxHints }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateNonogram(seed, difficulty), [seed, difficulty]);
  const { rows, cols, solution, rowClues, colClues } = puzzle;
  const timerKey = `nonogram-${seed}-${difficulty}`;
  const session = usePuzzleSession({ puzzleType: "nonogram", difficulty, progressUnit: "rows" });

  const saved = useMemo(() => loadProgress<NonogramState>(timerKey), [timerKey]);

  const [grid, setGrid] = useState<CellState[][]>(() =>
    saved?.state.grid ?? Array.from({ length: rows }, () => Array(cols).fill("empty"))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [touchMode, setTouchMode] = useState<"fill" | "mark">("fill");
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);
  const hintCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: "nonogram", difficulty, initialElapsed: saved?.elapsed ?? 0, timeLimit });

  const maxRowClueLen = Math.max(...rowClues.map((c) => c.length));
  const maxColClueLen = Math.max(...colClues.map((c) => c.length));

  // Compute row/column completion: compare filled pattern against solution clues
  const completedRows = useMemo(() => {
    const set = new Set<number>();
    for (let r = 0; r < rows; r++) {
      const filledClue = computeLineClue(grid[r].map((s) => s === "filled"));
      if (arrEq(filledClue, rowClues[r])) set.add(r);
    }
    return set;
  }, [grid, rows, rowClues]);

  const completedCols = useMemo(() => {
    const set = new Set<number>();
    for (let c = 0; c < cols; c++) {
      const col = grid.map((row) => row[c] === "filled");
      const filledClue = computeLineClue(col);
      if (arrEq(filledClue, colClues[c])) set.add(c);
    }
    return set;
  }, [grid, cols, colClues]);

  const gridRef2 = useRef(grid);
  gridRef2.current = grid;
  const { status: saveStatus, debouncedSave } = useAutoSave<NonogramState>({
    puzzleKey: timerKey,
    getState: () => ({ grid: gridRef2.current }),
    getElapsed: () => timer.elapsed,
    disabled: timer.isSolved || isRevealed,
  });

  useEffect(() => { debouncedSave(); }, [grid, debouncedSave]);

  // Track progress: completed rows
  useEffect(() => {
    session.setProgress(completedRows.size, rows);
  }, [completedRows, rows, session]);

  useEffect(() => {
    setCursor([0, 0]);
    containerRef.current?.focus();
  }, [seed, difficulty]);

  const setCellState = (r: number, c: number, state: CellState) => {
    if (timer.isSolved || isRevealed) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = state;
      return next;
    });
    setErrors(new Set());
  };

  const handleCellTap = (r: number, c: number) => {
    if (timer.isSolved || isRevealed) return;
    setCursor([r, c]);
    if (isMobile) haptic();
    if (isMobile) {
      const current = grid[r][c];
      if (touchMode === "fill") {
        setCellState(r, c, current === "filled" ? "empty" : "filled");
      } else {
        setCellState(r, c, current === "marked" ? "empty" : "marked");
      }
    } else {
      const current = grid[r][c];
      setCellState(r, c, current === "empty" ? "filled" : current === "filled" ? "marked" : "empty");
    }
    if (!isMobile) containerRef.current?.focus();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (timer.isSolved || isRevealed) return;
    const [r, c] = cursor;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setCursor([Math.max(0, r - 1), c]); break;
      case "ArrowDown": e.preventDefault(); setCursor([Math.min(rows - 1, r + 1), c]); break;
      case "ArrowLeft": e.preventDefault(); setCursor([r, Math.max(0, c - 1)]); break;
      case "ArrowRight": e.preventDefault(); setCursor([r, Math.min(cols - 1, c + 1)]); break;
      case " ": e.preventDefault(); setCellState(r, c, grid[r][c] === "filled" ? "empty" : "filled"); break;
      case "x": case "X": e.preventDefault(); setCellState(r, c, grid[r][c] === "marked" ? "empty" : "marked"); break;
      case "Delete": case "Backspace": e.preventDefault(); setCellState(r, c, "empty"); break;
    }
  }, [cursor, timer.isSolved, isRevealed, grid, rows, cols]);

  const handleReset = () => {
    setGrid(Array.from({ length: rows }, () => Array(cols).fill("empty")));
    setErrors(new Set());
    setCursor([0, 0]);
    setIsRevealed(false);
    hintCount.current = 0;
    resetCount.current++;
    timer.reset();
    clearProgress(timerKey);
    containerRef.current?.focus();
  };

  const handleCheck = () => {
    checkCount.current++;
    const errs = new Set<string>();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const shouldBeFilled = solution[r][c];
        const isFilled = grid[r][c] === "filled";
        if (shouldBeFilled !== isFilled) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size > 0) { errorCheckCount.current++; session.recordMistake(); }
    if (errs.size === 0) {
      const { isNewBest } = timer.solve({ assisted: hintCount.current > 0, hintsUsed: hintCount.current, mistakesCount: errorCheckCount.current });
      clearProgress(timerKey);
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Nonogram solved correctly!" });
      onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
    } else
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
  };

  const handleHint = () => {
    if (timer.isSolved || isRevealed) return;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const shouldBeFilled = solution[r][c];
        const isFilled = grid[r][c] === "filled";
        if (shouldBeFilled !== isFilled) {
          setCellState(r, c, shouldBeFilled ? "filled" : "marked");
          setCursor([r, c]);
          hintCount.current++;
          toast({ title: "💡 Hint", description: `Revealed a cell. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
          return;
        }
      }
    }
    toast({ title: "No hints needed", description: "All cells are correct!" });
  };

  const handleReveal = () => {
    const revealedGrid: CellState[][] = solution.map((row) =>
      row.map((cell) => (cell ? "filled" : "marked"))
    );
    setGrid(revealedGrid);
    setErrors(new Set());
    setIsRevealed(true);
    timer.pause();
    clearProgress(timerKey);
  };

  // Sizing: use fixed pixel sizes for precise grid
  const isSmall = rows > 10;
  const cellPx = isMobile ? (isSmall ? 24 : 30) : (isSmall ? 28 : 36);
  const clueFontSize = isMobile ? (isSmall ? 9 : 11) : (isSmall ? 10 : 13);

  // Row clue column width: enough for the widest clue set
  const rowClueWidth = maxRowClueLen * (clueFontSize * 1.1 + 4) + 8;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none"
      onKeyDown={handleKeyDown}
    >
      <PuzzleHeader
        puzzleType="nonogram"
        difficulty={difficulty}
        elapsed={timer.elapsed}
        mistakes={session.mistakes}
        personalBest={session.personalBest}
        progressCurrent={session.progressCurrent}
        progressTotal={session.progressTotal}
        progressUnit={session.progressUnit}
      />

      {isMobile && !timer.isSolved && !isRevealed && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation",
              touchMode === "fill" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
            )}
            onClick={() => setTouchMode("fill")}
          >
            ■ Fill
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation",
              touchMode === "mark" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
            )}
            onClick={() => setTouchMode("mark")}
          >
            ✕ Mark
          </button>
        </div>
      )}

      {!isMobile && !timer.isSolved && !isRevealed && (
        <p className="mb-3 text-xs text-muted-foreground">
          Arrow keys to move · Space to fill · X to mark · Delete to clear
        </p>
      )}

      <div className="max-w-full overflow-x-auto pb-2">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `${rowClueWidth}px repeat(${cols}, ${cellPx}px)`,
            gridTemplateRows: `auto repeat(${rows}, ${cellPx}px)`,
            gap: 0,
          }}
        >
          {/* Top-left corner spacer */}
          <div style={{ gridColumn: 1, gridRow: 1 }} />

          {/* Column clues — each in its own grid column, perfectly aligned */}
          {colClues.map((clue, c) => (
            <div
              key={`col-clue-${c}`}
              className={cn(
                "flex flex-col items-center justify-end pb-1 gap-px",
                // subtle divider every 5 cols
                c % 5 === 0 && c > 0 && "border-l border-foreground/20"
              )}
              style={{
                gridColumn: c + 2,
                gridRow: 1,
                width: cellPx,
                fontSize: clueFontSize,
                lineHeight: 1.25,
                minHeight: maxColClueLen * (clueFontSize * 1.25 + 1),
              }}
            >
              {clue.map((n, i) => (
                <span
                  key={i}
                  className={cn(
                    "font-semibold tabular-nums text-center leading-tight transition-opacity duration-300",
                    completedCols.has(c) && !timer.isSolved && !isRevealed
                      ? "opacity-30 line-through decoration-1"
                      : cursor[1] === c && !timer.isSolved && !isRevealed
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {n}
                </span>
              ))}
            </div>
          ))}

          {/* Grid rows: row clues + cells */}
          {Array.from({ length: rows }, (_, r) => (
            <>
              {/* Row clue */}
              <div
                key={`row-clue-${r}`}
                className={cn(
                  "flex items-center justify-end gap-1 pr-2",
                  r % 5 === 0 && r > 0 && "border-t border-foreground/20"
                )}
                style={{
                  gridColumn: 1,
                  gridRow: r + 2,
                  height: cellPx,
                  fontSize: clueFontSize,
                }}
              >
                {rowClues[r].map((n, i) => (
                  <span
                    key={i}
                    className={cn(
                      "font-semibold tabular-nums transition-opacity duration-300",
                      completedRows.has(r) && !timer.isSolved && !isRevealed
                        ? "opacity-30 line-through decoration-1"
                        : cursor[0] === r && !timer.isSolved && !isRevealed
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>

              {/* Cells */}
              {Array.from({ length: cols }, (_, c) => {
                const state = grid[r][c];
                const hasError = errors.has(`${r}-${c}`);
                const isCursor = cursor[0] === r && cursor[1] === c;
                const isActiveRow = cursor[0] === r && !timer.isSolved && !isRevealed;
                const isActiveCol = cursor[1] === c && !timer.isSolved && !isRevealed;
                const isSolved = timer.isSolved || isRevealed;

                // Border classes for 5-cell dividers
                const borderRight = c % 5 === 4 && c < cols - 1;
                const borderBottom = r % 5 === 4 && r < rows - 1;
                const borderLeft = c % 5 === 0 && c > 0;
                const borderTop = r % 5 === 0 && r > 0;

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    className={cn(
                      "relative flex items-center justify-center select-none cursor-pointer touch-manipulation transition-colors duration-75",
                      // Solved state: clean image reveal
                      isSolved && state === "filled" && "bg-foreground",
                      isSolved && state !== "filled" && "bg-puzzle-cell",
                      // Playing state
                      !isSolved && hasError && "bg-puzzle-cell-error",
                      !isSolved && !hasError && state === "filled" && "bg-foreground",
                      !isSolved && !hasError && state === "empty" && (isActiveRow || isActiveCol ? "bg-puzzle-cell-highlight" : "bg-puzzle-cell"),
                      !isSolved && !hasError && state === "marked" && "bg-puzzle-cell",
                      // Hover
                      !isSolved && "hover:brightness-95 active:animate-cell-pop",
                      // Cursor ring
                      isCursor && !isSolved && "ring-2 ring-inset ring-primary z-10"
                    )}
                    style={{
                      gridColumn: c + 2,
                      gridRow: r + 2,
                      width: cellPx,
                      height: cellPx,
                      // Borders: thin default, thick every 5
                      borderTop: borderTop ? '2px solid hsl(var(--foreground) / 0.25)' : '1px solid hsl(var(--puzzle-border) / 0.5)',
                      borderLeft: borderLeft ? '2px solid hsl(var(--foreground) / 0.25)' : '1px solid hsl(var(--puzzle-border) / 0.5)',
                      borderRight: c === cols - 1 ? '1px solid hsl(var(--puzzle-border) / 0.5)' : borderRight ? '2px solid hsl(var(--foreground) / 0.25)' : undefined,
                      borderBottom: r === rows - 1 ? '1px solid hsl(var(--puzzle-border) / 0.5)' : borderBottom ? '2px solid hsl(var(--foreground) / 0.25)' : undefined,
                    }}
                    onClick={() => handleCellTap(r, c)}
                  >
                    {state === "marked" && !isSolved && (
                      <span
                        className="text-muted-foreground font-bold leading-none select-none"
                        style={{ fontSize: clueFontSize }}
                      >
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <PuzzleToolbar
        onHint={showHints ? handleHint : undefined}
        hintsRemaining={showHints && maxHints != null ? Math.max(0, maxHints - hintCount.current) : undefined}
        onCheck={handleCheck}
        onReveal={showReveal ? handleReveal : undefined}
      />
      <PuzzleControls
        onReset={handleReset}
        onNewPuzzle={onNewPuzzle}
        isRevealed={isRevealed}
        puzzleCode={dailyCode ?? `nonogram-${seed}`}
        solveData={{ isSolved: timer.isSolved, time: timer.elapsed, difficulty, isEndless, assisted: hintCount.current > 0, category: "nonogram", seed, dailyCode }}
        saveStatus={saveStatus}
      />
    </div>
  );
};

export default NonogramGrid;
