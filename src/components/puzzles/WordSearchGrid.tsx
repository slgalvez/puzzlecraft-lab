import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { generateWordSearch } from "@/lib/generators/wordSearch";
import { WORDS } from "@/lib/wordList";
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

const WordSearchGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const puzzle = useMemo(() => generateWordSearch(seed, difficulty, WORDS), [seed, difficulty]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  const timerKey = `word-search-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey);

  const getPreviewCells = (): Set<string> => {
    if (!startCell || !hoverCell) return new Set();
    const [sr, sc] = startCell;
    const [er, ec] = hoverCell;
    const dr = Math.sign(er - sr);
    const dc = Math.sign(ec - sc);
    if (sr !== er && sc !== ec && Math.abs(er - sr) !== Math.abs(ec - sc)) return new Set();
    const cells = new Set<string>();
    let r = sr, c = sc;
    const steps = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
    for (let i = 0; i <= steps; i++) {
      cells.add(`${r}-${c}`);
      r += dr;
      c += dc;
    }
    return cells;
  };

  const previewCells = getPreviewCells();

  const handleCellClick = (r: number, c: number) => {
    if (timer.isSolved) return;
    if (!startCell) {
      setStartCell([r, c]);
    } else {
      const [sr, sc] = startCell;
      const dr = Math.sign(r - sr);
      const dc = Math.sign(c - sc);

      if (sr === r || sc === c || Math.abs(r - sr) === Math.abs(c - sc)) {
        const letters: string[] = [];
        const cells: string[] = [];
        let cr = sr, cc = sc;
        const steps = Math.max(Math.abs(r - sr), Math.abs(c - sc));
        for (let i = 0; i <= steps; i++) {
          letters.push(puzzle.grid[cr][cc]);
          cells.push(`${cr}-${cc}`);
          cr += dr;
          cc += dc;
        }
        const word = letters.join("");
        if (puzzle.words.includes(word) && !foundWords.has(word)) {
          const newFound = new Set([...foundWords, word]);
          setFoundWords(newFound);
          setFoundCells((prev) => {
            const next = new Set(prev);
            cells.forEach((c) => next.add(c));
            return next;
          });
          if (newFound.size === puzzle.words.length) {
            const { isNewBest } = timer.solve();
            toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "All words found!" });
          }
        }
      }
      setStartCell(null);
    }
  };

  const handleReset = () => {
    setFoundWords(new Set());
    setFoundCells(new Set());
    setStartCell(null);
    timer.reset();
  };

  const handleCheck = () => {
    if (foundWords.size === puzzle.words.length) {
      toast({ title: "🎉 Congratulations!", description: "All words found!" });
    } else {
      toast({
        title: "Keep searching!",
        description: `${foundWords.size}/${puzzle.words.length} words found.`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
        <p className="mb-2 text-xs text-muted-foreground">
          Click a start letter, then click the end letter to select a word.
        </p>
        <div
          className="inline-grid border-2 border-puzzle-border select-none"
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCells.has(key);
              const isStart = startCell?.[0] === r && startCell?.[1] === c;
              const isPreview = previewCells.has(key);

              return (
                <div
                  key={key}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 border border-puzzle-border flex items-center justify-center cursor-pointer text-sm sm:text-base font-semibold transition-colors",
                    isFound && "bg-puzzle-cell-highlight text-primary",
                    isStart && "bg-puzzle-cell-active",
                    isPreview && !isFound && !isStart && "bg-secondary",
                    !isFound && !isStart && !isPreview && "bg-puzzle-cell hover:bg-secondary"
                  )}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoverCell([r, c])}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
        <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
      </div>

      <div className="lg:max-w-xs">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Words to Find ({foundWords.size}/{puzzle.words.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {puzzle.words.map((word) => (
            <span
              key={word}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                foundWords.has(word)
                  ? "border-primary/30 bg-primary/10 text-primary line-through"
                  : "border-border bg-card text-foreground"
              )}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordSearchGrid;
