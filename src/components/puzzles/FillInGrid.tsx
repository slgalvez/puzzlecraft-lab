import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import GroupedEntryList from "./GroupedEntryList";
import type { FillInPuzzle } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import { PuzzleHeader } from "./PuzzleHeader";
import { PuzzleToolbar } from "./PuzzleToolbar";
import MobileNumberPad from "./MobileNumberPad";
import MobileLetterInput from "./MobileLetterInput";
import type { MobileLetterInputHandle } from "./MobileLetterInput";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { usePuzzleSession } from "@/hooks/usePuzzleSession";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNeedsKeyboardProxy } from "@/hooks/use-tablet";
import { haptic } from "@/lib/haptic";
import { loadProgress, clearProgress } from "@/lib/puzzleProgress";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { PuzzlePerformance } from "@/lib/endlessDifficulty";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";

interface Props {
  puzzle: FillInPuzzle;
  showControls?: boolean;
  onNewPuzzle?: () => void;
  onSolve?: (perf: PuzzlePerformance) => void;
  timeLimit?: number;
  isEndless?: boolean;
  dailyCode?: string;
  showHints?: boolean;
  showReveal?: boolean;
  maxHints?: number | null;
}

type Direction = "across" | "down";

interface EntrySlot {
  cells: [number, number][];
  direction: Direction;
}

interface FillInState {
  grid: string[][];
  usedEntries: string[];
}

const FillInGrid = ({ puzzle, showControls, onNewPuzzle, onSolve, timeLimit, isEndless, dailyCode, showHints = true, showReveal = true, maxHints }: Props) => {
  const { gridSize, blackCells, entries, type, solution } = puzzle;
  const isNumbers = type === "number-fill";
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const needsKeyboard = useNeedsKeyboardProxy();
  useKeyboardAvoidance();
  const timerKey = `fillin-${puzzle.id}`;
  const session = usePuzzleSession({ puzzleType: puzzle.type as any, difficulty: puzzle.difficulty as any, progressUnit: isNumbers ? "entries" : "words" });

  const saved = useMemo(() => loadProgress<FillInState>(timerKey), [timerKey]);

  const [grid, setGrid] = useState<string[][]>(
    () => saved?.state.grid ?? Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const [usedEntries, setUsedEntries] = useState<Set<string>>(
    () => saved?.state.usedEntries ? new Set(saved.state.usedEntries) : new Set()
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [isRevealed, setIsRevealed] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(true);
  const [correctCells, setCorrectCells] = useState<Set<string>>(new Set());

  // Derived: responsive cell base size — keeps large grids dense, small grids tappable
  const baseSize = gridSize >= 15 ? "w-[26px] h-[26px]" : "w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-12 lg:h-12";
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<MobileLetterInputHandle>(null);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);
  const hintCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: puzzle.type as "word-fill" | "number-fill", difficulty: puzzle.difficulty, initialElapsed: saved?.elapsed ?? 0, timeLimit });

  const gridRef2 = useRef(grid);
  gridRef2.current = grid;
  const usedRef = useRef(usedEntries);
  usedRef.current = usedEntries;
  const { status: saveStatus, debouncedSave } = useAutoSave<FillInState>({
    puzzleKey: timerKey,
    getState: () => ({
      grid: gridRef2.current,
      usedEntries: Array.from(usedRef.current),
    }),
    getElapsed: () => timer.elapsed,
    disabled: timer.isSolved || isRevealed,
  });


  useEffect(() => { debouncedSave(); }, [grid, usedEntries, debouncedSave]);

  const blacks = useMemo(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const isBlack = useCallback((r: number, c: number) => blacks.has(`${r}-${c}`), [blacks]);

  const entrySlots = useMemo(() => {
    const slots: EntrySlot[] = [];
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

  // Track progress: filled entry slots
  useEffect(() => {
    let filledSlots = 0;
    for (const slot of entrySlots) {
      if (slot.cells.every(([r, c]) => grid[r]?.[c])) filledSlots++;
    }
    session.setProgress(filledSlots, entrySlots.length);
  }, [grid, entrySlots, session.setProgress]);

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
    const key = `${r}-${c}`;
    const slots = cellToSlots.get(key);
    if (!slots || slots.length === 0) return null;
    const match = slots.find(s => s.direction === dir);
    if (match) return match;
    return slots[0];
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
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          setDirection("across");
          if (!needsKeyboard) containerRef.current?.focus();
          return;
        }
  }, [puzzle.id]);

  const enterChar = useCallback((char: string) => {
    if (!activeCell || timer.isSolved || isRevealed) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = char;
      return next;
    });
    setErrors(new Set());
    const slot = getActiveSlot(r, c, direction);
    if (slot) {
      const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
      if (idx !== -1 && idx < slot.cells.length - 1) {
        setActiveCell(slot.cells[idx + 1]);
      }
    }
  }, [activeCell, timer.isSolved, isRevealed, direction, getActiveSlot]);

  const deleteChar = useCallback(() => {
    if (!activeCell || timer.isSolved || isRevealed) return;
    const [r, c] = activeCell;
    if (grid[r][c]) {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = "";
        return next;
      });
      setErrors(new Set());
    } else {
      const slot = getActiveSlot(r, c, direction);
      if (slot) {
        const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
        if (idx > 0) {
          setActiveCell(slot.cells[idx - 1]);
        }
      }
    }
  }, [activeCell, timer.isSolved, isRevealed, grid, direction, getActiveSlot]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved || isRevealed) return;
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
  }, [activeCell, timer.isSolved, isRevealed, gridSize, isNumbers, enterChar, deleteChar, isBlack, direction, getActiveSlot, entrySlots]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (needsKeyboard) haptic();
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
        // Keep current direction
      } else if (hasAcross) {
        setDirection("across");
      } else if (hasDown) {
        setDirection("down");
      }
    }
    if (needsKeyboard) {
      mobileInputRef.current?.focus();
    } else {
      containerRef.current?.focus();
    }
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
    setIsRevealed(false);
    hintCount.current = 0;
    resetCount.current++;
    timer.reset();
    clearProgress(timerKey);
    if (!needsKeyboard) containerRef.current?.focus();
  };

  const handleCheck = () => {
    checkCount.current++;
    const errs = new Set<string>();
    let filled = true;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || solution[r][c] === null) continue;
        if (!grid[r][c]) { filled = false; }
      }
    }

    if (filled) {
      const slotWords = entrySlots.map((slot) =>
        slot.cells.map(([r, c]) => grid[r][c]).join("")
      );
      const entryCounts = new Map<string, number>();
      for (const e of entries) entryCounts.set(e, (entryCounts.get(e) || 0) + 1);

      const usedCounts = new Map<string, number>();
      const badSlots: EntrySlot[] = [];

      for (let i = 0; i < entrySlots.length; i++) {
        const word = slotWords[i];
        const available = entryCounts.get(word) || 0;
        const used = usedCounts.get(word) || 0;
        if (available > 0 && used < available) {
          usedCounts.set(word, used + 1);
        } else {
          badSlots.push(entrySlots[i]);
        }
      }

      if (badSlots.length === 0) {
        const { isNewBest } = timer.solve({ assisted: hintCount.current > 0, hintsUsed: hintCount.current, mistakesCount: errorCheckCount.current });
        clearProgress(timerKey);
        toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Puzzle solved correctly!" });
        onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
      } else {
        for (const slot of badSlots) {
          for (const [r, c] of slot.cells) errs.add(`${r}-${c}`);
        }
        setErrors(errs);
        errorCheckCount.current++;
        toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
      }
    } else {
      for (const slot of entrySlots) {
        const word = slot.cells.map(([r, c]) => grid[r][c]).join("");
        const allFilled = slot.cells.every(([r, c]) => grid[r][c]);
        if (allFilled && !entries.includes(word)) {
          for (const [r, c] of slot.cells) errs.add(`${r}-${c}`);
        }
      }
      setErrors(errs);
      if (errs.size > 0) {
        errorCheckCount.current++;
        session.recordMistake();
        toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
      } else {
        toast({ title: "Keep going!", description: "No errors so far." });
      }
    }
  };

  const handleHint = () => {
    if (timer.isSolved || isRevealed) return;
    // Prefer crossing cells (cells in 2+ slots)
    for (const [key, slots] of cellToSlots.entries()) {
      if (slots.length < 2) continue;
      const [r, c] = key.split("-").map(Number);
      if (solution[r][c] && grid[r][c] !== solution[r][c]) {
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = solution[r][c]!;
          return next;
        });
        setErrors(new Set());
        setActiveCell([r, c]);
        hintCount.current++;
        toast({ title: "💡 Hint", description: `Revealed a ${isNumbers ? "digit" : "letter"}. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
        return;
      }
    }
    // Fallback: any cell
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || solution[r][c] === null) continue;
        if (grid[r][c] !== solution[r][c]) {
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = solution[r][c]!;
            return next;
          });
          setErrors(new Set());
          setActiveCell([r, c]);
          hintCount.current++;
          toast({ title: "💡 Hint", description: `Revealed a ${isNumbers ? "digit" : "letter"}. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
          return;
        }
      }
    }
    toast({ title: "No hints needed", description: "All cells are correct!" });
  };

  const handleReveal = () => {
    const revealedGrid = solution.map((r) => r.map((v) => v ?? ""));
    setGrid(revealedGrid);
    setErrors(new Set());
    setIsRevealed(true);
    timer.pause();
    clearProgress(timerKey);
  };

  return (
    <div
      className="flex flex-col gap-6 lg:flex-row lg:gap-10 puzzle-keyboard-aware scroll-mt-4"
      style={{ touchAction: isMobile ? "none" : "auto" }}
    >
      <div className="flex-shrink-0">
        <PuzzleHeader
          puzzleType={puzzle.type as any}
          difficulty={puzzle.difficulty as any}
          elapsed={timer.elapsed}
          mistakes={session.mistakes}
          personalBest={session.personalBest}
          progressCurrent={session.progressCurrent}
          progressTotal={session.progressTotal}
          progressUnit={session.progressUnit}
        />
        {!needsKeyboard && (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move • Type to fill • Delete to clear • Tap same cell to toggle direction
          </p>
        )}

        {isMobile && !timer.isSolved && !isRevealed && (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {entrySlots.filter(s => s.cells.every(([r, c]) => grid[r]?.[c])).length}
              </span>
              /{entrySlots.length} slots filled
            </span>
            {usedEntries.size > 0 && (
              <span className="text-primary font-medium">{usedEntries.size} word{usedEntries.size !== 1 ? "s" : ""} checked off</span>
            )}
          </div>
        )}

        {!isNumbers && (
          <MobileLetterInput
            ref={mobileInputRef}
            active={needsKeyboard && !!activeCell && !timer.isSolved && !isRevealed}
            onLetter={enterChar}
            onDelete={deleteChar}
          />
        )}

        <div className="max-w-full overflow-x-auto [overscroll-behavior:contain] scroll-mt-4">
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
                    "relative w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-12 lg:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation active:animate-cell-pop",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isInActiveEntry && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isInActiveEntry && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {!black && (
                    <span className="text-xs sm:text-sm md:text-lg lg:text-xl font-semibold text-foreground uppercase">{grid[r][c]}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
        {isNumbers && (
          <MobileNumberPad
            visible={needsKeyboard && !!activeCell && !timer.isSolved && !isRevealed}
            onNumber={(n) => enterChar(n.toString())}
            onDelete={deleteChar}
          />
        )}

        {/* Entry list — mobile: inline before controls */}
        {isMobile && (
          <div className="mt-4">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {isNumbers ? "Numbers to Place" : "Words to Place"}
            </h3>
            <GroupedEntryList
              entries={entries}
              isNumbers={isNumbers}
              interactive
              usedEntries={usedEntries}
              onToggle={toggleEntry}
            />
          </div>
        )}

        {showControls && onNewPuzzle && (
          <>
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
              puzzleCode={dailyCode ?? puzzle.id}
              solveData={{ isSolved: timer.isSolved, time: timer.elapsed, difficulty: puzzle.difficulty as any, isEndless, assisted: hintCount.current > 0, category: puzzle.type as any, seed: parseInt(puzzle.id.replace(/\D/g, "")) || 0, dailyCode }}
              saveStatus={saveStatus}
            />
          </>
        )}
      </div>

      {/* Entry list — desktop only: side column */}
      {!isMobile && (
        <div className="lg:max-w-xs lg:pt-[108px] lg:self-start">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {isNumbers ? "Numbers to Place" : "Words to Place"}
          </h3>
          <GroupedEntryList
            entries={entries}
            isNumbers={isNumbers}
            interactive
            usedEntries={usedEntries}
            onToggle={toggleEntry}
          />
        </div>
      )}
    </div>
  );
};

export default FillInGrid;
