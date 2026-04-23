import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { CrosswordPuzzle, CrosswordClue } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import { PuzzleHeader } from "./PuzzleHeader";
import { PuzzleToolbar } from "./PuzzleToolbar";
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
  puzzle: CrosswordPuzzle;
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

interface CrosswordState {
  grid: string[][];
}

const CrosswordGrid = ({ puzzle, showControls, onNewPuzzle, onSolve, timeLimit, isEndless, dailyCode, showHints = true, showReveal = true, maxHints }: Props) => {
  const { gridSize, blackCells, clues } = puzzle;
  useKeyboardAvoidance();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const needsKeyboard = useNeedsKeyboardProxy();
  const timerKey = `crossword-${puzzle.id}`;
  const session = usePuzzleSession({ puzzleType: "crossword", difficulty: puzzle.difficulty as any, progressUnit: "words" });

  const saved = useMemo(() => loadProgress<CrosswordState>(timerKey), [timerKey]);

  const [grid, setGrid] = useState<string[][]>(
    () => {
      const savedGrid = saved?.state.grid;
      if (savedGrid && savedGrid.length === gridSize && savedGrid[0]?.length === gridSize) {
        return savedGrid;
      }
      return Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
    }
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [isRevealed, setIsRevealed] = useState(false);
  const [hintPhase, setHintPhase] = useState<"visible" | "exiting" | "hidden">("visible");
  const [correctCells, setCorrectCells] = useState<Set<string>>(new Set());
  const [recentlyEntered, setRecentlyEntered] = useState<Set<string>>(new Set());
  const [sweepCells, setSweepCells] = useState<Set<string>>(new Set());

  // Track every pending setTimeout so animation flags cannot leak across unmounts.
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);
  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
  }, []);

  // Derived: responsive cell base size — keeps large grids dense, small grids tappable
  const baseSize = gridSize >= 15 ? "w-[26px] h-[26px]" : "w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-12 lg:h-12";
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<MobileLetterInputHandle>(null);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);
  const hintCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: "crossword", difficulty: puzzle.difficulty, initialElapsed: saved?.elapsed ?? 0, timeLimit });

  const blacks = useMemo(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const isBlack = useCallback(
    (r: number, c: number) => blacks.has(`${r}-${c}`),
    [blacks]
  );

  const getCellNumber = (r: number, c: number) => {
    const clue = clues.find((cl) => cl.row === r && cl.col === c);
    return clue?.number;
  };

  const solutionGrid = useMemo(() => {
    const sg: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
    for (const clue of clues) {
      const dr = clue.direction === "down" ? 1 : 0;
      const dc = clue.direction === "across" ? 1 : 0;
      for (let i = 0; i < clue.answer.length; i++) {
        sg[clue.row + dr * i][clue.col + dc * i] = clue.answer[i];
      }
    }
    return sg;
  }, [clues, gridSize]);

  const activeClue = useMemo((): CrosswordClue | null => {
    if (!activeCell) return null;
    const [ar, ac] = activeCell;
    return clues.find((cl) => {
      if (cl.direction !== direction) return false;
      const dr = cl.direction === "down" ? 1 : 0;
      const dc = cl.direction === "across" ? 1 : 0;
      for (let i = 0; i < cl.answer.length; i++) {
        if (cl.row + dr * i === ar && cl.col + dc * i === ac) return true;
      }
      return false;
    }) ?? null;
  }, [activeCell, direction, clues]);

  const gridRef2 = useRef(grid);
  gridRef2.current = grid;
  const { status: saveStatus, debouncedSave } = useAutoSave<CrosswordState>({
    puzzleKey: timerKey,
    getState: () => ({ grid: gridRef2.current }),
    getElapsed: () => timer.elapsed,
    disabled: timer.isSolved || isRevealed,
  });

  useEffect(() => { debouncedSave(); }, [grid, debouncedSave]);

  // Track progress: count completed words (all cells in a clue filled correctly)
  useEffect(() => {
    const totalWords = clues.length;
    let completedWords = 0;
    for (const clue of clues) {
      const dr = clue.direction === "down" ? 1 : 0;
      const dc = clue.direction === "across" ? 1 : 0;
      let allCorrect = true;
      for (let i = 0; i < clue.answer.length; i++) {
        if (grid[clue.row + dr * i]?.[clue.col + dc * i] !== clue.answer[i]) { allCorrect = false; break; }
      }
      if (allCorrect) completedWords++;
    }
    session.setProgress(completedWords, totalWords);
  }, [grid, clues, session.setProgress]);

  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          if (!needsKeyboard) containerRef.current?.focus();
          return;
        }
  }, [puzzle.id]);

  const getHighlightedCells = useCallback((): Set<string> => {
    if (!activeCell) return new Set();
    const [ar, ac] = activeCell;
    const cells = new Set<string>();
    if (direction === "across") {
      for (let c = 0; c < gridSize; c++) {
        if (!isBlack(ar, c)) cells.add(`${ar}-${c}`);
        else if (c > ac) break;
        else if (c < ac) cells.clear();
      }
    } else {
      for (let r = 0; r < gridSize; r++) {
        if (!isBlack(r, ac)) cells.add(`${r}-${ac}`);
        else if (r > ar) break;
        else if (r < ar) cells.clear();
      }
    }
    return cells;
  }, [activeCell, direction, gridSize, blacks]);

  const highlighted = getHighlightedCells();

  const moveToNext = useCallback((r: number, c: number) => {
    if (direction === "across") {
      const nc = c + 1;
      if (nc < gridSize && !isBlack(r, nc)) { setActiveCell([r, nc]); }
    } else {
      const nr = r + 1;
      if (nr < gridSize && !isBlack(nr, c)) { setActiveCell([nr, c]); }
    }
  }, [direction, gridSize, blacks]);

  const moveToPrev = useCallback((r: number, c: number) => {
    if (direction === "across") {
      const nc = c - 1;
      if (nc >= 0 && !isBlack(r, nc)) { setActiveCell([r, nc]); }
    } else {
      const nr = r - 1;
      if (nr >= 0 && !isBlack(nr, c)) { setActiveCell([nr, c]); }
    }
  }, [direction, gridSize, blacks]);

  const findNextWord = (reverse: boolean) => {
    const wordStarts: [number, number, "across" | "down"][] = [];
    for (const cl of clues) wordStarts.push([cl.row, cl.col, cl.direction]);
    wordStarts.sort((a, b) => a[0] * gridSize + a[1] - (b[0] * gridSize + b[1]));
    if (!activeCell) {
      if (wordStarts.length > 0) {
        const w = reverse ? wordStarts[wordStarts.length - 1] : wordStarts[0];
        setActiveCell([w[0], w[1]]); setDirection(w[2]);
      }
      return;
    }
    const [ar, ac] = activeCell;
    const currentIdx = ar * gridSize + ac;
    if (reverse) {
      for (let i = wordStarts.length - 1; i >= 0; i--) {
        const idx = wordStarts[i][0] * gridSize + wordStarts[i][1];
        if (idx < currentIdx || (idx === currentIdx && wordStarts[i][2] !== direction)) {
          setActiveCell([wordStarts[i][0], wordStarts[i][1]]); setDirection(wordStarts[i][2]); return;
        }
      }
      const w = wordStarts[wordStarts.length - 1];
      setActiveCell([w[0], w[1]]); setDirection(w[2]);
    } else {
      for (const ws of wordStarts) {
        const idx = ws[0] * gridSize + ws[1];
        if (idx > currentIdx || (idx === currentIdx && ws[2] !== direction)) {
          setActiveCell([ws[0], ws[1]]); setDirection(ws[2]); return;
        }
      }
      const w = wordStarts[0];
      setActiveCell([w[0], w[1]]); setDirection(w[2]);
    }
  };

  const enterLetter = useCallback((letter: string) => {
    if (!activeCell || timer.isSolved || isRevealed) return;
    const [r, c] = activeCell;
    const key = `${r}-${c}`;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = letter.toUpperCase();
      return next;
    });
    setErrors(new Set());
    // Entry pop — transient, single-shot, cleared after the animation duration.
    setRecentlyEntered((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    scheduleTimeout(() => {
      setRecentlyEntered((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 130);
    moveToNext(r, c);
  }, [activeCell, timer.isSolved, isRevealed, moveToNext, scheduleTimeout]);

  const deleteLetter = useCallback(() => {
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
      moveToPrev(r, c);
    }
  }, [activeCell, timer.isSolved, isRevealed, grid, moveToPrev]);

  const clearActiveCell = useCallback(() => {
    if (!activeCell || timer.isSolved || isRevealed) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = "";
      return next;
    });
    setErrors(new Set());
    setCorrectCells((prev) => {
      const next = new Set(prev);
      next.delete(`${r}-${c}`);
      return next;
    });
  }, [activeCell, timer.isSolved, isRevealed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // One-shot hint-chip exit: only triggers on the first keypress in "visible" phase.
    if (hintPhase === "visible") {
      setHintPhase("exiting");
      scheduleTimeout(() => setHintPhase("hidden"), 150);
    }
    if (!activeCell || timer.isSolved || isRevealed) return;
    const [r, c] = activeCell;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (direction === "across") { setDirection("down"); } else {
          const nr = r - 1;
          if (nr >= 0 && !isBlack(nr, c)) setActiveCell([nr, c]);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (direction === "across") { setDirection("down"); } else {
          const nr = r + 1;
          if (nr < gridSize && !isBlack(nr, c)) setActiveCell([nr, c]);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (direction === "down") { setDirection("across"); } else {
          const nc = c - 1;
          if (nc >= 0 && !isBlack(r, nc)) setActiveCell([r, nc]);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (direction === "down") { setDirection("across"); } else {
          const nc = c + 1;
          if (nc < gridSize && !isBlack(r, nc)) setActiveCell([r, nc]);
        }
        break;
      case "Tab": e.preventDefault(); findNextWord(e.shiftKey); break;
      case "Backspace": case "Delete": e.preventDefault(); deleteLetter(); break;
      default: {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) { e.preventDefault(); enterLetter(letter); }
      }
    }
  }, [activeCell, direction, timer.isSolved, isRevealed, grid, gridSize, blacks, clues, enterLetter, deleteLetter, hintPhase, scheduleTimeout]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (needsKeyboard) haptic();
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
    if (needsKeyboard) {
      mobileInputRef.current?.focus();
    } else {
      containerRef.current?.focus();
    }
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setErrors(new Set());
    setIsRevealed(false);
    setCorrectCells(new Set());
    hintCount.current = 0;
    resetCount.current++;
    timer.reset();
    clearProgress(timerKey);
    if (!needsKeyboard) containerRef.current?.focus();
  };

  const handleCheck = () => {
    checkCount.current++;
    const errs = new Set<string>();
    const correct = new Set<string>();
    let filled = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c)) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (solutionGrid[r][c] && grid[r][c] !== solutionGrid[r][c]) errs.add(`${r}-${c}`);
        else if (solutionGrid[r][c] && grid[r][c] === solutionGrid[r][c]) correct.add(`${r}-${c}`);
      }
    }

    // Check-gated sweep: cells that belong to a newly fully-correct word and weren't already in correctCells.
    const sweep = new Set<string>();
    for (const clue of clues) {
      const dr = clue.direction === "down" ? 1 : 0;
      const dc = clue.direction === "across" ? 1 : 0;
      let allCorrect = true;
      const wordKeys: string[] = [];
      for (let i = 0; i < clue.answer.length; i++) {
        const wr = clue.row + dr * i;
        const wc = clue.col + dc * i;
        const k = `${wr}-${wc}`;
        wordKeys.push(k);
        if (!correct.has(k)) { allCorrect = false; break; }
      }
      if (allCorrect && wordKeys.some((k) => !correctCells.has(k))) {
        wordKeys.forEach((k) => sweep.add(k));
      }
    }

    setErrors(errs);
    setCorrectCells(correct);
    if (sweep.size > 0) {
      setSweepCells(sweep);
      haptic(15);
      scheduleTimeout(() => setSweepCells(new Set()), 240);
    }
    if (errs.size > 0) { errorCheckCount.current++; session.recordMistake(); }
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve({ assisted: hintCount.current > 0, hintsUsed: hintCount.current, mistakesCount: errorCheckCount.current });
      clearProgress(timerKey);
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Crossword solved correctly!" });
      onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  const handleHint = () => {
    if (timer.isSolved || isRevealed) return;
    // Try active clue cells first
    if (activeCell) {
      const highlightedArr = Array.from(highlighted);
      for (const key of highlightedArr) {
        const [r, c] = key.split("-").map(Number);
        if (solutionGrid[r][c] && grid[r][c] !== solutionGrid[r][c]) {
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = solutionGrid[r][c];
            return next;
          });
          setErrors(new Set());
          setActiveCell([r, c]);
          hintCount.current++;
          toast({ title: "💡 Hint", description: `Revealed a letter. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
          return;
        }
      }
    }
    // Fallback: any cell
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c)) continue;
        if (solutionGrid[r][c] && grid[r][c] !== solutionGrid[r][c]) {
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = solutionGrid[r][c];
            return next;
          });
          setErrors(new Set());
          setActiveCell([r, c]);
          hintCount.current++;
          toast({ title: "💡 Hint", description: `Revealed a letter. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
          return;
        }
      }
    }
    toast({ title: "No hints needed", description: "All cells are correct!" });
  };

  const handleReveal = () => {
    setGrid(solutionGrid.map((r) => [...r]));
    setErrors(new Set());
    setIsRevealed(true);
    timer.pause();
    clearProgress(timerKey);
  };

  const acrossClues = clues.filter((c) => c.direction === "across");
  const downClues = clues.filter((c) => c.direction === "down");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10 scroll-mt-4 puzzle-keyboard-aware">
      <div className="flex-shrink-0 [overscroll-behavior:contain]">
        <PuzzleHeader
          puzzleType="crossword"
          difficulty={puzzle.difficulty as any}
          elapsed={timer.elapsed}
          mistakes={session.mistakes}
          personalBest={session.personalBest}
          progressCurrent={session.progressCurrent}
          progressTotal={session.progressTotal}
          progressUnit={session.progressUnit}
        />

        {/* Active clue + direction toggle — sticky on mobile, visible on all viewports */}
        {activeCell && !timer.isSolved && !isRevealed && (
          <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/85 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDirection("across")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors touch-manipulation",
                  direction === "across" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={direction === "across"}
              >
                Across
              </button>
              <button
                type="button"
                onClick={() => setDirection("down")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors touch-manipulation",
                  direction === "down" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={direction === "down"}
              >
                Down
              </button>
              {activeClue && (
                <span className="rounded-full bg-secondary/40 px-3 py-1 text-sm leading-snug max-w-full truncate">
                  <span className="font-semibold text-primary mr-1.5">
                    {activeClue.number}{activeClue.direction === "across" ? "A" : "D"}
                  </span>
                  <span className="text-foreground">{activeClue.clue}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desktop keyboard hint chips — show on first load, hide after first keypress */}
        {!needsKeyboard && hintsVisible && (
          <div className="mb-2 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5">
              <kbd className="font-mono">← →</kbd> Move
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5">
              <kbd className="font-mono">Tab</kbd> Next
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5">
              <kbd className="font-mono">Click</kbd> Toggle
            </span>
          </div>
        )}

        <div className="max-w-full overflow-x-auto">
          <MobileLetterInput
            ref={mobileInputRef}
            active={needsKeyboard && !!activeCell && !timer.isSolved && !isRevealed}
            onLetter={enterLetter}
            onDelete={deleteLetter}
          />
        <div
          ref={containerRef}
          tabIndex={0}
          className="inline-grid border-2 border-puzzle-border outline-none"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          onKeyDown={handleKeyDown}
          aria-label={activeCell ? `Row ${activeCell[0] + 1} Column ${activeCell[1] + 1}, ${direction === "across" ? "Across" : "Down"}` : "Crossword grid"}
        >
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const black = isBlack(r, c);
              const num = getCellNumber(r, c);
              const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
              const isHighlighted = highlighted.has(`${r}-${c}`);
              const hasError = errors.has(`${r}-${c}`);
              const isCorrect = correctCells.has(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation active:animate-cell-pop",
                    baseSize,
                    isActive && "scroll-mt-24",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isHighlighted && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isHighlighted && "bg-puzzle-cell",
                    !black && isCorrect && !isActive && "opacity-85"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {num && !black && (
                    <span className="absolute left-0.5 top-0 text-[7px] sm:text-[8px] md:text-[9px] font-medium text-puzzle-number leading-tight">{num}</span>
                  )}
                  {!black && (
                    <span className={cn("font-semibold text-foreground uppercase", gridSize >= 15 ? "text-xs" : "text-xs sm:text-sm md:text-lg lg:text-xl")}>{grid[r][c]}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* Clues — mobile: inline before controls; desktop: side column */}
        {isMobile && (
          <div className="grid gap-4 grid-cols-2 mt-4">
            <div>
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Across</h3>
              <ul className="space-y-1 text-sm">
                {acrossClues.map((cl) => (
                  <li key={`a-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Down</h3>
              <ul className="space-y-1 text-sm">
                {downClues.map((cl) => (
                  <li key={`d-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {showControls && onNewPuzzle && (
          <>
            <PuzzleToolbar
              onHint={showHints ? handleHint : undefined}
              hintsRemaining={showHints && maxHints != null ? Math.max(0, maxHints - hintCount.current) : undefined}
              onCheck={handleCheck}
              onErase={clearActiveCell}
              onReveal={showReveal ? handleReveal : undefined}
            />
            <PuzzleControls
              onReset={handleReset}
              onNewPuzzle={onNewPuzzle}
              isRevealed={isRevealed}
              puzzleCode={dailyCode ?? puzzle.id}
              solveData={{ isSolved: timer.isSolved, time: timer.elapsed, difficulty: puzzle.difficulty as any, isEndless, assisted: hintCount.current > 0, category: "crossword", seed: parseInt(puzzle.id.replace(/\D/g, "")) || 0, dailyCode }}
              saveStatus={saveStatus}
            />
          </>
        )}
      </div>

      {/* Clues — desktop only: side column */}
      {!isMobile && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-xs lg:pt-[108px] lg:self-start">
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Across</h3>
            <ul className="space-y-1 text-sm">
              {acrossClues.map((cl) => (
                <li key={`a-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Down</h3>
            <ul className="space-y-1 text-sm">
              {downClues.map((cl) => (
                <li key={`d-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrosswordGrid;
