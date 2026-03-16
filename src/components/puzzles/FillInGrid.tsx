import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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

type Direction = "across" | "down";

interface EntrySlot {
  cells: [number, number][];
  direction: Direction;
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
  const [direction, setDirection] = useState<Direction>("across");
  const [usedEntries, setUsedEntries] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `fillin-${puzzle.id}`;
  const timer = usePuzzleTimer(timerKey, { category: puzzle.type as "word-fill" | "number-fill", difficulty: puzzle.difficulty });

  const blacks = useMemo(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const isBlack = useCallback((r: number, c: number) => blacks.has(`${r}-${c}`), [blacks]);

  // Compute all entry slots (contiguous runs of white cells, length >= 2)
  const entrySlots = useMemo(() => {
    const slots: EntrySlot[] = [];
    // Across entries
    for (let r = 0; r < gridSize; r++) {
      let start = -1;
      for (let c = 0; c <= gridSize; c++) {
        if (c < gridSize && !blacks.has(`${r}-${c}`)) {
          if (start === -1) start = c;
        } else {
          if (start !== -1 && c - start >= 2) {
            const cells: [number, number][] = [];
            for (let cc = start; cc < c; cc++) cells.push([r, cc]);
            slots.push({ cells, direction: "across" });
          }
          start = -1;
        }
      }
    }
    // Down entries
    for (let c = 0; c < gridSize; c++) {
      let start = -1;
      for (let r = 0; r <= gridSize; r++) {
        if (r < gridSize && !blacks.has(`${r}-${c}`)) {
          if (start === -1) start = r;
        } else {
          if (start !== -1 && r - start >= 2) {
            const cells: [number, number][] = [];
            for (let rr = start; rr < r; rr++) cells.push([rr, c]);
            slots.push({ cells, direction: "down" });
          }
          start = -1;
        }
      }
    }
    return slots;
  }, [gridSize, blacks]);

  // Build lookup: cell key -> entry slots it belongs to
  const cellToSlots = useMemo(() => {
    const map = new Map<string, EntrySlot[]>();
    for (const slot of entrySlots) {
      for (const [r, c] of slot.cells) {
        const key = `${r}-${c}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(slot);
      }
    }
    return map;
  }, [entrySlots]);

  // Get the active entry slot for the current cell + direction
  const getActiveSlot = useCallback((r: number, c: number, dir: Direction): EntrySlot | null => {
    const key = `${r}-${c}`;
    const slots = cellToSlots.get(key);
    if (!slots || slots.length === 0) return null;
    // Prefer the slot matching the requested direction
    const match = slots.find(s => s.direction === dir);
    if (match) return match;
    // Fall back to any available slot
    return slots[0];
  }, [cellToSlots]);

  // Get cells in the active entry for highlighting
  const activeEntryCells = useMemo(() => {
    if (!activeCell) return new Set<string>();
    const slot = getActiveSlot(activeCell[0], activeCell[1], direction);
    if (!slot) return new Set<string>();
    return new Set(slot.cells.map(([r, c]) => `${r}-${c}`));
  }, [activeCell, direction, getActiveSlot]);

  // Check if a cell belongs to any slot in a given direction
  const cellHasDirection = useCallback((r: number, c: number, dir: Direction): boolean => {
    const slots = cellToSlots.get(`${r}-${c}`);
    return slots ? slots.some(s => s.direction === dir) : false;
  }, [cellToSlots]);

  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          setDirection("across");
          if (!isMobile) containerRef.current?.focus();
          return;
        }
  }, [puzzle.id]);

  const enterChar = useCallback((char: string) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = char;
      return next;
    });
    setErrors(new Set());

    // Auto-advance within the active entry slot
    const slot = getActiveSlot(r, c, direction);
    if (slot) {
      const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
      if (idx !== -1 && idx < slot.cells.length - 1) {
        setActiveCell(slot.cells[idx + 1]);
      }
      // Stop at end of entry - don't advance further
    }
  }, [activeCell, timer.isSolved, direction, getActiveSlot]);

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
      // Move backward within the active entry slot
      const slot = getActiveSlot(r, c, direction);
      if (slot) {
        const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
        if (idx > 0) {
          setActiveCell(slot.cells[idx - 1]);
        }
      }
    }
  }, [activeCell, timer.isSolved, grid, direction, getActiveSlot]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        for (let nr = r - 1; nr >= 0; nr--) if (!isBlack(nr, c)) { setActiveCell([nr, c]); setDirection("down"); return; }
        break;
      case "ArrowDown":
        e.preventDefault();
        for (let nr = r + 1; nr < gridSize; nr++) if (!isBlack(nr, c)) { setActiveCell([nr, c]); setDirection("down"); return; }
        break;
      case "ArrowLeft":
        e.preventDefault();
        for (let nc = c - 1; nc >= 0; nc--) if (!isBlack(r, nc)) { setActiveCell([r, nc]); setDirection("across"); return; }
        break;
      case "ArrowRight":
        e.preventDefault();
        for (let nc = c + 1; nc < gridSize; nc++) if (!isBlack(r, nc)) { setActiveCell([r, nc]); setDirection("across"); return; }
        break;
      case "Tab": {
        e.preventDefault();
        // Move to the next/previous entry slot
        const currentSlot = getActiveSlot(r, c, direction);
        if (currentSlot) {
          const currentIdx = entrySlots.indexOf(currentSlot);
          const nextIdx = e.shiftKey
            ? (currentIdx - 1 + entrySlots.length) % entrySlots.length
            : (currentIdx + 1) % entrySlots.length;
          const nextSlot = entrySlots[nextIdx];
          setActiveCell(nextSlot.cells[0]);
          setDirection(nextSlot.direction);
        }
        break;
      }
      case "Backspace":
      case "Delete":
        e.preventDefault();
        deleteChar();
        break;
      default: {
        const char = isNumbers
          ? (/^[0-9]$/.test(e.key) ? e.key : "")
          : (/^[a-zA-Z]$/.test(e.key) ? e.key.toUpperCase() : "");
        if (char) { e.preventDefault(); enterChar(char); }
      }
    }
  }, [activeCell, timer.isSolved, gridSize, isNumbers, enterChar, deleteChar, isBlack, direction, getActiveSlot, entrySlots]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      // Re-tap same cell: toggle direction if this cell belongs to both directions
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && hasDown) {
        setDirection(prev => prev === "across" ? "down" : "across");
      }
    } else {
      setActiveCell([r, c]);
      // Pick the best direction for this cell
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && hasDown) {
        // Keep current direction if available, otherwise switch
        // (direction state persists)
      } else if (hasAcross) {
        setDirection("across");
      } else if (hasDown) {
        setDirection("down");
      }
    }
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
    setDirection("across");
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
            Arrow keys to move • Type to fill • Delete to clear • Tap same cell to toggle direction
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

        <div className="max-w-full overflow-x-auto">
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
              const isInActiveEntry = activeEntryCells.has(`${r}-${c}`);
              const hasError = errors.has(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isInActiveEntry && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isInActiveEntry && "bg-puzzle-cell"
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
