import { useState, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Sparkles, RefreshCw, Share2, Copy, Check, Loader2 } from "lucide-react";
import CraftStepper from "@/components/craft/CraftStepper";
import CraftTypeCards, { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import CraftPreviewGrid from "@/components/craft/CraftPreviewGrid";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";
type Step = "type" | "content" | "preview";

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function buildShareText(title?: string, from?: string): string {
  const lines: string[] = [];
  if (title) lines.push(title);
  if (from) lines.push(`From ${from}`);
  lines.push("");
  lines.push("I made you a puzzle 🧩");
  lines.push("Solve it here:");
  return lines.join("\n");
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
  const [puzzleTitle, setPuzzleTitle] = useState("");
  const [puzzleFrom, setPuzzleFrom] = useState("");
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

      const payload: {
        type: CraftType;
        puzzleData: Record<string, unknown>;
        revealMessage: string;
        title?: string;
        from?: string;
      } = { type: selectedType, puzzleData: data, revealMessage };
      if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
      if (puzzleFrom.trim()) payload.from = puzzleFrom.trim();

      const encoded = encodeShareData(payload);
      const url = `${window.location.origin}/craft/play?d=${encoded}`;
      setShareUrl(url);
      setStep("preview");
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Please try different input" });
    }
  }, [selectedType, wordInput, phraseInput, clueEntries, revealMessage, puzzleTitle, puzzleFrom, toast]);

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
    const shareTitle = puzzleTitle.trim() || "Solve my puzzle!";
    const shareText = puzzleFrom.trim() ? `${shareTitle} — ${puzzleFrom.trim()}` : shareTitle;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
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
    setPuzzleTitle("");
    setPuzzleFrom("");
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

            <div className="pb-2 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">
                {TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
              </h2>
            </div>

            {/* Title + From fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Puzzle title (optional)</label>
                <Input
                  value={puzzleTitle}
                  onChange={e => setPuzzleTitle(e.target.value)}
                  placeholder="For Sarah 💌"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From (optional)</label>
                <Input
                  value={puzzleFrom}
                  onChange={e => setPuzzleFrom(e.target.value)}
                  placeholder="— Alex 🫶"
                  maxLength={100}
                />
              </div>
            </div>

            {(selectedType === "word-fill" || selectedType === "word-search") && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Enter words (one per line or comma-separated)</label>
                <Textarea
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  placeholder={"LOVE\nSARAH\nBIRTHDAY\nMEMORIES\nFOREVER"}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Enter 5–15 words for best results
                </p>
              </div>
            )}

            {selectedType === "cryptogram" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Enter a phrase or message to encode</label>
                <Textarea
                  value={phraseInput}
                  onChange={e => setPhraseInput(e.target.value)}
                  placeholder="MEET ME AT MIDNIGHT"
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Message revealed after solving (optional)</label>
              <Input
                value={revealMessage}
                onChange={e => setRevealMessage(e.target.value)}
                placeholder="Congratulations! You cracked it 🎉"
                maxLength={500}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> Preview Puzzle
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              No account needed • Share instantly with a link
            </p>
          </div>
        )}

        {/* ─── Step 3: Preview & Share ─── */}
        {step === "preview" && generatedData && selectedType && (
          <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-5">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              <button onClick={handleBack} className="justify-self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={13} /> Edit content
              </button>
              <p className="justify-self-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium">
                Preview
              </p>
              <button onClick={handleStartOver} className="justify-self-end text-xs text-muted-foreground hover:text-foreground transition-colors">
                Start over
              </button>
            </div>

            {/* Ready message */}
            <div className="text-center space-y-2">
              <h2 className="text-base font-semibold leading-tight text-foreground">
                Your puzzle is ready to send
              </h2>
              <p className="text-xs text-muted-foreground/70">
                This is exactly what they'll see
              </p>
            </div>

            {/* Preview — matches final experience */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              {/* Title + From (only if provided) */}
              {(puzzleTitle.trim() || puzzleFrom.trim()) && (
                <div className="text-center space-y-0.5 pb-3 border-b border-border">
                  {puzzleTitle.trim() && (
                    <h3 className="text-base font-display font-semibold text-foreground">{puzzleTitle.trim()}</h3>
                  )}
                  {puzzleFrom.trim() && (
                    <p className="text-xs text-muted-foreground">{puzzleFrom.trim()}</p>
                  )}
                </div>
              )}

              <CraftPreviewGrid data={generatedData} puzzleType={selectedType} />
            </div>

            {/* Reveal message preview */}
            {revealMessage && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Reveal Message (Preview)</p>
                <p className="text-sm italic text-foreground/80">{revealMessage}</p>
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
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "or copy link"}
              </button>
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
