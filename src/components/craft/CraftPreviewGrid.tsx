import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

export default function CraftPreviewGrid({ data, puzzleType }: { data: Record<string, unknown>; puzzleType: CraftType }) {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="space-y-4">
      {/* Solution toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSolution(s => !s)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSolution ? <EyeOff size={13} /> : <Eye size={13} />}
          {showSolution ? "Hide solution" : "Show solution"}
        </button>
      </div>

      {(puzzleType === "word-fill" || puzzleType === "crossword") && (
        <GridPreview data={data} puzzleType={puzzleType} showSolution={showSolution} />
      )}
      {puzzleType === "cryptogram" && (
        <CryptogramPreview data={data} showSolution={showSolution} />
      )}
      {puzzleType === "word-search" && (
        <WordSearchPreview data={data} showSolution={showSolution} />
      )}
    </div>
  );
}

function GridPreview({ data, puzzleType, showSolution }: { data: Record<string, unknown>; puzzleType: "word-fill" | "crossword"; showSolution: boolean }) {
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const solution = (data.solution as (string | null)[][]) || null;
  const clues = (data.clues as { answer: string; row: number; col: number; direction: string; number?: number; clue?: string }[]) || [];
  const entries = (data.entries as string[]) || [];
  const blacks = new Set(blackCells.map(([r, c]) => `${r}-${c}`));

  const grid: (string | null)[][] = solution || (() => {
    const g: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    for (const c of clues) {
      const dr = c.direction === "down" ? 1 : 0;
      const dc = c.direction === "across" ? 1 : 0;
      for (let i = 0; i < c.answer.length; i++) {
        g[c.row + dr * i][c.col + dc * i] = c.answer[i];
      }
    }
    return g;
  })();

  // Compute cell numbers for crossword
  const cellNumbers = new Map<string, number>();
  if (puzzleType === "crossword") {
    let num = 1;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (blacks.has(`${r}-${c}`)) continue;
        const startsAcross = (c === 0 || blacks.has(`${r}-${c - 1}`)) && c + 1 < gridSize && !blacks.has(`${r}-${c + 1}`);
        const startsDown = (r === 0 || blacks.has(`${r - 1}-${c}`)) && r + 1 < gridSize && !blacks.has(`${r + 1}-${c}`);
        if (startsAcross || startsDown) cellNumbers.set(`${r}-${c}`, num++);
      }
    }
  }

  // Word bank for word-fill
  const wordBank = puzzleType === "word-fill"
    ? (entries.length > 0 ? entries : clues.map(c => c.answer)).sort((a, b) => a.length - b.length || a.localeCompare(b))
    : [];

  const cellSize = Math.min(28, Math.floor(280 / gridSize));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto flex justify-center">
        <div className="inline-grid gap-0 border border-border rounded" style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}>
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const isBlack = blacks.has(`${r}-${c}`);
              const num = cellNumbers.get(`${r}-${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative flex items-center justify-center border border-border/30 font-mono font-medium ${isBlack ? "bg-foreground/90" : "bg-card text-foreground"}`}
                  style={{ width: cellSize, height: cellSize, fontSize: showSolution ? 10 : 0 }}
                >
                  {num && (
                    <span className="absolute top-px left-0.5 text-[6px] text-muted-foreground leading-none">{num}</span>
                  )}
                  {!isBlack && showSolution && grid[r]?.[c] ? grid[r][c] : ""}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Word bank for word-fill */}
      {puzzleType === "word-fill" && wordBank.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Word Bank</p>
          <div className="flex flex-wrap gap-2">
            {wordBank.map((word, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-[11px] font-mono rounded bg-muted text-foreground/70"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clue list for crossword */}
      {puzzleType === "crossword" && clues.length > 0 && (
        <div className="space-y-2">
          {["across", "down"].map(dir => {
            const dirClues = clues.filter(c => c.direction === dir && c.number);
            if (dirClues.length === 0) return null;
            return (
              <div key={dir}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{dir}</p>
                <div className="space-y-0.5">
                  {dirClues.sort((a, b) => (a.number || 0) - (b.number || 0)).map(c => (
                    <p key={`${c.number}-${dir}`} className="text-[11px] text-foreground">
                      <span className="font-medium">{c.number}.</span> {c.clue}
                      {showSolution && <span className="text-muted-foreground ml-1">({c.answer})</span>}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CryptogramPreview({ data, showSolution }: { data: Record<string, unknown>; showSolution: boolean }) {
  const decoded = (data.decoded as string) || "";
  const encoded = (data.encoded as string) || "";
  const display = showSolution ? decoded : encoded;

  return (
    <div className="space-y-3">
      <p className="text-sm font-mono text-foreground tracking-wider break-all text-center leading-relaxed">
        {display.split("").map((ch, i) => (
          <span key={i} className={/[A-Z]/.test(ch) ? "border-b border-foreground/30 mx-px" : "mx-0.5"}>
            {ch}
          </span>
        ))}
      </p>
      {!showSolution && (
        <p className="text-[10px] text-center text-muted-foreground">Each letter represents another letter</p>
      )}
    </div>
  );
}

function WordSearchPreview({ data, showSolution }: { data: Record<string, unknown>; showSolution: boolean }) {
  const grid = (data.grid as string[][]) || [];
  const words = (data.words as string[]) || [];
  const wordPositions = (data.wordPositions as { word: string; row: number; col: number; dr: number; dc: number }[]) || [];
  const size = grid.length;
  const cellSize = Math.min(24, Math.floor(280 / size));

  // Build set of highlighted cells when showing solution
  const highlightedCells = new Set<string>();
  if (showSolution) {
    for (const wp of wordPositions) {
      for (let i = 0; i < wp.word.length; i++) {
        highlightedCells.add(`${wp.row + wp.dr * i}-${wp.col + wp.dc * i}`);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto flex justify-center">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}>
          {grid.flat().map((ch, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const isHighlighted = highlightedCells.has(`${r}-${c}`);
            return (
              <div
                key={i}
                className={`flex items-center justify-center text-[10px] font-mono font-medium transition-colors ${
                  isHighlighted ? "bg-primary/20 text-primary font-bold rounded-sm" : "text-foreground"
                }`}
                style={{ width: cellSize, height: cellSize }}
              >
                {ch}
              </div>
            );
          })}
        </div>
      </div>

      {/* Word bank */}
      {words.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Words to Find</p>
          <div className="flex flex-wrap gap-1.5">
            {[...words].sort().map((word, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                  showSolution ? "bg-primary/10 text-primary line-through" : "bg-muted text-muted-foreground"
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
