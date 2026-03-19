import { cn } from "@/lib/utils";
import type { Difficulty, PuzzleCategory } from "@/lib/puzzleTypes";
import { DIFFICULTY_LABELS, isDifficultyDisabled } from "@/lib/puzzleTypes";
import { useToast } from "@/hooks/use-toast";

const levels = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  /** When provided, disables unsupported difficulties for this category */
  category?: PuzzleCategory;
}

const DifficultySelector = ({ value, onChange, category }: Props) => {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-1.5">
      {levels.map(([val, label]) => {
        const disabled = category ? isDifficultyDisabled(category, val) : false;
        return (
          <button
            key={val}
            onClick={() => {
              if (disabled) {
                toast({ title: `${label} not available for this puzzle yet` });
                return;
              }
              onChange(val);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              disabled
                ? "border-border text-muted-foreground/40 cursor-not-allowed"
                : value === val
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
            title={disabled ? `${label} not available for this puzzle yet` : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default DifficultySelector;
