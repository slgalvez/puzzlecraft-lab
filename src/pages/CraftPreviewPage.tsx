/**
 * CraftPreviewPage.tsx — Craft v2 "Builder Canvas"
 *
 * Canvas-centered layout: live preview is the hero.
 * Type pills → Canvas → Accordion tool panels → Sticky action bar.
 * All original functionality preserved.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Plus, Trash2, Sparkles, RefreshCw, Copy,
  Check, Loader2, Save, Trophy, AlertCircle, Inbox,
  Type, Paintbrush, Settings, Heart, ChevronRight,
} from "lucide-react";
import { ShareButton } from "@/components/ui/ShareButton";
import { executeShare } from "@/lib/shareUtils";

import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import CraftTypeCards from "@/components/craft/CraftTypeCards";
import CraftPreviewGrid from "@/components/craft/CraftPreviewGrid";
import CraftInbox from "@/components/craft/CraftInbox";
import CraftSettingsPanel, { type CraftSettings, DEFAULT_CRAFT_SETTINGS } from "@/components/craft/CraftSettingsPanel";
import CraftLivePreview from "@/components/craft/CraftLivePreview";
import CraftThemePicker from "@/components/craft/CraftThemePicker";
import { CraftColorPicker, CRAFT_PALETTES, applyPalette } from "@/components/craft/CraftColorPicker";
import { getTheme } from "@/lib/craftThemes";
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
import {
  type CraftDraft,
  generateDraftId,
  saveDraft,
  deleteDraft,
  loadDrafts,
  addSentItem,
} from "@/lib/craftHistory";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

const TYPE_ACCENT: Record<CraftType, string> = {
  "word-search": "bg-sky-500/15 text-sky-600 border-sky-500/30 ring-sky-500/20",
  "word-fill": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 ring-emerald-500/20",
  crossword: "bg-primary/15 text-primary border-primary/30 ring-primary/20",
  cryptogram: "bg-violet-500/15 text-violet-600 border-violet-500/30 ring-violet-500/20",
};

const TYPE_ACCENT_BORDER: Record<CraftType, string> = {
  "word-search": "border-sky-500/25 shadow-sky-500/5",
  "word-fill": "border-emerald-500/25 shadow-emerald-500/5",
  crossword: "border-primary/25 shadow-primary/5",
  cryptogram: "border-violet-500/25 shadow-violet-500/5",
};

// ── Main component ───────────────────────────────────────────────────────────

export default function CraftPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const inboxTabFromState = (location.state as { inboxTab?: string } | null)?.inboxTab;
  const { isPremium, craftStatus, recordCraftSent } = usePremiumAccess();
  const limitReached = !isPremium && craftStatus.isAtLimit;
  const limitStatus = {
    used: craftStatus.used,
    limit: craftStatus.limit,
    remaining: craftStatus.remaining,
    atLimit: craftStatus.isAtLimit,
    label: craftStatus.isAtLimit
      ? `${craftStatus.limit}/${craftStatus.limit} used this month`
      : `${craftStatus.used}/${craftStatus.limit} used this month`,
  };

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showInbox, setShowInbox] = useState(!!inboxTabFromState);
  const [selectedType, setSelectedType] = useState<CraftType | null>(null);
  const [showTypeCards, setShowTypeCards] = useState(true);

  // Form fields
  const [wordInput, setWordInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [clueEntries, setClueEntries] = useState<{ answer: string; clue: string }[]>([
    { answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" },
  ]);
  const [revealMessage, setRevealMessage] = useState("");
  const [puzzleTitle, setPuzzleTitle] = useState("");
  const [puzzleFrom, setPuzzleFrom] = useState("");
  const [craftSettings, setCraftSettings] = useState<CraftSettings>(DEFAULT_CRAFT_SETTINGS);
  const [selectedTheme, setSelectedTheme] = useState<string>("none");
  const [colorPalette, setColorPalette] = useState("default");

  // Generation state
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft state
  const [draftCount, setDraftCount] = useState(() => loadDrafts().length);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftDirty, setDraftDirty] = useState(true);
  const [enteredFromDraft, setEnteredFromDraft] = useState(false);
  const activeDraftId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentRecorded = useRef(false);

  // Challenge mode
  const [creatorSolveTime, setCreatorSolveTime] = useState<number | null>(null);
  const challengeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshDraftCount = useCallback(() => setDraftCount(loadDrafts().length), []);

  // Summaries for accordion chips
  const wordCount = useMemo(() => {
    if (!selectedType) return 0;
    if (selectedType === "word-fill" || selectedType === "word-search")
      return wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean).length;
    if (selectedType === "cryptogram") return phraseInput.trim().replace(/[^A-Za-z]/g, "").length;
    if (selectedType === "crossword") return clueEntries.filter(e => e.answer.trim() && e.clue.trim()).length;
    return 0;
  }, [selectedType, wordInput, phraseInput, clueEntries]);

  const contentSummary = useMemo(() => {
    if (!selectedType) return "";
    if (selectedType === "cryptogram") return wordCount > 0 ? `${wordCount} letters` : "Empty";
    if (selectedType === "crossword") return wordCount > 0 ? `${wordCount} pair${wordCount !== 1 ? "s" : ""}` : "Empty";
    return wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? "s" : ""}` : "Empty";
  }, [selectedType, wordCount]);

  const themeSummary = useMemo(() => {
    if (selectedTheme === "none" && colorPalette === "default") return "Default";
    const theme = getTheme(selectedTheme);
    const parts: string[] = [];
    if (selectedTheme !== "none") parts.push(`${theme.emoji} ${theme.label}`);
    if (colorPalette !== "default") {
      const pal = CRAFT_PALETTES.find(p => p.id === colorPalette);
      if (pal) parts.push(pal.label);
    }
    return parts.join(" · ") || "Default";
  }, [selectedTheme, colorPalette]);

  const settingsSummary = useMemo(() => {
    return craftSettings.difficulty.charAt(0).toUpperCase() + craftSettings.difficulty.slice(1);
  }, [craftSettings.difficulty]);

  const personalSummary = useMemo(() => {
    const parts: string[] = [];
    if (puzzleTitle.trim()) parts.push(`"${puzzleTitle.trim()}"`);
    if (puzzleFrom.trim()) parts.push(`from ${puzzleFrom.trim()}`);
    if (!parts.length) return "None";
    return parts.join(" · ");
  }, [puzzleTitle, puzzleFrom]);

  const handleColorPaletteSelect = (id: string) => {
    setColorPalette(id);
    const palette = CRAFT_PALETTES.find(p => p.id === id);
    if (palette) applyPalette(palette);
    else applyPalette({ id: "default", label: "Default", cell: "", active: "", highlight: "", correct: "", border: "", text: "" });
  };

  // Pre-fill from "send one back" flow
  useEffect(() => {
    const state = location.state as { prefillTitle?: string } | null;
    if (state?.prefillTitle) setPuzzleTitle(state.prefillTitle);
    if (state) window.history.replaceState({}, "");
  }, [location.state]);

  useEffect(() => () => { if (challengeTimerRef.current) clearInterval(challengeTimerRef.current); }, []);

  // Reset color palette on unmount so it doesn't leak to other pages
  useEffect(() => {
    return () => {
      applyPalette({ id: "default", label: "Default", cell: "", active: "", highlight: "", correct: "", border: "", text: "" });
    };
  }, []);

  // Mark dirty
  useEffect(() => {
    if (selectedType) { setDraftDirty(true); setDraftSaved(false); }
  }, [wordInput, phraseInput, clueEntries, revealMessage, puzzleTitle, puzzleFrom, craftSettings]);

  // Auto-save draft
  useEffect(() => {
    if (!selectedType) return;
    if (!activeDraftId.current) activeDraftId.current = generateDraftId();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!activeDraftId.current || !selectedType) return;
      saveDraft({
        id: activeDraftId.current, type: selectedType, title: puzzleTitle, from: puzzleFrom,
        wordInput, phraseInput, clueEntries, revealMessage, settings: craftSettings, updatedAt: Date.now(),
      });
      refreshDraftCount();
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [selectedType, puzzleTitle, puzzleFrom, wordInput, phraseInput, clueEntries, revealMessage, craftSettings, refreshDraftCount]);

  // Read creator_time back from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedTime = params.get("creator_time");
    if (returnedTime) {
      const seconds = parseInt(returnedTime, 10);
      if (!isNaN(seconds) && seconds > 0) {
        setCreatorSolveTime(seconds);
        window.history.replaceState({}, "", window.location.pathname);
        if (shareUrl) {
          const shareId = shareUrl.includes("/s/") ? shareUrl.split("/s/")[1].split("?")[0] : shareUrl;
          supabase.from("shared_puzzles" as any).update({ creator_solve_time: seconds, creator_solved_at: new Date().toISOString() } as any).eq("id", shareId).then();
        }
      }
    }
  }, [shareUrl]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(() => {
    if (!selectedType) return;
    if (!activeDraftId.current) activeDraftId.current = generateDraftId();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveDraft({
      id: activeDraftId.current, type: selectedType, title: puzzleTitle, from: puzzleFrom,
      wordInput, phraseInput, clueEntries, revealMessage, settings: craftSettings, updatedAt: Date.now(),
    });
    refreshDraftCount();
    setDraftSaved(true); setDraftDirty(false);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [selectedType, puzzleTitle, puzzleFrom, wordInput, phraseInput, clueEntries, revealMessage, craftSettings, refreshDraftCount]);

  const handleSelectType = (type: CraftType) => {
    setSelectedType(type);
    setShowTypeCards(false);
  };

  const buildPuzzleData = useCallback((): (Record<string, unknown> & { droppedWords?: string[] }) | null => {
    if (!selectedType) return null;
    switch (selectedType) {
      case "word-fill": case "word-search": {
        const words = wordInput.split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
        if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return null; }
        return (selectedType === "word-fill" ? generateCustomFillIn(words, craftSettings.difficulty) : generateCustomWordSearch(words, craftSettings.difficulty)) as unknown as Record<string, unknown>;
      }
      case "cryptogram": {
        if (phraseInput.trim().length < 3) { toast({ title: "Enter a longer phrase" }); return null; }
        return generateCustomCryptogram(phraseInput.trim(), craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
      case "crossword": {
        const valid = clueEntries.filter(e => e.answer.trim() && e.clue.trim());
        if (valid.length < 2) { toast({ title: "Enter at least 2 answer/clue pairs" }); return null; }
        return generateCustomCrossword(valid, craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
    }
  }, [selectedType, wordInput, phraseInput, clueEntries, craftSettings.difficulty, toast]);

  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    try {
      const data = buildPuzzleData();
      if (!data) return;
      setGeneratedData(data);

      const droppedWords: string[] = (data as any).droppedWords ?? [];
      if (droppedWords.length > 0) {
        const wordList = droppedWords.slice(0, 3).join(", ");
        const more = droppedWords.length > 3 ? ` +${droppedWords.length - 3} more` : "";
        toast({
          title: `${droppedWords.length} word${droppedWords.length > 1 ? "s" : ""} couldn't fit`,
          description: selectedType === "crossword"
            ? `${wordList}${more} — try words that share more letters.`
            : `${wordList}${more} — try removing long words or reducing the total count.`,
          variant: "destructive",
        });
        return;
      }

      const payload: CraftPayload = {
        type: selectedType, puzzleData: data, revealMessage,
        settings: { difficulty: craftSettings.difficulty, hintsEnabled: craftSettings.hintsEnabled, revealEnabled: craftSettings.revealEnabled, checkEnabled: craftSettings.checkEnabled },
      };
      if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
      if (puzzleFrom.trim()) payload.from = puzzleFrom.trim();
      if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
      if (colorPalette !== "default") (payload as any).colorPalette = colorPalette;

      setSaving(true);
      const shortId = generateShortId();
      const { error: dbErr } = await supabase.from("shared_puzzles" as any).insert({ id: shortId, payload } as any);
      if (dbErr) { toast({ title: "Failed to save puzzle", description: "Please try again" }); return; }

      setShareUrl(buildCraftShareUrl(shortId));
      sentRecorded.current = false;
      toast({ title: "Puzzle ready ✨" });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Please try different input" });
    } finally {
      setSaving(false);
    }
  }, [selectedType, buildPuzzleData, revealMessage, puzzleTitle, puzzleFrom, craftSettings, selectedTheme, colorPalette, toast]);

  const handleRegenerate = useCallback(async () => {
    if (!selectedType) return;
    try {
      const data = buildPuzzleData();
      if (!data) return;
      setGeneratedData(data);
      if (shareUrl) {
        const shareId = shareUrl.split("/s/")[1] || shareUrl;
        const payload: CraftPayload = {
          type: selectedType, puzzleData: data, revealMessage,
          settings: { difficulty: craftSettings.difficulty, hintsEnabled: craftSettings.hintsEnabled, revealEnabled: craftSettings.revealEnabled, checkEnabled: craftSettings.checkEnabled },
        };
        if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
        if (puzzleFrom.trim()) payload.from = puzzleFrom.trim();
        if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
        if (colorPalette !== "default") (payload as any).colorPalette = colorPalette;
        await supabase.from("shared_puzzles" as any).update({ payload } as any).eq("id", shareId);
      }
      sentRecorded.current = false;
      toast({ title: "Puzzle refreshed" });
    } catch (err) {
      toast({ title: "Regeneration failed", description: err instanceof Error ? err.message : "Please try different input" });
    }
  }, [selectedType, buildPuzzleData, shareUrl, revealMessage, puzzleTitle, puzzleFrom, craftSettings, selectedTheme, colorPalette, toast]);

  const recordSent = useCallback(() => {
    if (sentRecorded.current || !shareUrl || !selectedType) return;
    sentRecorded.current = true;
    const shareId = shareUrl.split("/s/")[1] || shareUrl;
    if (activeDraftId.current) { deleteDraft(activeDraftId.current); activeDraftId.current = null; }
    addSentItem({ id: shareId, shareId, type: selectedType, title: puzzleTitle.trim(), from: puzzleFrom.trim(), revealMessage, shareUrl, sentAt: Date.now() });
    recordCraftSent(shareId);
    refreshDraftCount();
  }, [shareUrl, selectedType, puzzleTitle, puzzleFrom, revealMessage, refreshDraftCount, recordCraftSent]);

  const handleSolveFirst = useCallback(() => {
    if (!shareUrl) return;
    const shareId = shareUrl.includes("/s/") ? shareUrl.split("/s/")[1].split("?")[0] : shareUrl;
    navigate(`/s/${shareId}?creator=1`);
  }, [shareUrl, navigate]);

  const handleCopyLink = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl) return;
    const fullText = buildCraftShareText(puzzleTitle.trim() || undefined, puzzleFrom.trim() || undefined, shareUrl, selectedType ?? undefined, creatorSolveTime);
    try {
      await navigator.clipboard.writeText(fullText);
      recordSent(); setCopied(true); setShareSuccess(true);
      toast({ title: "Puzzle link copied" });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShareSuccess(false), 1500);
    } catch { toast({ title: "Failed to copy link" }); }
  };

  const handleShare = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl || !generatedData || !selectedType) return;
    const shareText = buildCraftShareText(puzzleTitle.trim() || undefined, puzzleFrom.trim() || undefined, shareUrl, selectedType ?? undefined, creatorSolveTime);
    const result = await executeShare(shareText);
    if (result === "shared" || result === "copied") {
      recordSent();
      setShareSuccess(true);
      if (result === "copied") {
        setCopied(true);
        toast({ title: "Puzzle link copied" });
        setTimeout(() => setCopied(false), 2000);
      }
      setTimeout(() => setShareSuccess(false), 1500);
    } else {
      toast({ title: "Failed to copy link" });
    }
  };

  const handleStartOver = () => {
    applyPalette({ id: "default", label: "Default", cell: "", active: "", highlight: "", correct: "", border: "", text: "" });
    if (activeDraftId.current) { deleteDraft(activeDraftId.current); activeDraftId.current = null; refreshDraftCount(); }
    setSelectedType(null); setShowTypeCards(true); setWordInput(""); setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage(""); setPuzzleTitle(""); setPuzzleFrom("");
    setCraftSettings(DEFAULT_CRAFT_SETTINGS); setGeneratedData(null); setShareUrl(null);
    setCopied(false); setShareSuccess(false); setSelectedTheme("none"); setColorPalette("default");
    setCreatorSolveTime(null); sentRecorded.current = false;
  };

  const handleResumeDraft = useCallback((draft: CraftDraft) => {
    activeDraftId.current = draft.id;
    setSelectedType(draft.type); setPuzzleTitle(draft.title); setPuzzleFrom(draft.from);
    setWordInput(draft.wordInput); setPhraseInput(draft.phraseInput);
    setClueEntries(draft.clueEntries.length >= 2 ? draft.clueEntries : [{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage(draft.revealMessage);
    if (draft.settings) {
      const d = draft.settings.difficulty;
      setCraftSettings({
        difficulty: d === "easy" || d === "medium" || d === "hard" ? d : DEFAULT_CRAFT_SETTINGS.difficulty,
        hintsEnabled: draft.settings.hintsEnabled ?? DEFAULT_CRAFT_SETTINGS.hintsEnabled,
        revealEnabled: draft.settings.revealEnabled ?? DEFAULT_CRAFT_SETTINGS.revealEnabled,
        checkEnabled: draft.settings.checkEnabled ?? DEFAULT_CRAFT_SETTINGS.checkEnabled,
      });
    } else setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    setGeneratedData(null); setShareUrl(null); setShowInbox(false); setShowTypeCards(false);
    setEnteredFromDraft(true);
  }, []);

  const handleBack = () => {
    if (enteredFromDraft) { setEnteredFromDraft(false); setShowInbox(true); return; }
    if (selectedType && !showTypeCards) {
      handleStartOver();
    } else {
      navigate(-1);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const isBuilding = !!selectedType && !showTypeCards;
  const hasGenerated = !!generatedData && !!shareUrl;

  const isAdminRoute = typeof window !== "undefined" && window.location.pathname === "/craft-v2";

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto pb-28">
        {isAdminRoute && (
          <div className="flex items-center justify-center pt-3">
            <PreviewLabel alwaysShow label="Live craft experience" />
          </div>
        )}
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-lg font-bold text-foreground">Create a Puzzle</h1>
            {!isPremium && !showInbox && (
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                {limitStatus.remaining}/{limitStatus.limit} free
                <span className="mx-1">·</span>
                <button onClick={() => setUpgradeOpen(true)} className="text-primary/70 hover:text-primary font-medium transition-colors">
                  Unlimited with Plus
                </button>
              </p>
            )}
          </div>

          <button
            onClick={() => setShowInbox(!showInbox)}
            className={cn(
              "relative flex items-center gap-1 text-xs font-medium transition-colors px-3 py-1.5 rounded-full",
              showInbox ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Inbox size={14} />
            <span className="hidden sm:inline">Inbox</span>
            {draftCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {draftCount}
              </span>
            )}
          </button>
        </div>

        {/* Limit warning */}
        {!isPremium && limitStatus.atLimit && !showInbox && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-destructive font-medium mb-3 py-2 rounded-lg bg-destructive/5 border border-destructive/15">
            <AlertCircle size={13} />
            <span>Monthly limit reached</span>
            <span>·</span>
            <button onClick={() => setUpgradeOpen(true)} className="underline">Upgrade</button>
          </div>
        )}

        {/* ── Inbox View ─────────────────────────────────────────────── */}
        {showInbox && (
          <div className="animate-in fade-in-0 duration-200">
            <CraftInbox onResumeDraft={handleResumeDraft} onDataChange={refreshDraftCount} initialTab={inboxTabFromState || undefined} />
          </div>
        )}

        {/* ── Builder View ───────────────────────────────────────────── */}
        {!showInbox && (
          <div className="animate-in fade-in-0 duration-200">
            {/* Type Cards (hero on first visit) */}
            {showTypeCards && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <CraftTypeCards onSelect={handleSelectType} />
              </div>
            )}

            {/* Type Pill Bar (compact, once type is selected) */}
            {isBuilding && (
              <div className="mb-4 animate-in fade-in-0 duration-200">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {TYPE_OPTIONS.map(opt => {
                    const active = selectedType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (opt.value !== selectedType) {
                            setSelectedType(opt.value as CraftType);
                            setGeneratedData(null); setShareUrl(null);
                            sentRecorded.current = false;
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                          active
                            ? TYPE_ACCENT[opt.value as CraftType]
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <PuzzleIcon type={opt.value as any} size={16} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Canvas ──────────────────────────────────────────────── */}
            {isBuilding && selectedType && (
              <div className="space-y-4">
                {/* Live Preview / Final Preview Canvas */}
                <div
                  className={cn(
                    "rounded-2xl border-2 bg-card p-5 transition-all duration-300 shadow-lg",
                    selectedType ? TYPE_ACCENT_BORDER[selectedType] : "border-border",
                  )}
                >
                  {/* Title overlay */}
                  {(puzzleTitle.trim() || puzzleFrom.trim()) && (
                    <div className="mb-3 pb-3 border-b border-border/50">
                      {puzzleTitle.trim() && (
                        <h3 className="text-sm font-display font-semibold text-foreground text-center">{puzzleTitle.trim()}</h3>
                      )}
                      {puzzleFrom.trim() && (
                        <p className="text-[11px] text-muted-foreground/60 text-center mt-0.5">from {puzzleFrom.trim()}</p>
                      )}
                    </div>
                  )}

                  {/* Canvas body */}
                  {hasGenerated ? (
                    <CraftPreviewGrid data={generatedData!} puzzleType={selectedType} />
                  ) : (
                    <CraftLivePreview
                      type={selectedType}
                      wordInput={selectedType === "word-fill" || selectedType === "word-search" ? wordInput : ""}
                      phraseInput={selectedType === "cryptogram" ? phraseInput : ""}
                      clueEntries={selectedType === "crossword" ? clueEntries : []}
                      difficulty={craftSettings.difficulty}
                    />
                  )}
                </div>

                {/* Reveal message preview */}
                {hasGenerated && revealMessage && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Reveal Message</p>
                    <p className="text-sm italic text-foreground/80">{revealMessage}</p>
                  </div>
                )}

                {/* Challenge card (post-generate) */}
                {hasGenerated && (
                  <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    {!creatorSolveTime ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                            <Trophy size={16} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground text-sm">Set a challenge time</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              Solve it yourself first to set a time to beat.
                            </p>
                            <div className="flex gap-2 mt-2.5">
                              <Button onClick={handleSolveFirst} size="sm" className="gap-1.5 h-8 text-xs">
                                <Trophy size={12} /> Solve first
                              </Button>
                              <Button onClick={() => {}} size="sm" variant="ghost" className="text-muted-foreground text-xs h-8">
                                Skip
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                          <Trophy size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Challenge: {Math.floor(creatorSolveTime / 60)}:{(creatorSolveTime % 60).toString().padStart(2, "0")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Your recipient will try to beat this</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tool Panels (accordion) ─────────────────────────── */}
                {!hasGenerated && (
                  <Accordion type="multiple" defaultValue={["content"]} className="space-y-1.5">
                    {/* Content */}
                    <AccordionItem value="content" className="border rounded-xl px-4 bg-card/50">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Type size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium">Content</span>
                          <span className="text-[10px] text-muted-foreground/60 ml-1">{contentSummary}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-3">
                        {(selectedType === "word-fill" || selectedType === "word-search") && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Words (one per line or comma-separated)</label>
                            <Textarea value={wordInput} onChange={e => setWordInput(e.target.value)} placeholder={"CHUCKY\nBEACH\nBIRTHDAY\nVACATION"} rows={5} className="resize-none font-mono text-sm uppercase tracking-wide" />
                          </div>
                        )}
                        {selectedType === "cryptogram" && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Phrase or message to encode</label>
                            <Textarea value={phraseInput} onChange={e => setPhraseInput(e.target.value)} placeholder="MEET ME AT MIDNIGHT" rows={4} className="resize-none" />
                          </div>
                        )}
                        {selectedType === "crossword" && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Answer + clue pairs</label>
                            {clueEntries.map((entry, i) => (
                              <div key={i} className="flex gap-2">
                                <Input value={entry.answer} onChange={e => { const u = [...clueEntries]; u[i] = { ...entry, answer: e.target.value }; setClueEntries(u); }} placeholder="Answer" className="flex-1" />
                                <Input value={entry.clue} onChange={e => { const u = [...clueEntries]; u[i] = { ...entry, clue: e.target.value }; setClueEntries(u); }} placeholder="Clue" className="flex-[2]" />
                                {clueEntries.length > 2 && (
                                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setClueEntries(clueEntries.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                                )}
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => setClueEntries([...clueEntries, { answer: "", clue: "" }])}><Plus className="h-3 w-3 mr-1" /> Add entry</Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Theme & Colors */}
                    <AccordionItem value="theme" className="border rounded-xl px-4 bg-card/50">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Paintbrush size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium">Theme & Colors</span>
                          <span className="text-[10px] text-muted-foreground/60 ml-1">{themeSummary}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <CraftThemePicker
                          selected={selectedTheme}
                          onSelect={(id) => {
                            setSelectedTheme(id);
                            const theme = getTheme(id);
                            if (!revealMessage.trim() && theme.revealTemplates.length > 0) setRevealMessage(theme.revealTemplates[0]);
                          }}
                          onRevealTemplate={(tmpl) => setRevealMessage(tmpl)}
                          onPrefillWords={(words) => {
                            if (!words.includes("\n")) {
                              setWordInput(prev => { const e = prev.trim(); if (!e) return words; if (e.includes(words)) return prev; return e + "\n" + words; });
                            } else setWordInput(words);
                            if (selectedType === "crossword") {
                              const wordList = words.split("\n").filter(Boolean);
                              if (wordList.length > 0) setClueEntries(wordList.map(w => ({ answer: w, clue: "" })));
                            }
                          }}
                          currentRevealMessage={revealMessage}
                          showWordSection={selectedType === "word-fill" || selectedType === "word-search"}
                        />
                        <CraftColorPicker selected={colorPalette} onSelect={handleColorPaletteSelect} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Settings */}
                    <AccordionItem value="settings" className="border rounded-xl px-4 bg-card/50">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Settings size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium">Settings</span>
                          <span className="text-[10px] text-muted-foreground/60 ml-1">{settingsSummary}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <CraftSettingsPanel value={craftSettings} onChange={setCraftSettings} />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Personal Touch */}
                    <AccordionItem value="personal" className="border rounded-xl px-4 bg-card/50">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Heart size={14} className="text-muted-foreground" />
                          <span className="text-sm font-medium">Personal Touch</span>
                          <span className="text-[10px] text-muted-foreground/60 ml-1">{personalSummary}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Puzzle title</label>
                            <Input value={puzzleTitle} onChange={e => setPuzzleTitle(e.target.value)} placeholder="Just for You" maxLength={100} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">From</label>
                            <Input value={puzzleFrom} onChange={e => setPuzzleFrom(e.target.value)} placeholder="Mariah" maxLength={100} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Message revealed after solving</label>
                          <Input value={revealMessage} onChange={e => setRevealMessage(e.target.value)} placeholder="Congratulations! You cracked it 🎉" maxLength={500} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Share actions (post-generate) */}
                {hasGenerated && (
                  <div className="relative rounded-xl border border-border bg-card p-4 space-y-3 overflow-hidden animate-in fade-in-0 duration-200">
                    {shareSuccess && (
                      <div className="absolute inset-0 flex items-center justify-center bg-card/90 z-10 animate-in fade-in-0 duration-200">
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Check size={24} strokeWidth={2.5} /></div>
                          <span className="text-sm font-medium text-foreground">Sent!</span>
                        </div>
                      </div>
                    )}
                    <ShareButton onShare={handleShare} label="Send Puzzle" iconSize={16} className="w-full" />
                    <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5">
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied!" : "or copy link"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky Action Bar ──────────────────────────────────────── */}
      {isBuilding && !showInbox && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-lg">
          <div className="container max-w-3xl mx-auto flex items-center justify-between py-3 px-4">
            {/* Left: draft save */}
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {draftSaved && !draftDirty ? (
                <><Check className="h-3.5 w-3.5 text-primary" /><span className="text-primary font-medium">Saved</span></>
              ) : (
                <><Save className="h-3.5 w-3.5" /><span>Save draft</span></>
              )}
            </button>

            {/* Center/Right: primary action */}
            <div className="flex items-center gap-2">
              {hasGenerated && (
                <>
                  <Button onClick={handleRegenerate} variant="outline" size="sm" className="gap-1.5 h-9">
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <Button onClick={handleStartOver} variant="ghost" size="sm" className="text-muted-foreground h-9">
                    Start over
                  </Button>
                </>
              )}
              {!hasGenerated && (
                <Button onClick={handleGenerate} disabled={saving} className="gap-2 h-9 px-5 relative overflow-hidden">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {saving ? "Saving…" : "Generate Puzzle"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
}
