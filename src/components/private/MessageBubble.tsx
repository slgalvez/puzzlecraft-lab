import { useState, useRef, useCallback, useEffect } from "react";
import { Timer, Check, CheckCheck, Eye, Pencil, Plus } from "lucide-react";
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
  onEdit?: (messageId: string, newBody: string) => void;
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
  onEdit,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const didLongPress = useRef(false);
  const lastTapRef = useRef(0);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const hiddenEmojiRef = useRef<HTMLInputElement>(null);

  const isViewOnce =
    isDisappearing &&
    expiresAt &&
    createdAt &&
    new Date(expiresAt).getTime() - new Date(createdAt).getTime() > 8 * 24 * 60 * 60 * 1000;

  const reactionEntries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);
  const hasReactions = reactionEntries.length > 0;

  const closeMenu = useCallback(() => { setShowMenu(false); setShowEmojiInput(false); }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double-tap → heart
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
    setShowMenu(false);
  };

  const handleStartEdit = () => {
    setEditText(body);
    setEditing(true);
    setShowMenu(false);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== body) {
      onEdit?.(id, trimmed);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const isAudio = isAudioMessage(body);
  const audioData = isAudio ? getAudioData(body) : null;
  const isMedia = !isAudio && isGifMessage(body);
  const mediaUrl = isMedia ? getGifUrl(body) : "";

  const bubbleClass = isMine
    ? showTail ? "msg-bubble-mine" : "msg-bubble-mine rounded-br-[1.125rem]"
    : showTail ? "msg-bubble-theirs" : "msg-bubble-theirs rounded-bl-[1.125rem]";

  const timeColor = isMine ? "text-primary-foreground/55" : "text-muted-foreground/70";
  const iconColor = isMine ? "text-primary-foreground/40" : "text-muted-foreground/50";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-1 relative`}>
      {/* Invisible click-away layer — no visual overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={closeMenu} style={{ background: "transparent" }} />
      )}
      <div className={`relative max-w-[82%] sm:max-w-[70%] transition-shadow duration-150 ${showMenu ? "z-50 ring-2 ring-primary/30 rounded-2xl" : ""}`}>
        {/* Press-and-hold context menu */}
        {showMenu && (
          <div
            className={`absolute z-50 bottom-full mb-2 flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden ${
              isMine ? "right-0" : "left-0"
            }`}
            style={{ minWidth: "180px" }}
          >
            {/* Reaction row */}
            <div className="flex items-center gap-0.5 px-2 py-2 border-b border-border">
              {REACTION_OPTIONS.map((r) => {
                const isActive = (reactions[r] || []).includes(currentUserId);
                return (
                  <button
                    key={r}
                    onClick={() => handleReact(r)}
                    className={`text-lg w-9 h-9 flex items-center justify-center rounded-full transition-transform hover:scale-125 active:scale-90 ${
                      isActive ? "bg-primary/20" : "hover:bg-secondary"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
              {/* Custom emoji button */}
              <button
                onClick={() => {
                  setShowEmojiInput(true);
                  setTimeout(() => emojiInputRef.current?.focus(), 50);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus size={16} />
              </button>
            </div>
            {/* Custom emoji input */}
            {showEmojiInput && (
              <div className="px-3 py-2 border-b border-border">
                <input
                  ref={emojiInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Type or pick an emoji"
                  className="w-full text-center text-lg bg-secondary/50 rounded-lg py-1.5 px-2 outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50"
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    // Extract the last emoji character(s) entered
                    const emojiMatch = val.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu);
                    if (emojiMatch && emojiMatch.length > 0) {
                      const emoji = emojiMatch[emojiMatch.length - 1];
                      handleReact(emoji);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowEmojiInput(false);
                    }
                  }}
                />
              </div>
            )}
            {/* Actions */}
            {isMine && !isMedia && !isAudio && onEdit && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Pencil size={14} className="text-muted-foreground" />
                Edit
              </button>
            )}
          </div>
        )}


        {/* Edit mode */}
        {editing ? (
          <div className={`${bubbleClass} px-3 py-2`}>
            <textarea
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-transparent text-[15px] leading-[1.35] resize-none outline-none min-h-[2.5rem]"
              rows={Math.min(editText.split("\n").length + 1, 6)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <div className="flex items-center gap-2 mt-1 justify-end">
              <button onClick={handleCancelEdit} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="text-[11px] text-primary font-medium px-2 py-0.5 rounded hover:bg-primary/10">
                Save
              </button>
            </div>
          </div>
        ) : isAudio && audioData ? (
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
      </div>
    </div>
  );
}
