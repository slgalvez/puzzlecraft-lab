import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Eye, RefreshCw, Share2, Copy, Check } from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";
type Step = "type" | "content" | "preview";

const TYPE_OPTIONS: { value: CraftType; label: string; icon: string; description: string }[] = [
  { value: "word-search", label: "Word Search", icon: "🔍", description: "Hide words in a letter grid" },
  { value: "word-fill", label: "Word Fill-In", icon: "📖", description: "Place words into a crossword-style grid" },
  { value: "crossword", label: "Crossword", icon: "📝", description: "Create clued crossword entries" },
  { value: "cryptogram", label: "Cryptogram", icon: "🔐", description: "Encode a secret message" },
];

function encodeShareData(data: {
  type: CraftType;
  puzzleData: Record<string, unknown>;
  revealMessage: string;
}): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

const CraftPuzzle = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<CraftType | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [clueEntries, setClueEntries] = useState<{ answer: string; clue: string }[]>([
    { answer: "", clue: "" },
    { answer: "", clue: "" },
    { answer: "", clue: "" },
  ]);
  const [revealMessage, setRevealMessage] = useState("");
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectType = (type: CraftType) => {
    setSelectedType(type);
    setStep("content");
  };

  const handleGenerate = useCallback(() => {
    if (!selectedType) return;
    try {
      let data: Record<string, unknown>;
      switch (selectedType) {
        case "word-fill": {
          const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
          if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return; }
          data = generateCustomFillIn(words) as unknown as Record<string, unknown>;
          break;
        }
        case "word-search": {
          const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
          if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return; }
          data = generateCustomWordSearch(words) as unknown as Record<string, unknown>;
          break;
        }
        case "cryptogram": {
          if (phraseInput.trim().length < 3) { toast({ title: "Enter a longer phrase" }); return; }
          data = generateCustomCryptogram(phraseInput.trim()) as unknown as Record<string, unknown>;
          break;
        }
        case "crossword": {
          const valid = clueEntries.filter(e => e.answer.trim() && e.clue.trim());
          if (valid.length < 2) { toast({ title: "Enter at least 2 answer/clue pairs" }); return; }
          data = generateCustomCrossword(valid) as unknown as Record<string, unknown>;
          break;
        }
      }
      setGeneratedData(data);

      const encoded = encodeShareData({ type: selectedType, puzzleData: data, revealMessage });
      const url = `${window.location.origin}/craft/play?d=${encoded}`;
      setShareUrl(url);
      setStep("preview");
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Please try different input" });
    }
  }, [selectedType, wordInput, phraseInput, clueEntries, revealMessage, toast]);

  const handleRegenerate = () => {
    setGeneratedData(null);
    setShareUrl(null);
    handleGenerate();
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link" });
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Solve my puzzle!", url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  const handleBack = () => {
    if (step === "preview") setStep("content");
    else if (step === "content") { setStep("type"); setSelectedType(null); }
  };

  const handleStartOver = () => {
    setStep("type");
    setSelectedType(null);
    setWordInput("");
    setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage("");
    setGeneratedData(null);
    setShareUrl(null);
    setCopied(false);
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Craft a Puzzle</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a custom puzzle and share it with anyone</p>
        </div>

        {/* ─── Type Selection ─── */}
        {step === "type" && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground">Choose puzzle type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectType(opt.value)}
                  className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/10 transition-colors text-left space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Content Entry ─── */}
        {step === "content" && selectedType && (
          <div className="space-y-5">
            <button onClick={handleBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-2">
              <PuzzleIcon type={selectedType === "word-fill" ? "word-fill" : selectedType === "word-search" ? "word-search" : selectedType === "crossword" ? "crossword" : "cryptogram"} size={20} className="text-foreground" />
              <h2 className="text-sm font-medium text-foreground">
                {TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
              </h2>
            </div>

            {(selectedType === "word-fill" || selectedType === "word-search") && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Enter words (one per line or comma-separated)</label>
                <Textarea
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  placeholder="HELLO, WORLD, PUZZLE, FRIEND, GAMES"
                  rows={6}
                />
                <p className="text-[10px] text-muted-foreground">
                  {wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean).length} words entered
                </p>
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
                    />
                    {clueEntries.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setClueEntries(clueEntries.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setClueEntries([...clueEntries, { answer: "", clue: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add entry
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  {clueEntries.filter(e => e.answer.trim() && e.clue.trim()).length} entries
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Reveal message (shown after solving — optional)</label>
              <Input
                value={revealMessage}
                onChange={e => setRevealMessage(e.target.value)}
                placeholder="Congratulations! You cracked it 🎉"
                maxLength={500}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <Eye className="h-4 w-4 mr-2" /> Generate & Preview
            </Button>
          </div>
        )}

        {/* ─── Preview & Share ─── */}
        {step === "preview" && generatedData && selectedType && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={12} /> Edit content
              </button>
              <button onClick={handleStartOver} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Start over
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">
                {TYPE_OPTIONS.find(o => o.value === selectedType)?.label} — Preview
              </h2>
              <p className="text-xs text-muted-foreground">
                This is what solvers will see. Share the link below to send it!
              </p>
            </div>

            {/* Preview of generated puzzle */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <PreviewGrid data={generatedData} puzzleType={selectedType} />
            </div>

            {revealMessage && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Reveal message</p>
                <p className="text-sm italic text-foreground">{revealMessage}</p>
              </div>
            )}

            {/* Share controls */}
            <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
              <p className="text-xs font-medium text-foreground">Share your puzzle</p>
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} variant="outline" className="flex-1 gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button onClick={handleShare} className="flex-1 gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
            </div>

            <Button onClick={handleRegenerate} variant="ghost" className="w-full gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4" /> Regenerate Puzzle
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

// ─── Simple preview (read-only grid rendering) ───

function PreviewGrid({ data, puzzleType }: { data: Record<string, unknown>; puzzleType: CraftType }) {
  if (puzzleType === "word-fill" || puzzleType === "crossword") {
    const gridSize = (data.gridSize as number) || 9;
    const blackCells = (data.blackCells as [number, number][]) || [];
    const solution = (data.solution as (string | null)[][]) || null;
    const clues = (data.clues as { answer: string; row: number; col: number; direction: string }[]) || [];
    const blacks = new Set(blackCells.map(([r, c]) => `${r}-${c}`));

    // Build solution grid from clues if needed
    const grid: (string | null)[][] = solution || (() => {
      const g: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
      for (const c of clues) {
        const dr = c.direction === "down" ? 1 : 0;
        const dc = c.direction === "across" ? 1 : 0;
        for (let i = 0; i < c.answer.length; i++) {
          g[c.row + dr * i][c.col + dc * i] = c.answer[i];
        }
      }
      return g;
    })();

    const cellSize = Math.min(28, Math.floor(280 / gridSize));
    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0 border border-border" style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}>
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const isBlack = blacks.has(`${r}-${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex items-center justify-center border border-border/30 text-[10px] font-mono font-medium ${isBlack ? "bg-foreground/90" : "bg-card text-foreground"}`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {!isBlack && grid[r]?.[c] ? grid[r][c] : ""}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (puzzleType === "cryptogram") {
    const decoded = (data.decoded as string) || "";
    return (
      <p className="text-sm font-mono text-foreground tracking-wider break-all">
        {decoded.split("").map((ch, i) => (
          <span key={i} className={/[A-Z]/.test(ch) ? "border-b border-foreground/30 mx-px" : "mx-0.5"}>
            {/[A-Z]/.test(ch) ? "•" : ch}
          </span>
        ))}
      </p>
    );
  }

  if (puzzleType === "word-search") {
    const grid = (data.grid as string[][]) || [];
    const size = grid.length;
    const cellSize = Math.min(24, Math.floor(280 / size));
    return (
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}>
          {grid.flat().map((ch, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-[10px] font-mono font-medium text-foreground"
              style={{ width: cellSize, height: cellSize }}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default CraftPuzzle;
