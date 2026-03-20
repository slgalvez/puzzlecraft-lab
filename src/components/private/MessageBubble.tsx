import { useState, useRef, useCallback } from "react";
import { Timer, Check, CheckCheck, Eye, Pencil, Plus, Undo2 } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { isGifMessage, getGifUrl } from "@/components/private/MessageComposer";
import { ImageViewer } from "@/components/private/ImageViewer";
import { AudioBubble, isAudioMessage, getAudioData } from "@/components/private/AudioBubble";

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
  onStartEdit?: (messageId: string, body: string) => void;
  onUnsend?: (messageId: string) => void;
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
  onStartEdit,
  onUnsend,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmUnsend, setConfirmUnsend] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const didLongPress = useRef(false);
  const lastTapRef = useRef(0);

  const isViewOnce =
    isDisappearing &&
    expiresAt &&
    createdAt &&
    new Date(expiresAt).getTime() - new Date(createdAt).getTime() > 8 * 24 * 60 * 60 * 1000;

  const reactionEntries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);
  const hasReactions = reactionEntries.length > 0;

  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setShowEmojiPicker(false);
    setConfirmUnsend(false);
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onReact?.(id, "❤️");
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [id, onReact]);

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowMenu(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (!didLongPress.current) {
      handleTap();
    }
  }, [handleTap]);

  const handleTouchMove = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleReact = (reaction: string) => {
    onReact?.(id, reaction);
    closeMenu();
  };

  const handleStartEdit = () => {
    onStartEdit?.(id, body);
    closeMenu();
  };

  const isAudio = isAudioMessage(body);
  const audioData = isAudio ? getAudioData(body) : null;
  const isMedia = !isAudio && isGifMessage(body);
  const mediaUrl = isMedia ? getGifUrl(body) : "";

  const bubbleClass = isMine
    ? showTail ? "msg-bubble-mine" : "msg-bubble-mine rounded-br-[1.25rem]"
    : showTail ? "msg-bubble-theirs" : "msg-bubble-theirs rounded-bl-[1.25rem]";

  const timeColor = isMine ? "text-primary-foreground/45" : "text-muted-foreground/50";
  const iconColor = isMine ? "text-primary-foreground/30" : "text-muted-foreground/40";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-1 relative`}>
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={closeMenu} />
      )}
      <div className={`relative max-w-[82%] sm:max-w-[70%] transition-all duration-150 ${showMenu ? "z-50 scale-[1.02]" : ""}`}>
        {showMenu && (
          <div
            className={`absolute z-50 bottom-full mb-2 flex flex-col bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden ${
              isMine ? "right-0" : "left-0"
            }`}
            style={{ minWidth: "180px" }}
          >
            <div className="flex items-center gap-0.5 px-2 py-2 border-b border-border/30">
              {REACTION_OPTIONS.map((r) => {
                const isActive = (reactions[r] || []).includes(currentUserId);
                return (
                  <button
                    key={r}
                    onClick={() => handleReact(r)}
                    className={`text-lg w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                      isActive ? "bg-primary/15 scale-110" : "hover:bg-secondary/60 hover:scale-110"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
              <button
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  showEmojiPicker
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
                }`}
                aria-label="More emoji reactions"
              >
                <Plus size={15} />
              </button>
            </div>

            {showEmojiPicker && (
              <div className="border-b border-border/30 p-2 bg-card/80">
                <div className="overflow-hidden rounded-xl">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
                    theme={Theme.DARK}
                    width="100%"
                    height={320}
                    searchDisabled={false}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    lazyLoadEmojis
                  />
                </div>
              </div>
            )}

            {isMine && !isMedia && !isAudio && onStartEdit && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-secondary/40 transition-colors"
              >
                <Pencil size={13} className="text-muted-foreground/60" />
                Edit
              </button>
            )}
            {isMine && onUnsend && (
              confirmUnsend ? (
                <button
                  onClick={() => {
                    onUnsend(id);
                    closeMenu();
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-destructive hover:bg-destructive/[0.06] transition-colors"
                >
                  <Undo2 size={13} />
                  Unsend?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmUnsend(true)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-foreground/80 hover:bg-secondary/40 transition-colors"
                >
                  <Undo2 size={13} className="text-muted-foreground/60" />
                  Unsend
                </button>
              )
            )}
          </div>
        )}

        {isAudio && audioData ? (
          <div
            className={`px-3.5 py-2.5 ${bubbleClass} select-none`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => clearTimeout(longPressTimer.current)}
            onTouchMove={handleTouchMove}
            onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          >
            <AudioBubble src={audioData.url} isMine={isMine} duration={audioData.duration} />
            <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
              {isDisappearing && (
                isViewOnce ? (
                  <Eye size={8} className={iconColor} />
                ) : (
                  <Timer size={8} className={iconColor} />
                )
              )}
              <span className={`text-[10px] leading-none ${timeColor}`}>
                {formatTime(createdAt)}
              </span>
              {isMine && (
                readAt ? (
                  <CheckCheck size={10} className={timeColor} />
                ) : (
                  <Check size={10} className="text-primary-foreground/35" />
                )
              )}
            </div>
          </div>
        ) : isMedia ? (
          <div className={`overflow-hidden ${bubbleClass} p-1 select-none`}>
            <img
              src={mediaUrl}
              alt="Image"
              className="rounded-xl max-w-[220px] sm:max-w-[260px] w-full cursor-pointer active:opacity-80 transition-opacity"
              loading="lazy"
              onClick={() => setViewerOpen(true)}
            />
            <div className={`flex items-center gap-1 mt-0.5 px-2 pb-0.5 ${isMine ? "justify-end" : ""}`}>
              <span className={`text-[10px] leading-none ${timeColor}`}>
                {formatTime(createdAt)}
              </span>
              {isMine && (
                readAt ? (
                  <CheckCheck size={10} className={timeColor} />
                ) : (
                  <Check size={10} className="text-primary-foreground/35" />
                )
              )}
            </div>
            {viewerOpen && (
              <ImageViewer src={mediaUrl} onClose={() => setViewerOpen(false)} />
            )}
          </div>
        ) : (
          <div
            className={`px-3.5 py-2 ${bubbleClass} select-none`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => clearTimeout(longPressTimer.current)}
            onTouchMove={handleTouchMove}
            onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          >
            <p className="text-[15px] whitespace-pre-wrap break-words leading-[1.35] overflow-hidden">{body}</p>
            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
              {isDisappearing && (
                isViewOnce ? (
                  <Eye size={8} className={iconColor} />
                ) : (
                  <Timer size={8} className={iconColor} />
                )
              )}
              <span className={`text-[10px] leading-none ${timeColor}`}>
                {formatTime(createdAt)}
              </span>
              {isMine && (
                readAt ? (
                  <CheckCheck size={10} className={timeColor} />
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
                  className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-all active:scale-95 ${
                    iReacted
                      ? "border-primary/30 bg-primary/[0.08]"
                      : "border-border/30 bg-card/50 hover:bg-secondary/40"
                  }`}
                >
                  <span className="text-[11px]">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-[9px] text-muted-foreground/60">{users.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
