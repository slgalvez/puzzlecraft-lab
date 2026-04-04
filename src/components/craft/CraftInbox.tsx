import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, FileText, Send, Eye, Inbox, Play, Clock, Trophy, Sparkles } from "lucide-react";
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
  "word-fill": "Word Fill-In Puzzle",
  crossword: "Custom Crossword",
  cryptogram: "Cryptogram Message",
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

// ── Example puzzles shown to new users (received tab, 0 items) ─────────────

const EXAMPLE_PUZZLES = [
  {
    id: "example-1",
    type: "crossword",
    title: "Summer Memories",
    from: "Alex",
    description: "Inside jokes turned into clues — try to solve it!",
    time: "3:47",
    emoji: "☀️",
  },
  {
    id: "example-2",
    type: "word-search",
    title: "Our Favourite Things",
    from: "Jamie",
    description: "Hidden words only we would know.",
    time: "2:14",
    emoji: "🔍",
  },
  {
    id: "example-3",
    type: "cryptogram",
    title: "Secret Message",
    from: "Taylor",
    description: "Decode this to find out what I really think of you.",
    time: "4:02",
    emoji: "🔐",
  },
];

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<CraftDraft[]>(() => loadDrafts());
  const [sent, setSent] = useState<CraftSentItem[]>(() => loadSentItems());
  const [received, setReceived] = useState<CraftReceivedItem[]>(() => loadReceivedItems());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentStatuses, setSentStatuses] = useState<Record<string, SentPuzzleStatus>>({});
  const prevCompleted = useRef<Set<string>>(new Set());
  const [newSolves, setNewSolves] = useState<Set<string>>(new Set());

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
        if (status === "completed" && !prevCompleted.current.has(row.id)) freshNewSolves.add(row.id);
        if (status === "completed") prevCompleted.current.add(row.id);
      }
      setSentStatuses(map);
      if (freshNewSolves.size > 0) setNewSolves((prev) => new Set([...prev, ...freshNewSolves]));
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

  const typeLabel = (type: string) => TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  const handleDeleteDraft = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteDraft(id); setDrafts(loadDrafts()); setConfirmDeleteId(null); onDataChange?.();
    } else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 3000); }
  }, [confirmDeleteId, onDataChange]);

  const handleDeleteSent = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteSentItem(id); setSent(loadSentItems()); setConfirmDeleteId(null); onDataChange?.();
    } else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 3000); }
  }, [confirmDeleteId, onDataChange]);

  const handleDeleteReceived = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      deleteReceivedItem(id); setReceived(loadReceivedItems()); setConfirmDeleteId(null); onDataChange?.();
    } else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 3000); }
  }, [confirmDeleteId, onDataChange]);

  const handleCopyLink = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: "Link copied" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast({ title: "Failed to copy" }); }
  }, [toast]);

  const statusLabel = (status: CraftReceivedItem["status"]) => {
    switch (status) {
      case "not_started": return "Not started";
      case "in_progress": return "In progress";
      case "completed":   return "Completed";
    }
  };

  const statusColor = (status: CraftReceivedItem["status"]) => {
    switch (status) {
      case "not_started": return "text-muted-foreground";
      case "in_progress": return "text-primary";
      case "completed":   return "text-primary";
    }
  };

  const unreadReceived = received.filter((r) => r.status === "not_started").length;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <Tabs defaultValue={initialTab || "drafts"}>
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
            <EmptyCraftDrafts onNavigate={() => onResumeDraft({} as CraftDraft)} />
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
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => onResumeDraft(d)}>Resume</Button>
                    <button className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all" onClick={() => handleDeleteDraft(d.id)}>
                      <Trash2 className={`h-3 w-3 ${confirmDeleteId === d.id ? "text-destructive opacity-100" : "text-muted-foreground"}`} />
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
                const isNew = newSolves.has(s.shareId);
                return (
                  <div key={s.id} className={cn(
                    "flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors",
                    isNew ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/30"
                  )}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(s.type)}</Badge>
                        <SolveStatusBadge status={status?.status ?? "sent"} solveTime={status?.solveTime ?? null} isNew={isNew} />
                        <span className="text-[10px] text-muted-foreground/60">{relativeTime(s.sentAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{displayTitle(s.title, s.type)}</p>
                      {status?.status === "completed" && status.solveTime && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock size={10} className="text-primary/70" />
                          <span className="font-mono text-[11px] font-semibold text-primary">
                            Solved in {formatTime(status.solveTime)}
                          </span>
                          {isNew && <span className="text-[10px] text-primary animate-pulse">· New!</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1 px-3"
                        onClick={() => navigate(`/s/${s.shareId}`, { state: { fromInbox: "sent" } })}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      <button className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-muted transition-all text-muted-foreground"
                        onClick={() => handleCopyLink(s.id, s.shareUrl)}>
                        {copiedId === s.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                        onClick={() => handleDeleteSent(s.id)}>
                        <Trash2 className={`h-3 w-3 ${confirmDeleteId === s.id ? "text-destructive opacity-100" : "text-muted-foreground"}`} />
                      </button>
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
            <div className="space-y-4">
              {/* Example puzzles — show what a received puzzle looks like */}
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                  <Sparkles size={13} className="text-primary/60" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    How it works — examples
                  </p>
                </div>
                <div className="divide-y divide-border/30">
                  {EXAMPLE_PUZZLES.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                      <span className="text-xl shrink-0">{ex.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            {typeLabel(ex.type)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/60">from {ex.from}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{ex.title}</p>
                        <p className="text-[10px] text-muted-foreground/70 italic mt-0.5">{ex.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 shrink-0">
                        <Clock size={9} />
                        {ex.time}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border/30 bg-muted/10">
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    Send a puzzle first — your friend's reply will appear here
                  </p>
                </div>
              </div>

              <EmptyCraftReceived onNavigate={() => navigate("/craft")} />
            </div>
          ) : (
            <div className="space-y-2.5">
              {received.map((r) => (
                <div key={r.id} className={cn(
                  "flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors",
                  r.status === "not_started" ? "border-primary/20 bg-primary/5" : "border-border/60 bg-muted/30"
                )}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(r.type)}</Badge>
                      <span className={`text-[10px] font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{displayTitle(r.title, r.type)}</p>
                    {r.from && (
                      <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">from {r.from}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant={r.status === "not_started" ? "default" : "outline"}
                      className="text-xs h-7 gap-1 px-3"
                      onClick={() => navigate(`/s/${r.shareId}`, { state: { fromInbox: "received" } })}>
                      <Play className="h-3 w-3" />
                      {r.status === "in_progress" ? "Continue" : r.status === "completed" ? "View" : "Play"}
                    </Button>
                    <button className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={() => handleDeleteReceived(r.id)}>
                      <Trash2 className={`h-3 w-3 ${confirmDeleteId === r.id ? "text-destructive opacity-100" : "text-muted-foreground"}`} />
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

function SolveStatusBadge({
  status, solveTime, isNew,
}: {
  status: "sent" | "in_progress" | "completed";
  solveTime: number | null;
  isNew: boolean;
}) {
  if (status === "completed") {
    return (
      <span className={cn("text-[10px] font-semibold flex items-center gap-1", isNew ? "text-primary" : "text-primary/70")}>
        <Trophy size={9} />
        Solved{solveTime ? ` · ${Math.floor(solveTime / 60)}:${(solveTime % 60).toString().padStart(2, "0")}` : ""}
      </span>
    );
  }
  if (status === "in_progress") return <span className="text-[10px] font-medium text-primary/70">In Progress</span>;
  return <span className="text-[10px] text-muted-foreground/60">Sent</span>;
}
