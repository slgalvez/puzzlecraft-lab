import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageComposerProps {
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  placeholder?: string;
}

export function MessageComposer({ onSend, sending, placeholder = "Message" }: MessageComposerProps) {
  const [message, setMessage] = useState("");

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

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border px-3 sm:px-4 py-2 shrink-0"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-end gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="msg-composer-input flex-1 text-[15px] py-2 border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          maxLength={5000}
          autoComplete="off"
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
  );
}
