import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { cn } from "@/lib/utils";
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
      <div className="container py-10 md:py-14">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Play
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick a puzzle and start solving instantly.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([type, info]) => {
            const currentDiff = getDifficulty(type);
            const isExpanded = expandedType === type;

            return (
              <div key={type} className="flex flex-col rounded-xl border-2 border-border bg-card transition-all hover:border-primary/50 hover:shadow-md">
                {/* Main card area — click to play */}
                <button
                  onClick={() => handlePlay(type)}
                  className="group flex flex-col items-start p-5 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="text-3xl">{info.icon}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {info.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">
                    {info.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Play size={12} className="fill-primary" />
                    Play · {DIFFICULTY_LABELS[currentDiff]}
                  </span>
                </button>

                {/* Difficulty toggle strip */}
                <div className="border-t border-border px-4 py-2">
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
