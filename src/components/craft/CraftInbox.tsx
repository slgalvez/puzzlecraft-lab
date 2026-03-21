import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, FileText, Send, Eye, Inbox, Play } from "lucide-react";
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
  relativeTime,
} from "@/lib/craftHistory";

/* ── Fallback title by puzzle type ── */

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

/* ── Props ── */

interface CraftInboxProps {
  onResumeDraft: (draft: CraftDraft) => void;
  onDataChange?: () => void;
  initialTab?: string;
}

export default function CraftInbox({ onResumeDraft, onDataChange, initialTab }: CraftInboxProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<CraftDraft[]>(() => loadDrafts());
  const [sent, setSent] = useState<CraftSentItem[]>(() => loadSentItems());
  const [received] = useState<CraftReceivedItem[]>(() => loadReceivedItems());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [solveStatuses, setSolveStatuses] = useState<Record<string, "sent" | "in_progress" | "completed">>({});
  // Per-recipient statuses keyed by puzzle shareId → array of { name, status }
  const [recipientStatuses, setRecipientStatuses] = useState<Record<string, { name: string; status: "sent" | "in_progress" | "completed" }[]>>({});

  // Fetch solve statuses for sent items from DB
  useEffect(() => {
    if (sent.length === 0) return;
    const shareIds = sent.map((s) => s.shareId);
    const hasRecipients = sent.some((s) => s.recipients && s.recipients.length > 0);

    (async () => {
      // Fetch puzzle-level statuses
      const { data } = await supabase
        .from("shared_puzzles" as any)
        .select("id, started_at, completed_at")
        .in("id", shareIds);
      if (data) {
        const map: Record<string, "sent" | "in_progress" | "completed"> = {};
        for (const row of data as any[]) {
          if (row.completed_at) map[row.id] = "completed";
          else if (row.started_at) map[row.id] = "in_progress";
          else map[row.id] = "sent";
        }
        setSolveStatuses(map);
      }

      // Fetch per-recipient statuses
      if (hasRecipients) {
        const { data: recData } = await supabase
          .from("craft_recipients" as any)
          .select("puzzle_id, recipient_name, started_at, completed_at")
          .in("puzzle_id", shareIds);
        if (recData) {
          const rMap: Record<string, { name: string; status: "sent" | "in_progress" | "completed" }[]> = {};
          for (const row of recData as any[]) {
            const status: "sent" | "in_progress" | "completed" = row.completed_at ? "completed" : row.started_at ? "in_progress" : "sent";
            if (!rMap[row.puzzle_id]) rMap[row.puzzle_id] = [];
            rMap[row.puzzle_id].push({ name: row.recipient_name, status });
          }
          setRecipientStatuses(rMap);
        }
      }
    })();
  }, [sent]);

  const typeLabel = (type: string) => TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  const handleDeleteDraft = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        deleteDraft(id);
        setDrafts(loadDrafts());
        setConfirmDeleteId(null);
        onDataChange?.();
      } else {
        setConfirmDeleteId(id);
        setTimeout(() => setConfirmDeleteId(null), 3000);
      }
    },
    [confirmDeleteId, onDataChange]
  );

  const handleDeleteSent = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        deleteSentItem(id);
        setSent(loadSentItems());
        setConfirmDeleteId(null);
        onDataChange?.();
      } else {
        setConfirmDeleteId(id);
        setTimeout(() => setConfirmDeleteId(null), 3000);
      }
    },
    [confirmDeleteId, onDataChange]
  );

  const handleCopyLink = useCallback(
    async (id: string, url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        toast({ title: "Link copied" });
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast({ title: "Failed to copy" });
      }
    },
    [toast]
  );

  const statusLabel = (status: CraftReceivedItem["status"]) => {
    switch (status) {
      case "not_started": return "Not started";
      case "in_progress": return "In progress";
      case "completed": return "Completed";
    }
  };

  const statusColor = (status: CraftReceivedItem["status"]) => {
    switch (status) {
      case "not_started": return "text-muted-foreground";
      case "in_progress": return "text-primary";
      case "completed": return "text-primary";
    }
  };

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <Tabs defaultValue={initialTab || "drafts"}>
        <TabsList className="w-full">
          <TabsTrigger value="drafts" className="flex-1 gap-1.5">
            <FileText className="h-3 w-3" /> Drafts
            {drafts.length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({drafts.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 gap-1.5">
            <Send className="h-3 w-3" /> Sent
            {sent.length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({sent.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 gap-1.5">
            <Inbox className="h-3 w-3" /> Received
            {received.length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({received.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Separator */}
        <div className="h-px bg-border mt-3 mb-4" />

        {/* ── Drafts ── */}
        <TabsContent value="drafts" className="mt-0">
          {drafts.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} text="No drafts yet" sub="Start creating a puzzle — it'll auto-save here" />
          ) : (
            <div className="space-y-2.5">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(d.type)}</Badge>
                      <span className="text-[10px] text-muted-foreground/60">{relativeTime(d.updatedAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayTitle(d.title, d.type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => onResumeDraft(d)}>
                      Resume
                    </Button>
                    <button
                      className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={() => handleDeleteDraft(d.id)}
                      aria-label="Delete draft"
                    >
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
            <EmptyState icon={<Send className="h-5 w-5" />} text="No sent puzzles yet" sub="Puzzles you share will appear here" />
          ) : (
            <div className="space-y-2.5">
              {sent.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(s.type)}</Badge>
                      <SolveStatusBadge status={solveStatuses[s.shareId] ?? "sent"} />
                      <span className="text-[10px] text-muted-foreground/60">{relativeTime(s.sentAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayTitle(s.title, s.type)}
                    </p>
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
                      aria-label="Copy link"
                    >
                      {copiedId === s.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      className="p-1.5 rounded-md opacity-30 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={() => handleDeleteSent(s.id)}
                      aria-label="Delete sent item"
                    >
                      <Trash2 className={`h-3 w-3 ${confirmDeleteId === s.id ? "text-destructive opacity-100" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Received ── */}
        <TabsContent value="received" className="mt-0">
          {received.length === 0 ? (
            <EmptyState icon={<Inbox className="h-5 w-5" />} text="No received puzzles" sub="Puzzles sent to you will appear here" />
          ) : (
            <div className="space-y-2.5">
              {received.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{typeLabel(r.type)}</Badge>
                      <span className={`text-[10px] font-medium ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayTitle(r.title, r.type)}
                    </p>
                    {r.from && (
                      <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">from {r.from}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 px-3"
                    onClick={() => navigate(`/s/${r.shareId}`, { state: { fromInbox: "received" } })}
                  >
                    <Play className="h-3 w-3" />
                    {r.status === "in_progress" ? "Continue" : r.status === "completed" ? "View" : "Play"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
      <div className="mb-3 opacity-30">{icon}</div>
      <p className="text-[13px] font-medium">{text}</p>
      <p className="text-xs mt-1 opacity-60">{sub}</p>
    </div>
  );
}

function SolveStatusBadge({ status }: { status: "sent" | "in_progress" | "completed" }) {
  const label = status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Sent";
  const color =
    status === "completed"
      ? "text-primary"
      : status === "in_progress"
        ? "text-primary/70"
        : "text-muted-foreground/60";
  return <span className={`text-[10px] font-medium ${color}`}>{label}</span>;
}
