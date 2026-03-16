import { useState, useRef, useEffect, useCallback } from "react";
import type { FillInPuzzle } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import MobileNumberPad from "./MobileNumberPad";
import MobileLetterInput from "./MobileLetterInput";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  puzzle: FillInPuzzle;
  showControls?: boolean;
  onNewPuzzle?: () => void;
}

const FillInGrid = ({ puzzle, showControls, onNewPuzzle }: Props) => {
  const { gridSize, blackCells, entries, type, solution } = puzzle;
  const isNumbers = type === "number-fill";
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [usedEntries, setUsedEntries] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `fillin-${puzzle.id}`;
  const timer = usePuzzleTimer(timerKey, { category: puzzle.type as "word-fill" | "number-fill", difficulty: puzzle.difficulty });

  const blackSet = useCallback(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const blacks = blackSet();
  const isBlack = (r: number, c: number) => blacks.has(`${r}-${c}`);

  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          if (!isMobile) containerRef.current?.focus();
          return;
        }
  }, [puzzle.id]);

  const findNextWhite = (r: number, c: number, dir: number): [number, number] | null => {
    let idx = r * gridSize + c + dir;
    while (idx >= 0 && idx < gridSize * gridSize) {
      const nr = Math.floor(idx / gridSize), nc = idx % gridSize;
      if (!isBlack(nr, nc)) return [nr, nc];
      idx += dir;
    }
    return null;
  };

  const enterChar = useCallback((char: string) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = char;
      return next;
    });
    setErrors(new Set());
    // Auto-advance
    for (let nc = c + 1; nc < gridSize; nc++) {
      if (!isBlack(r, nc) && !grid[r][nc]) { setActiveCell([r, nc]); return; }
    }
    const next = findNextWhite(r, c, 1);
    if (next) setActiveCell(next);
  }, [activeCell, timer.isSolved, grid, gridSize, blacks]);

  const deleteChar = useCallback(() => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    if (grid[r][c]) {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = "";
        return next;
      });
      setErrors(new Set());
    } else {
      const prev = findNextWhite(r, c, -1);
      if (prev) setActiveCell(prev);
    }
  }, [activeCell, timer.isSolved, grid, gridSize, blacks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); for (let nr = r - 1; nr >= 0; nr--) if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; } break;
      case "ArrowDown": e.preventDefault(); for (let nr = r + 1; nr < gridSize; nr++) if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; } break;
      case "ArrowLeft": e.preventDefault(); for (let nc = c - 1; nc >= 0; nc--) if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; } break;
      case "ArrowRight": e.preventDefault(); for (let nc = c + 1; nc < gridSize; nc++) if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; } break;
      case "Tab": { e.preventDefault(); const next = findNextWhite(r, c, e.shiftKey ? -1 : 1); if (next) setActiveCell(next); break; }
      case "Backspace": case "Delete": e.preventDefault(); deleteChar(); break;
      default: {
        const char = isNumbers
          ? (/^[0-9]$/.test(e.key) ? e.key : "")
          : (/^[a-zA-Z]$/.test(e.key) ? e.key.toUpperCase() : "");
        if (char) { e.preventDefault(); enterChar(char); }
      }
    }
  }, [activeCell, timer.isSolved, grid, gridSize, blacks, isNumbers, enterChar, deleteChar]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    setActiveCell([r, c]);
    if (!isMobile) containerRef.current?.focus();
  };

  const toggleEntry = (entry: string) => {
    setUsedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entry)) next.delete(entry); else next.add(entry);
      return next;
    });
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setUsedEntries(new Set());
    setErrors(new Set());
    timer.reset();
    if (!isMobile) containerRef.current?.focus();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || solution[r][c] === null) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (grid[r][c] !== solution[r][c]) errs.add(`${r}-${c}`);
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
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
        {!isMobile && (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move • Type to fill • Delete to clear
          </p>
        )}

        {isNumbers ? (
          <MobileNumberPad
            visible={isMobile && !!activeCell && !timer.isSolved}
            onNumber={(n) => enterChar(n.toString())}
            onDelete={deleteChar}
          />
        ) : (
          <MobileLetterInput
            active={isMobile && !!activeCell && !timer.isSolved}
            onLetter={enterChar}
            onDelete={deleteChar}
          />
        )}

        <div
          ref={containerRef}
          tabIndex={0}
          className="inline-grid border-2 border-puzzle-border outline-none"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          onKeyDown={handleKeyDown}
        >
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const black = isBlack(r, c);
              const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
              const hasError = errors.has(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {!black && (
                    <span className="text-lg sm:text-xl font-semibold text-foreground uppercase">{grid[r][c]}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        {showControls && onNewPuzzle && (
          <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
        )}
      </div>

      <div className="lg:max-w-xs">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {isNumbers ? "Numbers to Place" : "Words to Place"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <button
              key={entry}
              onClick={() => toggleEntry(entry)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation",
                usedEntries.has(entry)
                  ? "border-primary/30 bg-primary/10 text-primary line-through"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FillInGrid;
