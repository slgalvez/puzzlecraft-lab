import { useState } from "react";
import { Send, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GifPicker } from "@/components/private/GifPicker";

interface MessageComposerProps {
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  placeholder?: string;
  token: string;
}

/** Detect GIF message format */
export function isGifMessage(body: string): boolean {
  return body.startsWith("__GIF__:");
}

/** Extract GIF URL from message body */
export function getGifUrl(body: string): string {
  return body.replace("__GIF__:", "");
}

export function MessageComposer({ onSend, sending, placeholder = "Message", token }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || sending) return;
    setMessage("");
    try {
      await onSend(body);
    } catch {
      setMessage(body);
    }
  };

  const handleGifSelect = async (gifUrl: string) => {
    setShowGifPicker(false);
    try {
      await onSend(`__GIF__:${gifUrl}`);
    } catch {
      // silent
    }
  };

  return (
    <div className="shrink-0">
      {showGifPicker && (
        <GifPicker
          token={token}
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-3 sm:px-4 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowGifPicker(!showGifPicker)}
            className={`shrink-0 p-2 rounded-full transition-colors ${
              showGifPicker
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title="Send a GIF"
          >
            <ImageIcon size={18} />
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="msg-composer-input flex-1 text-[15px] py-2 border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            maxLength={5000}
            autoComplete="off"
            onFocus={() => setShowGifPicker(false)}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !message.trim()}
            className="h-9 w-9 rounded-full shrink-0 transition-transform active:scale-95"
          >
            <Send size={15} className="-translate-x-[1px]" />
          </Button>
        </div>
      </form>
    </div>
  );
}
