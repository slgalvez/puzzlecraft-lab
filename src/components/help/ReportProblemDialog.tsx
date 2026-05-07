import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { isNativeApp } from "@/lib/appMode";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function detectPlatform(): string {
  try {
    if (isNativeApp()) return "ios-native";
    if (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) return "pwa";
  } catch {}
  return "web";
}

export function ReportProblemDialog({ open, onOpenChange }: Props) {
  const { account } = useUserAccount();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage("");
      setEmail(account?.email ?? "");
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [open, account?.email]);

  const route = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const shortUA = useMemo(() => ua.slice(0, 80), [ua]);

  const canSubmit = message.trim().length >= 10 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("submit-bug-report", {
        body: {
          message: message.trim(),
          contactEmail: email.trim() || undefined,
          route,
          userAgent: ua.slice(0, 500),
          platform: detectPlatform(),
        },
      });
      if (invokeError || (data && (data as { error?: string }).error)) {
        throw new Error(((data as { error?: string })?.error) || invokeError?.message || "Failed");
      }
      setDone(true);
      toast.success("Report sent");
      setTimeout(() => onOpenChange(false), 1800);
    } catch (e) {
      console.error("Failed to submit bug report", e);
      setError("Couldn't send report. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. We'll take a look as soon as possible.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium text-foreground">Thanks — your report was sent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">What went wrong?</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
                placeholder="Describe what happened, what you expected, and any steps to reproduce…"
                rows={5}
                className="resize-none"
                autoFocus
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {message.trim().length < 10 ? `At least ${10 - message.trim().length} more characters` : "\u00a0"}
                </span>
                {message.length > 3500 && (
                  <span className="text-[10px] text-muted-foreground">{message.length}/4000</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email (optional)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
              />
            </div>

            <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
              <p className="truncate">Page: {route || "—"}</p>
              <p className="truncate">Device: {shortUA || "—"}</p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
                <Send size={14} />
                {submitting ? "Sending…" : "Send report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportProblemDialog;
