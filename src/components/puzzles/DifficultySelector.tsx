import { useState } from "react";
import { Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLUS_DIFFICULTIES,
  type Difficulty,
  usePremiumAccess,
} from "@/lib/premiumAccess";
import { DIFFICULTY_LABELS, DIFFICULTY_HOVER, DIFFICULTY_SELECTED } from "@/lib/puzzleTypes";
import UpgradeModal from "@/components/account/UpgradeModal";

interface Props {
  difficulty: Difficulty;
  onChange: (d: Difficulty) => void;
  puzzleType?: string;
  showAll?: boolean;
}

const DifficultySelector = ({ difficulty, onChange, showAll = false }: Props) => {
  const { isPremium, isDiffLocked } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const difficulties = PLUS_DIFFICULTIES;

  const handleSelect = (d: Difficulty) => {
    if (isDiffLocked(d) && !showAll) {
      setUpgradeOpen(true);
      return;
    }
    onChange(d);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-center">
        {difficulties.map((d) => {
          const locked = isDiffLocked(d) && !showAll;
          const active = difficulty === d && !locked;

          return (
            <button
              key={d}
              type="button"
              onClick={() => handleSelect(d)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full border px-3.5 py-1.5",
                "text-xs font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                locked
                  ? "border-border/40 bg-muted/30 text-muted-foreground/50 cursor-pointer select-none"
                  : active
                  ? cn(DIFFICULTY_SELECTED[d])
                  : cn("border-border text-muted-foreground", DIFFICULTY_HOVER[d])
              )}
              aria-label={
                locked
                  ? `${DIFFICULTY_LABELS[d]} — Puzzlecraft+ only`
                  : DIFFICULTY_LABELS[d]
              }
            >
              {locked ? (
                <>
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>{DIFFICULTY_LABELS[d]}</span>
                  <span className="absolute -top-2 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-sm">
                    <Crown className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                </>
              ) : (
                <span>{DIFFICULTY_LABELS[d]}</span>
              )}
            </button>
          );
        })}
      </div>

      {!isPremium && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          <button
            onClick={() => setUpgradeOpen(true)}
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            Unlock Extreme & Insane with Puzzlecraft+
          </button>
        </p>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
};

export default DifficultySelector;
