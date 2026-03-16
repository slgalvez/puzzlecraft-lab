import { Link } from "react-router-dom";
import { Grid3X3, Hash, Type } from "lucide-react";
import type { PuzzleInfo } from "@/data/puzzles";
import { cn } from "@/lib/utils";

const typeIcons = {
  crossword: Grid3X3,
  "number-fill": Hash,
  "word-fill": Type,
};

const typeLabels = {
  crossword: "Crossword",
  "number-fill": "Number Fill-In",
  "word-fill": "Word Fill-In",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

const PuzzleCard = ({ puzzle }: { puzzle: PuzzleInfo }) => {
  const Icon = typeIcons[puzzle.type];
  const playable = ["cw-001", "nf-001", "wf-001"].includes(puzzle.id);

  return (
    <Link
      to={playable ? `/play/${puzzle.id}` : "#"}
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-5 transition-all hover:shadow-md",
        !playable && "pointer-events-none opacity-60"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={18} />
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", difficultyColors[puzzle.difficulty])}>
          {puzzle.difficulty}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{puzzle.size}</span>
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
        {puzzle.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{typeLabels[puzzle.type]}</p>
      {playable && (
        <span className="mt-3 text-xs font-medium text-primary">Play now →</span>
      )}
      {!playable && (
        <span className="mt-3 text-xs text-muted-foreground">Coming soon</span>
      )}
    </Link>
  );
};

export default PuzzleCard;
