/**
 * QAMessagingPreview — mounts real MessageBubble + PuzzleMessageBubble
 * components against fixture data so admins can see exactly how
 * conversations render (text, system messages, share-text mirrors).
 */
import { useMemo } from "react";
import { MemoryRouter } from "react-router-dom";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewLabel } from "@/components/admin/PreviewLabel";
import { MessageBubble } from "@/components/private/MessageBubble";
import { PuzzleMessageBubble, isPuzzleMessage } from "@/components/private/PuzzleMessageBubble";
import { buildMessagingFixture, type MockMessage } from "@/lib/previewFixtures";
import { cn } from "@/lib/utils";

interface Props {
  /** Extra messages mirrored in from share previews (newest last). */
  injectedMessages?: { id: string; body: string }[];
  onClearInjected?: () => void;
}

const MOCK_USER = "__preview-me";
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function QAMessagingPreview({ injectedMessages = [], onClearInjected }: Props) {
  const baseMessages = useMemo<MockMessage[]>(() => buildMessagingFixture(), []);

  // Append injected share-text bubbles as "mine" so they appear at the bottom right
  const messages = useMemo<MockMessage[]>(() => {
    const now = Date.now();
    const injected: MockMessage[] = injectedMessages.map((m, i) => ({
      id: m.id,
      body: m.body,
      isMine: true,
      createdAt: new Date(now + i).toISOString(),
      kind: "text",
    }));
    return [...baseMessages, ...injected];
  }, [baseMessages, injectedMessages]);

  return (
    <section className="rounded-xl border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <MessageSquare size={11} className="text-primary" /> Messaging components
        </h3>
        <div className="flex items-center gap-2">
          {injectedMessages.length > 0 && onClearInjected && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={onClearInjected}>
              <Trash2 size={10} /> Clear injected
            </Button>
          )}
          <PreviewLabel alwaysShow label="Mock State" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Real MessageBubble + PuzzleMessageBubble against fixture data. Share-preview output can be mirrored in here via the
        “Send” action above.
      </p>

      {/* MemoryRouter so PuzzleMessageBubble's useNavigate() works in isolation */}
      <MemoryRouter>
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1 max-h-[480px] overflow-y-auto">
          {messages.map((m) => {
            // System messages → PuzzleMessageBubble
            if (isPuzzleMessage(m.body)) {
              return (
                <PuzzleMessageBubble
                  key={m.id}
                  body={m.body}
                  isMine={m.isMine}
                  formatTime={formatTime}
                  createdAt={m.createdAt}
                />
              );
            }

            // Regular bubbles → MessageBubble
            return (
              <div key={m.id} className={cn("flex", m.isMine ? "justify-end" : "justify-start")}>
                <MessageBubble
                  id={m.id}
                  body={m.body}
                  isMine={m.isMine}
                  createdAt={m.createdAt}
                  readAt={m.isMine ? m.createdAt : null}
                  isDisappearing={false}
                  expiresAt={null}
                  reactions={{}}
                  currentUserId={MOCK_USER}
                  formatTime={formatTime}
                  showTimestamp
                  groupPosition="single"
                  senderChanged
                />
              </div>
            );
          })}
        </div>
      </MemoryRouter>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>• Text — MessageBubble</span>
        <span>• __PUZZLE_SENT__ / __PUZZLE_SOLVED__ — PuzzleMessageBubble</span>
        <span>• Bottom bubbles — share-preview mirror</span>
      </div>
    </section>
  );
}
