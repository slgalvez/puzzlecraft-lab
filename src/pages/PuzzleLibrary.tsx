import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty, isDifficultyDisabled } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import HowToPlay from "@/components/puzzles/HowToPlay";
import { Play, ChevronDown } from "lucide-react";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];
const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

function loadDifficulties(): Record<string, Difficulty> {
  try { return JSON.parse(localStorage.getItem("play_difficulties") || "{}"); }
  catch { return {}; }
}

function saveDifficulty(type: string, d: Difficulty) {
  try {
    const stored = loadDifficulties();
    stored[type] = d;
    localStorage.setItem("play_difficulties", JSON.stringify(stored));
  } catch { /* ignore */ }
}

const PuzzleLibrary = () => {
  const navigate = useNavigate();
  const [storedDiffs] = useState(loadDifficulties);
  const [perTypeDifficulty, setPerTypeDifficulty] = useState<Record<string, Difficulty>>(() => storedDiffs);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const getDifficulty = (type: PuzzleCategory): Difficulty => perTypeDifficulty[type] || "medium";

  const handlePlay = (type: PuzzleCategory) => {
    const d = getDifficulty(type);
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=${d}`);
  };

  const handleDifficultyChange = (type: PuzzleCategory, d: Difficulty) => {
    setPerTypeDifficulty((prev) => ({ ...prev, [type]: d }));
    saveDifficulty(type, d);
  };

  const toggleExpanded = (type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedType((prev) => (prev === type ? null : type));
  };

  return (
    <Layout>
      <div className="container py-6 md:py-14 pb-20 md:pb-28">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Play
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick a puzzle and start solving instantly.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([type, info]) => {
            const currentDiff = getDifficulty(type);
            const isExpanded = expandedType === type;

            return (
              <div key={type} className="relative flex flex-col rounded-xl border-2 border-border bg-card transition-all hover:border-primary/50 hover:shadow-md">
                {/* How to play info icon — outside the button to avoid click conflicts */}
                <div className="absolute top-3 right-3 z-10">
                  <HowToPlay type={type} />
                </div>
                {/* Main card area — click to play */}
                <button
                  onClick={() => handlePlay(type)}
                  className="group flex flex-1 flex-col items-start p-5 pb-4 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex h-9 items-center">
                    <PuzzleIcon type={type} size={36} className="text-foreground opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="mt-3 font-display text-[1.1rem] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {info.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground/80 leading-snug font-normal">
                    {info.description}
                  </p>
                  <div className="mt-auto pt-4">
                    <span className="text-sm font-semibold text-primary">Play</span>
                    <span className="block text-[11px] text-muted-foreground/70 font-medium mt-0.5">
                      {DIFFICULTY_LABELS[currentDiff]}
                    </span>
                  </div>
                </button>

                {/* Difficulty toggle strip */}
                <div className="border-t border-border/60 px-4 py-2">
                  <button
                    onClick={(e) => toggleExpanded(type, e)}
                    className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Difficulty: <span className="font-medium text-foreground">{DIFFICULTY_LABELS[currentDiff]}</span></span>
                    <ChevronDown size={12} className={cn("transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {difficulties.map(([val, label]) => (
                        <button
                          key={val}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDifficultyChange(type, val);
                          }}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                            currentDiff === val
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default PuzzleLibrary;
