import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, Send as SendIcon, Check, Clock, ArrowLeft, Trash2 } from "lucide-react";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";

type PuzzleType = "word-fill" | "cryptogram" | "crossword" | "word-search";
type Tab = "received" | "sent" | "create";

interface PrivatePuzzle {
  id: string;
  created_by: string;
  sent_to: string;
  puzzle_type: PuzzleType;
  puzzle_data: Record<string, unknown>;
  reveal_message: string | null;
  solved_by: string | null;
  solved_at: string | null;
  solve_time: number | null;
  created_at: string;
  creator_name?: string;
  recipient_name?: string;
}

const PUZZLE_LABELS: Record<PuzzleType, string> = {
  "word-fill": "Word Fill-In",
  "cryptogram": "Cryptogram",
  "crossword": "Crossword",
  "word-search": "Word Search",
};

const ForYou = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("received");
  const [puzzles, setPuzzles] = useState<PrivatePuzzle[]>([]);
  const [loading, setLoading] = useState(true);

  // Create state
  const [createStep, setCreateStep] = useState<"type" | "content" | "preview">("type");
  const [selectedType, setSelectedType] = useState<PuzzleType | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [clueEntries, setClueEntries] = useState<{ answer: string; clue: string }[]>([{ answer: "", clue: "" }]);
  const [revealMessage, setRevealMessage] = useState("");
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [sending, setSending] = useState(false);

  // Solve state
  const [solvingPuzzle, setSolvingPuzzle] = useState<PrivatePuzzle | null>(null);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchPuzzles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-puzzles", token);
      setPuzzles(data.puzzles || []);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, handleSessionExpired]);

  useEffect(() => {
    fetchPuzzles();
  }, [fetchPuzzles]);

  const receivedPuzzles = puzzles.filter(p => p.sent_to === user?.id);
  const sentPuzzles = puzzles.filter(p => p.created_by === user?.id);

  // ─── Create Flow ───

  const handleSelectType = (type: PuzzleType) => {
    setSelectedType(type);
    setCreateStep("content");
    setWordInput("");
    setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }]);
    setRevealMessage("");
    setGeneratedData(null);
  };

  const handleGenerate = () => {
    try {
      let data: Record<string, unknown>;
      switch (selectedType) {
        case "word-fill": {
          const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
          if (words.length < 3) { toast({ title: "Enter at least 3 words", variant: "destructive" }); return; }
          data = generateCustomFillIn(words) as unknown as Record<string, unknown>;
          break;
        }
        case "cryptogram": {
          if (phraseInput.trim().length < 10) { toast({ title: "Phrase must be at least 10 characters", variant: "destructive" }); return; }
          data = generateCustomCryptogram(phraseInput) as unknown as Record<string, unknown>;
          break;
        }
        case "crossword": {
          const valid = clueEntries.filter(e => e.answer.trim() && e.clue.trim());
          if (valid.length < 3) { toast({ title: "Enter at least 3 answer + clue pairs", variant: "destructive" }); return; }
          data = generateCustomCrossword(valid) as unknown as Record<string, unknown>;
          break;
        }
        case "word-search": {
          const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
          if (words.length < 3) { toast({ title: "Enter at least 3 words", variant: "destructive" }); return; }
          data = generateCustomWordSearch(words) as unknown as Record<string, unknown>;
          break;
        }
        default:
          return;
      }
      setGeneratedData(data);
      setCreateStep("preview");
    } catch (e) {
      toast({ title: (e as Error).message || "Generation failed", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!token || !generatedData || !selectedType) return;
    setSending(true);
    try {
      await invokeMessaging("create-puzzle", token, {
        puzzle_type: selectedType,
        puzzle_data: generatedData,
        reveal_message: revealMessage.trim() || null,
      });
      toast({ title: "Puzzle sent!" });
      setTab("sent");
      resetCreate();
      fetchPuzzles();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Failed to send puzzle", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const resetCreate = () => {
    setCreateStep("type");
    setSelectedType(null);
    setGeneratedData(null);
    setWordInput("");
    setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }]);
    setRevealMessage("");
  };

  const handleDelete = async (puzzleId: string) => {
    if (!token) return;
    try {
      await invokeMessaging("delete-puzzle", token, { puzzle_id: puzzleId });
      toast({ title: "Puzzle deleted" });
      fetchPuzzles();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: (e as Error).message || "Could not delete puzzle", variant: "destructive" });
    }
  };

  const handleSolve = async (puzzleId: string, solveTime: number) => {
    if (!token) return;
    try {
      await invokeMessaging("solve-puzzle", token, { puzzle_id: puzzleId, solve_time: solveTime });
      toast({ title: "Puzzle solved! 🎉" });
      setSolvingPuzzle(null);
      fetchPuzzles();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Failed to record solve", variant: "destructive" });
    }
  };

  // ─── Render ───

  if (solvingPuzzle) {
    return (
      <PrivateLayout title="Puzzles for You">
        <SolvePuzzleView
          puzzle={solvingPuzzle}
          onBack={() => setSolvingPuzzle(null)}
          onSolve={handleSolve}
          userId={user?.id || ""}
        />
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="For You">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          {(["received", "sent", "create"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "create") resetCreate(); }}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "received" ? "Received" : t === "sent" ? "Sent" : "Create"}
              {t === "received" && receivedPuzzles.filter(p => !p.solved_by).length > 0 && (
                <span className="ml-1.5 bg-primary-foreground text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {receivedPuzzles.filter(p => !p.solved_by).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "received" && (
          <PuzzleList
            puzzles={receivedPuzzles}
            loading={loading}
            emptyMessage="No puzzles received yet"
            showCreator
            onSolve={(p) => setSolvingPuzzle(p)}
          />
        )}

        {tab === "sent" && (
          <PuzzleList
            puzzles={sentPuzzles}
            loading={loading}
            emptyMessage="No puzzles sent yet"
            showRecipient
            onDelete={handleDelete}
          />
        )}

        {tab === "create" && (
          <CreatePuzzleView
            step={createStep}
            selectedType={selectedType}
            wordInput={wordInput}
            setWordInput={setWordInput}
            phraseInput={phraseInput}
            setPhraseInput={setPhraseInput}
            clueEntries={clueEntries}
            setClueEntries={setClueEntries}
            revealMessage={revealMessage}
            setRevealMessage={setRevealMessage}
            generatedData={generatedData}
            sending={sending}
            onSelectType={handleSelectType}
            onGenerate={handleGenerate}
            onSend={handleSend}
            onBack={resetCreate}
          />
        )}
      </div>
    </PrivateLayout>
  );
};

// ─── Puzzle List ───

function PuzzleList({
  puzzles, loading, emptyMessage, showCreator, showRecipient, onSolve, onDelete,
}: {
  puzzles: PrivatePuzzle[];
  loading: boolean;
  emptyMessage: string;
  showCreator?: boolean;
  showRecipient?: boolean;
  onSolve?: (p: PrivatePuzzle) => void;
  onDelete?: (id: string) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (puzzles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Gift className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {puzzles.map(p => (
        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{PUZZLE_LABELS[p.puzzle_type]}</span>
              {p.solved_by ? (
                <Badge variant="secondary" className="text-[10px]">
                  <Check className="h-3 w-3 mr-0.5" /> Solved
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-primary/10 text-primary border-0">New</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {showCreator && p.creator_name && `From ${p.creator_name} · `}
              {showRecipient && p.recipient_name && `To ${p.recipient_name} · `}
              {new Date(p.created_at).toLocaleDateString()}
              {p.solve_time != null && ` · Solved in ${formatTime(p.solve_time)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSolve && !p.solved_by && (
              <Button size="sm" onClick={() => onSolve(p)}>
                Solve
              </Button>
            )}
            {onSolve && p.solved_by && p.reveal_message && (
              <Button size="sm" variant="outline" onClick={() => onSolve(p)}>
                View
              </Button>
            )}
            {onDelete && !p.solved_by && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(p.id)}
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Create Puzzle View ───

function CreatePuzzleView({
  step, selectedType, wordInput, setWordInput, phraseInput, setPhraseInput,
  clueEntries, setClueEntries, revealMessage, setRevealMessage,
  generatedData, sending, onSelectType, onGenerate, onSend, onBack,
}: {
  step: "type" | "content" | "preview";
  selectedType: PuzzleType | null;
  wordInput: string;
  setWordInput: (v: string) => void;
  phraseInput: string;
  setPhraseInput: (v: string) => void;
  clueEntries: { answer: string; clue: string }[];
  setClueEntries: (v: { answer: string; clue: string }[]) => void;
  revealMessage: string;
  setRevealMessage: (v: string) => void;
  generatedData: Record<string, unknown> | null;
  sending: boolean;
  onSelectType: (t: PuzzleType) => void;
  onGenerate: () => void;
  onSend: () => void;
  onBack: () => void;
}) {
  if (step === "type") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Choose puzzle type</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(PUZZLE_LABELS) as [PuzzleType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-colors text-left"
            >
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "content") {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <h3 className="text-sm font-medium">{PUZZLE_LABELS[selectedType!]}</h3>

        {(selectedType === "word-fill" || selectedType === "word-search") && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Enter words (one per line or comma-separated)</label>
            <Textarea
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              placeholder="HELLO, WORLD, PUZZLE, FRIEND"
              rows={5}
              maxLength={2000}
            />
          </div>
        )}

        {selectedType === "cryptogram" && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Enter a phrase or message to encode</label>
            <Textarea
              value={phraseInput}
              onChange={e => setPhraseInput(e.target.value)}
              placeholder="THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
              rows={4}
              maxLength={500}
            />
          </div>
        )}

        {selectedType === "crossword" && (
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">Enter answer + clue pairs</label>
            {clueEntries.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={entry.answer}
                  onChange={e => {
                    const updated = [...clueEntries];
                    updated[i] = { ...entry, answer: e.target.value };
                    setClueEntries(updated);
                  }}
                  placeholder="Answer"
                  className="flex-1"
                  maxLength={20}
                />
                <Input
                  value={entry.clue}
                  onChange={e => {
                    const updated = [...clueEntries];
                    updated[i] = { ...entry, clue: e.target.value };
                    setClueEntries(updated);
                  }}
                  placeholder="Clue"
                  className="flex-[2]"
                  maxLength={100}
                />
                {clueEntries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setClueEntries(clueEntries.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {clueEntries.length < 20 && (
              <Button variant="outline" size="sm" onClick={() => setClueEntries([...clueEntries, { answer: "", clue: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add entry
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Reveal message (optional — shown after solving)</label>
          <Input
            value={revealMessage}
            onChange={e => setRevealMessage(e.target.value)}
            placeholder="Congratulations! Here's a surprise…"
            maxLength={500}
          />
        </div>

        <Button onClick={onGenerate} className="w-full">Generate Puzzle</Button>
      </div>
    );
  }

  // Preview step
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Start over
      </button>
      <div className="p-4 rounded-lg border border-border bg-card space-y-2">
        <h3 className="text-sm font-medium">{PUZZLE_LABELS[selectedType!]} — Ready to send</h3>
        {selectedType === "word-fill" && generatedData && (
          <p className="text-xs text-muted-foreground">
            {(generatedData as { entries?: string[] }).entries?.length || 0} words placed on a {(generatedData as { gridSize?: number }).gridSize}×{(generatedData as { gridSize?: number }).gridSize} grid
          </p>
        )}
        {selectedType === "word-search" && generatedData && (
          <p className="text-xs text-muted-foreground">
            {(generatedData as { words?: string[] }).words?.length || 0} words hidden in a {(generatedData as { size?: number }).size}×{(generatedData as { size?: number }).size} grid
          </p>
        )}
        {selectedType === "crossword" && generatedData && (
          <p className="text-xs text-muted-foreground">
            {(generatedData as { clues?: unknown[] }).clues?.length || 0} clues placed on a {(generatedData as { gridSize?: number }).gridSize}×{(generatedData as { gridSize?: number }).gridSize} grid
          </p>
        )}
        {selectedType === "cryptogram" && generatedData && (
          <p className="text-xs text-muted-foreground">
            Encoded message: {((generatedData as { encoded?: string }).encoded || "").slice(0, 40)}…
          </p>
        )}
        {revealMessage && (
          <p className="text-xs text-muted-foreground italic">Reveal: "{revealMessage}"</p>
        )}
      </div>
      <Button onClick={onSend} disabled={sending} className="w-full">
        <SendIcon className="h-4 w-4 mr-2" />
        {sending ? "Sending…" : "Send Puzzle"}
      </Button>
    </div>
  );
}

// ─── Solve Puzzle View ───

function SolvePuzzleView({
  puzzle, onBack, onSolve, userId,
}: {
  puzzle: PrivatePuzzle;
  onBack: () => void;
  onSolve: (puzzleId: string, solveTime: number) => void;
  userId: string;
}) {
  const [startTime] = useState(() => Date.now());
  const alreadySolved = !!puzzle.solved_by;
  const data = puzzle.puzzle_data;

  // For solved puzzles, just show reveal message
  if (alreadySolved) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="text-center py-8 space-y-4">
          <Check className="mx-auto h-10 w-10 text-primary" />
          <h3 className="text-lg font-medium">Puzzle Solved!</h3>
          {puzzle.solve_time != null && (
            <p className="text-sm text-muted-foreground">Completed in {formatTime(puzzle.solve_time)}</p>
          )}
          {puzzle.reveal_message && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
              <p className="text-sm italic text-foreground">{puzzle.reveal_message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render inline solver based on type
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <h3 className="text-sm font-medium">
        {PUZZLE_LABELS[puzzle.puzzle_type]}
        {puzzle.creator_name && <span className="text-muted-foreground font-normal"> from {puzzle.creator_name}</span>}
      </h3>

      {puzzle.puzzle_type === "cryptogram" && (
        <CryptogramSolver
          data={data as unknown as { encoded: string; decoded: string; reverseCipher: Record<string, string>; hints: Record<string, string> }}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
        />
      )}
      {puzzle.puzzle_type === "word-search" && (
        <WordSearchSolver
          data={data as unknown as { grid: string[][]; words: string[]; wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[]; size: number }}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
        />
      )}
      {(puzzle.puzzle_type === "word-fill" || puzzle.puzzle_type === "crossword") && (
        <GridSolver
          data={data}
          puzzleType={puzzle.puzzle_type}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
        />
      )}
    </div>
  );
}

// ─── Inline Solvers ───

function CryptogramSolver({
  data, onComplete,
}: {
  data: { encoded: string; decoded: string; reverseCipher: Record<string, string>; hints: Record<string, string> };
  onComplete: () => void;
}) {
  const [guesses, setGuesses] = useState<Record<string, string>>(() => ({ ...data.hints }));
  const [completed, setCompleted] = useState(false);

  const encodedLetters = [...new Set(data.encoded.split("").filter(ch => /[A-Z]/.test(ch)))];

  const handleGuess = (encodedChar: string, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z]/g, "");
    const newGuesses = { ...guesses, [encodedChar]: upper };
    setGuesses(newGuesses);

    // Check if solved
    const allFilled = encodedLetters.every(ch => newGuesses[ch]);
    if (allFilled) {
      const decoded = data.encoded.split("").map(ch => /[A-Z]/.test(ch) ? (newGuesses[ch] || "") : ch).join("");
      if (decoded === data.decoded) {
        setCompleted(true);
        onComplete();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="font-mono text-sm leading-relaxed flex flex-wrap gap-1">
        {data.encoded.split("").map((ch, i) => {
          if (!/[A-Z]/.test(ch)) return <span key={i} className="px-0.5">{ch === " " ? "\u00A0\u00A0" : ch}</span>;
          const isHint = ch in data.hints;
          return (
            <span key={i} className="inline-flex flex-col items-center">
              <input
                className={`w-6 h-7 text-center text-xs border-b-2 bg-transparent outline-none ${
                  isHint ? "border-primary text-primary font-bold" : "border-border focus:border-primary"
                } ${completed ? "text-primary" : ""}`}
                maxLength={1}
                value={guesses[ch] || ""}
                onChange={e => !isHint && handleGuess(ch, e.target.value)}
                readOnly={isHint || completed}
              />
              <span className="text-[9px] text-muted-foreground">{ch}</span>
            </span>
          );
        })}
      </div>
      {completed && <p className="text-sm text-primary font-medium text-center">✓ Solved!</p>}
    </div>
  );
}

function WordSearchSolver({
  data, onComplete,
}: {
  data: { grid: string[][]; words: string[]; wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[]; size: number };
  onComplete: () => void;
}) {
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());

  const handleCellClick = (r: number, c: number) => {
    // Simple: check if clicking reveals a word starting/ending here
    for (const wp of data.wordPositions) {
      if (foundWords.has(wp.word)) continue;
      // Check if this cell is part of the word
      for (let i = 0; i < wp.word.length; i++) {
        if (wp.row + wp.dr * i === r && wp.col + wp.dc * i === c) {
          // Found a match, mark entire word
          const newFound = new Set(foundWords);
          newFound.add(wp.word);
          setFoundWords(newFound);
          const newCells = new Set(foundCells);
          for (let j = 0; j < wp.word.length; j++) {
            newCells.add(`${wp.row + wp.dr * j}-${wp.col + wp.dc * j}`);
          }
          setFoundCells(newCells);
          if (newFound.size === data.words.length) onComplete();
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${data.size}, minmax(0, 1fr))` }}>
        {data.grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-mono flex items-center justify-center rounded transition-colors ${
                foundCells.has(`${r}-${c}`)
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-accent/30"
              }`}
            >
              {cell}
            </button>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {data.words.map(w => (
          <Badge key={w} variant={foundWords.has(w) ? "default" : "outline"} className="text-xs">
            {foundWords.has(w) ? <Check className="h-3 w-3 mr-0.5" /> : null}
            {w}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function GridSolver({
  data, puzzleType, onComplete,
}: {
  data: Record<string, unknown>;
  puzzleType: "word-fill" | "crossword";
  onComplete: () => void;
}) {
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const solution = (data.solution as (string | null)[][]) || null;
  const clues = (data.clues as { number: number; clue: string; answer: string; row: number; col: number; direction: string }[]) || [];

  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);

  // Build solution map for crossword from clues
  const solutionMap = (() => {
    if (solution) return solution;
    const map: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    for (const c of clues) {
      const dr = c.direction === "down" ? 1 : 0;
      const dc = c.direction === "across" ? 1 : 0;
      for (let i = 0; i < c.answer.length; i++) {
        map[c.row + dr * i][c.col + dc * i] = c.answer[i];
      }
    }
    return map;
  })();

  const handleInput = (r: number, c: number, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = upper;
    setGrid(newGrid);

    // Check completion
    let complete = true;
    for (let rr = 0; rr < gridSize; rr++) {
      for (let cc = 0; cc < gridSize; cc++) {
        if (!blackSet.has(`${rr}-${cc}`) && solutionMap[rr]?.[cc]) {
          if (newGrid[rr][cc] !== solutionMap[rr][cc]) complete = false;
        }
      }
    }
    if (complete) onComplete();
  };

  return (
    <div className="space-y-4">
      <div
        className="inline-grid gap-0"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: gridSize }, (_, r) =>
          Array.from({ length: gridSize }, (_, c) => {
            if (blackSet.has(`${r}-${c}`)) {
              return <div key={`${r}-${c}`} className="w-7 h-7 sm:w-8 sm:h-8 bg-foreground/90" />;
            }
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
            return (
              <input
                key={`${r}-${c}`}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-center text-xs font-mono border border-border bg-card outline-none ${
                  isActive ? "bg-primary/10 border-primary" : ""
                }`}
                maxLength={1}
                value={grid[r][c]}
                onChange={e => handleInput(r, c, e.target.value)}
                onFocus={() => setActiveCell([r, c])}
              />
            );
          })
        )}
      </div>
      {puzzleType === "crossword" && clues.length > 0 && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-medium mb-1">Across</h4>
            {clues.filter(c => c.direction === "across").map(c => (
              <p key={`a-${c.number}`} className="text-muted-foreground">{c.number}. {c.clue}</p>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-1">Down</h4>
            {clues.filter(c => c.direction === "down").map(c => (
              <p key={`d-${c.number}`} className="text-muted-foreground">{c.number}. {c.clue}</p>
            ))}
          </div>
        </div>
      )}
      {puzzleType === "word-fill" && (data.entries as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(data.entries as string[]).map((entry, i) => (
            <Badge key={i} variant="outline" className="text-xs font-mono">{entry}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default ForYou;
