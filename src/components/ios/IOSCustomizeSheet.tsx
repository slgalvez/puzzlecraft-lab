import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty, isDifficultyDisabled, getEffectiveDifficulty } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];
const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

interface Props {
  open: boolean;
  onClose: () => void;
}

const IOSCustomizeSheet = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<PuzzleCategory>("sudoku");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");

  if (!open) return null;

  const handlePlay = () => {
    const diff = getEffectiveDifficulty(selectedType, selectedDifficulty);
    const seed = randomSeed();
    navigate(`/quick-play/${selectedType}?seed=${seed}&d=${diff}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-card border-t max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Handle */}
        <div className="sticky top-0 bg-card pt-3 pb-2 px-5 flex items-center justify-between z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="font-display text-lg font-bold text-foreground mt-3">Customize Puzzle</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary mt-3">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {/* Puzzle Type */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Puzzle Type</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {categories.map(([type, info]) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                  selectedType === type
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                )}
              >
                <PuzzleIcon type={type} size={24} className={cn(
                  "transition-colors",
                  selectedType === type ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-[11px] font-medium leading-tight text-center",
                  selectedType === type ? "text-foreground" : "text-muted-foreground"
                )}>
                  {info.name}
                </span>
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Difficulty</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {difficulties.map(([val, label]) => {
              const disabled = isDifficultyDisabled(selectedType, val);
              return (
                <button
                  key={val}
                  onClick={() => !disabled && setSelectedDifficulty(val)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    disabled
                      ? "border-border text-muted-foreground/30 cursor-not-allowed"
                      : selectedDifficulty === val
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Play button */}
          <Button onClick={handlePlay} size="lg" className="w-full text-base font-semibold">
            Play {CATEGORY_INFO[selectedType].name} — {DIFFICULTY_LABELS[selectedDifficulty]}
          </Button>
        </div>
      </div>
    </>
  );
};

export default IOSCustomizeSheet;
