import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GifPicker } from "@/components/private/GifPicker";
import { VoiceRecorder, VoicePreviewBar, type VoicePreview } from "@/components/private/VoiceRecorder";
import { hapticTap } from "@/lib/haptic";
import { useIsMobile } from "@/hooks/use-mobile";

export interface EditingMessage {
  id: string;
  body: string;
}

interface MessageComposerProps {
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  placeholder?: string;
  token: string;
  conversationId: string | null;
  editingMessage?: EditingMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newBody: string) => void;
  onTyping?: () => void;
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

export function MessageComposer({ onSend, sending, placeholder = "Message", token, conversationId, editingMessage, onCancelEdit, onSaveEdit, onTyping }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [voicePreview, setVoicePreview] = useState<VoicePreview | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendGuardRef = useRef(false); // prevent double-tap sends
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // When entering edit mode, populate the textarea
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.body);
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = ta.value.length;
          autoResize(ta);
        }
      }, 50);
    }
  }, [editingMessage]);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-tap guard — prevent rapid successive sends
    if (sendGuardRef.current) return;
    sendGuardRef.current = true;
    setTimeout(() => { sendGuardRef.current = false; }, 300);
    // Voice note staged — upload and send
    if (voicePreview) {
      await handleSendVoice();
      return;
    }

    // Media preview staged — send
    if (mediaPreview) {
      const url = mediaPreview.url;
      setMediaPreview(null);
      try {
        await onSend(`__MEDIA__:${url}`);
      } catch {
        setMediaPreview({ url, type: mediaPreview.type });
      }
      return;
    }

    // Edit mode — save edit
    if (editingMessage) {
      const trimmed = message.trim();
      if (trimmed && trimmed !== editingMessage.body) {
        hapticTap();
        onSaveEdit?.(editingMessage.id, trimmed);
      }
      setMessage("");
      onCancelEdit?.();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      return;
    }

    const body = message.trim();
    if (!body || sending) return;
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      hapticTap();
      await onSend(body);
    } catch {
      setMessage(body);
    }
  };

  const handleSendVoice = async () => {
    if (!voicePreview || !conversationId || !token) return;
    setUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("conversation_id", conversationId);

      // Create a proper file from the blob
      const ext = voicePreview.blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([voicePreview.blob], `voice.${ext}`, { type: voicePreview.blob.type });
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

      // Send as audio message with duration
      const dur = Math.round(voicePreview.duration);
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      hapticTap();
      await onSend(`__AUDIO__:${data.url}|${dur}`);
    } catch {
      toast({ title: "Upload failed", description: "Please try again." });
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || !token) return;
    e.target.value = "";

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

      setMediaPreview({ url: data.url, type: "upload" });
    } catch {
      toast({ title: "Upload failed", description: "Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setGifOpen(false);
    setMediaPreview({ url: gifUrl, type: "gif" });
  };

  const clearPreview = () => setMediaPreview(null);

  const clearVoicePreview = () => {
    if (voicePreview) URL.revokeObjectURL(voicePreview.url);
    setVoicePreview(null);
  };

  const canSend = voicePreview || mediaPreview || message.trim();
  const hasVoiceOrMedia = !!voicePreview || !!mediaPreview;
  const isEditing = !!editingMessage;

  const handleCancelEdit = () => {
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onCancelEdit?.();
  };

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
        <div className="border-t border-border/30 px-3 sm:px-4 py-2 bg-secondary/15">
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

      {/* Voice preview bar */}
      {voicePreview && (
        <VoicePreviewBar preview={voicePreview} onDiscard={clearVoicePreview} />
      )}

      {/* Edit mode banner */}
      {isEditing && (
        <div className="border-t border-border/30 px-3 sm:px-4 py-1.5 bg-secondary/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/60">Editing message</span>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`border-t border-border/20 px-2.5 sm:px-4 py-1.5 composer-form ${isEditing ? "border-t-0" : ""}`}
      >
        <div className="flex items-end gap-1.5 sm:gap-2">
          {!hasVoiceOrMedia && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !conversationId}
                className={`shrink-0 p-2 rounded-full transition-colors ${
                  uploading
                    ? "text-primary bg-primary/[0.08]"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary/30"
                }`}
                title="Send an image"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setGifOpen((v) => !v)}
                disabled={uploading || !conversationId}
                className={`shrink-0 p-2 rounded-full transition-colors text-[11px] font-bold tracking-tight ${
                  gifOpen
                    ? "text-primary bg-primary/[0.08]"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary/30"
                }`}
                title="Search GIFs"
              >
                GIF
              </button>
            </>
          )}

          {/* Auto-expanding textarea */}
          {!hasVoiceOrMedia && (
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                autoResize(e.target);
                if (e.target.value.trim()) onTyping?.();
              }}
              onKeyDown={(e) => {
                // On mobile, Enter inserts newline — send via button only.
                // On desktop, Enter sends (Shift+Enter for newline).
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  handleSubmit(e);
                }
                if (e.key === "Escape" && isEditing) {
                  handleCancelEdit();
                }
              }}
              placeholder={isEditing ? "Edit message…" : placeholder}
              className="msg-composer-input flex-1 text-[15px] py-2 border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-none overflow-hidden"
              style={{ minHeight: "36px", maxHeight: "120px" }}
              rows={1}
              maxLength={5000}
              autoComplete="off"
              disabled={uploading}
            />
          )}

          {/* Voice recorder: show mic when no text and not editing */}
          {!hasVoiceOrMedia && !message.trim() && !isEditing && (
            <VoiceRecorder
              disabled={uploading || !conversationId}
              onPreviewReady={setVoicePreview}
            />
          )}

          {/* Send button */}
          {(canSend || hasVoiceOrMedia) && (
            <Button
              type="submit"
              size="icon"
              disabled={sending || uploading || uploadingVoice || !canSend}
              className="h-9 w-9 rounded-full shrink-0 transition-transform active:scale-95"
            >
              {uploadingVoice ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} className="-translate-x-[1px]" />
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
