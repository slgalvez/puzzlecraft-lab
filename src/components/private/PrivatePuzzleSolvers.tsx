/**
 * Private puzzle inline solvers — styled and interaction-matched
 * to the main Puzzlecraft site puzzle components.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import GroupedEntryList from "@/components/puzzles/GroupedEntryList";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Lightbulb, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileLetterInput from "@/components/puzzles/MobileLetterInput";
import type { MobileLetterInputHandle } from "@/components/puzzles/MobileLetterInput";

// ─── Types ───

type Direction = "across" | "down";
interface EntrySlot { cells: [number, number][]; direction: Direction; }

// ─── Grid Solver (Word Fill-In / Crossword) ───

interface GridSolverProps {
  data: Record<string, unknown>;
  puzzleType: "word-fill" | "crossword";
  onComplete: () => void;
  savedState?: { grid: string[][] } | null;
  onSaveProgress?: (state: { grid: string[][] }) => void;
  showHints?: boolean;
  showReveal?: boolean;
  showCheck?: boolean;
}

export function GridSolver({ data, puzzleType, onComplete, savedState, onSaveProgress, showHints = true, showReveal = false, showCheck = true }: GridSolverProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const solution = (data.solution as (string | null)[][]) || null;
  const clues = (data.clues as { number: number; clue: string; answer: string; row: number; col: number; direction: string }[]) || [];
  const entries = (data.entries as string[]) || [];

  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<MobileLetterInputHandle>(null);
  const [grid, setGrid] = useState<string[][]>(() => {
    if (savedState?.grid) return savedState.grid;
    return Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
  });
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [usedEntries, setUsedEntries] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);

  const blacks = useMemo(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const isBlack = useCallback((r: number, c: number) => blacks.has(`${r}-${c}`), [blacks]);

  // Listen for save-progress event from parent
  useEffect(() => {
    const handler = () => {
      onSaveProgress?.({ grid });
    };
    window.addEventListener("save-puzzle-progress", handler);
    return () => window.removeEventListener("save-puzzle-progress", handler);
  }, [grid, onSaveProgress]);

  // Build solution map for crossword from clues
  const solutionMap = useMemo(() => {
    if (solution) return solution;
    const map: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    for (const c of clues) {
      const dr = c.direction === "down" ? 1 : 0;
      const dc = c.direction === "across" ? 1 : 0;
      for (let i = 0; i < c.answer.length; i++) {
        map[c.row + dr * i][c.col + dc * i] = c.answer[i];
      }
    }
    return map;
  }, [solution, clues, gridSize]);

  // Compute entry slots (contiguous white runs >= 2)
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

  // Cell numbering for crossword
  const cellNumbers = useMemo(() => {
    if (puzzleType !== "crossword") return new Map<string, number>();
    const nums = new Map<string, number>();
    let num = 1;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (blacks.has(`${r}-${c}`)) continue;
        const startsAcross = (c === 0 || blacks.has(`${r}-${c - 1}`)) && c + 1 < gridSize && !blacks.has(`${r}-${c + 1}`);
        const startsDown = (r === 0 || blacks.has(`${r - 1}-${c}`)) && r + 1 < gridSize && !blacks.has(`${r + 1}-${c}`);
        if (startsAcross || startsDown) nums.set(`${r}-${c}`, num++);
      }
    }
    return nums;
  }, [gridSize, blacks, puzzleType]);

  // Initialize active cell
  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          setDirection("across");
          if (!isMobile) containerRef.current?.focus();
          return;
        }
  }, [gridSize]);

  const checkCompletion = useCallback((newGrid: string[][]) => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || !solutionMap[r]?.[c]) continue;
        if (newGrid[r][c] !== solutionMap[r][c]) return;
      }
    setSolved(true);
    onComplete();
  }, [gridSize, isBlack, solutionMap, onComplete]);

  const enterChar = useCallback((char: string) => {
    if (!activeCell || solved) return;
    const [r, c] = activeCell;
    const upper = char.toUpperCase();
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = upper;
      checkCompletion(next);
      return next;
    });
    setErrors(new Set());
    // Auto-advance within active entry slot
    const slot = getActiveSlot(r, c, direction);
    if (slot) {
      const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
      if (idx !== -1 && idx < slot.cells.length - 1) {
        setActiveCell(slot.cells[idx + 1]);
      }
    }
  }, [activeCell, solved, direction, getActiveSlot, checkCompletion]);

  const deleteChar = useCallback(() => {
    if (!activeCell || solved) return;
    const [r, c] = activeCell;
    if (grid[r][c]) {
      setGrid(prev => {
        const next = prev.map(row => [...row]);
        next[r][c] = "";
        return next;
      });
      setErrors(new Set());
    } else {
      const slot = getActiveSlot(r, c, direction);
      if (slot) {
        const idx = slot.cells.findIndex(([cr, cc]) => cr === r && cc === c);
        if (idx > 0) setActiveCell(slot.cells[idx - 1]);
      }
    }
  }, [activeCell, solved, grid, direction, getActiveSlot]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || solved) return;
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
        if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          enterChar(e.key.toUpperCase());
        }
      }
    }
  }, [activeCell, solved, gridSize, isBlack, direction, enterChar, deleteChar, getActiveSlot, entrySlots]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c) || solved) return;
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && hasDown) setDirection(prev => prev === "across" ? "down" : "across");
    } else {
      setActiveCell([r, c]);
      const hasAcross = cellHasDirection(r, c, "across");
      const hasDown = cellHasDirection(r, c, "down");
      if (hasAcross && !hasDown) setDirection("across");
      else if (hasDown && !hasAcross) setDirection("down");
    }
    if (isMobile) {
      mobileInputRef.current?.focus();
    } else {
      containerRef.current?.focus();
    }
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setErrors(new Set());
    setUsedEntries(new Set());
    setSolved(false);
    if (!isMobile) containerRef.current?.focus();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || !solutionMap[r]?.[c]) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (grid[r][c] !== solutionMap[r][c]) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size === 0 && filled) {
      setSolved(true);
      onComplete();
    }
  };

  const handleHint = () => {
    if (solved) return;
    // Find first empty or wrong cell
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || !solutionMap[r]?.[c]) continue;
        if (grid[r][c] !== solutionMap[r][c]) {
          setGrid(prev => {
            const next = prev.map(row => [...row]);
            next[r][c] = solutionMap[r][c]!;
            checkCompletion(next);
            return next;
          });
          toast({ title: "Hint revealed" });
          return;
        }
      }
  };

  const handleReveal = () => {
    if (solved) return;
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++)
          if (!isBlack(r, c) && solutionMap[r]?.[c]) next[r][c] = solutionMap[r][c]!;
      return next;
    });
    setSolved(true);
    onComplete();
    toast({ title: "Solution revealed" });
  };

  const acrossClues = clues.filter(c => c.direction === "across").sort((a, b) => a.number - b.number);
  const downClues = clues.filter(c => c.direction === "down").sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        {isMobile && activeCell && !solved && (
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation",
                direction === "across" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
              onClick={() => setDirection("across")}
            >Across →</button>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation",
                direction === "down" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
              onClick={() => setDirection("down")}
            >Down ↓</button>
          </div>
        )}
        {!isMobile && (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move · Type to fill · Delete to clear · Tap same cell to toggle direction
          </p>
        )}

        <MobileLetterInput
          ref={mobileInputRef}
          active={isMobile && !!activeCell && !solved}
          onLetter={enterChar}
          onDelete={deleteChar}
        />

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
              const isInEntry = activeEntryCells.has(`${r}-${c}`);
              const hasError = errors.has(`${r}-${c}`);
              const num = cellNumbers.get(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative w-8 h-8 sm:w-10 sm:h-10 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isInEntry && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isInEntry && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {num && !black && (
                    <span className="absolute left-0.5 top-0 text-[8px] font-medium text-puzzle-number leading-tight">{num}</span>
                  )}
                  {!black && (
                    <span className="text-sm sm:text-base font-semibold text-foreground uppercase">{grid[r][c]}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          {showCheck && (
            <Button variant="outline" size="sm" onClick={handleCheck}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Check
            </Button>
          )}
          {showHints && (
            <Button variant="outline" size="sm" onClick={handleHint}>
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Hint
            </Button>
          )}
          {showReveal && (
            <Button variant="outline" size="sm" onClick={handleReveal}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Reveal
            </Button>
          )}
        </div>
      </div>

      {/* Side panel: clues or word list */}
      <div className="lg:max-w-xs">
        {puzzleType === "crossword" && clues.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Across</h4>
              <ul className="space-y-1 text-sm">
                {acrossClues.map(cl => (
                  <li key={`a-${cl.number}`} className="text-foreground"><span className="mr-1 font-semibold">{cl.number}.</span>{cl.clue}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Down</h4>
              <ul className="space-y-1 text-sm">
                {downClues.map(cl => (
                  <li key={`d-${cl.number}`} className="text-foreground"><span className="mr-1 font-semibold">{cl.number}.</span>{cl.clue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {puzzleType === "word-fill" && entries.length > 0 && (
          <>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Words to Place</h4>
            <GroupedEntryList
              entries={entries}
              isNumbers={false}
              interactive
              usedEntries={usedEntries}
              onToggle={(entry) => setUsedEntries(prev => {
                const next = new Set(prev);
                if (next.has(entry)) next.delete(entry); else next.add(entry);
                return next;
              })}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cryptogram Solver ───

interface CryptogramSolverProps {
  data: { encoded: string; decoded: string; reverseCipher: Record<string, string>; hints: Record<string, string> };
  onComplete: () => void;
  savedState?: Record<string, string> | null;
  onSaveProgress?: (state: Record<string, string>) => void;
  showHints?: boolean;
  showReveal?: boolean;
}

export function CryptogramSolver({ data, onComplete, savedState, onSaveProgress, showHints = true, showReveal = false }: CryptogramSolverProps) {
  const { toast } = useToast();
  const [guesses, setGuesses] = useState<Record<string, string>>(() => {
    if (savedState && Object.keys(savedState).length > 0) return { ...data.hints, ...savedState };
    return { ...data.hints };
  });
  const [completed, setCompleted] = useState(false);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const encodedLetters = useMemo(() => [...new Set(data.encoded.split("").filter(ch => /[A-Z]/.test(ch)))], [data.encoded]);
  const editableIndices = useMemo(() =>
    data.encoded.split("").map((ch, i) => ({ ch, i })).filter(({ ch }) => /[A-Z]/.test(ch) && !(ch in data.hints)).map(({ i }) => i),
    [data.encoded, data.hints]
  );

  // Listen for save-progress event
  useEffect(() => {
    const handler = () => {
      onSaveProgress?.(guesses);
    };
    window.addEventListener("save-puzzle-progress", handler);
    return () => window.removeEventListener("save-puzzle-progress", handler);
  }, [guesses, onSaveProgress]);

  useEffect(() => {
    if (editableIndices.length > 0) {
      const el = inputRefs.current.get(editableIndices[0]);
      if (el) setTimeout(() => el.focus(), 80);
    }
  }, []);

  const findNextEditable = (fromIdx: number, dir: number): number | null => {
    const pos = editableIndices.indexOf(fromIdx);
    if (pos === -1) return editableIndices[0] ?? null;
    const next = pos + dir;
    if (next >= 0 && next < editableIndices.length) return editableIndices[next];
    return null;
  };

  const handleInput = (encodedChar: string, value: string, idx: number) => {
    const upper = value.toUpperCase().replace(/[^A-Z]/g, "");
    const letter = upper.slice(-1);
    const newGuesses = { ...guesses, [encodedChar]: letter };
    setGuesses(newGuesses);

    if (letter) {
      const nextIdx = findNextEditable(idx, 1);
      if (nextIdx !== null) inputRefs.current.get(nextIdx)?.focus();
    }

    // Check completion
    const allFilled = encodedLetters.every(ch => newGuesses[ch]);
    if (allFilled) {
      const decoded = data.encoded.split("").map(ch => /[A-Z]/.test(ch) ? (newGuesses[ch] || "") : ch).join("");
      if (decoded === data.decoded) {
        setCompleted(true);
        onComplete();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, encodedChar: string, idx: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (guesses[encodedChar]) {
        setGuesses(prev => ({ ...prev, [encodedChar]: "" }));
      } else {
        const prevIdx = findNextEditable(idx, -1);
        if (prevIdx !== null) inputRefs.current.get(prevIdx)?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      const prevIdx = findNextEditable(idx, -1);
      if (prevIdx !== null) inputRefs.current.get(prevIdx)?.focus();
    } else if (e.key === "ArrowRight" || e.key === "Tab") {
      e.preventDefault();
      const nextIdx = findNextEditable(idx, 1);
      if (nextIdx !== null) inputRefs.current.get(nextIdx)?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-mono text-sm leading-loose flex flex-wrap gap-x-0.5 gap-y-3">
        {data.encoded.split("").map((ch, i) => {
          if (ch === " ") return <span key={i} className="w-3" />;
          if (!/[A-Z]/.test(ch)) return <span key={i} className="px-0.5 text-muted-foreground">{ch}</span>;
          const isHint = ch in data.hints;
          return (
            <span key={i} className="inline-flex flex-col items-center">
              <input
                ref={el => { if (el) inputRefs.current.set(i, el); }}
                className={cn(
                  "w-7 h-8 text-center text-sm border-b-2 bg-transparent outline-none font-semibold",
                  isHint && "border-primary text-primary",
                  !isHint && !completed && "border-puzzle-border focus:border-primary text-foreground",
                  completed && "border-primary text-primary"
                )}
                maxLength={1}
                value={guesses[ch] || ""}
                onChange={e => !isHint && !completed && handleInput(ch, e.target.value, i)}
                onKeyDown={e => !isHint && !completed && handleKeyDown(e, ch, i)}
                readOnly={isHint || completed}
              />
              <span className="text-[9px] text-muted-foreground mt-0.5">{ch}</span>
            </span>
          );
        })}
      </div>
      {completed && <p className="text-sm text-primary font-medium text-center">✓ Solved!</p>}
    </div>
  );
}

// ─── Word Search Solver ───

interface WordSearchSolverProps {
  data: { grid: string[][]; words: string[]; wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[]; size: number };
  onComplete: () => void;
  savedState?: { foundWords: string[] } | null;
  onSaveProgress?: (state: { foundWords: string[]; foundCells: string[] }) => void;
}

export function WordSearchSolver({ data, onComplete, savedState, onSaveProgress }: WordSearchSolverProps) {
  const [foundWords, setFoundWords] = useState<Set<string>>(() => {
    if (savedState?.foundWords) return new Set(savedState.foundWords);
    return new Set();
  });
  const [foundCells, setFoundCells] = useState<Set<string>>(() => {
    if (savedState?.foundWords) {
      const cells = new Set<string>();
      for (const word of savedState.foundWords) {
        const wp = data.wordPositions.find(w => w.word === word);
        if (wp) {
          for (let i = 0; i < wp.word.length; i++) {
            cells.add(`${wp.row + wp.dr * i}-${wp.col + wp.dc * i}`);
          }
        }
      }
      return cells;
    }
    return new Set();
  });
  const [selStart, setSelStart] = useState<[number, number] | null>(null);
  const [selEnd, setSelEnd] = useState<[number, number] | null>(null);
  const [tapStart, setTapStart] = useState<[number, number] | null>(null);
  const touchMoved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const completed = foundWords.size === data.words.length;

  useEffect(() => {
    const handler = () => {
      onSaveProgress?.({ foundWords: [...foundWords], foundCells: [...foundCells] });
    };
    window.addEventListener("save-puzzle-progress", handler);
    return () => window.removeEventListener("save-puzzle-progress", handler);
  }, [foundWords, foundCells, onSaveProgress]);

  const getCellFromPoint = useCallback((x: number, y: number): [number, number] | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / data.size;
    const cellH = rect.height / data.size;
    const c = Math.floor((x - rect.left) / cellW);
    const r = Math.floor((y - rect.top) / cellH);
    if (r < 0 || r >= data.size || c < 0 || c >= data.size) return null;
    return [r, c];
  }, [data.size]);

  const getPreviewCells = (): Set<string> => {
    const start = selStart || tapStart;
    const end = selEnd;
    if (!start || !end) return new Set();
    const [sr, sc] = start;
    const [er, ec] = end;
    const dr = Math.sign(er - sr);
    const dc = Math.sign(ec - sc);
    const len = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
    const cells = new Set<string>();
    for (let i = 0; i <= len; i++) cells.add(`${sr + dr * i}-${sc + dc * i}`);
    return cells;
  };

  const trySelectWord = useCallback((sr: number, sc: number, er: number, ec: number) => {
    const dr = Math.sign(er - sr);
    const dc = Math.sign(ec - sc);
    const len = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
    const letters: string[] = [];
    for (let i = 0; i <= len; i++) letters.push(data.grid[sr + dr * i]?.[sc + dc * i] || "");
    const fwd = letters.join("");
    const rev = letters.slice().reverse().join("");

    for (const wp of data.wordPositions) {
      if (foundWords.has(wp.word)) continue;
      if (wp.word === fwd || wp.word === rev) {
        const newFound = new Set(foundWords);
        newFound.add(wp.word);
        setFoundWords(newFound);
        const newCells = new Set(foundCells);
        for (let i = 0; i < wp.word.length; i++)
          newCells.add(`${wp.row + wp.dr * i}-${wp.col + wp.dc * i}`);
        setFoundCells(newCells);
        if (newFound.size === data.words.length) onComplete();
        return true;
      }
    }
    return false;
  }, [data, foundWords, foundCells, onComplete]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchMoved.current = false;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) { setSelStart(cell); setSelEnd(cell); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    touchMoved.current = true;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) setSelEnd(cell);
  };
  const handleTouchEnd = () => {
    if (!touchMoved.current && selStart) {
      // Tap — use tap-to-select mode
      const tappedCell = selStart;
      setSelStart(null);
      setSelEnd(null);
      if (!tapStart) {
        setTapStart(tappedCell);
      } else {
        const result = trySelectWord(tapStart[0], tapStart[1], tappedCell[0], tappedCell[1]);
        setTapStart(null);
        if (!result) setTapStart(tappedCell);
      }
      return;
    }
    if (selStart && selEnd) trySelectWord(selStart[0], selStart[1], selEnd[0], selEnd[1]);
    setSelStart(null);
    setSelEnd(null);
    setTapStart(null);
  };

  const handleMouseDown = (r: number, c: number) => {
    setSelStart([r, c]);
    setSelEnd([r, c]);
  };
  const handleMouseEnter = (r: number, c: number) => {
    if (selStart) setSelEnd([r, c]);
  };
  const handleMouseUp = () => {
    if (selStart && selEnd) trySelectWord(selStart[0], selStart[1], selEnd[0], selEnd[1]);
    setSelStart(null);
    setSelEnd(null);
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (selStart && selEnd) trySelectWord(selStart[0], selStart[1], selEnd[0], selEnd[1]);
      setSelStart(null);
      setSelEnd(null);
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [selStart, selEnd, trySelectWord]);

  const previewCells = getPreviewCells();
  const tapStartKey = tapStart ? `${tapStart[0]}-${tapStart[1]}` : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground sm:hidden">
        Tap two letters to select a word, or drag across letters
      </p>
      <div
        ref={gridRef}
        className="inline-grid gap-0 select-none"
        style={{ gridTemplateColumns: `repeat(${data.size}, minmax(0, 1fr))`, touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseUp={handleMouseUp}
      >
        {data.grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isFound = foundCells.has(key);
            const isPreview = previewCells.has(key);
            const isTapStart = tapStartKey === key;
            return (
              <div
                key={key}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-mono select-none border border-puzzle-border touch-manipulation transition-colors cursor-pointer",
                  isFound && "bg-primary/20 text-primary font-bold",
                  isTapStart && "bg-puzzle-cell-active ring-2 ring-inset ring-primary",
                  !isFound && !isTapStart && isPreview && "bg-puzzle-cell-active",
                  !isFound && !isTapStart && !isPreview && "bg-puzzle-cell hover:bg-puzzle-cell-highlight"
                )}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
              >
                {cell}
              </div>
            );
          })
        )}
      </div>
      {tapStart && (
        <p className="text-xs text-primary animate-pulse">
          Tap the end letter to complete selection
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {data.words.map(w => (
          <Badge key={w} variant={foundWords.has(w) ? "default" : "outline"} className="text-xs">
            {foundWords.has(w) && <Check className="h-3 w-3 mr-0.5" />}
            {w}
          </Badge>
        ))}
      </div>
      {completed && <p className="text-sm text-primary font-medium text-center">✓ All words found!</p>}
    </div>
  );
}

// ─── Completed (Read-Only) Views ───

export function CompletedGridView({ data, puzzleType }: { data: Record<string, unknown>; puzzleType: "word-fill" | "crossword" }) {
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const solution = (data.solution as (string | null)[][]) || [];
  const clues = (data.clues as { number: number; clue: string; answer: string; row: number; col: number; direction: string }[]) || [];
  const entries = (data.entries as string[]) || [];
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));

  const cellNums = new Map<string, number>();
  if (puzzleType === "crossword") {
    let num = 1;
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) {
        if (blackSet.has(`${r}-${c}`)) continue;
        const startsAcross = (c === 0 || blackSet.has(`${r}-${c - 1}`)) && c + 1 < gridSize && !blackSet.has(`${r}-${c + 1}`);
        const startsDown = (r === 0 || blackSet.has(`${r - 1}-${c}`)) && r + 1 < gridSize && !blackSet.has(`${r + 1}-${c}`);
        if (startsAcross || startsDown) cellNums.set(`${r}-${c}`, num++);
      }
  }

  return (
    <div className="space-y-3">
      <div className="inline-grid border-2 border-puzzle-border" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
        {Array.from({ length: gridSize }, (_, r) =>
          Array.from({ length: gridSize }, (_, c) => {
            const black = blackSet.has(`${r}-${c}`);
            const num = cellNums.get(`${r}-${c}`);
            const letter = solution?.[r]?.[c] || "";
            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-6 h-6 sm:w-7 sm:h-7 border border-puzzle-border flex items-center justify-center",
                  black ? "bg-puzzle-cell-black" : "bg-puzzle-cell"
                )}
              >
                {num && !black && (
                  <span className="absolute left-px top-0 text-[6px] font-medium text-puzzle-number leading-tight">{num}</span>
                )}
                {!black && letter && (
                  <span className="text-[10px] sm:text-xs font-semibold text-primary">{letter}</span>
                )}
              </div>
            );
          })
        )}
      </div>
      {puzzleType === "crossword" && clues.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <h4 className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider text-[10px]">Across</h4>
            {clues.filter(c => c.direction === "across").map(c => (
              <p key={`a-${c.number}`} className="text-foreground"><span className="font-semibold mr-1">{c.number}.</span>{c.clue}</p>
            ))}
          </div>
          <div>
            <h4 className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider text-[10px]">Down</h4>
            {clues.filter(c => c.direction === "down").map(c => (
              <p key={`d-${c.number}`} className="text-foreground"><span className="font-semibold mr-1">{c.number}.</span>{c.clue}</p>
            ))}
          </div>
        </div>
      )}
      {puzzleType === "word-fill" && entries.length > 0 && (
        <GroupedEntryList entries={entries} isNumbers={false} badgeMode />
      )}
    </div>
  );
}

export function CompletedCryptogramView({ data }: { data: Record<string, unknown> }) {
  const encoded = (data.encoded as string) || "";
  const decoded = (data.decoded as string) || "";
  const reverseCipher = (data.reverseCipher as Record<string, string>) || {};

  return (
    <div className="space-y-3">
      <div className="font-mono text-sm leading-loose flex flex-wrap gap-x-0.5 gap-y-3">
        {encoded.split("").map((ch, i) => {
          if (ch === " ") return <span key={i} className="w-3" />;
          if (!/[A-Z]/.test(ch)) return <span key={i} className="px-0.5 text-muted-foreground">{ch}</span>;
          const answer = reverseCipher[ch] || decoded[i] || "?";
          return (
            <span key={i} className="inline-flex flex-col items-center">
              <span className="w-7 h-8 flex items-center justify-center text-sm font-semibold text-primary border-b-2 border-primary/30">
                {answer}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{ch}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CompletedWordSearchView({ data }: { data: Record<string, unknown> }) {
  const grid = (data.grid as string[][]) || [];
  const words = (data.words as string[]) || [];
  const size = (data.size as number) || 10;
  const wordPositions = (data.wordPositions as { word: string; row: number; col: number; dr: number; dc: number }[]) || [];

  const foundCells = new Set<string>();
  wordPositions.forEach(wp => {
    for (let i = 0; i < wp.word.length; i++) {
      foundCells.add(`${wp.row + wp.dr * i}-${wp.col + wp.dc * i}`);
    }
  });

  return (
    <div className="space-y-3">
      <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[9px] sm:text-[10px] font-mono border border-puzzle-border",
                foundCells.has(`${r}-${c}`) ? "bg-primary/15 text-primary font-bold" : "bg-puzzle-cell text-muted-foreground"
              )}
            >
              {cell}
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map(w => (
          <Badge key={w} variant="default" className="text-xs">
            <Check className="h-3 w-3 mr-0.5" />
            {w}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ─── Read-Only Puzzle Preview ───

interface PuzzlePreviewProps {
  data: Record<string, unknown>;
  puzzleType: "word-fill" | "cryptogram" | "crossword" | "word-search";
}

export function PuzzlePreview({ data, puzzleType }: PuzzlePreviewProps) {
  if (puzzleType === "cryptogram") {
    const encoded = (data.encoded as string) || "";
    return (
      <div className="space-y-3">
        <div className="font-mono text-sm leading-loose flex flex-wrap gap-x-0.5 gap-y-3">
          {encoded.split("").map((ch, i) => {
            if (ch === " ") return <span key={i} className="w-3" />;
            if (!/[A-Z]/.test(ch)) return <span key={i} className="px-0.5 text-muted-foreground">{ch}</span>;
            return (
              <span key={i} className="inline-flex flex-col items-center">
                <span className="w-7 h-8 flex items-center justify-center text-sm font-semibold text-foreground border-b-2 border-puzzle-border">
                  {ch}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5">?</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (puzzleType === "word-search") {
    const grid = (data.grid as string[][]) || [];
    const words = (data.words as string[]) || [];
    const size = (data.size as number) || 10;
    return (
      <div className="space-y-3">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div key={`${r}-${c}`} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[9px] sm:text-[10px] font-mono bg-puzzle-cell border border-puzzle-border">
                {cell}
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {words.map(w => <Badge key={w} variant="outline" className="text-xs">{w}</Badge>)}
        </div>
      </div>
    );
  }

  // Grid-based: word-fill or crossword
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const clues = (data.clues as { number: number; clue: string; answer: string; row: number; col: number; direction: string }[]) || [];
  const entries = (data.entries as string[]) || [];

  // Cell numbering for crossword
  const cellNums = new Map<string, number>();
  if (puzzleType === "crossword") {
    let num = 1;
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) {
        if (blackSet.has(`${r}-${c}`)) continue;
        const startsAcross = (c === 0 || blackSet.has(`${r}-${c - 1}`)) && c + 1 < gridSize && !blackSet.has(`${r}-${c + 1}`);
        const startsDown = (r === 0 || blackSet.has(`${r - 1}-${c}`)) && r + 1 < gridSize && !blackSet.has(`${r + 1}-${c}`);
        if (startsAcross || startsDown) cellNums.set(`${r}-${c}`, num++);
      }
  }

  return (
    <div className="space-y-3">
      <div className="inline-grid border-2 border-puzzle-border" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
        {Array.from({ length: gridSize }, (_, r) =>
          Array.from({ length: gridSize }, (_, c) => {
            const black = blackSet.has(`${r}-${c}`);
            const num = cellNums.get(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-5 h-5 sm:w-6 sm:h-6 border border-puzzle-border flex items-center justify-center",
                  black ? "bg-puzzle-cell-black" : "bg-puzzle-cell"
                )}
              >
                {num && !black && (
                  <span className="absolute left-px top-0 text-[6px] font-medium text-puzzle-number leading-tight">{num}</span>
                )}
              </div>
            );
          })
        )}
      </div>
      {puzzleType === "crossword" && clues.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <h4 className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider text-[10px]">Across</h4>
            {clues.filter(c => c.direction === "across").map(c => (
              <p key={`a-${c.number}`} className="text-foreground"><span className="font-semibold mr-1">{c.number}.</span>{c.clue}</p>
            ))}
          </div>
          <div>
            <h4 className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider text-[10px]">Down</h4>
            {clues.filter(c => c.direction === "down").map(c => (
              <p key={`d-${c.number}`} className="text-foreground"><span className="font-semibold mr-1">{c.number}.</span>{c.clue}</p>
            ))}
          </div>
        </div>
      )}
      {puzzleType === "word-fill" && entries.length > 0 && (
        <GroupedEntryList
          entries={entries}
          isNumbers={false}
          badgeMode
        />
      )}
    </div>
  );
}
