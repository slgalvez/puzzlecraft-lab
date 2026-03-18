import { useState, useCallback } from "react";
import { useParams, useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { RefreshCw, Dices, ChevronDown, ChevronRight, ArrowLeft, Sparkles } from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";

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

const puzzleTypes: { value: PuzzleCategory; label: string; icon: string }[] = [
  { value: "sudoku", label: "Sudoku", icon: "🧮" },
  { value: "crossword", label: "Crossword", icon: "📝" },
  { value: "word-search", label: "Word Search", icon: "🔍" },
  { value: "kakuro", label: "Kakuro", icon: "➕" },
  { value: "nonogram", label: "Nonogram", icon: "🎨" },
  { value: "cryptogram", label: "Cryptogram", icon: "🔐" },
  { value: "word-fill", label: "Word Fill-In", icon: "📖" },
  { value: "number-fill", label: "Number Fill-In", icon: "🔢" },
];

const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];
const allTypes = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];

type Mode = "generate" | "random";
type MobileStep = 1 | 2 | 3;

const PuzzleGenerator = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const category = type as PuzzleCategory;
  const info = CATEGORY_INFO[category];
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const initialSeed = searchParams.get("seed");
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
  const [puzzleGenerated, setPuzzleGenerated] = useState(!!info);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Mode & mobile stepper
  const [mode, setMode] = useState<Mode>("generate");
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);

  // Random tab state
  const [randomTypes, setRandomTypes] = useState<Set<PuzzleCategory>>(
    new Set(allTypes.map(([t]) => t))
  );
  const [randomDifficulty, setRandomDifficulty] = useState<Difficulty | "any">("any");

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

  if (!info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <p className="mt-2 text-sm text-muted-foreground">The puzzle type you requested doesn't exist.</p>
          <Link to="/puzzles" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Browse puzzle types
          </Link>
        </div>
      </Layout>
    );
  }

  const handleLoadSeed = async () => {
    const code = seedInput.trim();
    if (!code) return;
    if (getPuzzleById(code)) { navigate(`/play/${code}`); return; }
    setLoadingSeed(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-code', { body: { code } });
      if (error) throw error;
      switch (data?.type) {
        case 'unlock': navigate(`/p/login?t=${encodeURIComponent(data.ticket)}`); break;
        case 'seed': setSeed(data.seed); setPuzzleKey((k) => k + 1); setSeedInput(""); break;
        case 'type-seed':
          if (data.puzzleType === category) { setSeed(data.seed); setPuzzleKey((k) => k + 1); setSeedInput(""); }
          else navigate(`/generate/${data.puzzleType}?seed=${data.seed}`);
          break;
        case 'type-name':
          if (data.puzzleType !== category) navigate(`/generate/${data.puzzleType}`);
          break;
        default: toast({ title: "Code not recognized", description: "We couldn't find a puzzle matching that code." });
      }
    } catch { toast({ title: "Something went wrong", description: "Please check the code and try again." }); }
    finally { setLoadingSeed(false); }
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
    setPuzzleGenerated(true);
    if (isMobile) setMobileStep(3);
  };

  const handleTypeChange = (newType: PuzzleCategory) => {
    setRandomPool(null);
    if (isMobile) setMobileStep(2);
    navigate(`/generate/${newType}`, { replace: true });
  };

  const handleGenerate = () => {
    setSeed(randomSeed());
    setPuzzleKey((k) => k + 1);
    setPuzzleGenerated(true);
    if (isMobile) setMobileStep(3);
  };

  // Random tab
  const toggleRandomType = (type: PuzzleCategory) => {
    setRandomTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { if (next.size > 1) next.delete(type); }
      else next.add(type);
      return next;
    });
  };

  const handleRandomGenerate = () => {
    const types = Array.from(randomTypes);
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const newSeed = randomSeed();
    const diff: Difficulty = randomDifficulty === "any"
      ? difficulties[Math.floor(Math.random() * difficulties.length)][0]
      : randomDifficulty;
    setDifficulty(diff);
    navigate(`/generate/${chosenType}?seed=${newSeed}`, {
      state: { randomPool: types, randomDifficulty: diff },
    });
  };

  const renderPuzzle = () => {
    const key = `${seed}-${difficulty}-${puzzleKey}`;
    switch (category) {
      case "sudoku": return <SudokuGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "word-search": return <WordSearchGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "kakuro": return <KakuroGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "nonogram": return <NonogramGrid key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "cryptogram": return <CryptogramPuzzle key={key} seed={seed} difficulty={difficulty} onNewPuzzle={handleNewPuzzle} />;
      case "crossword": {
        const gen = generateCrossword(seed, difficulty);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: difficulty as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, difficulty);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: difficulty as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} />;
      }
      default: return null;
    }
  };

  // ─── Mobile Generate Stepper ───
  const renderMobileGenerate = () => {
    if (mobileStep === 3 && puzzleGenerated) {
      return (
        <div>
          <button
            onClick={() => setMobileStep(1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> New puzzle
          </button>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PuzzleIcon type={category} size={24} className="text-foreground" />
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">{info.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{difficulty}</p>
              </div>
            </div>
            <Button onClick={handleGenerate} size="sm" variant="outline" className="gap-1.5">
              <RefreshCw size={13} /> New
            </Button>
          </div>
          <div className="min-h-[300px]">{renderPuzzle()}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-[60vh] justify-center">
        {mobileStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 1 of 2</p>
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Choose Puzzle Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {puzzleTypes.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => handleTypeChange(pt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all",
                    category === pt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <PuzzleIcon type={pt.value} size={28} className="text-foreground" />
                  <span className="text-sm font-medium text-foreground">{pt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mobileStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setMobileStep(1)}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 2 of 2</p>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Choose Difficulty</h2>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="text-lg mr-1">{info.icon}</span> {info.name}
            </p>
            <div className="flex flex-col gap-3">
              {difficulties.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleDifficultyChange(val)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all",
                    difficulty === val
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span className="text-base font-medium text-foreground">{label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Mobile Random ───
  const renderMobileRandom = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center">
        <Dices size={32} className="mx-auto text-primary mb-2" />
        <h2 className="font-display text-xl font-bold text-foreground">Surprise Me</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick types and difficulty, we'll do the rest</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Puzzle Types</label>
          <div className="flex gap-2">
            <button onClick={() => setRandomTypes(new Set(allTypes.map(([t]) => t)))} className="text-[10px] font-medium text-primary hover:underline">All</button>
            <button onClick={() => setRandomTypes(new Set([allTypes[0][0]]))} className="text-[10px] font-medium text-primary hover:underline">Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allTypes.map(([type, info]) => (
            <button
              key={type}
              onClick={() => toggleRandomType(type)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                randomTypes.has(type)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <span>{info.icon}</span>
              <span>{info.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Difficulty</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRandomDifficulty("any")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              randomDifficulty === "any" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Any
          </button>
          {difficulties.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRandomDifficulty(val)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                randomDifficulty === val ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleRandomGenerate} size="lg" className="w-full gap-2 text-base">
        <Dices size={18} />
        Generate Random Puzzle
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">
        {randomTypes.size === allTypes.length ? "From all puzzle types" : `From ${randomTypes.size} selected type${randomTypes.size > 1 ? "s" : ""}`}
      </p>
    </div>
  );

  // ─── Desktop Layout ───
  const renderDesktopGenerate = () => (
    <div className="space-y-8">
      {/* Puzzle Type */}
      <div>
        <label className="mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Puzzle Type
        </label>
        <div className="grid grid-cols-4 gap-3">
          {puzzleTypes.map((pt) => (
            <button
              key={pt.value}
              onClick={() => handleTypeChange(pt.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all",
                category === pt.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <span className="text-xl">{pt.icon}</span>
              <span className="text-sm font-medium text-foreground">{pt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-2">
          {difficulties.map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setDifficulty(val); }}
              className={cn(
                "rounded-full border-2 px-5 py-2 text-sm font-medium transition-all",
                difficulty === val
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action */}
      <div className="flex items-center gap-4">
        <Button onClick={handleGenerate} size="lg" className="gap-2 text-base px-8">
          <Sparkles size={18} />
          Generate Puzzle
        </Button>
        {puzzleGenerated && (
          <p className="text-xs text-muted-foreground">
            Seed: <span className="font-mono text-foreground">{seed}</span>
          </p>
        )}
        {randomPool && randomPool.length > 1 && (
          <p className="text-[10px] text-primary/70 flex items-center gap-1">
            <Dices size={10} />
            Random mode
            <button onClick={() => setRandomPool(null)} className="ml-1 text-muted-foreground hover:text-foreground">✕</button>
          </p>
        )}
      </div>

      {/* Advanced (collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown size={14} className={cn("transition-transform", advancedOpen && "rotate-180")} />
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg border bg-card p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Puzzle Seed / Code
            </label>
            <div className="flex items-center gap-3">
              <Input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter a seed or puzzle code..."
                onKeyDown={(e) => e.key === "Enter" && handleLoadSeed()}
                disabled={loadingSeed}
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={handleLoadSeed} disabled={!seedInput.trim() || loadingSeed}>
                {loadingSeed ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  const renderDesktopRandom = () => (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Dices size={24} className="text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Surprise Me</h2>
        </div>
        <p className="text-sm text-muted-foreground">Select puzzle types and difficulty — we'll pick one at random</p>
      </div>

      {/* Types multi-select */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Puzzle Types</label>
          <div className="flex gap-2">
            <button onClick={() => setRandomTypes(new Set(allTypes.map(([t]) => t)))} className="text-xs font-medium text-primary hover:underline">All</button>
            <span className="text-xs text-muted-foreground">·</span>
            <button onClick={() => setRandomTypes(new Set([allTypes[0][0]]))} className="text-xs font-medium text-primary hover:underline">Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {allTypes.map(([type, info]) => (
            <button
              key={type}
              onClick={() => toggleRandomType(type)}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all text-left",
                randomTypes.has(type)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              )}
            >
              <span>{info.icon}</span>
              <span>{info.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Difficulty</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRandomDifficulty("any")}
            className={cn(
              "rounded-full border-2 px-5 py-2 text-sm font-medium transition-all",
              randomDifficulty === "any" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Any
          </button>
          {difficulties.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRandomDifficulty(val)}
              className={cn(
                "rounded-full border-2 px-5 py-2 text-sm font-medium transition-all",
                randomDifficulty === val ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Button onClick={handleRandomGenerate} size="lg" className="gap-2 text-base px-8">
          <Dices size={18} />
          Generate Random Puzzle
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          {randomTypes.size === allTypes.length ? "From all puzzle types" : `From ${randomTypes.size} selected type${randomTypes.size > 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Puzzle Lab</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize and generate puzzles your way</p>
        </div>

        {/* Mode Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          <button
            onClick={() => setMode("generate")}
            className={cn(
              "rounded-md px-5 py-2 text-sm font-medium transition-all",
              mode === "generate"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Generate
          </button>
          <button
            onClick={() => setMode("random")}
            className={cn(
              "rounded-md px-5 py-2 text-sm font-medium transition-all",
              mode === "random"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Random
          </button>
        </div>

        {/* Content */}
        {mode === "generate" ? (
          <>
            {isMobile ? renderMobileGenerate() : (
              <>
                {renderDesktopGenerate()}
                {puzzleGenerated && (
                  <div className="mt-10 min-h-[300px]">{renderPuzzle()}</div>
                )}
              </>
            )}
          </>
        ) : (
          isMobile ? renderMobileRandom() : renderDesktopRandom()
        )}
      </div>
    </Layout>
  );
};

export default PuzzleGenerator;
