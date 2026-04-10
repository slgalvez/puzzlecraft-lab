import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty, isDifficultyDisabled, getEffectiveDifficulty, DIFFICULTY_HOVER, DIFFICULTY_SELECTED } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { hapticTap } from "@/lib/haptic";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];
const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

interface Props {
  open: boolean;
  onClose: () => void;
}

const IOSCustomizeSheet = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState<Set<PuzzleCategory>>(
    () => new Set(categories.map(([t]) => t))
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [revealEnabled, setRevealEnabled] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);

  if (!open) return null;

  const toggleType = (type: PuzzleCategory) => {
    hapticTap();
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handlePlay = () => {
    hapticTap();
    const types = Array.from(selectedTypes);
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const diff = getEffectiveDifficulty(chosenType, selectedDifficulty);
    const seed = randomSeed();
    const params = new URLSearchParams({ seed: String(seed), d: diff });
    if (!timerEnabled) params.set("noTimer", "1");
    navigate(`/quick-play/${chosenType}?${params.toString()}`, {
      state: { hintsEnabled, revealEnabled, timerEnabled },
    });
    onClose();
  };

  const typeCount = selectedTypes.size;
  const ctaLabel =
    typeCount === categories.length
      ? "Start Custom Game"
      : typeCount === 1
        ? `Play ${CATEGORY_INFO[Array.from(selectedTypes)[0]].name}`
        : `Play ${typeCount} Selected Puzzles`;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-card border-t max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Handle */}
        <div className="sticky top-0 bg-card pt-3 pb-2 px-5 flex items-center justify-between z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="font-display text-lg font-bold text-foreground mt-3">Customize Puzzle</h2>
          <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-secondary mt-3">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {/* Puzzle Type — multi-select */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
            Puzzle Types
            <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
              ({typeCount} selected)
            </span>
          </p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {categories.map(([type, info]) => {
              const selected = selectedTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-150 active:scale-95",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border opacity-50"
                  )}
                >
                  <PuzzleIcon type={type} size={24} className={cn(
                    "transition-colors",
                    selected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[11px] font-medium leading-tight text-center",
                    selected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Difficulty — single select */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Difficulty</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {difficulties.map(([val, label]) => {
              const disabled = isDifficultyDisabled(
                selectedTypes.size === 1 ? Array.from(selectedTypes)[0] : "sudoku",
                val
              );
              return (
                <button
                  key={val}
                  onClick={() => !disabled && setSelectedDifficulty(val)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    disabled
                      ? "border-border text-muted-foreground/30 cursor-not-allowed"
                      : selectedDifficulty === val
                        ? DIFFICULTY_SELECTED[val]
                        : cn("border-border text-muted-foreground", DIFFICULTY_HOVER[val])
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Game Settings */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Game Settings</p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Hints</span>
              <Switch checked={hintsEnabled} onCheckedChange={setHintsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Reveal Answers</span>
              <Switch checked={revealEnabled} onCheckedChange={setRevealEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Timer</span>
              <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
            </div>
          </div>

          {/* Play button */}
          <Button onClick={handlePlay} size="lg" className="w-full text-base font-semibold active:scale-95 transition-transform duration-150">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </>
  );
};

export default IOSCustomizeSheet;
