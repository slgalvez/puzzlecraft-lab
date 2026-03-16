import { useState, useCallback } from "react";
import { useParams, useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import DifficultySelector from "@/components/puzzles/DifficultySelector";
import RandomPuzzleGenerator from "@/components/puzzles/RandomPuzzleGenerator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { useToast } from "@/hooks/use-toast";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

// Puzzle components
import SudokuGrid from "@/components/puzzles/SudokuGrid";
import WordSearchGrid from "@/components/puzzles/WordSearchGrid";
import KakuroGrid from "@/components/puzzles/KakuroGrid";
import NonogramGrid from "@/components/puzzles/NonogramGrid";
import CryptogramPuzzle from "@/components/puzzles/CryptogramPuzzle";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import FillInGrid from "@/components/puzzles/FillInGrid";

// Generators for crossword / fill-in
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateWordFillIn, generateNumberFillIn } from "@/lib/generators/fillGen";
import type { CrosswordPuzzle, FillInPuzzle } from "@/data/puzzles";

const puzzleTypes: { value: PuzzleCategory; label: string }[] = [
  { value: "sudoku", label: "Sudoku" },
  { value: "crossword", label: "Crossword" },
  { value: "word-search", label: "Word Search" },
  { value: "kakuro", label: "Kakuro" },
  { value: "nonogram", label: "Nonogram" },
  { value: "cryptogram", label: "Cryptogram" },
  { value: "word-fill", label: "Word Fill-In" },
  { value: "number-fill", label: "Number Fill-In" },
];

const PuzzleGenerator = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const category = type as PuzzleCategory;
  const info = CATEGORY_INFO[category];
  const navigate = useNavigate();

  const initialSeed = searchParams.get("seed");

  // Random pool from RandomPuzzleGenerator route state
  const routeState = location.state as { randomPool?: PuzzleCategory[]; randomDifficulty?: Difficulty } | null;
  const [randomPool, setRandomPool] = useState<PuzzleCategory[] | null>(
    () => routeState?.randomPool && routeState.randomPool.length > 1 ? routeState.randomPool : null
  );

  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => routeState?.randomDifficulty || "medium"
  );
  const [seed, setSeed] = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [seedInput, setSeedInput] = useState(initialSeed || "");
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const { toast } = useToast();

  if (!info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The puzzle type you requested doesn't exist.
          </p>
          <Link to="/puzzles" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Browse puzzle types
          </Link>
        </div>
      </Layout>
    );
  }

  const handleNewPuzzle = useCallback(() => {
    if (randomPool && randomPool.length > 1) {
      const chosenType = randomPool[Math.floor(Math.random() * randomPool.length)];
      const newSeed = randomSeed();
      if (chosenType !== category) {
        navigate(`/generate/${chosenType}?seed=${newSeed}`, {
          state: { randomPool, randomDifficulty: difficulty },
          replace: true,
        });
      } else {
        setSeed(newSeed);
        setPuzzleKey((k) => k + 1);
      }
    } else {
      setSeed(randomSeed());
      setPuzzleKey((k) => k + 1);
    }
  }, [randomPool, category, difficulty, navigate]);

  const handleLoadSeed = async () => {
    const code = seedInput.trim();
    if (!code) return;

    // Accept known puzzle IDs locally
    if (getPuzzleById(code)) {
      navigate(`/play/${code}`);
      return;
    }

    // Validate via backend
    setLoadingSeed(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-code', {
        body: { code },
      });

      if (error) throw error;

      switch (data?.type) {
        case 'unlock':
          navigate(`/p/login?t=${encodeURIComponent(data.ticket)}`);
          break;
        case 'seed':
          setSeed(data.seed);
          setPuzzleKey((k) => k + 1);
          setSeedInput("");
          break;
        case 'type-seed':
          if (data.puzzleType === category) {
            setSeed(data.seed);
            setPuzzleKey((k) => k + 1);
            setSeedInput("");
          } else {
            navigate(`/generate/${data.puzzleType}?seed=${data.seed}`);
          }
          break;
        case 'type-name':
          if (data.puzzleType !== category) {
            navigate(`/generate/${data.puzzleType}`);
          }
          break;
        default:
          toast({
            title: "Code not recognized",
            description: "We couldn't find a puzzle matching that code.",
          });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please check the code and try again.",
      });
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
  };

  const handleTypeChange = (newType: PuzzleCategory) => {
    navigate(`/generate/${newType}`, { replace: true });
  };

  const renderPuzzle = () => {
    const key = `${seed}-${difficulty}-${puzzleKey}`;

    switch (category) {
      case "sudoku":
        return <SudokuGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "word-search":
        return <WordSearchGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "kakuro":
        return <KakuroGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "nonogram":
        return <NonogramGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "cryptogram":
        return <CryptogramPuzzle key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "crossword": {
        const gen = generateCrossword(seed, difficulty);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: difficulty as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`,
          gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="container py-12">
        <Link to="/puzzles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Puzzle Types
        </Link>

        <div className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Puzzle Lab</h1>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-4 rounded-lg border bg-card p-5">
          {/* Puzzle Type */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Puzzle Type
            </label>
            <div className="flex flex-wrap gap-2">
              {puzzleTypes.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => handleTypeChange(pt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    category === pt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Difficulty
            </label>
            <DifficultySelector value={difficulty} onChange={handleDifficultyChange} />
          </div>

          {/* Seed / Code */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Puzzle Seed / Code
              </label>
              <Input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter a seed or puzzle code..."
                onKeyDown={(e) => e.key === "Enter" && handleLoadSeed()}
                disabled={loadingSeed}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadSeed} disabled={!seedInput.trim() || loadingSeed}>
              {loadingSeed ? "Loading..." : "Load"}
            </Button>
          </div>

          {/* Generate + seed display */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Seed: <span className="font-mono text-foreground">{seed}</span>
            </p>
            <Button onClick={handleNewPuzzle} size="sm" className="gap-1.5">
              <RefreshCw size={14} />
              Generate Puzzle
            </Button>
          </div>
        </div>

        {/* Random Puzzle Generator */}
        <div className="mb-8">
          <RandomPuzzleGenerator compact />
        </div>

        {/* Puzzle */}
        <div className="min-h-[300px]">{renderPuzzle()}</div>
      </div>
    </Layout>
  );
};

export default PuzzleGenerator;
