import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, FileText, Send, Eye, Inbox, Play, Trophy } from "lucide-react";
import {
  EmptyCraftReceived,
  EmptyCraftSent,
  EmptyCraftDrafts,
} from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import { supabase } from "@/integrations/supabase/client";
import {
  type CraftDraft,
  type CraftSentItem,
  type CraftReceivedItem,
  loadDrafts,
  loadSentItems,
  loadReceivedItems,
  deleteDraft,
  deleteSentItem,
  deleteReceivedItem,
  relativeTime,
} from "@/lib/craftHistory";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

const TYPE_FALLBACK_TITLES: Record<string, string> = {
  "word-search": "Word Search Puzzle",
  "word-fill":   "Word Fill-In Puzzle",
  crossword:     "Custom Crossword",
  cryptogram:    "Cryptogram Message",
};

function displayTitle(title: string | undefined | null, type: string): string {
  if (title?.trim()) return title.trim();
  return TYPE_FALLBACK_TITLES[type] ?? "Puzzle for You";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface SentPuzzleStatus {
  status: "sent" | "in_progress" | "completed";
  solveTime: number | null;
}

interface CraftInboxProps {
  onResumeDraft: (draft: CraftDraft) => void;
  onDataChange?: () => void;
  initialTab?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CraftInbox({ onResumeDraft, onDataChange, initialTab }: CraftInboxProps) {
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const [drafts,    setDrafts]    = useState<CraftDraft[]>(() => loadDrafts());
  const [sent,      setSent]      = useState<CraftSentItem[]>(() => loadSentItems());
  const [received,  setReceived]  = useState<CraftReceivedItem[]>(() => loadReceivedItems());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId,  setCopiedId]  = useState<string | null>(null);
  const [sentStatuses, setSentStatuses] = useState<Record<string, SentPuzzleStatus>>({});
  const prevCompleted = useRef<Set<string>>(new Set());
  const [newSolves, setNewSolves] = useState<Set<string>>(new Set());

  // ── Smart default tab ──────────────────────────────────────────────────────
  // Context-aware: received (if unread) > sent (if any) > drafts
  const smartDefaultTab = useMemo(() => {
    if (initialTab) return initialTab;
    const unreadReceived = received.filter((r) => r.status === "not_started").length;
    if (unreadReceived > 0) return "received";
    if (sent.length > 0) return "sent";
    return "drafts";
  }, [initialTab, received, sent]);

  // ── Fetch solve status for sent items ──────────────────────────────────────

  const fetchSentStatuses = useCallback(async (sentItems: CraftSentItem[]) => {
    if (sentItems.length === 0) return;
    const shareIds = sentItems.map((s) => s.shareId);
    const { data } = await supabase
      .from("shared_puzzles" as any)
      .select("id, started_at, completed_at, solve_time")
      .in("id", shareIds);
    if (data) {
      const map: Record<string, SentPuzzleStatus> = {};
      const freshNewSolves = new Set<string>();
      for (const row of data as any[]) {
        let status: SentPuzzleStatus["status"] = "sent";
        if (row.completed_at) status = "completed";
        else if (row.started_at) status = "in_progress";
        map[row.id] = { status, solveTime: row.solve_time ?? null };
        if (status === "completed" && !prevCompleted.current.has(row.id)) {
          freshNewSolves.add(row.id);
        }
        if (status === "completed") prevCompleted.current.add(row.id);
      }
      setSentStatuses(map);
      if (freshNewSolves.size > 0) {
        setNewSolves((prev) => new Set([...prev, ...freshNewSolves]));
      }
    }
  }, []);

  useEffect(() => { fetchSentStatuses(sent); }, [sent, fetchSentStatuses]);
  useEffect(() => {
    if (sent.length === 0) return;
    const interval = setInterval(() => fetchSentStatuses(sent), 30_000);
    const handleFocus = () => fetchSentStatuses(sent);
    window.addEventListener("focus", handleFocus);
    return () => { clearInterval(interval); window.removeEventListener("focus", handleFocus); };
  }, [sent, fetchSentStatuses]);

  // ── Delete handlers ────────────────────────────────────────────────────────

  const typeLabel = (type: string) => TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  const handleDeleteDraft = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteDraft(id); setDrafts(loadDrafts()); setConfirmDeleteId(null); onDataChange?.();
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }, [confirmDeleteId, onDataChange]);

  const handleDeleteSent = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteSentItem(id); setSent(loadSentItems()); setConfirmDeleteId(null); onDataChange?.();
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }, [confirmDeleteId, onDataChange]);

  const handleDeleteReceived = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteReceivedItem(id); setReceived(loadReceivedItems()); setConfirmDeleteId(null); onDataChange?.();
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }, [confirmDeleteId, onDataChange]);

  const handleCopyLink = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: "Link copied" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy" });
    }
  }, [toast]);

  const unreadReceived = received.filter((r) => r.status === "not_started").length;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <Tabs defaultValue={smartDefaultTab}>
        <TabsList className="w-full">
          <TabsTrigger value="drafts" className="flex-1 gap-1.5 relative">
            <FileText className="h-3 w-3" /> Drafts
            {drafts.length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({drafts.length})</span>
            )}
          </TabsTrigger>

          <TabsTrigger value="sent" className="flex-1 gap-1.5 relative">
            <Send className="h-3 w-3" /> Sent
            {sent.length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({sent.length})</span>
            )}
            {newSolves.size > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>

          <TabsTrigger value="received" className="flex-1 gap-1.5 relative">
            <Inbox className="h-3 w-3" /> Received
            {unreadReceived > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                {unreadReceived}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="h-px bg-border mt-3 mb-4" />

        {/* ── Drafts ── */}
        <TabsContent value="drafts" className="mt-0">
          {drafts.length === 0 ? (
            <EmptyCraftDrafts onNavigate={() => {}} />
          ) : (
            <div className="space-y-2.5">
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(d.type)}</Badge>
                      <span className="text-[10px] text-muted-foreground/60">{relativeTime(d.updatedAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{displayTitle(d.title, d.type)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => onResumeDraft(d)}>
                      Resume
                    </Button>
                    <button
                      className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={() => handleDeleteDraft(d.id)}
                    >
                      <Trash2 className={cn("h-3 w-3", confirmDeleteId === d.id ? "text-destructive opacity-100" : "text-muted-foreground")} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sent ── */}
        <TabsContent value="sent" className="mt-0">
          {sent.length === 0 ? (
            <EmptyCraftSent onNavigate={() => navigate("/craft")} />
          ) : (
            <div className="space-y-2.5">
              {sent.map((s) => {
                const status = sentStatuses[s.shareId];
                const isNew  = newSolves.has(s.shareId);
                const isSolved = status?.status === "completed";

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border overflow-hidden transition-colors",
                      isNew
                        ? "border-emerald-400/40"
                        : isSolved
                          ? "border-primary/20"
                          : "border-border/60",
                    )}
                  >
                    {/* New solve banner — the magic moment */}
                    {isNew && (
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-400/30">
                        <Trophy size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          🎉 They solved it!
                          {status?.solveTime && ` In ${formatTime(status.solveTime)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 p-3.5 bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(s.type)}</Badge>
                          {!isNew && (
                            <SolveStatusBadge
                              status={status?.status ?? "sent"}
                              solveTime={status?.solveTime ?? null}
                              isNew={false}
                            />
                          )}
                          <span className="text-[10px] text-muted-foreground/60">{relativeTime(s.sentAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{displayTitle(s.title, s.type)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 px-3"
                          onClick={() => navigate(`/s/${s.shareId}`, { state: { fromInbox: "sent" } })}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        <button
                          className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-muted transition-all text-muted-foreground"
                          onClick={() => handleCopyLink(s.id, s.shareUrl)}
                        >
                          {copiedId === s.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <button
                          className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                          onClick={() => handleDeleteSent(s.id)}
                        >
                          <Trash2 className={cn("h-3 w-3", confirmDeleteId === s.id ? "text-destructive opacity-100" : "text-muted-foreground")} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Received ── */}
        <TabsContent value="received" className="mt-0">
          {received.length === 0 ? (
            <EmptyCraftReceived onNavigate={() => navigate("/craft")} />
          ) : (
            <div className="space-y-2.5">
              {received.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors",
                    r.status === "not_started"
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/60 bg-muted/30",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {typeLabel(r.type)}
                      </Badge>
                      {r.status !== "not_started" && (
                        <span className={cn(
                          "text-[10px] font-medium",
                          r.status === "completed" ? "text-primary/70" : "text-primary",
                        )}>
                          {r.status === "in_progress" ? "In progress" : "Completed"}
                        </span>
                      )}
                    </div>
                    {/* Title + from on same line for scannability */}
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayTitle(r.title, r.type)}
                      {r.from && (
                        <span className="text-muted-foreground/60 font-normal">
                          {" "}— from {r.from}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {relativeTime(r.receivedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={r.status === "not_started" ? "default" : "outline"}
                      className="text-xs h-7 gap-1 px-3"
                      onClick={() => navigate(`/s/${r.shareId}`, { state: { fromInbox: "received" } })}
                    >
                      <Play className="h-3 w-3" />
                      {r.status === "in_progress" ? "Continue" : r.status === "completed" ? "View" : "Play"}
                    </Button>
                    <button
                      className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={() => handleDeleteReceived(r.id)}
                    >
                      <Trash2 className={cn("h-3 w-3", confirmDeleteId === r.id ? "text-destructive opacity-100" : "text-muted-foreground")} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SolveStatusBadge ───────────────────────────────────────────────────────

function SolveStatusBadge({
  status,
  solveTime,
  isNew,
}: {
  status: "sent" | "in_progress" | "completed";
  solveTime: number | null;
  isNew: boolean;
}) {
  if (status === "completed") {
    return (
      <span className={cn(
        "text-[10px] font-semibold flex items-center gap-1",
        isNew ? "text-primary" : "text-primary/70",
      )}>
        <Trophy size={9} />
        Solved{solveTime ? ` · ${formatTime(solveTime)}` : ""}
      </span>
    );
  }
  if (status === "in_progress") {
    return <span className="text-[10px] font-medium text-primary/70">In progress</span>;
  }
  return <span className="text-[10px] text-muted-foreground/50">Awaiting</span>;
}
