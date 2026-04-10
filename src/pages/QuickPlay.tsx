import { useState, useCallback, useEffect, useMemo } from "react";
import { getPackPuzzleWordBank } from "@/lib/weeklyPacks";
import { goBackOrFallback } from "@/lib/navigation";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory, isDifficultyDisabled, getEffectiveDifficulty } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { cn } from "@/lib/utils";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { ArrowLeft, Dices, Infinity, TrendingUp, TrendingDown, Minus, Square } from "lucide-react";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/premium/UpgradeModal";
import DifficultySelector from "@/components/puzzles/DifficultySelector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { computeNextDifficulty, createDifficultyMap, type PuzzlePerformance } from "@/lib/endlessDifficulty";
import EndlessSummary, { type EndlessSolveRecord } from "@/components/puzzles/EndlessSummary";
import EndlessFlash from "@/components/puzzles/EndlessFlash";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";

// Puzzle components
import SudokuGrid from "@/components/puzzles/SudokuGrid";
import WordSearchGrid from "@/components/puzzles/WordSearchGrid";
import KakuroGrid from "@/components/puzzles/KakuroGrid";
import NonogramGrid from "@/components/puzzles/NonogramGrid";
import CryptogramPuzzle from "@/components/puzzles/CryptogramPuzzle";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";

// Generators
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateWordFillIn, generateNumberFillIn } from "@/lib/generators/fillGen";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";


const allTypes = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
const allDifficulties = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

type PlayMode = "default" | "surprise" | "endless";

const QuickPlay = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const category = type as PuzzleCategory;
  const info = CATEGORY_INFO[category];

  const mode: PlayMode = (searchParams.get("mode") as PlayMode) || "default";
  const initialDifficulty = (searchParams.get("d") as Difficulty) || "medium";
  const initialSeed = searchParams.get("seed");
  const packId = searchParams.get("pack");
  const packPuzzleId = searchParams.get("packPuzzle");

  const packWordData = useMemo(() => {
    if (!packId || !packPuzzleId) return null;
    return getPackPuzzleWordBank(packId, packPuzzleId);
  }, [packId, packPuzzleId]);

  // Set origin context
  useEffect(() => {
    setPuzzleOrigin("play");
  }, []);

  const {
    isPremium,
    isDiffLocked,
    isEndlessLocked,
    endlessSessionCap,
    availableDifficulties,
  } = usePremiumAccess();

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [seed, setSeed] = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [currentType, setCurrentType] = useState<PuzzleCategory>(category);
  const currentInfo = CATEGORY_INFO[currentType] || info;

  // Endless mode state
  const [endlessDiffMap, setEndlessDiffMap] = useState(() => createDifficultyMap());
  const [endlessCount, setEndlessCount] = useState(1);
  const [lastDiffChange, setLastDiffChange] = useState<"up" | "down" | "stay" | null>(null);
  const [endlessSolves, setEndlessSolves] = useState<EndlessSolveRecord[]>([]);

  // True when a free user has hit their per-session puzzle cap in endless mode.
  const capReached =
    mode === "endless" &&
    endlessSessionCap !== null &&
    endlessSolves.length >= endlessSessionCap;
  const [showSummary, setShowSummary] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const activeDifficulty = mode === "endless" ? endlessDiffMap[currentType] : difficulty;
  // For generation: downgrade unsupported difficulties (e.g. kakuro insane → extreme)
  const effectiveDifficulty = getEffectiveDifficulty(currentType, activeDifficulty);

  // Memoize heavy generators to prevent re-running on every render (mobile Safari crash fix)
  const generatedPuzzle = useMemo(() => {
    try {
      switch (currentType) {
        case "crossword": {
          const gen = generateCrossword(seed, effectiveDifficulty);
          return {
            id: `gen-${seed}`, title: "Generated Crossword", type: "crossword" as const,
            difficulty: effectiveDifficulty as CrosswordPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
          } satisfies CrosswordPuzzle;
        }
        case "word-fill": {
          const gen = generateWordFillIn(seed, effectiveDifficulty);
          return {
            id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill" as const,
            difficulty: effectiveDifficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
          } satisfies FillInPuzzle;
        }
        case "number-fill": {
          const gen = generateNumberFillIn(seed, effectiveDifficulty);
          return {
            id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill" as const,
            difficulty: effectiveDifficulty as FillInPuzzle["difficulty"],
            size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
          } satisfies FillInPuzzle;
        }
        default:
          return null;
      }
    } catch (e) {
      console.error("Puzzle generation failed:", e);
      return null;
    }
  }, [currentType, seed, effectiveDifficulty]);

  const handleNewPuzzle = useCallback(() => {
    if (mode === "surprise") {
      const newType = allTypes[Math.floor(Math.random() * allTypes.length)];
      const allowedDiffs = allDifficulties.filter((d) => availableDifficulties.includes(d));
      const newDiff = allowedDiffs[Math.floor(Math.random() * allowedDiffs.length)] as Difficulty;
      const newSeed = randomSeed();
      setCurrentType(newType);
      setDifficulty(newDiff);
      setSeed(newSeed);
      setPuzzleKey((k) => k + 1);
      window.history.replaceState(null, "", `/quick-play/${newType}?d=${newDiff}&seed=${newSeed}&mode=surprise`);
    } else if (mode === "endless") {
      const newType = allTypes[Math.floor(Math.random() * allTypes.length)];
      const newSeed = randomSeed();
      setCurrentType(newType);
      setSeed(newSeed);
      setPuzzleKey((k) => k + 1);
      setEndlessCount((c) => c + 1);
      setLastDiffChange(null);
      window.history.replaceState(null, "", `/quick-play/${newType}?mode=endless`);
    } else {
      setSeed(randomSeed());
      setPuzzleKey((k) => k + 1);
    }
  }, [mode]);

  const handleEndlessSolve = useCallback((perf: PuzzlePerformance) => {
    if (mode !== "endless") return;
    const current = endlessDiffMap[currentType];
    const { next, direction } = computeNextDifficulty(current, perf);

    // Record solve
    setEndlessSolves((prev) => [...prev, {
      type: currentType,
      difficulty: current,
      elapsed: perf.elapsed,
      diffChange: direction,
    }]);

    if (direction !== "stay") {
      setEndlessDiffMap((prev) => ({ ...prev, [currentType]: next }));
    }
    setLastDiffChange(direction);
    setShowFlash(true);

    // ── Cap enforcement ──────────────────────────────────────────────────────────
    // After recording this solve, check whether the free session cap is now reached.
    if (
      !isPremium &&
      endlessSessionCap !== null &&
      endlessSolves.length + 1 >= endlessSessionCap
    ) {
      setTimeout(() => {
        setShowSummary(true);
        setUpgradeOpen(true);
      }, 700);
    }

    if (direction === "up") {
      toast({
        title: "⬆️ Difficulty increased",
        description: `${CATEGORY_INFO[currentType].name} → ${DIFFICULTY_LABELS[next]}`,
      });
    } else if (direction === "down") {
      toast({
        title: "⬇️ Difficulty eased",
        description: `${CATEGORY_INFO[currentType].name} → ${DIFFICULTY_LABELS[next]}`,
      });
    }
  }, [mode, currentType, endlessDiffMap, toast]);

  const handleEndSession = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setShowSummary(false);
    setEndlessSolves([]);
    setEndlessDiffMap(createDifficultyMap());
    setEndlessCount(1);
    setLastDiffChange(null);
    const newType = allTypes[Math.floor(Math.random() * allTypes.length)];
    const newSeed = randomSeed();
    setCurrentType(newType);
    setSeed(newSeed);
    setPuzzleKey((k) => k + 1);
    window.history.replaceState(null, "", `/quick-play/${newType}?mode=endless`);
  }, []);

  const handleDifficultyChange = (d: Difficulty) => {
    if (isDiffLocked(d)) {
      setUpgradeOpen(true);
      return;
    }
    setDifficulty(d);
    try {
      const stored = JSON.parse(localStorage.getItem("play_difficulties") || "{}");
      stored[currentType] = d;
      localStorage.setItem("play_difficulties", JSON.stringify(stored));
    } catch { /* ignore */ }
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  };

  const handleFlashDone = useCallback(() => {
    setShowFlash(false);
    handleNewPuzzle();
  }, [handleNewPuzzle]);

  // Show summary screen
  if (mode === "endless" && showSummary) {
    return (
      <EndlessSummary
        solves={endlessSolves}
        diffMap={endlessDiffMap}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (!info && !currentInfo) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <button onClick={() => navigate("/puzzles")} className="mt-4 text-sm font-medium text-primary hover:underline">
            ← Back to Play
          </button>
        </div>
      </Layout>
    );
  }

  const activeType = currentType;
  const activeInfo = currentInfo;
  const onSolveHandler = mode === "endless" ? handleEndlessSolve : undefined;
  const isEndless = mode === "endless";


  const renderPuzzle = () => {
    const key = `${seed}-${effectiveDifficulty}-${puzzleKey}`;
    switch (activeType) {
      case "sudoku": return <SudokuGrid key={key} seed={seed} difficulty={effectiveDifficulty} onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} />;
      case "word-search": return <WordSearchGrid key={key} seed={seed} difficulty={effectiveDifficulty} onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} words={packWordData?.wordBank} />;
      case "kakuro": return <KakuroGrid key={key} seed={seed} difficulty={effectiveDifficulty} onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} />;
      case "nonogram": return <NonogramGrid key={key} seed={seed} difficulty={effectiveDifficulty} onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} />;
      case "cryptogram": return <CryptogramPuzzle key={key} seed={seed} difficulty={effectiveDifficulty} onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} forcedQuote={packWordData?.quote} />;
      case "crossword":
        return generatedPuzzle ? (
          <CrosswordGrid key={key} puzzle={generatedPuzzle as CrosswordPuzzle} showControls onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} />
        ) : null;
      case "word-fill":
      case "number-fill":
        return generatedPuzzle ? (
          <FillInGrid key={key} puzzle={generatedPuzzle as FillInPuzzle} showControls onNewPuzzle={handleNewPuzzle} onSolve={onSolveHandler} isEndless={isEndless} />
        ) : null;
      default: return null;
    }
  };

  const modeLabel = mode === "surprise" ? "Surprise Puzzle" : mode === "endless" ? "Endless Mode" : null;
  const ModeIcon = mode === "surprise" ? Dices : mode === "endless" ? Infinity : null;

  return (
    <Layout>
      <div className="container py-4 md:py-10">
        {/* Minimal header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => goBackOrFallback(navigate, "/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          {mode === "endless" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndSession}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Square size={12} />
              End Session
            </Button>
          )}
        </div>

        {/* Mode badge + puzzle identity */}
        <div className="mb-4 md:mb-6">
          {modeLabel && ModeIcon && (
            <div className="flex items-center gap-1.5 mb-2">
              <ModeIcon size={14} className="text-primary" />
              <span className="text-xs font-medium uppercase tracking-widest text-primary">{modeLabel}</span>
              {mode === "endless" && (
                <span className="text-xs text-muted-foreground ml-2">#{endlessCount}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-3">
            <PuzzleIcon type={activeType} size={28} className="text-foreground" />
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">{activeInfo.name}</h1>
          </div>

          {mode === "default" && (
            <DifficultySelector
              difficulty={activeDifficulty}
              onChange={handleDifficultyChange}
              puzzleType={activeType}
            />
          )}

          {mode === "surprise" && (
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize",
              DIFFICULTY_SELECTED[effectiveDifficulty] || "text-muted-foreground"
            )}>
              {DIFFICULTY_LABELS[effectiveDifficulty]}
            </span>
          )}

          {mode === "endless" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Difficulty:</span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize",
                DIFFICULTY_SELECTED[effectiveDifficulty] || "text-muted-foreground"
              )}>
                {DIFFICULTY_LABELS[effectiveDifficulty]}
              </span>
              {lastDiffChange === "up" && <TrendingUp size={12} className="text-primary" />}
              {lastDiffChange === "down" && <TrendingDown size={12} className="text-destructive" />}
              {lastDiffChange === "stay" && <Minus size={12} className="text-muted-foreground" />}
              {endlessSolves.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  · {endlessSolves.length} solved
                </span>
              )}
              {/* Free session cap counter */}
              {!isPremium && endlessSessionCap !== null && (
                <span
                  className={cn(
                    "text-xs ml-1",
                    endlessSolves.length >= endlessSessionCap - 2
                      ? "text-destructive font-medium"
                      : "text-muted-foreground/60"
                  )}
                >
                  · {Math.max(0, endlessSessionCap - endlessSolves.length)} left
                </span>
              )}
            </div>
          )}
        </div>

        {/* Puzzle */}
        <div className="min-h-[300px]">
          {renderPuzzle()}
        </div>
        {showFlash && <EndlessFlash onDone={handleFlashDone} />}
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
};

export default QuickPlay;
