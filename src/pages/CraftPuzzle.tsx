import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Sparkles, RefreshCw, Share2, Copy, Check } from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import CraftStepper from "@/components/craft/CraftStepper";
import CraftTypeCards, { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import CraftPreviewGrid from "@/components/craft/CraftPreviewGrid";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";
type Step = "type" | "content" | "preview";

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
  const [shareSuccess, setShareSuccess] = useState(false);

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
      setShareSuccess(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShareSuccess(false), 1500);
    } catch {
      toast({ title: "Failed to copy link" });
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Solve my puzzle!", url: shareUrl });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 1500);
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
    setShareSuccess(false);
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-2 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Send a Puzzle</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a custom puzzle and share it with someone</p>
        </div>

        {/* Progress Stepper */}
        <CraftStepper current={step} />

        {/* ─── Step 1: Type Selection ─── */}
        {step === "type" && (
          <CraftTypeCards onSelect={handleSelectType} />
        )}

        {/* ─── Step 2: Content Entry ─── */}
        {step === "content" && selectedType && (
          <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-5">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Back
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PuzzleIcon type={selectedType} size={16} />
              </div>
              <h2 className="text-sm font-medium text-foreground">
                {TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
              </h2>
            </div>

            {(selectedType === "word-fill" || selectedType === "word-search") && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Enter words (one per line or comma-separated)</label>
                <Textarea
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  placeholder="HELLO, WORLD, PUZZLE, FRIEND, GAMES"
                  rows={6}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  {wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean).length} words entered
                </p>
              </div>
            )}

            {selectedType === "cryptogram" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Enter a phrase or message to encode</label>
                <Textarea
                  value={phraseInput}
                  onChange={e => setPhraseInput(e.target.value)}
                  placeholder="THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}

            {selectedType === "crossword" && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground">Enter answer + clue pairs</label>
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
              <label className="text-xs font-medium text-muted-foreground">Reveal message (shown after solving — optional)</label>
              <Input
                value={revealMessage}
                onChange={e => setRevealMessage(e.target.value)}
                placeholder="Congratulations! You cracked it 🎉"
                maxLength={500}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> Generate & Preview
            </Button>
          </div>
        )}

        {/* ─── Step 3: Preview & Share ─── */}
        {step === "preview" && generatedData && selectedType && (
          <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={13} /> Edit content
              </button>
              <button onClick={handleStartOver} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Start over
              </button>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-sm font-medium text-foreground">
                Your {TYPE_OPTIONS.find(o => o.value === selectedType)?.label} is ready!
              </h2>
              <p className="text-xs text-muted-foreground">
                Share the link below to send it to someone
              </p>
            </div>

            {/* Preview */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <CraftPreviewGrid data={generatedData} puzzleType={selectedType} />
            </div>

            {revealMessage && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Reveal message</p>
                <p className="text-sm italic text-foreground">{revealMessage}</p>
              </div>
            )}

            {/* Share controls */}
            <div className="relative space-y-3 p-5 rounded-xl border border-border bg-card overflow-hidden">
              {/* Success overlay */}
              {shareSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/90 z-10 animate-in fade-in-0 duration-200">
                  <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-medium text-foreground">Sent!</span>
                  </div>
                </div>
              )}

              <Button onClick={handleShare} className="w-full gap-2">
                <Share2 className="h-4 w-4" /> Send Puzzle
              </Button>
              <Button onClick={handleCopyLink} variant="ghost" className="w-full gap-2 text-muted-foreground">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy link instead"}
              </Button>
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

export default CraftPuzzle;
