import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/puzzleTypes";
import { DIFFICULTY_LABELS } from "@/lib/puzzleTypes";

const levels = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}

const DifficultySelector = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-1.5">
    {levels.map(([val, label]) => (
      <button
        key={val}
        onClick={() => onChange(val)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          value === val
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </button>
    ))}
  </div>
);

export default DifficultySelector;
