type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

export default function CraftPreviewGrid({ data, puzzleType }: { data: Record<string, unknown>; puzzleType: CraftType }) {
  if (puzzleType === "word-fill" || puzzleType === "crossword") {
    const gridSize = (data.gridSize as number) || 9;
    const blackCells = (data.blackCells as [number, number][]) || [];
    const solution = (data.solution as (string | null)[][]) || null;
    const clues = (data.clues as { answer: string; row: number; col: number; direction: string }[]) || [];
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

    const cellSize = Math.min(28, Math.floor(280 / gridSize));
    return (
      <div className="overflow-x-auto flex justify-center">
        <div className="inline-grid gap-0 border border-border rounded" style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}>
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const isBlack = blacks.has(`${r}-${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex items-center justify-center border border-border/30 text-[10px] font-mono font-medium ${isBlack ? "bg-foreground/90" : "bg-card text-foreground"}`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {!isBlack && grid[r]?.[c] ? grid[r][c] : ""}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (puzzleType === "cryptogram") {
    const decoded = (data.decoded as string) || "";
    return (
      <p className="text-sm font-mono text-foreground tracking-wider break-all text-center">
        {decoded.split("").map((ch, i) => (
          <span key={i} className={/[A-Z]/.test(ch) ? "border-b border-foreground/30 mx-px" : "mx-0.5"}>
            {/[A-Z]/.test(ch) ? "•" : ch}
          </span>
        ))}
      </p>
    );
  }

  if (puzzleType === "word-search") {
    const grid = (data.grid as string[][]) || [];
    const size = grid.length;
    const cellSize = Math.min(24, Math.floor(280 / size));
    return (
      <div className="overflow-x-auto flex justify-center">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}>
          {grid.flat().map((ch, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-[10px] font-mono font-medium text-foreground"
              style={{ width: cellSize, height: cellSize }}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
