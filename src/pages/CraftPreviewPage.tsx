/**
 * CraftPreviewPage.tsx
 * src/pages/CraftPreviewPage.tsx
 *
 * Admin-only preview of the redesigned Craft experience.
 * Route: /craft-v2  (add to App.tsx — see patch at bottom of file)
 *
 * Design: Split layout — inputs on left, live preview on right.
 * Same generators/share logic as CraftPuzzle.tsx, completely new shell.
 *
 * TO ADD ROUTE — append to App.tsx PublicRoutes:
 *   import CraftPreviewPage from "./pages/CraftPreviewPage";
 *   <Route path="/craft-v2" element={<CraftPreviewPage />} />
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { cn } from "@/lib/utils";
import {
  Sparkles, Share, Copy, Check, Loader2, RefreshCw,
  Search, Grid2x2, Hash, Lock, ChevronDown, ChevronUp,
  ArrowRight, Wand2, Send,
} from "lucide-react";
import CraftPreviewGrid from "@/components/craft/CraftPreviewGrid";
import CraftLivePreview from "@/components/craft/CraftLivePreview";
import CraftSettingsPanel, { type CraftSettings, DEFAULT_CRAFT_SETTINGS } from "@/components/craft/CraftSettingsPanel";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";
import {
  type CraftPayload,
  type CraftType,
  buildCraftShareText,
  buildCraftShareUrl,
} from "@/lib/craftShare";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPES: {
  id: CraftType;
  label: string;
  icon: React.ElementType;
  tagline: string;
  inputLabel: string;
  placeholder: string;
  difficulty: string;
  youDo: string;
  theyDo: string;
}[] = [
  {
    id: "word-search",
    label: "Word Search",
    icon: Search,
    tagline: "Hide words in a grid",
    inputLabel: "Your words",
    placeholder: "NASHVILLE\nBIRTHDAY\nCHUCKY\nBEACH\nSUMMER",
    difficulty: "Easy",
    youDo: "Enter words from your life",
    theyDo: "Hunt for every one",
  },
  {
    id: "word-fill",
    label: "Word Fill-In",
    icon: Grid2x2,
    tagline: "Build a grid from your words",
    inputLabel: "Your words",
    placeholder: "VACATION\nBEACH\nSUMMER\nSUNSET\nICECREAM",
    difficulty: "Medium",
    youDo: "Give the words, set the grid",
    theyDo: "Place every word perfectly",
  },
  {
    id: "crossword",
    label: "Crossword",
    icon: Hash,
    tagline: "Write the clues, set the trap",
    inputLabel: "Answer + Clue pairs",
    placeholder: "",
    difficulty: "Tricky",
    youDo: "Write answers + clever clues",
    theyDo: "Decode every clue",
  },
  {
    id: "cryptogram",
    label: "Cryptogram",
    icon: Lock,
    tagline: "Turn a message into a cipher",
    inputLabel: "Your secret phrase",
    placeholder: "MEET ME AT MIDNIGHT",
    difficulty: "Tricky",
    youDo: "Write any phrase or message",
    theyDo: "Decode it letter by letter",
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  Medium: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
  Tricky: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
};

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CraftPreviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account } = useUserAccount();
  const { isPremium, craftStatus, recordCraftSent } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Admin gate
  if (account && !account.isAdmin) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <p className="text-muted-foreground text-sm">Admin preview only.</p>
          <button onClick={() => navigate("/craft")} className="mt-4 text-xs text-primary underline">
            Go to Craft
          </button>
        </div>
      </Layout>
    );
  }

  return <CraftV2Inner isPremium={isPremium} craftStatus={craftStatus} recordCraftSent={recordCraftSent} upgradeOpen={upgradeOpen} setUpgradeOpen={setUpgradeOpen} />;
}

// ─── Inner component (hooks safe, after admin gate) ───────────────────────────

function CraftV2Inner({
  isPremium,
  craftStatus,
  recordCraftSent,
  upgradeOpen,
  setUpgradeOpen,
}: {
  isPremium: boolean;
  craftStatus: any;
  recordCraftSent: (id: string) => void;
  upgradeOpen: boolean;
  setUpgradeOpen: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeType, setActiveType] = useState<CraftType>("word-search");
  const typeConfig = TYPES.find(t => t.id === activeType)!;

  // Shared fields
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [revealMessage, setRevealMessage] = useState("");

  // Type-specific
  const [wordInput, setWordInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [clueEntries, setClueEntries] = useState([
    { answer: "", clue: "" },
    { answer: "", clue: "" },
    { answer: "", clue: "" },
  ]);

  // Settings
  const [settings, setSettings] = useState<CraftSettings>(DEFAULT_CRAFT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Generation state
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const sentRef = useRef(false);

  // Reset generated state when type changes
  useEffect(() => {
    setGeneratedData(null);
    setShareUrl(null);
    sentRef.current = false;
  }, [activeType]);

  // Word count for live feedback
  const wordCount = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean).length;
  const validClues = clueEntries.filter(e => e.answer.trim() && e.clue.trim()).length;
  const phraseLen = phraseInput.trim().length;

  const isReady = () => {
    if (activeType === "word-search" || activeType === "word-fill") return wordCount >= 2;
    if (activeType === "cryptogram") return phraseLen >= 3;
    if (activeType === "crossword") return validClues >= 2;
    return false;
  };

  const buildData = useCallback((): Record<string, unknown> | null => {
    switch (activeType) {
      case "word-fill":
      case "word-search": {
        const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
        if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return null; }
        return activeType === "word-fill"
          ? generateCustomFillIn(words, settings.difficulty) as unknown as Record<string, unknown>
          : generateCustomWordSearch(words, settings.difficulty) as unknown as Record<string, unknown>;
      }
      case "cryptogram": {
        if (phraseInput.trim().length < 3) { toast({ title: "Enter a longer phrase" }); return null; }
        return generateCustomCryptogram(phraseInput.trim(), settings.difficulty) as unknown as Record<string, unknown>;
      }
      case "crossword": {
        const valid = clueEntries.filter(e => e.answer.trim() && e.clue.trim());
        if (valid.length < 2) { toast({ title: "Enter at least 2 clue pairs" }); return null; }
        return generateCustomCrossword(valid, settings.difficulty) as unknown as Record<string, unknown>;
      }
    }
  }, [activeType, wordInput, phraseInput, clueEntries, settings.difficulty, toast]);

  const handleGenerate = async () => {
    const data = buildData();
    if (!data) return;
    setSaving(true);
    try {
      setGeneratedData(data);
      const payload: CraftPayload = {
        type: activeType,
        puzzleData: data,
        revealMessage,
        settings: {
          difficulty: settings.difficulty,
          hintsEnabled: settings.hintsEnabled,
          revealEnabled: settings.revealEnabled,
          checkEnabled: settings.checkEnabled,
        },
      };
      if (title.trim()) payload.title = title.trim();
      if (from.trim()) payload.from = from.trim();

      const shortId = generateShortId();
      await supabase.from("shared_puzzles" as any).insert({ id: shortId, payload } as any);
      setShareUrl(buildCraftShareUrl(shortId));
      sentRef.current = false;
      toast({ title: "Puzzle ready ✨" });
    } catch {
      toast({ title: "Generation failed", description: "Try different input" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    const data = buildData();
    if (!data || !shareUrl) return;
    setGeneratedData(data);
    const shareId = shareUrl.split("/s/")[1] || shareUrl;
    const payload: CraftPayload = {
      type: activeType, puzzleData: data, revealMessage,
      settings: { difficulty: settings.difficulty, hintsEnabled: settings.hintsEnabled, revealEnabled: settings.revealEnabled, checkEnabled: settings.checkEnabled },
    };
    if (title.trim()) payload.title = title.trim();
    if (from.trim()) payload.from = from.trim();
    await supabase.from("shared_puzzles" as any).update({ payload } as any).eq("id", shareId);
    sentRef.current = false;
    toast({ title: "Regenerated" });
  };

  const recordSent = () => {
    if (sentRef.current || !shareUrl) return;
    sentRef.current = true;
    const shareId = shareUrl.split("/s/")[1] || shareUrl;
    recordCraftSent(shareId);
  };

  const handleShare = async () => {
    if (craftStatus.isAtLimit && !isPremium) { setUpgradeOpen(true); return; }
    if (!shareUrl) return;
    const text = buildCraftShareText(title.trim() || undefined, from.trim() || undefined, shareUrl, activeType);
    if (navigator.share) {
      try { await navigator.share({ text }); recordSent(); setShared(true); setTimeout(() => setShared(false), 2000); } catch {}
      return;
    }
    await navigator.clipboard.writeText(text);
    recordSent();
    setCopied(true);
    setShared(true);
    toast({ title: "Link copied!" });
    setTimeout(() => { setCopied(false); setShared(false); }, 2000);
  };

  const handleCopy = async () => {
    if (craftStatus.isAtLimit && !isPremium) { setUpgradeOpen(true); return; }
    if (!shareUrl) return;
    const text = buildCraftShareText(title.trim() || undefined, from.trim() || undefined, shareUrl, activeType);
    await navigator.clipboard.writeText(text);
    recordSent();
    setCopied(true);
    toast({ title: "Puzzle link copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      {/* Admin badge */}
      <div className="sticky top-0 z-10 border-b bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50">
        <div className="container py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            ⚡ Admin Preview — Craft v2
          </span>
          <button onClick={() => navigate("/craft")} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
            View current Craft →
          </button>
        </div>
      </div>

      <div className="container py-8 max-w-6xl">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Send a Puzzle
          </h1>
          <p className="text-muted-foreground mt-1">
            Make something personal — deliver it to anyone
          </p>
        </div>

        {/* ── Type selector — horizontal tabs ── */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = activeType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-2xl border px-5 py-3 transition-all",
                  "text-sm font-medium select-none touch-manipulation",
                  active
                    ? "border-foreground bg-foreground text-background shadow-md"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <Icon size={15} className={cn(active ? "text-background" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{t.label}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  active
                    ? "bg-background/20 text-background"
                    : DIFFICULTY_COLORS[t.difficulty]
                )}>
                  {t.difficulty}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Split layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 items-start">

          {/* ══ LEFT: Inputs ══════════════════════════════════════════════════ */}
          <div className="space-y-5">

            {/* Type description strip */}
            <div className="flex items-center gap-6 py-3 px-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">You</p>
                <p className="text-sm text-foreground">{typeConfig.youDo}</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground/40 shrink-0" />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">They</p>
                <p className="text-sm text-foreground">{typeConfig.theyDo}</p>
              </div>
            </div>

            {/* Title + From — inline row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Puzzle title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Just for You"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  placeholder="Mariah"
                  maxLength={100}
                />
              </div>
            </div>

            {/* ── Type-specific input ── */}
            <div className="space-y-3">
              {/* Word Search / Word Fill-In */}
              {(activeType === "word-search" || activeType === "word-fill") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">{typeConfig.inputLabel}</label>
                    <span className={cn(
                      "text-[11px] font-medium transition-colors",
                      wordCount >= 5 ? "text-emerald-500" : wordCount >= 2 ? "text-amber-500" : "text-muted-foreground/50"
                    )}>
                      {wordCount} {wordCount === 1 ? "word" : "words"}
                      {wordCount < 2 ? " · need at least 2" : wordCount >= 5 ? " · looking good" : ""}
                    </span>
                  </div>
                  <Textarea
                    value={wordInput}
                    onChange={e => setWordInput(e.target.value)}
                    placeholder={typeConfig.placeholder}
                    rows={6}
                    className="resize-none font-mono text-sm uppercase tracking-wide"
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    One per line, or comma-separated. All caps optional.
                  </p>
                </div>
              )}

              {/* Cryptogram */}
              {activeType === "cryptogram" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">{typeConfig.inputLabel}</label>
                    <span className={cn(
                      "text-[11px] font-medium transition-colors",
                      phraseLen >= 10 ? "text-emerald-500" : phraseLen >= 3 ? "text-amber-500" : "text-muted-foreground/50"
                    )}>
                      {phraseLen} chars{phraseLen < 3 ? " · too short" : ""}
                    </span>
                  </div>
                  <Textarea
                    value={phraseInput}
                    onChange={e => setPhraseInput(e.target.value)}
                    placeholder={typeConfig.placeholder}
                    rows={4}
                    className="resize-none font-mono text-sm uppercase tracking-widest"
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    Letters only — numbers and punctuation are stripped from the cipher.
                  </p>
                </div>
              )}

              {/* Crossword */}
              {activeType === "crossword" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Answer + Clue pairs</label>
                    <span className={cn(
                      "text-[11px] font-medium transition-colors",
                      validClues >= 5 ? "text-emerald-500" : validClues >= 2 ? "text-amber-500" : "text-muted-foreground/50"
                    )}>
                      {validClues} / {clueEntries.length} complete
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clueEntries.map((entry, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 text-center">{i + 1}</span>
                        <Input
                          value={entry.answer}
                          onChange={e => {
                            const u = [...clueEntries]; u[i] = { ...entry, answer: e.target.value }; setClueEntries(u);
                          }}
                          placeholder="ANSWER"
                          className="flex-1 font-mono uppercase text-sm"
                        />
                        <Input
                          value={entry.clue}
                          onChange={e => {
                            const u = [...clueEntries]; u[i] = { ...entry, clue: e.target.value }; setClueEntries(u);
                          }}
                          placeholder="Your clue here…"
                          className="flex-[2] text-sm"
                        />
                        {clueEntries.length > 2 && (
                          <button
                            onClick={() => setClueEntries(clueEntries.filter((_, j) => j !== i))}
                            className="text-muted-foreground/30 hover:text-destructive transition-colors text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setClueEntries([...clueEntries, { answer: "", clue: "" }])}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    + Add another pair
                  </button>
                </div>
              )}
            </div>

            {/* Reveal message */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Message revealed after solving
                <span className="ml-1 text-muted-foreground/40">(optional)</span>
              </label>
              <Input
                value={revealMessage}
                onChange={e => setRevealMessage(e.target.value)}
                placeholder="Congratulations! You cracked it 🎉"
                maxLength={500}
              />
            </div>

            {/* Settings — collapsible */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
              >
                <span>Puzzle settings</span>
                {settingsOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {settingsOpen && (
                <div className="border-t border-border/60 p-4">
                  <CraftSettingsPanel value={settings} onChange={setSettings} />
                </div>
              )}
            </div>

            {/* Generate CTA */}
            <Button
              onClick={generatedData ? handleRegenerate : handleGenerate}
              disabled={saving || !isReady()}
              className="w-full h-12 rounded-xl gap-2 font-semibold text-base"
              size="lg"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Generating…</>
              ) : generatedData ? (
                <><RefreshCw size={16} /> Regenerate Puzzle</>
              ) : (
                <><Wand2 size={16} /> Generate Puzzle</>
              )}
            </Button>

            {!isReady() && (
              <p className="text-center text-[11px] text-muted-foreground/50">
                {activeType === "crossword"
                  ? "Add at least 2 complete answer/clue pairs to continue"
                  : activeType === "cryptogram"
                    ? "Enter a phrase of at least 3 characters"
                    : "Enter at least 2 words to continue"}
              </p>
            )}
          </div>

          {/* ══ RIGHT: Live preview panel ══════════════════════════════════════ */}
          <div className="lg:sticky lg:top-24">

            {/* Before generation — live preview */}
            {!generatedData && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live Preview</p>
                    <p className="text-sm text-foreground font-medium mt-0.5">
                      {title.trim() || "Untitled puzzle"}
                    </p>
                  </div>
                  {typeConfig && (
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", DIFFICULTY_COLORS[typeConfig.difficulty])}>
                      {typeConfig.difficulty}
                    </span>
                  )}
                </div>

                {/* Live preview grid */}
                <div className="p-5 min-h-[260px] flex flex-col justify-center">
                  {isReady() ? (
                    <CraftLivePreview
                      type={activeType}
                      wordInput={wordInput}
                      phraseInput={phraseInput}
                      clueEntries={clueEntries}
                      difficulty={settings.difficulty}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                        {(() => { const Icon = typeConfig.icon; return <Icon size={28} className="text-muted-foreground/30" />; })()}
                      </div>
                      <p className="text-sm text-muted-foreground/60">
                        {activeType === "crossword"
                          ? "Add clue pairs on the left to see a preview"
                          : activeType === "cryptogram"
                            ? "Type your secret phrase on the left"
                            : "Add words on the left to see a live preview"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata preview */}
                {(from.trim() || revealMessage.trim()) && (
                  <div className="px-5 pb-5 space-y-2 border-t border-border/40 pt-4">
                    {from.trim() && (
                      <p className="text-[11px] text-muted-foreground/60 italic text-right">
                        — {from.trim()}
                      </p>
                    )}
                    {revealMessage.trim() && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">Reveal message</p>
                        <p className="text-xs italic text-foreground/70">{revealMessage.trim()}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: isReady()
                        ? activeType === "cryptogram"
                          ? `${Math.min(100, (phraseLen / 20) * 100)}%`
                          : activeType === "crossword"
                            ? `${Math.min(100, (validClues / 5) * 100)}%`
                            : `${Math.min(100, (wordCount / 8) * 100)}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>
            )}

            {/* After generation — final puzzle + share */}
            {generatedData && (
              <div className="space-y-4">
                {/* Puzzle card */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ready to Send</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {title.trim() || "Your puzzle"}
                      </p>
                    </div>
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  </div>

                  <div className="p-5">
                    <CraftPreviewGrid data={generatedData} puzzleType={activeType} />
                    {from.trim() && (
                      <p className="mt-3 text-[11px] text-muted-foreground/60 italic text-right">— {from.trim()}</p>
                    )}
                  </div>

                  {revealMessage.trim() && (
                    <div className="px-5 pb-5">
                      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">Reveal message preview</p>
                        <p className="text-xs italic text-foreground/70">{revealMessage.trim()}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Share actions */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  {/* Craft limit bar — free users */}
                  {!isPremium && (
                    <div className={cn(
                      "flex items-center justify-between text-[11px] px-3 py-2.5 rounded-lg border",
                      craftStatus.isAtLimit
                        ? "bg-destructive/5 border-destructive/20 text-destructive"
                        : "bg-muted/40 border-border/50 text-muted-foreground"
                    )}>
                      <span>
                        {craftStatus.isAtLimit
                          ? "Monthly limit reached"
                          : `${craftStatus.remaining} free puzzle${craftStatus.remaining === 1 ? "" : "s"} left this month`}
                      </span>
                      <button onClick={() => setUpgradeOpen(true)} className="font-semibold text-primary hover:text-primary/80 transition-colors">
                        Unlimited →
                      </button>
                    </div>
                  )}

                  <Button
                    onClick={handleShare}
                    className="w-full h-11 rounded-xl gap-2 font-semibold"
                  >
                    {shared
                      ? <><Check size={15} /> Sent!</>
                      : <><Send size={15} /> Send Puzzle</>
                    }
                  </Button>

                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy link instead"}
                  </button>

                  {shareUrl && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Puzzle link</p>
                      <p className="text-[11px] font-mono text-foreground/70 truncate select-all">
                        {shareUrl}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
}
