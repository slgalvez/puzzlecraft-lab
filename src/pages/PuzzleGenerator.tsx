import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory, isDifficultyDisabled, getEffectiveDifficulty } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { RefreshCw, Dices, ChevronDown, ChevronRight, ArrowLeft, Sparkles, Clock, Lightbulb, Eye, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
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
  const category = type as PuzzleCategory | undefined;
  const info = category ? CATEGORY_INFO[category] : undefined;
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const hintLimits: { value: number | null; label: string }[] = [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: null, label: "∞" },
  ];

  const renderAssists = (compact = false) => (
    <div>
      <label className={cn("mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground", compact && "mb-2")}>
        Assists
      </label>
      <div className="space-y-3">
        {/* Hints toggle */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={hintsEnabled} onCheckedChange={setHintsEnabled} id="hints-toggle" />
            <label htmlFor="hints-toggle" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
              <Lightbulb size={14} className="text-muted-foreground" />
              Hints
            </label>
          </div>
          {hintsEnabled && (
            <div className="ml-10 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Limit:</span>
              {hintLimits.map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setHintLimit(value)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors min-w-[28px]",
                    hintLimit === value
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
        {/* Reveal toggle */}
        <div className="flex items-center gap-2">
          <Switch checked={revealEnabled} onCheckedChange={setRevealEnabled} id="reveal-toggle" />
          <label htmlFor="reveal-toggle" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
            <Eye size={14} className="text-muted-foreground" />
            Reveal
          </label>
        </div>
      </div>
    </div>
  );

  useEffect(() => { setPuzzleOrigin("lab"); }, []);

  const initialSeed = searchParams.get("seed");
  const routeState = location.state as { randomPool?: PuzzleCategory[]; randomDifficulty?: Difficulty } | null;

  const [randomPool, setRandomPool] = useState<PuzzleCategory[] | null>(
    () => routeState?.randomPool && routeState.randomPool.length > 1 ? routeState.randomPool : null
  );
  const [difficulty, setDifficulty] = useState<Difficulty | null>(
    () => routeState?.randomDifficulty || null
  );
  const [seed, setSeed] = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [seedInput, setSeedInput] = useState(initialSeed || "");
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [puzzleGenerated, setPuzzleGenerated] = useState(
    () => !!(routeState?.randomPool && routeState.randomDifficulty)
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [randomSettingsOpen, setRandomSettingsOpen] = useState(false);

  // Random settings with localStorage persistence
  const RANDOM_SETTINGS_KEY = "puzzlecraft-random-settings";
  interface RandomSettings { timer: boolean; timerMin: number; timerSec: number; hints: boolean; hintLimit: number | null; reveal: boolean; }
  const defaultRandomSettings: RandomSettings = { timer: false, timerMin: 5, timerSec: 0, hints: true, hintLimit: 3, reveal: true };

  const loadRandomSettings = (): RandomSettings => {
    try {
      const raw = localStorage.getItem(RANDOM_SETTINGS_KEY);
      if (raw) { const parsed = JSON.parse(raw); return { ...defaultRandomSettings, ...parsed }; }
    } catch { /* ignore */ }
    return defaultRandomSettings;
  };

  const [randomSettings, setRandomSettings] = useState<RandomSettings>(loadRandomSettings);

  const updateRandomSetting = <K extends keyof RandomSettings>(key: K, value: RandomSettings[K]) => {
    setRandomSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(RANDOM_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetRandomSettings = () => {
    localStorage.removeItem(RANDOM_SETTINGS_KEY);
    setRandomSettings(defaultRandomSettings);
  };

  // Derive convenience accessors from randomSettings (used throughout render)
  const timeLimitEnabled = randomSettings.timer;
  const setTimeLimitEnabled = (v: boolean) => updateRandomSetting("timer", v);
  const timeLimitMinutes = randomSettings.timerMin;
  const setTimeLimitMinutes = (v: number) => updateRandomSetting("timerMin", v);
  const timeLimitSeconds = randomSettings.timerSec;
  const setTimeLimitSeconds = (v: number) => updateRandomSetting("timerSec", v);
  const hintsEnabled = randomSettings.hints;
  const setHintsEnabled = (v: boolean) => updateRandomSetting("hints", v);
  const hintLimit = randomSettings.hintLimit;
  const setHintLimit = (v: number | null) => updateRandomSetting("hintLimit", v);
  const revealEnabled = randomSettings.reveal;
  const setRevealEnabled = (v: boolean) => updateRandomSetting("reveal", v);

  // Mode & mobile stepper
  const [mode, setMode] = useState<Mode>(() => routeState?.randomPool ? "random" : "generate");
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);

  // Generate tab: multi-select types
  const [generateTypes, setGenerateTypes] = useState<Set<PuzzleCategory>>(
    () => category ? new Set([category]) : new Set()
  );




  const handleNewPuzzle = useCallback(() => {
    const pool = randomPool ?? (generateTypes.size > 1 ? Array.from(generateTypes) : null);
    if (pool && pool.length > 1) {
      const chosenType = pool[Math.floor(Math.random() * pool.length)];
      const newSeed = randomSeed();
      if (chosenType !== category) {
        navigate(`/generate/${chosenType}?seed=${newSeed}`, {
          state: { randomPool: pool, randomDifficulty: difficulty },
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
  }, [randomPool, generateTypes, category, difficulty, navigate]);

  // Show error for truly invalid types (not just missing)
  if (type && !info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <p className="mt-2 text-sm text-muted-foreground">The puzzle type you requested doesn't exist.</p>
          <Link to="/generate" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to Puzzle Lab
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

  // Auto-generate when arriving with a seed from URL and user picks difficulty
  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    // If we have a seed from URL and haven't generated yet, auto-generate
    if (initialSeed && !puzzleGenerated) {
      setPuzzleKey((k) => k + 1);
      setPuzzleGenerated(true);
      if (isMobile) setMobileStep(3);
    }
  };

  const toggleGenerateType = (t: PuzzleCategory) => {
    setGenerateTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    // On mobile step 1, don't navigate yet — wait for explicit "Next"
    if (!isMobile) {
      // Navigate to show the type in URL (pick last toggled if adding, or first remaining)
      setPuzzleGenerated(false);
    }
  };

  const handleTypeChange = (newType: PuzzleCategory) => {
    setGenerateTypes(new Set([newType]));
    setRandomPool(null);
    setPuzzleGenerated(false);
    if (isMobile) setMobileStep(2);
    navigate(`/generate/${newType}`, { replace: true });
  };

  const canGenerate = generateTypes.size > 0 && !!difficulty;

  const handleGenerate = () => {
    if (!canGenerate) {
      toast({
        title: "Missing selections",
        description: "Select at least one puzzle type and difficulty to generate",
      });
      return;
    }
    const types = Array.from(generateTypes);
    const chosenType = types.length === 1 ? types[0] : types[Math.floor(Math.random() * types.length)];
    const newSeed = puzzleGenerated || !initialSeed ? randomSeed() : seed;

    if (types.length > 1) {
      setRandomPool(types);
    } else {
      setRandomPool(null);
    }

    if (chosenType !== category) {
      navigate(`/generate/${chosenType}?seed=${newSeed}`, {
        state: types.length > 1 ? { randomPool: types, randomDifficulty: difficulty } : undefined,
        replace: true,
      });
    }

    setSeed(newSeed);
    setPuzzleKey((k) => k + 1);
    setPuzzleGenerated(true);
    if (isMobile) setMobileStep(3);
  };

  const handleClear = () => {
    setDifficulty(null);
    setPuzzleGenerated(false);
    setSeed(randomSeed());
    setPuzzleKey(0);
    setRandomPool(null);
    setGenerateTypes(new Set());
    setSeedInput("");
    setAdvancedOpen(false);
    if (isMobile) setMobileStep(1);
    navigate("/generate", { replace: true });
  };

  // Random tab — fully random, no user selection needed
  const handleRandomGenerate = () => {
    const allTypeKeys = allTypes.map(([t]) => t);
    const chosenType = allTypeKeys[Math.floor(Math.random() * allTypeKeys.length)];
    const newSeed = randomSeed();
    const validDiffs = difficulties.filter(([val]) => !isDifficultyDisabled(chosenType, val));
    const diff = validDiffs[Math.floor(Math.random() * validDiffs.length)][0];
    setDifficulty(diff);
    setMode("random");
    setSeed(newSeed);
    setPuzzleGenerated(true);
    setRandomPool(allTypeKeys);
    setPuzzleKey((k) => k + 1);
    navigate(`/generate/${chosenType}?seed=${newSeed}`, {
      state: { randomPool: allTypeKeys, randomDifficulty: diff },
      replace: true,
    });
  };

  const activeTimeLimit = timeLimitEnabled ? (timeLimitMinutes * 60 + timeLimitSeconds) : undefined;

  const assistProps = {
    showHints: hintsEnabled,
    showReveal: revealEnabled,
    maxHints: hintsEnabled ? hintLimit : undefined,
  };

  const renderPuzzle = () => {
    if (!category || !difficulty) return null;
    const d = getEffectiveDifficulty(category, difficulty as Difficulty);
    const key = `${seed}-${d}-${puzzleKey}`;
    switch (category) {
      case "sudoku": return <SudokuGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      case "word-search": return <WordSearchGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      case "kakuro": return <KakuroGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      case "nonogram": return <NonogramGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      case "cryptogram": return <CryptogramPuzzle key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      case "crossword": {
        const gen = generateCrossword(seed, d);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: d as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, d);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: d as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, d);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: d as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      default: return null;
    }
  };

  // ─── Mobile Generate Stepper ───
  const renderMobileGenerate = () => {
    if (mobileStep === 3 && puzzleGenerated && category && info && difficulty) {
      return (
        <div>
          <button
            onClick={handleClear}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> New puzzle
          </button>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PuzzleIcon type={category} size={24} className="text-foreground" />
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">{info.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{DIFFICULTY_LABELS[getEffectiveDifficulty(category, difficulty)]}</p>
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
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Choose Puzzle Type</h2>
            <p className="text-sm text-muted-foreground mb-6">Select one or more types</p>
            <div className="grid grid-cols-2 gap-3">
              {puzzleTypes.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => toggleGenerateType(pt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all",
                    generateTypes.has(pt.value)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <PuzzleIcon type={pt.value} size={28} className="text-foreground" />
                  <span className="text-sm font-medium text-foreground">{pt.label}</span>
                </button>
              ))}
            </div>
            {generateTypes.size > 0 && (
              <div className="mt-6">
                <Button
                  onClick={() => {
                    // Navigate to first selected type for URL consistency
                    const first = Array.from(generateTypes)[0];
                    navigate(`/generate/${first}`, { replace: true });
                    setMobileStep(2);
                  }}
                  size="lg"
                  className="w-full gap-2 text-base"
                >
                  Next — {generateTypes.size === 1 ? CATEGORY_INFO[Array.from(generateTypes)[0]].name : `${generateTypes.size} types`}
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}

        {mobileStep === 2 && generateTypes.size > 0 && (
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
              {generateTypes.size === 1 ? (
                <><PuzzleIcon type={Array.from(generateTypes)[0]} size={20} className="text-foreground mr-1 inline-block align-text-bottom" /> {CATEGORY_INFO[Array.from(generateTypes)[0]].name}</>
              ) : (
                <>{generateTypes.size} puzzle types selected</>
              )}
            </p>
            <div className="flex flex-col gap-3">
              {difficulties.map(([val, label]) => {
                const selectedTypes = Array.from(generateTypes);
                const disabled = selectedTypes.every(t => isDifficultyDisabled(t, val));
                return (
                  <button
                    key={val}
                    onClick={() => {
                      if (disabled) {
                        toast({ title: `${label} not available for selected types` });
                        return;
                      }
                      handleDifficultyChange(val);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all",
                      disabled
                        ? "border-border bg-card text-muted-foreground/40 cursor-not-allowed"
                        : difficulty === val
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <span className={cn("text-base font-medium", disabled ? "text-muted-foreground/40" : "text-foreground")}>{label}</span>
                    {!disabled && <ChevronRight size={16} className="text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
            {difficulty && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={timeLimitEnabled}
                    onCheckedChange={setTimeLimitEnabled}
                    id="time-limit-toggle-mobile"
                  />
                  <label htmlFor="time-limit-toggle-mobile" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
                    <Clock size={14} className="text-muted-foreground" />
                    Timer
                  </label>
                </div>
                {timeLimitEnabled && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={timeLimitSeconds}
                      onChange={(e) => setTimeLimitSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                )}
                {renderAssists(true)}
                <Button onClick={handleGenerate} size="lg" className="w-full gap-2 text-base">
                  <Sparkles size={18} />
                  Generate Puzzle
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Mobile Random ───
  const renderMobileRandom = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
      <Dices size={48} className="text-primary mb-4" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Surprise Me</h2>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
        We'll pick a random puzzle type and difficulty — just tap and play
      </p>

      {/* Collapsible Settings */}
      <Collapsible open={randomSettingsOpen} onOpenChange={setRandomSettingsOpen} className="w-full max-w-xs mb-6">
        <CollapsibleTrigger className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown size={14} className={cn("transition-transform", randomSettingsOpen && "rotate-180")} />
          Settings
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={timeLimitEnabled} onCheckedChange={setTimeLimitEnabled} id="random-timer-mobile" />
              <label htmlFor="random-timer-mobile" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
                <Clock size={14} className="text-muted-foreground" /> Timer
              </label>
            </div>
            {timeLimitEnabled && (
              <div className="ml-10 flex items-center gap-1.5">
                <Input type="number" min={0} max={120} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))} className="w-14 h-7 text-center text-xs" />
                <span className="text-xs text-muted-foreground">min</span>
                <Input type="number" min={0} max={59} value={timeLimitSeconds} onChange={(e) => setTimeLimitSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="w-14 h-7 text-center text-xs" />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={hintsEnabled} onCheckedChange={setHintsEnabled} id="random-hints-mobile" />
              <label htmlFor="random-hints-mobile" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
                <Lightbulb size={14} className="text-muted-foreground" /> Hints
              </label>
            </div>
            {hintsEnabled && (
              <div className="ml-10 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Limit:</span>
                {hintLimits.map(({ value, label }) => (
                  <button key={label} onClick={() => setHintLimit(value)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors min-w-[28px]", hintLimit === value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={revealEnabled} onCheckedChange={setRevealEnabled} id="random-reveal-mobile" />
            <label htmlFor="random-reveal-mobile" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
              <Eye size={14} className="text-muted-foreground" /> Reveal
            </label>
          </div>
          <button onClick={resetRandomSettings} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1">
            <RotateCcw size={11} /> Reset to defaults
          </button>
        </CollapsibleContent>
      </Collapsible>

      <Button onClick={handleRandomGenerate} size="lg" className="w-full max-w-xs gap-2 text-base">
        <Dices size={18} />
        Surprise Me
      </Button>
    </div>
  );

  // ─── Desktop Layout ───
  const renderDesktopGenerate = () => (
    <div className="space-y-8">
      {/* Puzzle Type — multi-select */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Puzzle Type
          </label>
          <div className="flex gap-2">
            <button onClick={() => setGenerateTypes(new Set(puzzleTypes.map(pt => pt.value)))} className="text-xs font-medium text-primary hover:underline">All</button>
            <span className="text-xs text-muted-foreground">·</span>
            <button onClick={() => { setGenerateTypes(new Set()); setPuzzleGenerated(false); }} className="text-xs font-medium text-primary hover:underline">Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {puzzleTypes.map((pt) => (
            <button
              key={pt.value}
              onClick={() => toggleGenerateType(pt.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all",
                generateTypes.has(pt.value)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <PuzzleIcon type={pt.value} size={22} className="text-foreground" />
              <span className="text-sm font-medium text-foreground">{pt.label}</span>
            </button>
          ))}
        </div>
        {generateTypes.size > 1 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {generateTypes.size} types selected — a random one will be picked on generate
          </p>
        )}
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-2">
          {difficulties.map(([val, label]) => {
            // Disabled if ALL selected types disable this difficulty
            const selectedTypes = Array.from(generateTypes);
            const disabled = selectedTypes.length > 0 && selectedTypes.every(t => isDifficultyDisabled(t, val));
            return (
              <button
                key={val}
                onClick={() => {
                  if (disabled) {
                    toast({ title: `${label} not available for ${info?.name} yet` });
                    return;
                  }
                  setDifficulty(val);
                }}
                className={cn(
                  "rounded-full border-2 px-5 py-2 text-sm font-medium transition-all",
                  disabled
                    ? "border-border bg-card text-muted-foreground/40 cursor-not-allowed"
                    : difficulty === val
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
                title={disabled ? `${label} not available for ${info?.name} yet` : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timer */}
      <div>
        <label className="mb-3 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Timer
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={timeLimitEnabled}
              onCheckedChange={setTimeLimitEnabled}
              id="time-limit-toggle"
            />
            <label htmlFor="time-limit-toggle" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
              <Clock size={14} className="text-muted-foreground" />
              Timer
            </label>
          </div>
          {timeLimitEnabled && (
            <div className="flex items-center gap-1.5 ml-2">
              <Clock size={14} className="text-muted-foreground" />
              <Input
                type="number"
                min={0}
                max={120}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                className="w-16 h-8 text-center text-sm"
              />
              <span className="text-xs text-muted-foreground">min</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={timeLimitSeconds}
                onChange={(e) => setTimeLimitSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-16 h-8 text-center text-sm"
              />
              <span className="text-xs text-muted-foreground">sec</span>
            </div>
          )}
        </div>
      </div>

      {/* Assists */}
      {renderAssists()}

      {/* Primary Action */}
      <div className="flex items-center gap-4">
        <Button onClick={handleGenerate} size="lg" className="gap-2 text-base px-8" disabled={!canGenerate}>
          <Sparkles size={18} />
          Generate Puzzle
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            Select at least one puzzle type and difficulty to generate
          </p>
        )}
        {puzzleGenerated && (
          <p className="text-xs text-muted-foreground">
            Puzzle Code: <span className="font-mono text-foreground">{seed}</span>
          </p>
        )}
        {(puzzleGenerated || generateTypes.size > 0 || difficulty) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
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
              Puzzle Code
            </label>
            <div className="flex items-center gap-3">
              <Input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter a puzzle code..."
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
    <div className="max-w-md space-y-8">
      <div className="text-center">
        <Dices size={40} className="mx-auto text-primary mb-3" />
        <h2 className="font-display text-2xl font-bold text-foreground">Surprise Me</h2>
        <p className="text-sm text-muted-foreground mt-2">
          We'll pick a random puzzle type and difficulty — just click and play
        </p>
      </div>

      {/* Collapsible Settings */}
      <Collapsible open={randomSettingsOpen} onOpenChange={setRandomSettingsOpen}>
        <CollapsibleTrigger className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown size={14} className={cn("transition-transform", randomSettingsOpen && "rotate-180")} />
          Settings
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={timeLimitEnabled} onCheckedChange={setTimeLimitEnabled} id="random-timer-desktop" />
              <label htmlFor="random-timer-desktop" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
                <Clock size={14} className="text-muted-foreground" /> Timer
              </label>
            </div>
            {timeLimitEnabled && (
              <div className="ml-10 flex items-center gap-1.5">
                <Input type="number" min={0} max={120} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))} className="w-16 h-8 text-center text-sm" />
                <span className="text-xs text-muted-foreground">min</span>
                <Input type="number" min={0} max={59} value={timeLimitSeconds} onChange={(e) => setTimeLimitSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="w-16 h-8 text-center text-sm" />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={hintsEnabled} onCheckedChange={setHintsEnabled} id="random-hints-desktop" />
              <label htmlFor="random-hints-desktop" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
                <Lightbulb size={14} className="text-muted-foreground" /> Hints
              </label>
            </div>
            {hintsEnabled && (
              <div className="ml-10 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Limit:</span>
                {hintLimits.map(({ value, label }) => (
                  <button key={label} onClick={() => setHintLimit(value)} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors min-w-[28px]", hintLimit === value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={revealEnabled} onCheckedChange={setRevealEnabled} id="random-reveal-desktop" />
            <label htmlFor="random-reveal-desktop" className="flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer">
              <Eye size={14} className="text-muted-foreground" /> Reveal
            </label>
          </div>
          <button onClick={resetRandomSettings} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1">
            <RotateCcw size={11} /> Reset to defaults
          </button>
        </CollapsibleContent>
      </Collapsible>

      <div className="text-center">
        <Button onClick={handleRandomGenerate} size="lg" className="gap-2 text-base px-10">
          <Dices size={18} />
          Surprise Me
        </Button>
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
          <>
            {isMobile ? renderMobileRandom() : renderDesktopRandom()}
            {puzzleGenerated && (
              <div className="mt-10 min-h-[300px]">{renderPuzzle()}</div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PuzzleGenerator;
