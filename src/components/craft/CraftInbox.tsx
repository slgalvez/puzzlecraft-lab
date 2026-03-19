import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, FileText, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TYPE_OPTIONS } from "@/components/craft/CraftTypeCards";
import {
  type CraftDraft,
  type CraftSentItem,
  loadDrafts,
  loadSentItems,
  deleteDraft,
  deleteSentItem,
  relativeTime,
} from "@/lib/craftHistory";

interface CraftInboxProps {
  onResumeDraft: (draft: CraftDraft) => void;
  /** Called after a draft/sent deletion so parent can refresh counts */
  onDataChange?: () => void;
}

export default function CraftInbox({ onResumeDraft, onDataChange }: CraftInboxProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<CraftDraft[]>(() => loadDrafts());
  const [sent, setSent] = useState<CraftSentItem[]>(() => loadSentItems());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <Tabs defaultValue="drafts">
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
          <TabsTrigger value="received" className="flex-1" disabled>
            Received
            <span className="ml-1 text-[9px] opacity-40">soon</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Drafts ── */}
        <TabsContent value="drafts">
          {drafts.length === 0 ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} text="No drafts yet" sub="Start creating a puzzle — it'll auto-save here" />
          ) : (
            <div className="space-y-2 mt-3">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(d.type)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(d.updatedAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {d.title || "Untitled puzzle"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onResumeDraft(d)}>
                      Resume
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDeleteDraft(d.id)}
                    >
                      <Trash2 className={`h-3 w-3 ${confirmDeleteId === d.id ? "text-destructive" : ""}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sent ── */}
        <TabsContent value="sent">
          {sent.length === 0 ? (
            <EmptyState icon={<Send className="h-6 w-6" />} text="No sent puzzles yet" sub="Puzzles you share will appear here" />
          ) : (
            <div className="space-y-2 mt-3">
              {sent.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(s.type)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(s.sentAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.title || "Untitled puzzle"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleCopyLink(s.id, s.shareUrl)}
                  >
                    {copiedId === s.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedId === s.id ? "Copied" : "Copy link"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Received placeholder ── */}
        <TabsContent value="received">
          <EmptyState icon={<span className="text-lg">📬</span>} text="Coming soon" sub="Received puzzles will appear here in a future update" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
      <p className="text-xs mt-1 opacity-70">{sub}</p>
    </div>
  );
}
