import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Password reset landing page. Supabase recovery links redirect users here
 * with a recovery token in the URL hash that auto-creates a temporary session.
 * The user can then set a new password via supabase.auth.updateUser().
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Recovery links arrive as `#access_token=...&type=recovery`. Supabase
    // detects this automatically and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setHasRecoverySession(true);
      }
      setReady(true);
    });

    // Also check current session in case the event already fired before mount.
    supabase.auth.getSession().then(({ data }) => {
      if (window.location.hash.includes("type=recovery") && data.session) {
        setHasRecoverySession(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message?.toLowerCase().includes("password")
          ? "Password must be at least 6 characters."
          : "Couldn't update password. Please try again.");
        return;
      }
      toast.success("Password updated — you're signed in");
      navigate("/account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 pt-8 pb-16">
        <h1 className="text-2xl font-semibold mb-1">Reset Password</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose a new password for your account.</p>

        <div className="rounded-2xl border bg-card p-5">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !hasRecoverySession ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </p>
              <Button onClick={() => navigate("/account")} className="w-full rounded-xl h-11 font-semibold">
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-9 rounded-xl"
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="pl-9 rounded-xl"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={submitting}>
                {submitting ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
