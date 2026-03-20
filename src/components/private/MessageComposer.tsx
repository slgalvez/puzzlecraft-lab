import { useState, useRef } from "react";
import { Send, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GifPicker } from "@/components/private/GifPicker";

interface MessageComposerProps {
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  placeholder?: string;
  token: string;
  conversationId: string | null;
}

/** Detect media message format */
export function isMediaMessage(body: string): boolean {
  return body.startsWith("__MEDIA__:");
}

/** Extract media URL from message body */
export function getMediaUrl(body: string): string {
  return body.replace("__MEDIA__:", "");
}

// Keep backward compat with old GIF format
export function isGifMessage(body: string): boolean {
  return body.startsWith("__GIF__:") || body.startsWith("__MEDIA__:");
}

export function getGifUrl(body: string): string {
  if (body.startsWith("__MEDIA__:")) return body.replace("__MEDIA__:", "");
  return body.replace("__GIF__:", "");
}

interface MediaPreview {
  url: string;
  type: "upload" | "gif";
}

export function MessageComposer({ onSend, sending, placeholder = "Message", token, conversationId }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If there's a media preview staged, send that
    if (mediaPreview) {
      const url = mediaPreview.url;
      setMediaPreview(null);
      try {
        await onSend(`__MEDIA__:${url}`);
      } catch {
        // Restore preview on failure
        setMediaPreview({ url, type: mediaPreview.type });
      }
      return;
    }

    const body = message.trim();
    if (!body || sending) return;
    setMessage("");
    try {
      await onSend(body);
    } catch {
      setMessage(body);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || !token) return;

    // Reset input so same file can be selected again
    e.target.value = "";

    // Validate client-side
    const allowed = ["image/gif", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Use GIF, PNG, JPEG, or WebP." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 10MB." });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("conversation_id", conversationId);
      formData.append("file", file);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      const data = await resp.json();
      if (!resp.ok || data.error) {
        toast({ title: "Upload failed", description: data.error || "Please try again." });
        return;
      }

      // Stage preview instead of auto-sending
      setMediaPreview({ url: data.url, type: "upload" });
    } catch {
      toast({ title: "Upload failed", description: "Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setGifOpen(false);
    // Stage preview instead of auto-sending
    setMediaPreview({ url: gifUrl, type: "gif" });
  };

  const clearPreview = () => {
    setMediaPreview(null);
  };

  const canSend = mediaPreview || message.trim();

  return (
    <div className="shrink-0">
      {gifOpen && (
        <GifPicker
          token={token}
          onSelect={handleGifSelect}
          onClose={() => setGifOpen(false)}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Media preview bar */}
      {mediaPreview && (
        <div className="border-t border-border px-3 sm:px-4 py-2 bg-secondary/30">
          <div className="relative inline-block">
            <img
              src={mediaPreview.url}
              alt="Media preview"
              className="h-20 max-w-[160px] object-cover rounded-lg border border-border"
            />
            <button
              onClick={clearPreview}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center hover:bg-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-3 sm:px-4 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !conversationId}
            className={`shrink-0 p-2 rounded-full transition-colors ${
              uploading
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title="Send an image"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setGifOpen((v) => !v)}
            disabled={uploading || !conversationId}
            className={`shrink-0 p-2 rounded-full transition-colors text-xs font-bold ${
              gifOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title="Search GIFs"
          >
            GIF
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={mediaPreview ? "Add a caption or send" : placeholder}
            className="msg-composer-input flex-1 text-[15px] py-2 border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            maxLength={5000}
            autoComplete="off"
            disabled={uploading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || uploading || !canSend}
            className="h-9 w-9 rounded-full shrink-0 transition-transform active:scale-95"
          >
            <Send size={15} className="-translate-x-[1px]" />
          </Button>
        </div>
      </form>
    </div>
  );
}
