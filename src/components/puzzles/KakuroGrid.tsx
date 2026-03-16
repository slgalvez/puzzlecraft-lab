import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateKakuro } from "@/lib/generators/kakuro";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import MobileNumberPad from "./MobileNumberPad";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

type Direction = "across" | "down";

interface EntrySlot {
  cells: [number, number][];
  direction: Direction;
}

const KakuroGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateKakuro(seed, difficulty), [seed, difficulty]);
  const { size, isBlack, solution, clues } = puzzle;

  const [grid, setGrid] = useState(() =>
    Array.from({ length: size }, () => Array(size).fill(""))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `kakuro-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "kakuro", difficulty });

  const clueMap = useMemo(() => {
    const map = new Map<string, { across?: number; down?: number }>();
    for (const c of clues) map.set(`${c.row}-${c.col}`, { across: c.across, down: c.down });
    return map;
  }, [clues]);

  // Compute entry slots (contiguous runs of white cells)
  const entrySlots = useMemo(() => {
    const slots: EntrySlot[] = [];
    // Across
    for (let r = 0; r < size; r++) {
      let start = -1;
      for (let c = 0; c <= size; c++) {
        if (c < size && !isBlack[r][c]) {
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
    // Down
    for (let c = 0; c < size; c++) {
      let start = -1;
      for (let r = 0; r <= size; r++) {
        if (r < size && !isBlack[r][c]) {
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
  }, [size, isBlack]);

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

  const getActiveSlot = useCallback((r: number, c: number, dir: Direction): EntrySlot | null => {
    const slots = cellToSlots.get(`${r}-${c}`);
    if (!slots || slots.length === 0) return null;
    return slots.find(s => s.direction === dir) || slots[0];
  }, [cellToSlots]);

  const activeEntryCells = useMemo(() => {
    if (!activeCell) return new Set<string>();
    const slot = getActiveSlot(activeCell[0], activeCell[1], direction);
    if (!slot) return new Set<string>();
    return new Set(slot.cells.map(([r, c]) => `${r}-${c}`));
  }, [activeCell, direction, getActiveSlot]);

  const cellHasDirection = useCallback((r: number, c: number, dir: Direction): boolean => {
    const slots = cellToSlots.get(`${r}-${c}`);
    return slots ? slots.some(s => s.direction === dir) : false;
  }, [cellToSlots]);

  useEffect(() => {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (!isBlack[r][c]) { setActiveCell([r, c]); setDirection("across"); containerRef.current?.focus(); return; }
  }, [seed, difficulty]);

  const enterNumber = useCallback((num: number) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = num.toString();
      return next;
    });
    setErrors(new Set());
    // Auto-advance within entry
    const slot = getActiveSlot(r, c, direction);
    if (slot) {
      const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
      if (idx !== -1 && idx < slot.cells.length - 1) {
        setActiveCell(slot.cells[idx + 1]);
      }
    }
  }, [activeCell, timer.isSolved, direction, getActiveSlot]);

  const deleteCell = useCallback(() => {
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
      // Move backward within entry
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
        for (let nr = r - 1; nr >= 0; nr--) if (!isBlack[nr][c]) { setActiveCell([nr, c]); setDirection("down"); return; }
        break;
      case "ArrowDown":
        e.preventDefault();
        for (let nr = r + 1; nr < size; nr++) if (!isBlack[nr][c]) { setActiveCell([nr, c]); setDirection("down"); return; }
        break;
      case "ArrowLeft":
        e.preventDefault();
        for (let nc = c - 1; nc >= 0; nc--) if (!isBlack[r][nc]) { setActiveCell([r, nc]); setDirection("across"); return; }
        break;
      case "ArrowRight":
        e.preventDefault();
        for (let nc = c + 1; nc < size; nc++) if (!isBlack[r][nc]) { setActiveCell([r, nc]); setDirection("across"); return; }
        break;
      case "Tab": {
        e.preventDefault();
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
      case "Backspace": case "Delete": e.preventDefault(); deleteCell(); break;
      default: { if (/^[1-9]$/.test(e.key)) { e.preventDefault(); enterNumber(parseInt(e.key)); } }
    }
  }, [activeCell, timer.isSolved, size, isBlack, enterNumber, deleteCell, direction, getActiveSlot, entrySlots]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack[r][c]) return;
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && hasDown) {
        setDirection(prev => prev === "across" ? "down" : "across");
      }
    } else {
      setActiveCell([r, c]);
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && hasDown) {
        // keep current direction
      } else if (hasAcross) {
        setDirection("across");
      } else if (hasDown) {
        setDirection("down");
      }
    }
    if (!isMobile) containerRef.current?.focus();
  };

  const handleReset = () => {
    setGrid(Array.from({ length: size }, () => Array(size).fill("")));
    setErrors(new Set());
    setDirection("across");
    timer.reset();
    containerRef.current?.focus();
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
      {!isMobile && (
        <p className="mb-2 text-xs text-muted-foreground">
          Arrow keys to move • 1–9 to enter • Delete to clear • Tap same cell to toggle direction
        </p>
      )}
      <div
        ref={containerRef}
        tabIndex={0}
        className="inline-grid border-2 border-foreground outline-none"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const black = isBlack[r][c];
            const clue = clueMap.get(`${r}-${c}`);
            const hasError = errors.has(`${r}-${c}`);
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
            const isInActiveEntry = activeEntryCells.has(`${r}-${c}`);

            if (black) {
              return (
                <div key={`${r}-${c}`} className="relative w-10 h-10 sm:w-12 sm:h-12 bg-puzzle-cell-black border border-puzzle-border overflow-hidden">
                  {clue && (
                    <>
                      <div className="absolute inset-0" style={{
                        background: (clue.across && clue.down)
                          ? "linear-gradient(to top right, transparent calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% + 0.5px), transparent calc(50% + 0.5px))"
                          : undefined,
                      }} />
                      {clue.down != null && <span className="absolute top-0.5 right-1 text-[9px] font-bold text-primary-foreground/90">{clue.down}</span>}
                      {clue.across != null && <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-primary-foreground/90">{clue.across}</span>}
                    </>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation",
                  hasError && "bg-puzzle-cell-error",
                  !hasError && isActive && "bg-puzzle-cell-active",
                  !hasError && !isActive && isInActiveEntry && "bg-puzzle-cell-highlight",
                  !hasError && !isActive && !isInActiveEntry && "bg-puzzle-cell"
                )}
                onClick={() => handleCellClick(r, c)}
              >
                <span className="text-lg sm:text-xl font-semibold text-foreground">{grid[r][c]}</span>
              </div>
            );
          })
        )}
      </div>
      <MobileNumberPad
        visible={isMobile && !!activeCell && !timer.isSolved}
        onNumber={enterNumber}
        onDelete={deleteCell}
      />
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default KakuroGrid;
