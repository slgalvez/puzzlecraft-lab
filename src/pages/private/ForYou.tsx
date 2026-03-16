import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Puzzle, Send as SendIcon, Check, ArrowLeft, Trash2, RefreshCw, Eye, Pencil, FileText, Save, Loader2, CheckCircle2 } from "lucide-react";
import {
  generateCustomFillIn,
  generateCustomCryptogram,
  generateCustomCrossword,
  generateCustomWordSearch,
} from "@/lib/generators/customPuzzles";
import {
  GridSolver,
  CryptogramSolver,
  WordSearchSolver,
  PuzzlePreview,
} from "@/components/private/PrivatePuzzleSolvers";

type PuzzleType = "word-fill" | "cryptogram" | "crossword" | "word-search";
type Tab = "received" | "sent" | "drafts" | "create";

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
  is_draft?: boolean;
  creator_name?: string;
  recipient_name?: string;
  solver_state?: Record<string, unknown> | null;
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
  const [drafts, setDrafts] = useState<PrivatePuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  // Create state
  const [createStep, setCreateStep] = useState<"type" | "recipient" | "content" | "preview">("type");
  const [selectedType, setSelectedType] = useState<PuzzleType | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [clueEntries, setClueEntries] = useState<{ answer: string; clue: string }[]>([{ answer: "", clue: "" }]);
  const [revealMessage, setRevealMessage] = useState("");
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [sending, setSending] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const autoSaveResetRef = useRef<ReturnType<typeof setTimeout>>();

  // Solve state
  const [solvingPuzzle, setSolvingPuzzle] = useState<PrivatePuzzle | null>(null);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  // Debounced auto-save for draft edits
  const triggerAutoSave = useCallback(async (overrides?: { recipientId?: string; reveal?: string }) => {
    if (!editingDraftId || !token || !generatedData || !selectedType) return;
    clearTimeout(autoSaveTimerRef.current);
    clearTimeout(autoSaveResetRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        await invokeMessaging("update-draft", token, {
          puzzle_id: editingDraftId,
          puzzle_type: selectedType,
          puzzle_data: generatedData,
          reveal_message: (overrides?.reveal ?? revealMessage).trim() || null,
          sent_to: overrides?.recipientId ?? selectedRecipientId,
        });
        setAutoSaveStatus("saved");
        autoSaveResetRef.current = setTimeout(() => setAutoSaveStatus("idle"), 3000);
      } catch (e) {
        if (e instanceof SessionExpiredError) return handleSessionExpired();
        setAutoSaveStatus("idle");
      }
    }, 800);
  }, [editingDraftId, token, generatedData, selectedType, revealMessage, selectedRecipientId, handleSessionExpired]);

  const fetchPuzzles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-puzzles", token);
      setPuzzles(data.puzzles || []);
      setDrafts(data.drafts || []);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, handleSessionExpired]);

  const fetchRecipients = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-recipients", token);
      const list = data.recipients || [];
      setRecipients(list);
      // Auto-select if only one recipient
      if (list.length === 1 && !selectedRecipientId) {
        setSelectedRecipientId(list[0].id);
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    }
  }, [token, handleSessionExpired, selectedRecipientId]);

  useEffect(() => {
    fetchPuzzles();
    fetchRecipients();
  }, [fetchPuzzles, fetchRecipients]);

  const receivedPuzzles = puzzles.filter(p => p.sent_to === user?.id);
  const sentPuzzles = puzzles.filter(p => p.created_by === user?.id);

  const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);
  const activeRecipientName = selectedRecipient
    ? `${selectedRecipient.first_name} ${selectedRecipient.last_name}`
    : null;

  // ─── Create Flow ───

  const handleSelectType = (type: PuzzleType) => {
    setSelectedType(type);
    // If only one recipient, skip recipient step
    if (recipients.length <= 1) {
      if (recipients.length === 1) setSelectedRecipientId(recipients[0].id);
      setCreateStep("content");
    } else {
      setCreateStep("recipient");
    }
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

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleSend = async () => {
    if (!token || !generatedData || !selectedType) return;
    setSending(true);
    try {
      if (editingDraftId) {
        await invokeMessaging("update-draft", token, {
          puzzle_id: editingDraftId,
          puzzle_type: selectedType,
          puzzle_data: generatedData,
          reveal_message: revealMessage.trim() || null,
          sent_to: selectedRecipientId,
        });
        await invokeMessaging("send-draft", token, { puzzle_id: editingDraftId });
      } else {
        await invokeMessaging("create-puzzle", token, {
          puzzle_type: selectedType,
          puzzle_data: generatedData,
          reveal_message: revealMessage.trim() || null,
          sent_to: selectedRecipientId,
        });
      }
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

  const handleSaveDraft = async () => {
    if (!token || !generatedData || !selectedType) return;
    setSending(true);
    try {
      if (editingDraftId) {
        await invokeMessaging("update-draft", token, {
          puzzle_id: editingDraftId,
          puzzle_type: selectedType,
          puzzle_data: generatedData,
          reveal_message: revealMessage.trim() || null,
          sent_to: selectedRecipientId,
        });
      } else {
        await invokeMessaging("create-puzzle", token, {
          puzzle_type: selectedType,
          puzzle_data: generatedData,
          reveal_message: revealMessage.trim() || null,
          is_draft: true,
          sent_to: selectedRecipientId,
        });
      }
      toast({ title: "Draft saved" });
      setTab("drafts");
      resetCreate();
      fetchPuzzles();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Failed to save draft", variant: "destructive" });
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
    setEditingDraftId(null);
    // Reset recipient to default (first if only one)
    if (recipients.length === 1) {
      setSelectedRecipientId(recipients[0].id);
    } else {
      setSelectedRecipientId(null);
    }
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

  const handleEditDraft = (draft: PrivatePuzzle) => {
    setEditingDraftId(draft.id);
    setSelectedRecipientId(draft.sent_to);
    setSelectedType(draft.puzzle_type);
    setGeneratedData(draft.puzzle_data);
    setRevealMessage(draft.reveal_message || "");
    setCreateStep("preview");
    setTab("drafts");
  };

  const handleSendDraft = async (draftId: string) => {
    if (!token) return;
    try {
      await invokeMessaging("send-draft", token, { puzzle_id: draftId });
      toast({ title: "Puzzle sent!" });
      fetchPuzzles();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  const handleSaveProgress = useCallback(async (puzzleId: string, solverState: Record<string, unknown>) => {
    if (!token) return;
    try {
      await invokeMessaging("save-progress", token, { puzzle_id: puzzleId, solver_state: solverState });
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      // Silent fail for autosave; toast only on manual save
    }
  }, [token, handleSessionExpired]);

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
          onSaveProgress={handleSaveProgress}
          userId={user?.id || ""}
        />
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Puzzles for You">
      <div className="p-4 sm:p-6 pb-6 max-w-2xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-2 overflow-x-auto">
          {(["received", "sent", "drafts", "create"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "create") resetCreate(); }}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors whitespace-nowrap ${
                tab === t
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "received" ? "Received" : t === "sent" ? "Sent" : t === "drafts" ? "Drafts" : "Create"}
              {t === "received" && receivedPuzzles.filter(p => !p.solved_by).length > 0 && (
                <span className="ml-1.5 bg-primary-foreground text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {receivedPuzzles.filter(p => !p.solved_by).length}
                </span>
              )}
              {t === "drafts" && drafts.length > 0 && (
                <span className="ml-1.5 bg-primary-foreground text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {drafts.length}
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
            onDelete={handleDelete}
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

        {tab === "drafts" && !editingDraftId && (
          <DraftList
            drafts={drafts}
            loading={loading}
            onEdit={handleEditDraft}
            onDelete={handleDelete}
            onSend={handleSendDraft}
          />
        )}

        {(tab === "create" || (tab === "drafts" && !!editingDraftId)) && (
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
            setRevealMessage={(v) => { setRevealMessage(v); if (editingDraftId) triggerAutoSave({ reveal: v }); }}
            generatedData={generatedData}
            sending={sending}
            recipientName={activeRecipientName}
            recipients={recipients}
            selectedRecipientId={selectedRecipientId}
            onSelectRecipient={(id) => {
              setSelectedRecipientId(id);
              setCreateStep(editingDraftId ? "preview" : "content");
              if (editingDraftId) triggerAutoSave({ recipientId: id });
            }}
            isEditingDraft={!!editingDraftId}
            autoSaveStatus={autoSaveStatus}
            onSelectType={handleSelectType}
            onGenerate={handleGenerate}
            onRegenerate={handleRegenerate}
            onSend={handleSend}
            onSaveDraft={handleSaveDraft}
            onBack={() => {
              clearTimeout(autoSaveTimerRef.current);
              resetCreate();
              setTab(editingDraftId ? "drafts" : "create");
            }}
            onEditContent={() => setCreateStep("content")}
            onChangeRecipient={() => setCreateStep("recipient")}
            onGoToPreview={() => setCreateStep("preview")}
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
        <Puzzle className="mx-auto h-10 w-10 mb-3 opacity-40" />
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
              ) : p.solver_state ? (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  In progress
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
                {p.solver_state ? "Resume" : "Solve"}
              </Button>
            )}
            {onSolve && p.solved_by && p.reveal_message && (
              <Button size="sm" variant="outline" onClick={() => onSolve(p)}>
                View
              </Button>
            )}
            {onDelete && (
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

// ─── Draft List ───

function DraftList({
  drafts, loading, onEdit, onDelete, onSend,
}: {
  drafts: PrivatePuzzle[];
  loading: boolean;
  onEdit: (draft: PrivatePuzzle) => void;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No drafts saved</p>
        <p className="text-xs mt-1">Create a puzzle and save it as a draft to send later</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map(d => (
        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{PUZZLE_LABELS[d.puzzle_type]}</span>
              <Badge variant="outline" className="text-[10px]">Draft</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.recipient_name && `To ${d.recipient_name} · `}
              {new Date(d.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => onEdit(d)} className="h-8 px-2.5">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => onSend(d.id)} className="h-8 px-2.5">
              <SendIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(d.id)}
              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
  generatedData, sending, recipientName, recipients, selectedRecipientId,
  onSelectRecipient, isEditingDraft, autoSaveStatus,
  onSelectType, onGenerate, onRegenerate, onSend, onSaveDraft, onBack, onEditContent, onChangeRecipient, onGoToPreview,
}: {
  step: "type" | "recipient" | "content" | "preview";
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
  recipientName: string | null;
  recipients: { id: string; first_name: string; last_name: string }[];
  selectedRecipientId: string | null;
  onSelectRecipient: (id: string) => void;
  isEditingDraft: boolean;
  autoSaveStatus?: "idle" | "saving" | "saved";
  onSelectType: (t: PuzzleType) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSend: () => void;
  onSaveDraft: () => void;
  onBack: () => void;
  onEditContent: () => void;
  onChangeRecipient: () => void;
  onGoToPreview: () => void;
}) {
  if (step === "type") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Choose puzzle type</h3>
        {recipientName && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/50 border border-border">
            <SendIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Sending to <span className="text-foreground font-medium">{recipientName}</span>
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(PUZZLE_LABELS) as [PuzzleType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/10 transition-colors text-left"
            >
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "recipient") {
    return (
      <div className="space-y-4">
        <button onClick={() => { if (isEditingDraft && generatedData) { onGoToPreview(); } else { onBack(); } }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <h3 className="text-sm font-medium text-foreground">Select recipient</h3>
        <p className="text-xs text-muted-foreground">Who should receive this {PUZZLE_LABELS[selectedType!]}?</p>
        <div className="space-y-2">
          {recipients.map(r => (
            <button
              key={r.id}
              onClick={() => onSelectRecipient(r.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                selectedRecipientId === r.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <SendIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{r.first_name} {r.last_name}</span>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{PUZZLE_LABELS[selectedType!]}</h3>
          {recipientName && (
            <button onClick={onChangeRecipient} className="text-xs text-muted-foreground hover:text-foreground">
              To <span className="text-foreground font-medium">{recipientName}</span>
              {recipients.length > 1 && <Pencil className="inline h-3 w-3 ml-1" />}
            </button>
          )}
        </div>

        {(selectedType === "word-fill" || selectedType === "word-search") && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Enter words (one per line or comma-separated)</label>
            <Textarea
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              placeholder="HELLO, WORLD, PUZZLE, FRIEND"
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
            <Button variant="outline" size="sm" onClick={() => setClueEntries([...clueEntries, { answer: "", clue: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add entry
            </Button>
            <p className="text-[10px] text-muted-foreground">
              {clueEntries.filter(e => e.answer.trim() && e.clue.trim()).length} entries
            </p>
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

        <Button onClick={onGenerate} className="w-full">
          <Eye className="h-4 w-4 mr-2" /> Generate Preview
        </Button>
      </div>
    );
  }

  // ─── Preview step ───
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> {isEditingDraft ? "Back to Drafts" : "Start over"}
        </button>
        {isEditingDraft && autoSaveStatus && autoSaveStatus !== "idle" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {autoSaveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
            {autoSaveStatus === "saved" && <><CheckCircle2 className="h-3 w-3 text-primary" /> Saved</>}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium">
          {PUZZLE_LABELS[selectedType!]} — {isEditingDraft ? "Edit Draft" : "Preview"}
        </h3>
        {recipientName && (
          <button
            onClick={onChangeRecipient}
            className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/50 border border-border w-full text-left hover:border-primary/40 transition-colors"
          >
            <SendIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs flex-1">
              Sending to <span className="text-foreground font-semibold">{recipientName}</span>
            </p>
            {recipients.length > 1 && <Pencil className="h-3 w-3 text-muted-foreground" />}
          </button>
        )}
      </div>

      <div className="p-4 rounded-lg border border-border bg-card">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
          Puzzle as recipient will see it
        </p>
        {generatedData && selectedType && (
          <PuzzlePreview data={generatedData} puzzleType={selectedType} />
        )}
      </div>

      {/* Editable reveal message for drafts */}
      {isEditingDraft ? (
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Reveal Message
          </label>
          <Input
            value={revealMessage}
            onChange={e => setRevealMessage(e.target.value)}
            placeholder="Message shown after solving (optional)"
            maxLength={500}
          />
        </div>
      ) : revealMessage ? (
        <div className="p-3 rounded-lg border border-border bg-card/50">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Reveal Message</p>
          <p className="text-sm italic text-foreground">{revealMessage}</p>
        </div>
      ) : null}

      {/* Action buttons — always inline, always reachable */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onEditContent} disabled={sending}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Content
          </Button>
          <Button variant="outline" onClick={onRegenerate} disabled={sending}>
            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
          </Button>
        </div>
        <div className={`grid gap-2 ${isEditingDraft ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {!isEditingDraft && (
            <Button variant="outline" onClick={onSaveDraft} disabled={sending}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
          )}
          <Button onClick={onSend} disabled={sending} className="w-full">
            <SendIcon className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : recipientName ? `Send to ${recipientName}` : "Send Puzzle"}
          </Button>
        </div>
        <Button variant="ghost" onClick={onBack} disabled={sending} className="w-full text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isEditingDraft ? "Back to Drafts" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

// ─── Solve Puzzle View ───

function SolvePuzzleView({
  puzzle, onBack, onSolve, onSaveProgress, userId,
}: {
  puzzle: PrivatePuzzle;
  onBack: () => void;
  onSolve: (puzzleId: string, solveTime: number) => void;
  onSaveProgress: (puzzleId: string, solverState: Record<string, unknown>) => Promise<void>;
  userId: string;
}) {
  const { toast } = useToast();
  const [startTime] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const alreadySolved = !!puzzle.solved_by;
  const data = puzzle.puzzle_data;
  const savedState = puzzle.solver_state || null;

  const handleSaveProgress = useCallback(async (state: Record<string, unknown>) => {
    setSaving(true);
    try {
      await onSaveProgress(puzzle.id, state);
      toast({ title: "Progress saved", description: "You can resume later." });
    } catch {
      toast({ title: "Could not save progress", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [puzzle.id, onSaveProgress, toast]);

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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={saving}
          onClick={() => {
            // Solvers will call this via ref or callback
            const event = new CustomEvent("save-puzzle-progress");
            window.dispatchEvent(event);
          }}
        >
          <Save className="h-3 w-3 mr-1" />
          {saving ? "Saving…" : "Save Progress"}
        </Button>
      </div>
      <h3 className="text-sm font-medium">
        {PUZZLE_LABELS[puzzle.puzzle_type]}
        {puzzle.creator_name && <span className="text-muted-foreground font-normal"> from {puzzle.creator_name}</span>}
      </h3>

      {puzzle.puzzle_type === "cryptogram" && (
        <CryptogramSolver
          data={data as unknown as { encoded: string; decoded: string; reverseCipher: Record<string, string>; hints: Record<string, string> }}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
          savedState={savedState as Record<string, string> | null}
          onSaveProgress={(state) => handleSaveProgress(state as unknown as Record<string, unknown>)}
        />
      )}
      {puzzle.puzzle_type === "word-search" && (
        <WordSearchSolver
          data={data as unknown as { grid: string[][]; words: string[]; wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[]; size: number }}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
          savedState={savedState as { foundWords: string[] } | null}
          onSaveProgress={(state) => handleSaveProgress(state as unknown as Record<string, unknown>)}
        />
      )}
      {(puzzle.puzzle_type === "word-fill" || puzzle.puzzle_type === "crossword") && (
        <GridSolver
          data={data}
          puzzleType={puzzle.puzzle_type}
          onComplete={() => onSolve(puzzle.id, Math.floor((Date.now() - startTime) / 1000))}
          savedState={savedState as { grid: string[][] } | null}
          onSaveProgress={(state) => handleSaveProgress(state as unknown as Record<string, unknown>)}
        />
      )}
    </div>
  );
}

export default ForYou;
