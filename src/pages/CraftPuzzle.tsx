import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Sparkles, RefreshCw, Share, Copy, Check, Loader2, Save, Trophy, AlertCircle, Palette } from "lucide-react";
import { CraftSolveFirst } from "@/components/craft/CraftSolveFirst";

import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { cn } from "@/lib/utils";
import CraftStepper from "@/components/craft/CraftStepper";
import CraftTypeCards, { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import CraftPreviewGrid from "@/components/craft/CraftPreviewGrid";
import CraftNav, { type CraftView } from "@/components/craft/CraftNav";
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

type Step = "type" | "content" | "preview";

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const CraftPuzzle = () => {
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
  const [view, setView] = useState<CraftView>(inboxTabFromState ? "inbox" : "create");
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
  const [saving, setSaving] = useState(false);
  const [craftSettings, setCraftSettings] = useState<CraftSettings>(DEFAULT_CRAFT_SETTINGS);
  const [draftCount, setDraftCount] = useState(() => loadDrafts().length);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftDirty, setDraftDirty] = useState(true);
  const [enteredFromDraft, setEnteredFromDraft] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("none");
  const [colorPalette, setColorPalette] = useState("default");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleColorPaletteSelect = (id: string) => {
    setColorPalette(id);
    const palette = CRAFT_PALETTES.find((p) => p.id === id);
    if (palette) {
      applyPalette(palette);
    } else {
      applyPalette({ id: "default", label: "Default", cell: "", active: "", highlight: "", correct: "", border: "", text: "" });
    }
  };
  
  const sentRecorded = useRef(false);

  // Challenge mode state
  const [creatorSolveTime, setCreatorSolveTime] = useState<number | null>(null);
  const [challengeTimerRunning, setChallengeTimerRunning] = useState(false);
  const [challengeElapsed, setChallengeElapsed] = useState(0);
  const challengeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const challengeStartRef = useRef<number | null>(null);

  // Active draft ID for auto-save
  const activeDraftId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshDraftCount = useCallback(() => setDraftCount(loadDrafts().length), []);

  // Accept pre-filled state from "Send one back" flow
  useEffect(() => {
    const state = location.state as { prefillTitle?: string; startAtContent?: boolean } | null;
    if (state?.prefillTitle) {
      setPuzzleTitle(state.prefillTitle);
    }
    if (state) {
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Challenge timer cleanup
  useEffect(() => {
    return () => {
      if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
    };
  }, []);

  /* ── Mark dirty on any content change ── */
  useEffect(() => {
    if (step === "content" || step === "preview") {
      setDraftDirty(true);
      setDraftSaved(false);
    }
  }, [wordInput, phraseInput, clueEntries, revealMessage, puzzleTitle, puzzleFrom, craftSettings]);

  /* ── Auto-save draft ── */
  useEffect(() => {
    if (step !== "content" || !selectedType) return;

    // Create draft ID if entering content fresh
    if (!activeDraftId.current) {
      activeDraftId.current = generateDraftId();
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!activeDraftId.current || !selectedType) return;
      const draft: CraftDraft = {
        id: activeDraftId.current,
        type: selectedType,
        title: puzzleTitle,
        from: puzzleFrom,
        wordInput,
        phraseInput,
        clueEntries,
        revealMessage,
        settings: craftSettings,
        updatedAt: Date.now(),
      };
      saveDraft(draft);
      refreshDraftCount();
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [step, selectedType, puzzleTitle, puzzleFrom, wordInput, phraseInput, clueEntries, revealMessage, craftSettings, refreshDraftCount]);

  /** Manual save draft — works on both content and preview steps */
  const handleSaveDraft = useCallback(() => {
    if (!selectedType) return;
    if (!activeDraftId.current) {
      activeDraftId.current = generateDraftId();
    }
    // Clear any pending auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);

    const draft: CraftDraft = {
      id: activeDraftId.current,
      type: selectedType,
      title: puzzleTitle,
      from: puzzleFrom,
      wordInput,
      phraseInput,
      clueEntries,
      revealMessage,
      settings: craftSettings,
      updatedAt: Date.now(),
    };
    saveDraft(draft);
    refreshDraftCount();
    setDraftSaved(true);
    setDraftDirty(false);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [selectedType, puzzleTitle, puzzleFrom, wordInput, phraseInput, clueEntries, revealMessage, craftSettings, refreshDraftCount]);

  const handleSelectType = (type: CraftType) => {
    setSelectedType(type);
    setStep("content");
  };

  /** Pure generation — builds puzzle data without any DB/share/sent logic */
  const buildPuzzleData = useCallback((): Record<string, unknown> | null => {
    if (!selectedType) return null;
    switch (selectedType) {
      case "word-fill": {
        const words = wordInput.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
        if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return null; }
        return generateCustomFillIn(words, craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
      case "word-search": {
        const words = wordInput.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
        if (words.length < 2) { toast({ title: "Enter at least 2 words" }); return null; }
        return generateCustomWordSearch(words, craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
      case "cryptogram": {
        if (phraseInput.trim().length < 3) { toast({ title: "Enter a longer phrase" }); return null; }
        return generateCustomCryptogram(phraseInput.trim(), craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
      case "crossword": {
        const valid = clueEntries.filter((entry) => entry.answer.trim() && entry.clue.trim());
        if (valid.length < 2) { toast({ title: "Enter at least 2 answer/clue pairs" }); return null; }
        return generateCustomCrossword(valid, craftSettings.difficulty) as unknown as Record<string, unknown>;
      }
    }
  }, [selectedType, wordInput, phraseInput, clueEntries, craftSettings.difficulty, toast]);


  /** Generate + save to DB + create share URL (first time only) */
  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    try {
      const data = buildPuzzleData();
      if (!data) return;

      setGeneratedData(data);

      // Detect dropped words and warn user
      const inputWords = (() => {
        if (!selectedType) return [];
        if (selectedType === "crossword") {
          return clueEntries.filter((e) => e.answer.trim() && e.clue.trim()).map((e) => e.answer.trim());
        }
        return wordInput.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
      })();
      const placedCount = (() => {
        if (!data || inputWords.length === 0) return inputWords.length;
        try {
          if (selectedType === "word-fill" || selectedType === "word-search") {
            const entries = (data.entries as any[]) ?? (data.words as any[]) ?? [];
            return entries.length;
          }
          if (selectedType === "crossword") {
            return ((data.clues as any[]) ?? []).length;
          }
        } catch {}
        return inputWords.length;
      })();
      const droppedCount = Math.max(0, inputWords.length - placedCount);
      if (droppedCount > 0) {
        toast({
          title: `${droppedCount} word${droppedCount > 1 ? "s" : ""} won't fit`,
          description: droppedCount > 2
            ? `Remove ${droppedCount} words or use shorter words, then try again.`
            : `Try removing ${droppedCount === 1 ? "a word" : "a couple of words"} or using shorter ones.`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const payload: CraftPayload = {
        type: selectedType,
        puzzleData: data,
        revealMessage,
        settings: {
          difficulty: craftSettings.difficulty,
          hintsEnabled: craftSettings.hintsEnabled,
          revealEnabled: craftSettings.revealEnabled,
          checkEnabled: craftSettings.checkEnabled,
        },
      };
      if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
      if (puzzleFrom.trim()) payload.from = puzzleFrom.trim();
      if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
      if (colorPalette !== "default") (payload as any).colorPalette = colorPalette;

      setSaving(true);
      const shortId = generateShortId();
      const { error: dbErr } = await supabase
        .from("shared_puzzles" as any)
        .insert({ id: shortId, payload } as any);

      if (dbErr) {
        toast({ title: "Failed to save puzzle", description: "Please try again" });
        return;
      }


      const url = buildCraftShareUrl(shortId);
      setShareUrl(url);
      sentRecorded.current = false;

      toast({ title: "Puzzle ready ✨" });
      setStep("preview");
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Please try different input" });
    } finally {
      setSaving(false);
    }
  }, [selectedType, buildPuzzleData, revealMessage, puzzleTitle, puzzleFrom, craftSettings, toast]);

  /** Regenerate — only refreshes puzzle data + updates DB, stays in draft */
  const handleRegenerate = useCallback(async () => {
    if (!selectedType) return;
    try {
      const data = buildPuzzleData();
      if (!data) return;

      setGeneratedData(data);

      // Update the existing share record with new puzzle data
      if (shareUrl) {
        const shareId = shareUrl.split("/s/")[1] || shareUrl;
        const payload: CraftPayload = {
          type: selectedType,
          puzzleData: data,
          revealMessage,
          settings: {
            difficulty: craftSettings.difficulty,
            hintsEnabled: craftSettings.hintsEnabled,
            revealEnabled: craftSettings.revealEnabled,
            checkEnabled: craftSettings.checkEnabled,
          },
        };
        if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
        if (puzzleFrom.trim()) payload.from = puzzleFrom.trim();
        if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
        if (colorPalette !== "default") (payload as any).colorPalette = colorPalette;

        await supabase
          .from("shared_puzzles" as any)
          .update({ payload } as any)
          .eq("id", shareId);
      }

      toast({ title: "Puzzle refreshed" });
    } catch (err) {
      toast({ title: "Regeneration failed", description: err instanceof Error ? err.message : "Please try different input" });
    }
  }, [selectedType, buildPuzzleData, shareUrl, revealMessage, puzzleTitle, puzzleFrom, craftSettings, toast]);

  /** Record the puzzle as "Sent" exactly once, on actual share/copy */
  const recordSent = useCallback(() => {
    if (sentRecorded.current || !shareUrl || !selectedType) return;
    sentRecorded.current = true;

    // Extract shareId from url
    const shareId = shareUrl.split("/s/")[1] || shareUrl;

    if (activeDraftId.current) {
      deleteDraft(activeDraftId.current);
      activeDraftId.current = null;
    }

    addSentItem({
      id: shareId,
      shareId,
      type: selectedType,
      title: puzzleTitle.trim(),
      from: puzzleFrom.trim(),
      revealMessage,
      shareUrl,
      sentAt: Date.now(),
    });
    recordCraftSent(shareId);
    refreshDraftCount();
  }, [shareUrl, selectedType, puzzleTitle, puzzleFrom, revealMessage, refreshDraftCount, recordCraftSent]);

  const handleSolveFirst = useCallback(() => {
    if (!shareUrl) return;
    const shareId = shareUrl.includes("/s/")
      ? shareUrl.split("/s/")[1].split("?")[0]
      : shareUrl;
    navigate(`/s/${shareId}?creator=1`);
  }, [shareUrl, navigate]);

  // Read creator_time back from URL when returning from solving
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedTime = params.get("creator_time");
    if (returnedTime) {
      const seconds = parseInt(returnedTime, 10);
      if (!isNaN(seconds) && seconds > 0) {
        setCreatorSolveTime(seconds);
        window.history.replaceState({}, "", window.location.pathname);

        if (shareUrl) {
          const shareId = shareUrl.includes("/s/")
            ? shareUrl.split("/s/")[1].split("?")[0]
            : shareUrl;
          supabase
            .from("shared_puzzles" as any)
            .update({
              creator_solve_time: seconds,
              creator_solved_at: new Date().toISOString(),
            } as any)
            .eq("id", shareId)
            .then();
        }
      }
    }
  }, [shareUrl]);

  const handleStartChallenge = useCallback(() => {
    if (!shareUrl || !selectedType) return;
    challengeStartRef.current = Date.now();
    setChallengeTimerRunning(true);
    setChallengeElapsed(0);
    challengeTimerRef.current = setInterval(() => {
      setChallengeElapsed(Math.floor((Date.now() - challengeStartRef.current!) / 1000));
    }, 1000);
    const shareId = shareUrl.split("/s/")[1] || shareUrl;
    window.open(`/s/${shareId}`, "_blank");
  }, [shareUrl, selectedType]);

  const handleCreatorSolved = useCallback((time: number) => {
    if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
    setChallengeTimerRunning(false);
    setCreatorSolveTime(time);
    if (shareUrl) {
      const shareId = shareUrl.split("/s/")[1] || shareUrl;
      supabase
        .from("shared_puzzles" as any)
        .update({
          creator_solve_time: time,
          creator_solved_at: new Date().toISOString(),
        } as any)
        .eq("id", shareId)
        .then();
    }
    toast({ title: `Challenge set! Your time: ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}` });
  }, [shareUrl, toast]);

  const handleCopyLink = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl) return;
    const fullText = buildCraftShareText(
      puzzleTitle.trim() || undefined,
      puzzleFrom.trim() || undefined,
      shareUrl,
      selectedType ?? undefined,
      creatorSolveTime,
    );
    try {
      await navigator.clipboard.writeText(fullText);
      recordSent();
      setCopied(true);
      setShareSuccess(true);
      toast({ title: "Puzzle link copied" });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShareSuccess(false), 1500);
    } catch {
      toast({ title: "Failed to copy link" });
    }
  };

  const handleShare = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl || !generatedData || !selectedType) return;

    const shareText = buildCraftShareText(
      puzzleTitle.trim() || undefined,
      puzzleFrom.trim() || undefined,
      shareUrl,
      selectedType ?? undefined,
      creatorSolveTime,
    );

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        recordSent();
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 1500);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn("Share failed:", err.message);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      recordSent();
      setCopied(true);
      setShareSuccess(true);
      toast({ title: "Puzzle link copied" });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShareSuccess(false), 1500);
    } catch {
      toast({ title: "Failed to copy link" });
    }
  };

  const handleBack = () => {
    if (step === "preview") setStep("content");
    else if (step === "content") {
      if (enteredFromDraft) {
        setEnteredFromDraft(false);
        setView("inbox");
        return;
      }
    sentRecorded.current = false;
    setStep("type");
      setSelectedType(null);
    }
  };

  const handleStartOver = () => {
    applyPalette({ id: "default", label: "Default", cell: "", active: "", highlight: "", correct: "", border: "", text: "" });
    // Delete active draft
    if (activeDraftId.current) {
      deleteDraft(activeDraftId.current);
      activeDraftId.current = null;
      refreshDraftCount();
    }
    setStep("type");
    setSelectedType(null);
    setWordInput("");
    setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage("");
    setPuzzleTitle("");
    setPuzzleFrom("");
    setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    setGeneratedData(null);
    setShareUrl(null);
    setCopied(false);
    setShareSuccess(false);
    setSelectedTheme("none");
  };

  const handleResumeDraft = useCallback((draft: CraftDraft) => {
    activeDraftId.current = draft.id;
    setSelectedType(draft.type);
    setPuzzleTitle(draft.title);
    setPuzzleFrom(draft.from);
    setWordInput(draft.wordInput);
    setPhraseInput(draft.phraseInput);
    setClueEntries(
      draft.clueEntries.length >= 2
        ? draft.clueEntries
        : [{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]
    );
    setRevealMessage(draft.revealMessage);
    if (draft.settings) {
      setCraftSettings({
        difficulty: draft.settings.difficulty ?? DEFAULT_CRAFT_SETTINGS.difficulty,
        hintsEnabled: draft.settings.hintsEnabled ?? DEFAULT_CRAFT_SETTINGS.hintsEnabled,
        revealEnabled: draft.settings.revealEnabled ?? DEFAULT_CRAFT_SETTINGS.revealEnabled,
        checkEnabled: draft.settings.checkEnabled ?? DEFAULT_CRAFT_SETTINGS.checkEnabled,
      });
    } else {
      setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    }
    setGeneratedData(null);
    setShareUrl(null);
    setStep("content");
    setView("create");
    setEnteredFromDraft(true);
  }, []);

  const handleWordSuggestions = (words: string) => {
    if (!words.includes("\n")) {
      setWordInput((prev) => {
        const existing = prev.trim();
        if (!existing) return words;
        if (existing.includes(words)) return prev;
        return existing + "\n" + words;
      });
    } else {
      setWordInput(words);
    }
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-2 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Send a Puzzle</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a custom puzzle and share it with someone</p>
        </div>

        {/* View Nav */}
        <CraftNav view={view} onViewChange={(v) => {
          if (v === "create") {
            // Reset to fresh type-selection step
            activeDraftId.current = null;
            setStep("type");
            setSelectedType(null);
            setWordInput("");
            setPhraseInput("");
            setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
            setRevealMessage("");
            setPuzzleTitle("");
            setPuzzleFrom("");
            
            setCraftSettings(DEFAULT_CRAFT_SETTINGS);
            setGeneratedData(null);
            setShareUrl(null);
            setCopied(false);
            setShareSuccess(false);
            setEnteredFromDraft(false);
            setSelectedTheme("none");
            sentRecorded.current = false;
          }
          setView(v);
        }} draftCount={draftCount} />

        {!isPremium && view === "create" && (
          <div className="flex items-center justify-between text-[11px] -mt-1 mb-1 px-0.5">
            <span className={cn(
              "font-medium",
              limitStatus.atLimit ? "text-destructive" : "text-muted-foreground/60"
            )}>
              {limitStatus.atLimit
                ? "No free puzzles left this month"
                : `${limitStatus.remaining} free craft puzzle${limitStatus.remaining === 1 ? "" : "s"} remaining`
              }
            </span>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="text-primary text-[11px] font-medium hover:underline"
            >
              Get unlimited →
            </button>
          </div>
        )}

        {/* ─── Inbox View ─── */}
        {view === "inbox" && (
          <CraftInbox onResumeDraft={handleResumeDraft} onDataChange={refreshDraftCount} initialTab={inboxTabFromState || undefined} />
        )}

        {/* ─── Create View ─── */}
        {view === "create" && (
          <>
            {/* Progress Stepper */}
            <CraftStepper current={step} />

            {/* Step 1: Type Selection */}
            {step === "type" && (
              <CraftTypeCards onSelect={handleSelectType} />
            )}

            {/* Step 2: Content Entry */}
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

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Puzzle title (optional)</label>
                    <Input
                      value={puzzleTitle}
                      onChange={e => setPuzzleTitle(e.target.value)}
                      placeholder="Just for You"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">From (optional)</label>
                    <Input
                      value={puzzleFrom}
                      onChange={e => setPuzzleFrom(e.target.value)}
                      placeholder="Mariah"
                      maxLength={100}
                    />
                  </div>
                </div>

                <CraftThemePicker
                  selected={selectedTheme}
                  onSelect={(id) => {
                    setSelectedTheme(id);
                    const theme = getTheme(id);
                    if (!revealMessage.trim() && theme.revealTemplates.length > 0) {
                      setRevealMessage(theme.revealTemplates[0]);
                    }
                  }}
                  onRevealTemplate={(tmpl) => setRevealMessage(tmpl)}
                  onPrefillWords={(words) => setWordInput(words)}
                  currentRevealMessage={revealMessage}
                  showWordSection={selectedType === "word-fill" || selectedType === "word-search"}
                />

                <CraftColorPicker selected={colorPalette} onSelect={setColorPalette} />

{(selectedType === "word-fill" || selectedType === "word-search") && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Enter words (one per line or comma-separated)</label>
                      <Textarea
                        value={wordInput}
                        onChange={e => setWordInput(e.target.value)}
                        placeholder={"CHUCKY\nBEACH\nBIRTHDAY\nVACATION\nNASHVILLE"}
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                    <CraftLivePreview
                      type={selectedType}
                      wordInput={wordInput}
                      phraseInput=""
                      clueEntries={[]}
                      difficulty={craftSettings.difficulty}
                    />
                  </div>
                )}

{selectedType === "cryptogram" && (
                  <div className="space-y-3">
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
                    <CraftLivePreview
                      type="cryptogram"
                      wordInput=""
                      phraseInput={phraseInput}
                      clueEntries={[]}
                      difficulty={craftSettings.difficulty}
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
                    <CraftLivePreview
                      type="crossword"
                      wordInput=""
                      phraseInput=""
                      clueEntries={clueEntries}
                      difficulty={craftSettings.difficulty}
                    />
                  </div>
                )}

                {/* Creator settings */}
                <CraftSettingsPanel value={craftSettings} onChange={setCraftSettings} />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Message revealed after solving (optional)</label>
                  <Input
                    value={revealMessage}
                    onChange={e => setRevealMessage(e.target.value)}
                    placeholder="Congratulations! You cracked it 🎉"
                    maxLength={500}
                  />
                </div>

                <Button onClick={handleGenerate} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {saving ? "Saving…" : "Preview Puzzle"}
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {draftSaved && !draftDirty ? (
                      <>
                        <Check className="h-3 w-3 text-primary" />
                        <span className="text-primary">Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        <span>Save draft</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    No account needed
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Share */}
            {step === "preview" && generatedData && selectedType && (
              <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-5">
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

                <div className="text-center space-y-2">
                  <h2 className="text-base font-semibold leading-tight text-foreground">
                    Your puzzle is ready to send
                  </h2>
                  <p className="text-xs text-muted-foreground/70">
                    This is exactly what they'll see
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                  {/* Title centered, From as subtle bottom-right note */}
                  {puzzleTitle.trim() && (
                    <div className="text-center pb-3 border-b border-border">
                      <h3 className="text-base font-display font-semibold text-foreground">{puzzleTitle.trim()}</h3>
                    </div>
                  )}

                  <CraftPreviewGrid data={generatedData} puzzleType={selectedType} />

                  {puzzleFrom.trim() && (
                    <p className="text-[11px] text-muted-foreground/60 text-right italic">
                      {puzzleFrom.trim()}
                    </p>
                  )}
                </div>

                {revealMessage && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Reveal Message (Preview)</p>
                    <p className="text-sm italic text-foreground/80">{revealMessage}</p>
                  </div>
                )}

                <CraftSolveFirst
                  creatorSolveTime={creatorSolveTime}
                  onSolveFirst={handleSolveFirst}
                  onSkip={() => {}}
                  puzzleTypeLabel={
                    selectedType === "word-search" ? "Word Search" :
                    selectedType === "crossword" ? "Crossword" :
                    selectedType === "cryptogram" ? "Cryptogram" :
                    selectedType === "word-fill" ? "Word Fill-In" :
                    "Puzzle"
                  }
                />

                {!isPremium && (
                  <div className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 border",
                    limitStatus.atLimit
                      ? "bg-destructive/5 border-destructive/20"
                      : limitStatus.remaining === 1
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-secondary/50 border-border"
                  )}>
                    <div className="flex items-center gap-2">
                      {limitStatus.atLimit ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className={cn(
                          "text-xs font-semibold",
                          limitStatus.atLimit ? "text-destructive" : "text-foreground"
                        )}>
                          {limitStatus.atLimit
                            ? "Monthly limit reached"
                            : `${limitStatus.remaining} puzzle${limitStatus.remaining === 1 ? "" : "s"} left this month`
                          }
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {limitStatus.label}
                        </p>
                      </div>
                    </div>
                    {limitStatus.atLimit && (
                      <button
                        onClick={() => setUpgradeOpen(true)}
                        className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap ml-3"
                      >
                        Upgrade →
                      </button>
                    )}
                  </div>
                )}

                <div className="relative space-y-3 p-5 rounded-xl border border-border bg-card overflow-hidden">
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
                    <Share className="h-4 w-4" /> Send Puzzle
                  </Button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "or copy link"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {draftSaved && !draftDirty ? (
                      <>
                        <Check className="h-3 w-3 text-primary" />
                        <span className="text-primary">Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        <span>Save draft</span>
                      </>
                    )}
                  </button>
                  <Button onClick={handleRegenerate} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-auto py-1 px-2">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
};

export default CraftPuzzle;
