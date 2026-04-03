import { useState } from "react";
import { Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLUS_DIFFICULTIES,
  type Difficulty,
  usePremiumAccess,
} from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme",
  insane: "Insane",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy:    "border-emerald-400/60 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  medium:  "border-amber-400/60  bg-amber-400/10  text-amber-700  dark:text-amber-300",
  hard:    "border-orange-500/60 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  extreme: "border-rose-500/60   bg-rose-500/10   text-rose-700   dark:text-rose-300",
  insane:  "border-violet-600/60 bg-violet-600/10 text-violet-700 dark:text-violet-300",
};

const DIFFICULTY_ACTIVE: Record<Difficulty, string> = {
  easy:    "border-emerald-500 bg-emerald-500/20 shadow-emerald-500/30",
  medium:  "border-amber-500  bg-amber-500/20  shadow-amber-500/30",
  hard:    "border-orange-500 bg-orange-500/20 shadow-orange-500/30",
  extreme: "border-rose-500   bg-rose-500/20   shadow-rose-500/30",
  insane:  "border-violet-600 bg-violet-600/20 shadow-violet-600/30",
};

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
                  ? cn(DIFFICULTY_COLORS[d], DIFFICULTY_ACTIVE[d], "shadow-sm ring-1")
                  : cn(DIFFICULTY_COLORS[d], "hover:opacity-80")
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
