import { useState, useRef } from "react";
import { Timer, Check, CheckCheck, Eye } from "lucide-react";
import { isGifMessage, getGifUrl } from "@/components/private/MessageComposer";

const REACTION_OPTIONS = ["❤️", "👍", "😂", "‼️", "❓", "😢"];

interface MessageBubbleProps {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
  readAt: string | null;
  isDisappearing: boolean;
  expiresAt: string | null;
  reactions: Record<string, string[]>;
  currentUserId: string;
  formatTime: (iso: string) => string;
  showTail?: boolean;
  onReact?: (messageId: string, reaction: string) => void;
}

export function MessageBubble({
  id,
  body,
  isMine,
  createdAt,
  readAt,
  isDisappearing,
  expiresAt,
  reactions,
  currentUserId,
  formatTime,
  showTail = true,
  onReact,
}: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const didLongPress = useRef(false);

  const isViewOnce =
    isDisappearing &&
    expiresAt &&
    createdAt &&
    new Date(expiresAt).getTime() - new Date(createdAt).getTime() > 8 * 24 * 60 * 60 * 1000;

  const reactionEntries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);
  const hasReactions = reactionEntries.length > 0;

  const handleDoubleTap = () => {
    onReact?.(id, "❤️");
  };

  const handleTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowPicker(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleReact = (reaction: string) => {
    onReact?.(id, reaction);
    setShowPicker(false);
  };

  const isMedia = isGifMessage(body);
  const mediaUrl = isMedia ? getGifUrl(body) : "";

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} px-1 group relative`}
      onDoubleClick={handleDoubleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="relative max-w-[82%] sm:max-w-[70%]">
        {/* Reaction picker */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div
              className={`absolute z-50 bottom-full mb-1 flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-1 shadow-lg ${
                isMine ? "right-0" : "left-0"
              }`}
            >
              {REACTION_OPTIONS.map((r) => {
                const isActive = (reactions[r] || []).includes(currentUserId);
                return (
                  <button
                    key={r}
                    onClick={() => handleReact(r)}
                    className={`text-base w-8 h-8 flex items-center justify-center rounded-full transition-transform hover:scale-125 active:scale-95 ${
                      isActive ? "bg-primary/20" : "hover:bg-secondary"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Bubble */}
        {isMedia ? (
          <div className={`overflow-hidden ${
            isMine
              ? showTail ? "msg-bubble-mine p-1" : "msg-bubble-mine rounded-br-[1.125rem] p-1"
              : showTail ? "msg-bubble-theirs p-1" : "msg-bubble-theirs rounded-bl-[1.125rem] p-1"
          }`}>
            <img
              src={mediaUrl}
              alt="Image"
              className="rounded-xl max-w-[220px] sm:max-w-[260px] w-full"
              loading="lazy"
            />
            <div className={`flex items-center gap-1 mt-0.5 px-2 pb-0.5 ${isMine ? "justify-end" : ""}`}>
              <span className={`text-[10px] leading-none ${isMine ? "text-primary-foreground/55" : "text-muted-foreground/70"}`}>
                {formatTime(createdAt)}
              </span>
              {isMine && (
                readAt ? (
                  <CheckCheck size={10} className="text-primary-foreground/55" />
                ) : (
                  <Check size={10} className="text-primary-foreground/35" />
                )
              )}
            </div>
          </div>
        ) : (
          <div
            className={`px-3.5 py-2 ${
              isMine
                ? showTail ? "msg-bubble-mine" : "msg-bubble-mine rounded-br-[1.125rem]"
                : showTail ? "msg-bubble-theirs" : "msg-bubble-theirs rounded-bl-[1.125rem]"
            }`}
          >
            <p className="text-[15px] whitespace-pre-wrap break-words leading-[1.35]">{body}</p>
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
            {isDisappearing && (
              isViewOnce ? (
                <Eye size={8} className={isMine ? "text-primary-foreground/40" : "text-muted-foreground/50"} />
              ) : (
                <Timer size={8} className={isMine ? "text-primary-foreground/40" : "text-muted-foreground/50"} />
              )
            )}
            <span className={`text-[10px] leading-none ${isMine ? "text-primary-foreground/55" : "text-muted-foreground/70"}`}>
              {formatTime(createdAt)}
            </span>
            {isMine && (
              readAt ? (
                <CheckCheck size={10} className="text-primary-foreground/55" />
              ) : (
                <Check size={10} className="text-primary-foreground/35" />
              )
            )}
          </div>
          </div>
        )}

        {/* Reaction display */}
        {hasReactions && (
          <div className={`flex items-center gap-0.5 mt-0.5 ${isMine ? "justify-end pr-1" : "justify-start pl-1"}`}>
            {reactionEntries.map(([emoji, users]) => {
              const iReacted = users.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                    iReacted
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <span className="text-[11px]">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-[9px] text-muted-foreground">{users.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop hover: show reaction trigger */}
        {!showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground text-xs w-6 h-6 flex items-center justify-center rounded-full bg-card border border-border shadow-sm ${
              isMine ? "-left-3" : "-right-3"
            }`}
            title="React"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
