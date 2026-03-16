import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

const allTypes = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];
const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

interface Props {
  /** If provided, pre-selects this type and navigates on generate */
  compact?: boolean;
}

const RandomPuzzleGenerator = ({ compact }: Props) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<PuzzleCategory>>(
    new Set(allTypes.map(([t]) => t))
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const toggleType = (type: PuzzleCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allTypes.map(([t]) => t)));
  const selectNone = () => {
    // Keep at least one
    const first = allTypes[0][0];
    setSelected(new Set([first]));
  };

  const handleGenerate = () => {
    const types = Array.from(selected);
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const seed = randomSeed();
    navigate(`/generate/${chosenType}?seed=${seed}`);
  };

  return (
    <div className={cn(
      "rounded-lg border bg-card",
      compact ? "p-4" : "p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Dices size={20} className="text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">
          Random Puzzle Generator
        </h3>
      </div>

      {/* Puzzle type selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Puzzle Types
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              All
            </button>
            <span className="text-[10px] text-muted-foreground">·</span>
            <button
              onClick={selectNone}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allTypes.map(([type, info]) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                selected.has(type)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              <span className="mr-1">{info.icon}</span>
              {info.name}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-1.5">
          {difficulties.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDifficulty(val)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                difficulty === val
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button onClick={handleGenerate} className="w-full gap-2">
        <Dices size={16} />
        Generate Random Puzzle
      </Button>

      <p className="mt-2 text-[10px] text-muted-foreground text-center">
        {selected.size === allTypes.length
          ? "From all puzzle types"
          : `From ${selected.size} selected type${selected.size > 1 ? "s" : ""}`}
      </p>
    </div>
  );
};

export default RandomPuzzleGenerator;
