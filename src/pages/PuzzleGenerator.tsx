/**
 * PuzzleGenerator.tsx  ← FULL REPLACEMENT
 * src/pages/PuzzleGenerator.tsx
 *
 * Changes from previous version:
 *  - Page heading renamed: "Puzzle Lab" → "Generate"
 *  - Header.tsx route label also updated separately
 *  - Surprise Me leads the page as a hero section with a one-line explanation
 *    of adaptive difficulty — instead of being buried in a mode tab
 *  - Desktop layout: clear two-section structure (controls left, puzzle right)
 *  - Advanced settings (timer, hints, reveal) visible by default on desktop
 *    — not behind a collapsible
 *  - Session history: last 5 sessions shown below controls
 *  - All existing logic preserved exactly (mobile stepper, seed loading,
 *    adaptive difficulty, multi-type generate, etc.)
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty,
  type PuzzleCategory, isDifficultyDisabled, getEffectiveDifficulty,
} from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { computeNextDifficulty, createDifficultyMap, type PuzzlePerformance } from "@/lib/endlessDifficulty";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPuzzleById } from "@/data/puzzles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Dices, ChevronRight, ArrowLeft,
  Sparkles, Clock, Lightbulb, Eye, Zap, History,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { setPuzzleOrigin } from "@/lib/puzzleOrigin";
import { usePremiumAccess, PLUS_DIFFICULTIES } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { formatTime } from "@/hooks/usePuzzleTimer";

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

// ── Session history ───────────────────────────────────────────────────────────

const SESSION_HISTORY_KEY = "puzzlecraft-lab-history";
const MAX_HISTORY = 5;

interface HistoryEntry {
  type: PuzzleCategory;
  difficulty: Difficulty;
  seed: number;
  playedAt: number; // timestamp
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistoryEntry(entry: HistoryEntry) {
  try {
    const existing = loadHistory().filter(
      (h) => !(h.type === entry.type && h.seed === entry.seed)
    );
    const updated = [entry, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

// ── Puzzle type list ──────────────────────────────────────────────────────────

const puzzleTypes: { value: PuzzleCategory; label: string }[] = [
  { value: "sudoku",       label: "Sudoku"       },
  { value: "crossword",    label: "Crossword"    },
  { value: "word-search",  label: "Word Search"  },
  { value: "kakuro",       label: "Kakuro"       },
  { value: "nonogram",     label: "Nonogram"     },
  { value: "cryptogram",   label: "Cryptogram"   },
  { value: "word-fill",    label: "Word Fill-In" },
  { value: "number-fill",  label: "Number Fill-In" },
];

const allTypes = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];
const difficulties = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

type Mode = "generate" | "random";
type MobileStep = 1 | 2 | 3;

// ── Component ─────────────────────────────────────────────────────────────────

const PuzzleGenerator = () => {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const category = type as PuzzleCategory | undefined;
  const info = category ? CATEGORY_INFO[category] : undefined;
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isDiffLocked } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => { setPuzzleOrigin("lab"); }, []);

  const initialSeed = searchParams.get("seed");
  const routeState = location.state as { randomPool?: PuzzleCategory[]; randomDifficulty?: Difficulty } | null;

  // ── Core state ──
  const [randomPool, setRandomPool]     = useState<PuzzleCategory[] | null>(
    () => routeState?.randomPool && routeState.randomPool.length > 1 ? routeState.randomPool : null
  );
  const [difficulty, setDifficulty]     = useState<Difficulty | null>(() => routeState?.randomDifficulty || null);
  const [seed, setSeed]                 = useState(() => initialSeed ? parseInt(initialSeed) || randomSeed() : randomSeed());
  const [seedInput, setSeedInput]       = useState(initialSeed || "");
  const [puzzleKey, setPuzzleKey]       = useState(0);
  const [loadingSeed, setLoadingSeed]   = useState(false);
  const [puzzleGenerated, setPuzzleGenerated] = useState(
    () => !!(routeState?.randomPool && routeState.randomDifficulty)
  );

  // Session history
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Adaptive difficulty map for Surprise Me
  const SURPRISE_DIFF_KEY = "puzzlecraft-surprise-diffmap";
  const [surpriseDiffMap, setSurpriseDiffMap] = useState<Record<PuzzleCategory, Difficulty>>(() => {
    try {
      const raw = localStorage.getItem(SURPRISE_DIFF_KEY);
      if (raw) return { ...createDifficultyMap(), ...JSON.parse(raw) };
    } catch {}
    return createDifficultyMap();
  });

  // Settings (persisted)
  const SETTINGS_KEY = "puzzlecraft-random-settings";
  interface Settings { timer: boolean; timerMin: number; timerSec: number; hints: boolean; hintLimit: number | null; reveal: boolean; }
  const defaultSettings: Settings = { timer: false, timerMin: 5, timerSec: 0, hints: true, hintLimit: 3, reveal: true };
  const loadSettings = (): Settings => {
    try { const r = localStorage.getItem(SETTINGS_KEY); if (r) return { ...defaultSettings, ...JSON.parse(r) }; }
    catch {}
    return defaultSettings;
  };
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const { timer: timeLimitEnabled, timerMin: timeLimitMinutes, timerSec: timeLimitSeconds,
    hints: hintsEnabled, hintLimit, reveal: revealEnabled } = settings;

  // Mode & mobile
  const [mode, setMode] = useState<Mode>(() => routeState?.randomPool ? "random" : "generate");
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);

  // Multi-select types
  const [generateTypes, setGenerateTypes] = useState<Set<PuzzleCategory>>(
    () => category ? new Set([category]) : new Set()
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const handleSurpriseComplete = useCallback((perf: PuzzlePerformance) => {
    if (mode !== "random" || !category) return;
    const current = surpriseDiffMap[category];
    const { next } = computeNextDifficulty(current, perf);
    setSurpriseDiffMap((prev) => {
      const updated = { ...prev, [category]: next };
      localStorage.setItem(SURPRISE_DIFF_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [mode, category, surpriseDiffMap]);

  const handleLoadSeed = async () => {
    const code = seedInput.trim();
    if (!code) return;
    if (getPuzzleById(code)) { navigate(`/play/${code}`); return; }
    setLoadingSeed(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-code", { body: { code } });
      if (error) throw error;
      switch (data?.type) {
        case "unlock": {
          const { isNativeApp } = await import("@/lib/appMode");
          if (isNativeApp()) { toast({ title: "Code not recognized" }); break; }
          navigate(`/p/login?t=${encodeURIComponent(data.ticket)}`); break;
        }
        case "seed": setSeed(data.seed); setPuzzleKey((k) => k + 1); setSeedInput(""); break;
        case "type-seed":
          if (data.puzzleType === category) { setSeed(data.seed); setPuzzleKey((k) => k + 1); setSeedInput(""); }
          else navigate(`/generate/${data.puzzleType}?seed=${data.seed}`);
          break;
        case "type-name":
          if (data.puzzleType !== category) navigate(`/generate/${data.puzzleType}`);
          break;
        default: toast({ title: "Code not recognized", description: "We couldn't find a puzzle matching that code." });
      }
    } catch { toast({ title: "Something went wrong" }); }
    finally { setLoadingSeed(false); }
  };

  const handleDifficultyChange = (d: Difficulty) => {
    if (isDiffLocked(d)) { setUpgradeOpen(true); return; }
    setDifficulty(d);
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
    if (!isMobile) setPuzzleGenerated(false);
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
      toast({ title: "Pick a type and difficulty first" });
      return;
    }
    const types = Array.from(generateTypes);
    const chosenType = types.length === 1 ? types[0] : types[Math.floor(Math.random() * types.length)];
    const newSeed = puzzleGenerated || !initialSeed ? randomSeed() : seed;

    setRandomPool(types.length > 1 ? types : null);

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

    // Save to session history
    const entry: HistoryEntry = {
      type: chosenType, difficulty: difficulty!, seed: newSeed, playedAt: Date.now(),
    };
    saveHistoryEntry(entry);
    setHistory(loadHistory());
  };

  const handleClear = () => {
    setDifficulty(null);
    setPuzzleGenerated(false);
    setSeed(randomSeed());
    setPuzzleKey(0);
    setRandomPool(null);
    setGenerateTypes(new Set());
    setSeedInput("");
    if (isMobile) setMobileStep(1);
    navigate("/generate", { replace: true });
  };

  const handleRandomGenerate = () => {
    const allTypeKeys = allTypes.map(([t]) => t);
    const chosenType = allTypeKeys[Math.floor(Math.random() * allTypeKeys.length)];
    const newSeed = randomSeed();
    const adaptiveDiff = surpriseDiffMap[chosenType];
    const effectiveDiff = getEffectiveDifficulty(chosenType, adaptiveDiff);
    setDifficulty(effectiveDiff);
    setMode("random");
    setSeed(newSeed);
    setPuzzleGenerated(true);
    setRandomPool(allTypeKeys);
    setPuzzleKey((k) => k + 1);
    navigate(`/generate/${chosenType}?seed=${newSeed}`, {
      state: { randomPool: allTypeKeys, randomDifficulty: effectiveDiff },
      replace: true,
    });
    const entry: HistoryEntry = { type: chosenType, difficulty: effectiveDiff, seed: newSeed, playedAt: Date.now() };
    saveHistoryEntry(entry);
    setHistory(loadHistory());
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const activeTimeLimit = timeLimitEnabled ? (timeLimitMinutes * 60 + timeLimitSeconds) : undefined;
  const assistProps = { showHints: hintsEnabled, showReveal: revealEnabled, maxHints: hintsEnabled ? hintLimit : undefined };

  const renderPuzzle = () => {
    if (!category || !difficulty) return null;
    const d = getEffectiveDifficulty(category, difficulty);
    const key = `${seed}-${d}-${puzzleKey}`;
    const onSolve = mode === "random" ? handleSurpriseComplete : undefined;

    switch (category) {
      case "sudoku":      return <SudokuGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      case "word-search": return <WordSearchGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      case "kakuro":      return <KakuroGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      case "nonogram":    return <NonogramGrid key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      case "cryptogram":  return <CryptogramPuzzle key={key} seed={seed} difficulty={d} onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      case "crossword": {
        const gen = generateCrossword(seed, d);
        const puzzle: CrosswordPuzzle = {
          id: `gen-${seed}`, title: "Generated Crossword", type: "crossword",
          difficulty: d as CrosswordPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, clues: gen.clues,
        };
        return <CrosswordGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      case "word-fill": {
        const gen = generateWordFillIn(seed, d);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Word Fill-In", type: "word-fill",
          difficulty: d as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      case "number-fill": {
        const gen = generateNumberFillIn(seed, d);
        const puzzle: FillInPuzzle = {
          id: `gen-${seed}`, title: "Generated Number Fill-In", type: "number-fill",
          difficulty: d as FillInPuzzle["difficulty"],
          size: `${gen.gridSize}×${gen.gridSize}`, gridSize: gen.gridSize, blackCells: gen.blackCells, entries: gen.entries, solution: gen.solution,
        };
        return <FillInGrid key={key} puzzle={puzzle} showControls onNewPuzzle={handleNewPuzzle} onSolve={onSolve} timeLimit={activeTimeLimit} {...assistProps} />;
      }
      default: return null;
    }
  };

  // ── Settings panel (shared between desktop and mobile) ────────────────────

  const renderSettings = () => (
    <div className="space-y-3">
      {/* Timer */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch checked={timeLimitEnabled} onCheckedChange={(v) => updateSetting("timer", v)} id="timer-toggle" />
          <label htmlFor="timer-toggle" className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <Clock size={13} className="text-muted-foreground" /> Time limit
          </label>
        </div>
        {timeLimitEnabled && (
          <div className="ml-8 flex items-center gap-1.5">
            <Input type="number" min={0} max={120} value={timeLimitMinutes}
              onChange={(e) => updateSetting("timerMin", Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
              className="w-14 h-7 text-center text-xs" />
            <span className="text-xs text-muted-foreground">min</span>
            <Input type="number" min={0} max={59} value={timeLimitSeconds}
              onChange={(e) => updateSetting("timerSec", Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-14 h-7 text-center text-xs" />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
        )}
      </div>
      {/* Hints */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch checked={hintsEnabled} onCheckedChange={(v) => updateSetting("hints", v)} id="hints-toggle" />
          <label htmlFor="hints-toggle" className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <Lightbulb size={13} className="text-muted-foreground" /> Hints
          </label>
          {hintsEnabled && (
            <div className="ml-auto flex items-center gap-1">
              {[1, 2, 3, null].map((v) => (
                <button key={String(v)} onClick={() => updateSetting("hintLimit", v)}
                  className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors min-w-[24px]",
                    hintLimit === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}>
                  {v ?? "∞"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Reveal */}
      <div className="flex items-center gap-2">
        <Switch checked={revealEnabled} onCheckedChange={(v) => updateSetting("reveal", v)} id="reveal-toggle" />
        <label htmlFor="reveal-toggle" className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
          <Eye size={13} className="text-muted-foreground" /> Reveal
        </label>
      </div>
    </div>
  );

  // ── Invalid type guard ────────────────────────────────────────────────────

  if (type && !info) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Unknown puzzle type</h1>
          <Link to="/generate" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to Generate
          </Link>
        </div>
      </Layout>
    );
  }

  // ── Mobile render ─────────────────────────────────────────────────────────

  if (isMobile) {
    // Surprise Me mobile: straight into puzzle
    if (mode === "random" && puzzleGenerated && category && info && difficulty) {
      return (
        <Layout>
          <div className="container py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PuzzleIcon type={category} size={20} className="text-foreground" />
                <span className="text-sm font-medium text-foreground">{info.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  · {DIFFICULTY_LABELS[getEffectiveDifficulty(category, difficulty)]}
                </span>
              </div>
              <Button onClick={handleRandomGenerate} size="sm" variant="outline" className="gap-1.5">
                <Dices size={13} /> Next
              </Button>
            </div>
            <div className="min-h-[300px]">{renderPuzzle()}</div>
          </div>
        </Layout>
      );
    }

    // Mobile generate step 3: puzzle
    if (mobileStep === 3 && puzzleGenerated && category && info && difficulty) {
      return (
        <Layout>
          <div className="container py-4">
            <button onClick={handleClear}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> New puzzle
            </button>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PuzzleIcon type={category} size={22} className="text-foreground" />
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
        </Layout>
      );
    }

    // Mobile step 1 & 2: type + difficulty picker
    return (
      <Layout>
        <div className="container py-6">
          {/* Surprise Me CTA — mobile lead */}
          {mobileStep === 1 && (
            <button onClick={handleRandomGenerate}
              className="w-full mb-6 flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/8 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Dices size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Surprise Me</p>
                <p className="text-xs text-muted-foreground">Random type · adapts to your level</p>
              </div>
              <ChevronRight size={16} className="text-primary shrink-0" />
            </button>
          )}

          {/* Step 1 — type select */}
          {mobileStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 1 of 2</p>
              <h2 className="font-display text-2xl font-bold text-foreground mb-5">Choose type</h2>
              <div className="grid grid-cols-2 gap-3">
                {puzzleTypes.map((pt) => (
                  <button key={pt.value} onClick={() => toggleGenerateType(pt.value)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all",
                      generateTypes.has(pt.value)
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    )}>
                    <PuzzleIcon type={pt.value} size={28} className="text-foreground" />
                    <span className="text-sm font-medium text-foreground">{pt.label}</span>
                  </button>
                ))}
              </div>
              {generateTypes.size > 0 && (
                <Button onClick={() => {
                  const first = Array.from(generateTypes)[0];
                  navigate(`/generate/${first}`, { replace: true });
                  setMobileStep(2);
                }} size="lg" className="w-full mt-5 gap-2">
                  Next <ChevronRight size={16} />
                </Button>
              )}
            </div>
          )}

          {/* Step 2 — difficulty + settings */}
          {mobileStep === 2 && generateTypes.size > 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => setMobileStep(1)}
                className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 2 of 2</p>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Difficulty</h2>
              <div className="flex flex-col gap-2.5 mb-5">
                {difficulties.map(([val, label]) => {
                  const allDisabled = Array.from(generateTypes).every((t) => isDifficultyDisabled(t, val));
                  const locked = isDiffLocked(val);
                  return (
                    <button key={val} onClick={() => {
                      if (allDisabled) return;
                      handleDifficultyChange(val);
                    }}
                      className={cn("flex items-center justify-between rounded-xl border-2 px-5 py-3.5 text-left transition-all",
                        allDisabled ? "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed" :
                        difficulty === val ? "border-primary bg-primary/5" :
                        "border-border bg-card hover:border-primary/40"
                      )}>
                      <span className={cn("text-sm font-medium", allDisabled ? "text-muted-foreground/40" : "text-foreground")}>{label}</span>
                      {!allDisabled && !locked && difficulty === val && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              {difficulty && (
                <>
                  {renderSettings()}
                  <Button onClick={handleGenerate} size="lg" className="w-full mt-5 gap-2">
                    <Sparkles size={18} /> Generate
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── DESKTOP RENDER ────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="container py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Generate</h1>
            <p className="mt-1.5 text-muted-foreground text-sm">
              Pick a type and difficulty, or let Surprise Me adapt to your skill level.
            </p>
          </div>
          {/* Seed / code loader */}
          <div className="flex items-center gap-2 shrink-0">
            <Input
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="Puzzle code..."
              className="text-sm h-9 w-44"
              onKeyDown={(e) => e.key === "Enter" && handleLoadSeed()}
              disabled={loadingSeed}
            />
            <Button variant="outline" size="sm" onClick={handleLoadSeed}
              disabled={!seedInput.trim() || loadingSeed} className="shrink-0">
              {loadingSeed ? "..." : "Load"}
            </Button>
          </div>
        </div>

        {/* ── Surprise Me hero ── */}
        <div className="mb-8 grid sm:grid-cols-[1fr_auto] gap-0 rounded-2xl border-2 border-primary/25 bg-primary/5 overflow-hidden hover:border-primary/40 transition-colors group">
          <div className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Dices size={22} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-display text-base font-bold text-foreground">Surprise Me</h2>
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  Adaptive
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Random puzzle type, any difficulty.{" "}
                <span className="text-foreground font-medium">Gets harder when you win, easier when you struggle</span>
                {" "}— automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center px-5 border-t sm:border-t-0 sm:border-l border-primary/15">
            <Button onClick={handleRandomGenerate} className="gap-2 whitespace-nowrap">
              <Dices size={15} /> Start
            </Button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
            or pick yourself
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* ── Desktop two-column: controls left, puzzle right ── */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">

          {/* ── LEFT: controls ── */}
          <div className="space-y-6 lg:sticky lg:top-24">

            {/* Type selector */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Puzzle type
                {generateTypes.size > 1 && (
                  <span className="ml-2 normal-case font-normal text-primary">
                    {generateTypes.size} selected
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {puzzleTypes.map((pt) => {
                  const isSelected = generateTypes.has(pt.value);
                  return (
                    <button key={pt.value} onClick={() => toggleGenerateType(pt.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all text-xs font-medium",
                        isSelected
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                      )}>
                      <PuzzleIcon type={pt.value} size={16} className="shrink-0" />
                      {pt.label}
                    </button>
                  );
                })}
              </div>
              {generateTypes.size > 1 && (
                <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                  Multi-select: a random type will be chosen each time
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Difficulty
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PLUS_DIFFICULTIES.map((val) => {
                  const label = DIFFICULTY_LABELS[val];
                  const allDisabled = Array.from(generateTypes).every((t) => isDifficultyDisabled(t, val)) && generateTypes.size > 0;
                  const locked = isDiffLocked(val);
                  const isActive = difficulty === val && !allDisabled;
                  return (
                    <button key={val}
                      onClick={() => {
                        if (allDisabled) return;
                        handleDifficultyChange(val);
                      }}
                      title={locked ? `${label} requires Puzzlecraft+` : allDisabled ? `Not available for selected types` : label}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        allDisabled ? "border-border/40 text-muted-foreground/30 cursor-not-allowed" :
                        isActive ? "border-primary bg-primary/10 text-primary" :
                        "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      )}>
                      {label}
                      {locked && !allDisabled && (
                        <span className="ml-1 text-[9px] text-muted-foreground/50">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings — always visible on desktop */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Options
              </p>
              {renderSettings()}
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full gap-2"
              size="lg"
            >
              <Sparkles size={16} />
              {puzzleGenerated ? "New Puzzle" : "Generate"}
            </Button>

            {puzzleGenerated && (
              <button onClick={handleClear}
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                Start over
              </button>
            )}

            {/* Session history */}
            {history.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <History size={10} /> Recent
                </p>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button key={i}
                      onClick={() => {
                        navigate(`/generate/${h.type}?seed=${h.seed}`, {
                          state: { randomDifficulty: h.difficulty },
                          replace: true,
                        });
                        setDifficulty(h.difficulty);
                        setSeed(h.seed);
                        setGenerateTypes(new Set([h.type]));
                        setPuzzleKey((k) => k + 1);
                        setPuzzleGenerated(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary transition-colors">
                      <PuzzleIcon type={h.type} size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {CATEGORY_INFO[h.type]?.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 capitalize shrink-0">
                        {DIFFICULTY_LABELS[h.difficulty]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: puzzle ── */}
          <div className="min-h-[300px]">
            {puzzleGenerated && category && difficulty ? (
              <>
                {/* Puzzle identity bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <PuzzleIcon type={category} size={22} className="text-foreground" />
                    <div>
                      <h2 className="font-display font-bold text-foreground leading-tight">
                        {mode === "random" && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary mr-2">
                            Surprise Me
                          </span>
                        )}
                        {info?.name}
                      </h2>
                      <p className="text-xs text-muted-foreground capitalize">
                        {DIFFICULTY_LABELS[getEffectiveDifficulty(category, difficulty)]}
                      </p>
                    </div>
                  </div>
                  <Button onClick={mode === "random" ? handleRandomGenerate : handleGenerate}
                    size="sm" variant="outline" className="gap-1.5">
                    <RefreshCw size={13} />
                    {mode === "random" ? "Next puzzle" : "New puzzle"}
                  </Button>
                </div>
                {renderPuzzle()}
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border-2 border-dashed border-border/50 text-center px-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
                  <Sparkles size={24} className="text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {generateTypes.size === 0
                    ? "Pick a puzzle type to get started"
                    : !difficulty
                    ? "Now pick a difficulty"
                    : "Hit Generate"}
                </p>
                <p className="text-xs text-muted-foreground max-w-48">
                  or use Surprise Me above for a random adaptive puzzle
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
};

export default PuzzleGenerator;
