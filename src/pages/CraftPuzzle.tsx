import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Sparkles, RefreshCw, Share2, Copy,
  Check, Loader2, Trophy, AlertCircle, Palette, ChevronDown, ChevronUp,
} from "lucide-react";
import { CraftSolveFirst } from "@/components/craft/CraftSolveFirst";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { cn } from "@/lib/utils";
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
  buildCraftShareUrl,
  buildCraftShareText,
} from "@/lib/craftShare";
import { executeShare } from "@/lib/shareUtils";
import {
  type CraftDraft,
  generateDraftId,
  saveDraft,
  deleteDraft,
  loadDrafts,
  loadReceivedItems,
  addSentItem,
} from "@/lib/craftHistory";

type Step = "type" | "content" | "preview";

// Per-type placeholder text for the words input. Kept at file-top so each type
// can diverge later without hunting through render code.
const WORD_PLACEHOLDERS: Record<"word-fill" | "word-search", string> = {
  "word-search": "BARCELONA\nOCTOBER\nTHE BRIDGE\nPATRICK\nMIDNIGHT SWIM",
  "word-fill":   "SUNDAY MORNING\nCOFFEE\nYOUR BACKYARD\nLATE SUMMER",
};

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const CraftPuzzle = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();
  const inboxTabFromState = (location.state as { inboxTab?: string } | null)?.inboxTab;

  const { isPremium, craftStatus, recordCraftSent } = usePremiumAccess();
  const limitReached = !isPremium && craftStatus.isAtLimit;
  const limitStatus  = {
    used:      craftStatus.used,
    limit:     craftStatus.limit,
    remaining: craftStatus.remaining,
    atLimit:   craftStatus.isAtLimit,
    label:     craftStatus.isAtLimit
      ? `${craftStatus.limit}/${craftStatus.limit} used this month`
      : `${craftStatus.used}/${craftStatus.limit} used this month`,
  };

  const [view,          setView]         = useState<CraftView>(inboxTabFromState ? "inbox" : "create");
  const [step,          setStep]         = useState<Step>("type");
  const [selectedType,  setSelectedType] = useState<CraftType | null>(null);

  // Content fields
  const [wordInput,     setWordInput]    = useState("");
  const [phraseInput,   setPhraseInput]  = useState("");
  const [clueEntries,   setClueEntries]  = useState<{ answer: string; clue: string }[]>([
    { answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" },
  ]);
  const [revealMessage,  setRevealMessage]  = useState("");
  const [puzzleTitle,    setPuzzleTitle]    = useState("");
  const [puzzleFrom,     setPuzzleFrom]     = useState("");
  const [selectedTheme,  setSelectedTheme]  = useState<string>("none");
  const [craftSettings,  setCraftSettings]  = useState<CraftSettings>(DEFAULT_CRAFT_SETTINGS);
  const [colorPalette,   setColorPalette]   = useState<string>("default");

  // Optional fields disclosure (collapsed by default — reduces content step overwhelm)
  const [personalizationOpen, setPersonalizationOpen] = useState(false);

  // Preview/share state
  const [generatedData, setGeneratedData]     = useState<Record<string, unknown> | null>(null);
  const [shareUrl,      setShareUrl]          = useState<string | null>(null);
  const [shareState,    setShareState]        = useState<"idle" | "sent" | "copied">("idle");
  const [copyLinkState, setCopyLinkState]     = useState<"idle" | "copied">("idle");
  const [saving,        setSaving]            = useState(false);

  // Challenge
  const [creatorSolveTime, setCreatorSolveTime] = useState<number | null>(null);

  // Draft
  const [enteredFromDraft, setEnteredFromDraft] = useState(false);
  const activeDraftId = useRef<string | null>(null);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentRecorded  = useRef(false);

  // Unread received count — drives the Inbox badge (not draft count)
  const [unreadCount, setUnreadCount] = useState(
    () => loadReceivedItems().filter((r) => r.status === "not_started").length
  );

  const refreshUnreadCount = useCallback(
    () => setUnreadCount(loadReceivedItems().filter((r) => r.status === "not_started").length),
    [],
  );

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Palette ref — used by guarded cleanup so we don't write the DOM unnecessarily
  const colorPaletteRef = useRef(colorPalette);
  useEffect(() => { colorPaletteRef.current = colorPalette; }, [colorPalette]);

  // Restore default palette on unmount, but ONLY if the user actually changed it
  useEffect(() => {
    return () => {
      if (typeof document === "undefined") return;
      if (colorPaletteRef.current !== "default") {
        applyPalette(CRAFT_PALETTES[0]);
      }
    };
  }, []);

  // Shared helper — single source of truth for attaching palette to payload
  const attachPaletteToPayload = useCallback(
    <T extends Record<string, unknown>>(payload: T): T => {
      if (colorPalette && colorPalette !== "default") {
        (payload as Record<string, unknown>).colorPalette = colorPalette;
      }
      return payload;
    },
    [colorPalette],
  );

  // Guarded restore — used by start-over / reset paths
  const restoreDefaultPalette = useCallback(() => {
    if (typeof document === "undefined") return;
    if (colorPaletteRef.current !== "default") {
      applyPalette(CRAFT_PALETTES[0]);
    }
  }, []);

  // Accept pre-filled state from "Send one back" flow
  useEffect(() => {
    const state = location.state as { prefillTitle?: string } | null;
    if (state?.prefillTitle) setPuzzleTitle(state.prefillTitle);
    if (state) window.history.replaceState({}, "");
  }, [location.state]);

  // Auto-save draft (no manual button — auto-save is canonical)
  useEffect(() => {
    if (step !== "content" || !selectedType) return;
    if (!activeDraftId.current) activeDraftId.current = generateDraftId();
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
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [step, selectedType, puzzleTitle, puzzleFrom, wordInput, phraseInput, clueEntries, revealMessage, craftSettings]);

  /** Pure generation — builds puzzle data without DB/share logic */
  const buildPuzzleData = useCallback((): (Record<string, unknown> & { droppedWords?: string[] }) | null => {
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
        const valid = clueEntries.filter((e) => e.answer.trim() && e.clue.trim());
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

      const droppedWords: string[] = (data as any).droppedWords ?? [];
      if (droppedWords.length > 0) {
        const count = droppedWords.length;
        const wordList = droppedWords.slice(0, 3).join(", ");
        const more = droppedWords.length > 3 ? ` +${droppedWords.length - 3} more` : "";
        toast({
          title: `${count} word${count > 1 ? "s" : ""} couldn't fit`,
          description: selectedType === "crossword"
            ? `${wordList}${more} — try words that share more letters with each other.`
            : `${wordList}${more} — try removing long words or reducing the total count.`,
          variant: "destructive",
        });
        return;
      }

      setGeneratedData(data);
      const payload: CraftPayload = {
        type: selectedType,
        puzzleData: data,
        revealMessage,
        settings: {
          difficulty:    craftSettings.difficulty,
          hintsEnabled:  craftSettings.hintsEnabled,
          revealEnabled: craftSettings.revealEnabled,
          checkEnabled:  craftSettings.checkEnabled,
        },
      };
      if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
      if (puzzleFrom.trim())  payload.from  = puzzleFrom.trim();
      if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
      attachPaletteToPayload(payload as unknown as Record<string, unknown>);

      setSaving(true);
      const shortId = generateShortId();
      const { error: dbErr } = await supabase
        .from("shared_puzzles" as any)
        .insert({ id: shortId, payload } as any);
      if (dbErr) { toast({ title: "Failed to save puzzle", description: "Please try again" }); return; }

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
  }, [selectedType, buildPuzzleData, revealMessage, puzzleTitle, puzzleFrom, craftSettings, selectedTheme, attachPaletteToPayload, toast]);

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
          settings: {
            difficulty:    craftSettings.difficulty,
            hintsEnabled:  craftSettings.hintsEnabled,
            revealEnabled: craftSettings.revealEnabled,
            checkEnabled:  craftSettings.checkEnabled,
          },
        };
        if (puzzleTitle.trim()) payload.title = puzzleTitle.trim();
        if (puzzleFrom.trim())  payload.from  = puzzleFrom.trim();
        if (selectedTheme && selectedTheme !== "none") payload.theme = selectedTheme;
        attachPaletteToPayload(payload as unknown as Record<string, unknown>);
        await supabase.from("shared_puzzles" as any).update({ payload } as any).eq("id", shareId);
      }
      // Reset sentRecorded so the regenerated puzzle can be tracked as a new send
      sentRecorded.current = false;
      toast({ title: "Puzzle refreshed" });
    } catch (err) {
      toast({ title: "Regeneration failed", description: err instanceof Error ? err.message : "Please try different input" });
    }
  }, [selectedType, buildPuzzleData, shareUrl, revealMessage, puzzleTitle, puzzleFrom, craftSettings, selectedTheme, attachPaletteToPayload, toast]);

  const recordSent = useCallback(() => {
    if (sentRecorded.current || !shareUrl || !selectedType) return;
    sentRecorded.current = true;
    const shareId = shareUrl.split("/s/")[1] || shareUrl;
    if (activeDraftId.current) {
      deleteDraft(activeDraftId.current);
      activeDraftId.current = null;
    }
    addSentItem({ id: shareId, shareId, type: selectedType, title: puzzleTitle.trim(), from: puzzleFrom.trim(), revealMessage, shareUrl, sentAt: Date.now() });
    recordCraftSent(shareId);
  }, [shareUrl, selectedType, puzzleTitle, puzzleFrom, revealMessage, recordCraftSent]);

  const handleSolveFirst = useCallback(() => {
    if (!shareUrl) return;
    const shareId = shareUrl.includes("/s/") ? shareUrl.split("/s/")[1].split("?")[0] : shareUrl;
    navigate(`/s/${shareId}?creator=1`);
  }, [shareUrl, navigate]);

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

  // ── Share + copy: use unified executeShare cascade with subtle confirmation ──

  const handleShare = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl || !generatedData || !selectedType) return;

    const text = buildCraftShareText(
      puzzleTitle.trim() || undefined,
      puzzleFrom.trim() || undefined,
      undefined, // url passed separately so native sheet keeps text/url separate
      selectedType,
      creatorSolveTime,
    );
    const result = await executeShare(text, shareUrl);

    if (result === "shared") {
      recordSent();
      setShareState("sent");
      sonnerToast.success("Sent ✓");
      setTimeout(() => setShareState("idle"), 2000);
    } else if (result === "copied") {
      recordSent();
      setShareState("copied");
      sonnerToast.success("Link copied");
      setTimeout(() => setShareState("idle"), 2000);
    } else if (result === "error") {
      sonnerToast.error("Couldn't share — try again");
    }
  };

  const handleCopyLink = async () => {
    if (limitReached) { setUpgradeOpen(true); return; }
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      recordSent();
      setCopyLinkState("copied");
      sonnerToast.success("Link copied");
      setTimeout(() => setCopyLinkState("idle"), 2000);
    } catch {
      sonnerToast.error("Couldn't copy link");
    }
  };

  const handleBack = () => {
    if (step === "preview") setStep("content");
    else if (step === "content") {
      if (enteredFromDraft) { setEnteredFromDraft(false); setView("inbox"); return; }
      sentRecorded.current = false;
      setStep("type");
      setSelectedType(null);
    }
  };

  const handleStartOver = () => {
    if (activeDraftId.current) { deleteDraft(activeDraftId.current); activeDraftId.current = null; }
    setStep("type"); setSelectedType(null); setWordInput(""); setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage(""); setPuzzleTitle(""); setPuzzleFrom(""); setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    setGeneratedData(null); setShareUrl(null); setShareState("idle"); setCopyLinkState("idle");
    setSelectedTheme("none"); setPersonalizationOpen(false);
    restoreDefaultPalette();
    setColorPalette("default");
    setCreatorSolveTime(null);
  };

  const handleResumeDraft = useCallback((draft: CraftDraft) => {
    activeDraftId.current = draft.id;
    setSelectedType(draft.type); setPuzzleTitle(draft.title); setPuzzleFrom(draft.from);
    setWordInput(draft.wordInput); setPhraseInput(draft.phraseInput);
    setClueEntries(draft.clueEntries.length >= 2 ? draft.clueEntries : [{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage(draft.revealMessage);
    if (draft.settings) {
      const restoredDifficulty = draft.settings.difficulty;
      setCraftSettings({
        difficulty:
          restoredDifficulty === "easy" || restoredDifficulty === "medium" || restoredDifficulty === "hard"
            ? restoredDifficulty
            : DEFAULT_CRAFT_SETTINGS.difficulty,
        hintsEnabled: draft.settings.hintsEnabled ?? DEFAULT_CRAFT_SETTINGS.hintsEnabled,
        revealEnabled: draft.settings.revealEnabled ?? DEFAULT_CRAFT_SETTINGS.revealEnabled,
        checkEnabled: draft.settings.checkEnabled ?? DEFAULT_CRAFT_SETTINGS.checkEnabled,
      });
    } else {
      setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    }
    setGeneratedData(null); setShareUrl(null);
    setStep("content"); setView("create"); setEnteredFromDraft(true);
  }, []);

  const resetToCreate = () => {
    activeDraftId.current = null;
    setStep("type"); setSelectedType(null); setWordInput(""); setPhraseInput("");
    setClueEntries([{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
    setRevealMessage(""); setPuzzleTitle(""); setPuzzleFrom(""); setCraftSettings(DEFAULT_CRAFT_SETTINGS);
    setGeneratedData(null); setShareUrl(null); setShareState("idle"); setCopyLinkState("idle");
    setEnteredFromDraft(false); setSelectedTheme("none"); setPersonalizationOpen(false);
    restoreDefaultPalette();
    setColorPalette("default");
    sentRecorded.current = false;
    setCreatorSolveTime(null);
  };

  // Share button label/icon based on success state
  const shareButtonLabel =
    shareState === "sent"   ? "Sent ✓" :
    shareState === "copied" ? "Link copied ✓" :
    "Send Puzzle";
  const ShareIcon = shareState === "idle" ? Share2 : Check;

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl mx-auto">

        {/* Header — single clean title, no subtitle clutter */}
        <div className="mb-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Create a Puzzle</h1>
        </div>

        {/* Nav: Create / Inbox — badge shows UNREAD RECEIVED, not draft count */}
        <CraftNav
          view={view}
          onViewChange={(v) => {
            if (v === "create") resetToCreate();
            else refreshUnreadCount();
            setView(v);
          }}
          unreadCount={unreadCount}
        />

        {/* Free user credit counter — only shown in Create view */}
        {!isPremium && view === "create" && (
          <div className="flex items-center justify-between text-[11px] -mt-1 mb-4 px-0.5">
            <span className={cn("font-medium", limitStatus.atLimit ? "text-destructive" : "text-muted-foreground/60")}>
              {limitStatus.atLimit
                ? "No free puzzles left this month"
                : `${limitStatus.remaining} free craft puzzle${limitStatus.remaining === 1 ? "" : "s"} remaining`
              }
            </span>
            <button onClick={() => setUpgradeOpen(true)} className="text-primary text-[11px] font-medium hover:underline">
              Get unlimited →
            </button>
          </div>
        )}

        {/* ─── Inbox View ─── */}
        {view === "inbox" && (
          <CraftInbox
            onResumeDraft={handleResumeDraft}
            onDataChange={refreshUnreadCount}
            initialTab={inboxTabFromState || undefined}
          />
        )}

        {/* ─── Create View ─── */}
        {view === "create" && (
          <>
            {/* ── Step 1: Type selection ── */}
            {step === "type" && (
              <CraftTypeCards onSelect={(type) => { setSelectedType(type); setStep("content"); }} />
            )}

            {/* ── Step 2: Content entry ── */}
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

                {/* ── PRIMARY INPUT — the only required surface ── */}
                <div className="space-y-3">
                  {(selectedType === "word-fill" || selectedType === "word-search") && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Words from their world
                      </label>
                      <Textarea
                        value={wordInput}
                        onChange={e => setWordInput(e.target.value)}
                        placeholder={WORD_PLACEHOLDERS[selectedType]}
                        rows={5}
                        className="resize-none"
                      />
                      {(() => {
                        const activeTheme = selectedTheme !== "none" ? getTheme(selectedTheme) : null;
                        if (!activeTheme || activeTheme.wordSuggestions.length === 0) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const suggestions = activeTheme.wordSuggestions.join("\n");
                              setWordInput((prev) => {
                                const existing = prev.trim();
                                if (!existing) return suggestions;
                                // Additive merge with dedupe (case-insensitive)
                                const existingSet = new Set(
                                  existing.split(/[,\n]+/).map((w) => w.trim().toUpperCase()).filter(Boolean),
                                );
                                const additions = activeTheme.wordSuggestions
                                  .filter((w) => !existingSet.has(w.trim().toUpperCase()));
                                if (additions.length === 0) return prev;
                                return existing + "\n" + additions.join("\n");
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            ✨ Fill {activeTheme.label} words
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {selectedType === "cryptogram" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Your message or phrase
                      </label>
                      <Textarea
                        value={phraseInput}
                        onChange={e => setPhraseInput(e.target.value)}
                        placeholder="HAPPY BIRTHDAY FROM YOUR FAVORITE PERSON"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  )}

                  {selectedType === "crossword" && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-muted-foreground">Answer + clue pairs</label>
                      {clueEntries.map((entry, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={entry.answer}
                            onChange={e => { const u = [...clueEntries]; u[i] = { ...entry, answer: e.target.value }; setClueEntries(u); }}
                            placeholder="Answer"
                            className="flex-1"
                          />
                          <Input
                            value={entry.clue}
                            onChange={e => { const u = [...clueEntries]; u[i] = { ...entry, clue: e.target.value }; setClueEntries(u); }}
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
                    </div>
                  )}

                  {/* Live preview */}
                  <CraftLivePreview
                    type={selectedType}
                    wordInput={wordInput}
                    phraseInput={phraseInput}
                    clueEntries={clueEntries}
                    difficulty={craftSettings.difficulty}
                  />
                </div>

                {/* ── PERSONALIZE — collapsed by default ──────────────────────
                    Optional: title, from, reveal message, theme, settings.
                    Drops the visible form surface from ~8 elements to ~2. */}
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPersonalizationOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Personalize</span>
                      <span className="text-[11px] text-muted-foreground">
                        title · reveal message · theme · color · difficulty
                      </span>
                    </div>
                    {personalizationOpen
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </button>

                  {personalizationOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/50 bg-muted/20">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Title</label>
                          <Input value={puzzleTitle} onChange={e => setPuzzleTitle(e.target.value)} placeholder="Just for You" maxLength={100} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">From</label>
                          <Input value={puzzleFrom} onChange={e => setPuzzleFrom(e.target.value)} placeholder="Mariah" maxLength={100} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Message revealed after solving</label>
                        <Input
                          value={revealMessage}
                          onChange={e => setRevealMessage(e.target.value)}
                          placeholder="Congratulations! You cracked it 🎉"
                          maxLength={500}
                        />
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
                        onPrefillWords={(words) => {
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
                          if (selectedType === "crossword") {
                            const wordList = words.split("\n").filter(Boolean);
                            if (wordList.length > 0) {
                              setClueEntries(wordList.map((w) => ({ answer: w, clue: "" })));
                            }
                          }
                        }}
                        currentRevealMessage={revealMessage}
                        showWordSection={selectedType === "word-fill" || selectedType === "word-search"}
                      />

                      <CraftSettingsPanel value={craftSettings} onChange={setCraftSettings} />

                      <CraftColorPicker
                        selected={colorPalette}
                        onSelect={(id) => {
                          setColorPalette(id);
                          if (typeof document !== "undefined") {
                            const palette = CRAFT_PALETTES.find((p) => p.id === id) ?? CRAFT_PALETTES[0];
                            applyPalette(palette);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Generate CTA */}
                <Button onClick={handleGenerate} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {saving ? "Building your puzzle…" : "Continue"}
                </Button>

                {/* Auto-save indicator only — no manual button */}
                <p className="text-center text-[10px] text-muted-foreground/40">
                  Draft saved automatically
                </p>
              </div>
            )}

            {/* ── Step 3: Preview & Share ── */}
            {step === "preview" && generatedData && selectedType && (
              <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-5">

                {/* Nav row */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <button onClick={handleBack} className="justify-self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={13} /> Edit
                  </button>
                  <p className="justify-self-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium">
                    Preview
                  </p>
                  <button onClick={handleStartOver} className="justify-self-end text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Start over
                  </button>
                </div>

                {/* ── PUZZLE PREVIEW HERO ── */}
                <div className="rounded-2xl border border-primary/15 bg-card shadow-sm overflow-hidden">
                  {puzzleTitle.trim() && (
                    <div className="text-center px-5 pt-5 pb-3 border-b border-border/40">
                      <h3 className="text-base font-display font-semibold text-foreground">{puzzleTitle.trim()}</h3>
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <CraftPreviewGrid data={generatedData} puzzleType={selectedType} />
                  </div>

                  {puzzleFrom.trim() && (
                    <div className="px-5 pb-4 text-right">
                      <span className="text-[11px] text-muted-foreground/60 italic">{puzzleFrom.trim()}</span>
                    </div>
                  )}
                </div>

                {/* ── SHARE — second visible element, no scroll required ── */}
                <div className="space-y-2.5 p-5 rounded-2xl border border-primary/20 bg-primary/[0.03]">
                  <Button onClick={handleShare} className="w-full gap-2 h-11">
                    <ShareIcon className="h-4 w-4" />
                    {shareButtonLabel}
                  </Button>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-card/50"
                  >
                    {copyLinkState === "copied"
                      ? <Check className="h-3.5 w-3.5 text-primary" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                    <span className={cn(copyLinkState === "copied" && "text-primary font-medium")}>
                      {copyLinkState === "copied" ? "Link copied ✓" : "Copy link instead"}
                    </span>
                  </button>
                </div>

                {/* ── CHALLENGE TIME ── */}
                <CraftSolveFirst
                  creatorSolveTime={creatorSolveTime}
                  onSolveFirst={handleSolveFirst}
                  onSkip={() => {}}
                  puzzleTypeLabel={
                    selectedType === "word-search" ? "Word Search" :
                    selectedType === "crossword"   ? "Crossword"   :
                    selectedType === "cryptogram"  ? "Cryptogram"  : "Word Fill-In"
                  }
                />

                {/* Reveal message preview */}
                {revealMessage && (
                  <div className="px-4 py-3 rounded-xl bg-muted/50 border border-border space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Reveal message</p>
                    <p className="text-sm italic text-foreground/80">{revealMessage}</p>
                  </div>
                )}

                {/* Free user limit — at the bottom */}
                {!isPremium && (
                  <div className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 border",
                    limitStatus.atLimit
                      ? "bg-destructive/5 border-destructive/20"
                      : limitStatus.remaining === 1
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-secondary/50 border-border",
                  )}>
                    <div className="flex items-center gap-2">
                      {limitStatus.atLimit && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <div>
                        <p className={cn("text-xs font-semibold", limitStatus.atLimit ? "text-destructive" : "text-foreground")}>
                          {limitStatus.atLimit ? "Monthly limit reached" : `${limitStatus.remaining} puzzle${limitStatus.remaining === 1 ? "" : "s"} left this month`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{limitStatus.label}</p>
                      </div>
                    </div>
                    {limitStatus.atLimit && (
                      <button onClick={() => setUpgradeOpen(true)} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap ml-3">
                        Upgrade →
                      </button>
                    )}
                  </div>
                )}

                {/* Regenerate — visible outline button, not ghost */}
                <div className="flex justify-center">
                  <Button onClick={handleRegenerate} variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                    <RefreshCw className="h-3 w-3" /> Regenerate puzzle
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
