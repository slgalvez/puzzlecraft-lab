import { Timer, Check, CheckCheck, Eye } from "lucide-react";

interface MessageBubbleProps {
  body: string;
  isMine: boolean;
  createdAt: string;
  readAt: string | null;
  isDisappearing: boolean;
  expiresAt: string | null;
  formatTime: (iso: string) => string;
  showTail?: boolean;
}

export function MessageBubble({
  body,
  isMine,
  createdAt,
  readAt,
  isDisappearing,
  expiresAt,
  formatTime,
  showTail = true,
}: MessageBubbleProps) {
  const isViewOnce =
    isDisappearing &&
    expiresAt &&
    createdAt &&
    new Date(expiresAt).getTime() - new Date(createdAt).getTime() > 8 * 24 * 60 * 60 * 1000;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-1`}>
      <div
        className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2 ${
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
    </div>
  );
}
