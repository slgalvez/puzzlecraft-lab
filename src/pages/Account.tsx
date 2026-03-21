import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Lock, User, Sparkles, Pencil, Check, X } from "lucide-react";
import UpgradeModal from "@/components/account/UpgradeModal";
import { hasPremiumAccess, shouldShowUpgradeCTA, PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { supabase } from "@/integrations/supabase/client";
import { syncLeaderboardRating } from "@/lib/leaderboardSync";
import { toast } from "sonner";

export default function AccountPage() {
  const navigate = useNavigate();
  const { account, signIn, signUp, signOut, subscribed, subscriptionEnd, openCustomerPortal } = useUserAccount();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Username editing state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!account || !newName.trim() || newName.trim().length < 2) {
      toast.error("Username must be at least 2 characters");
      return;
    }
    setNameSaving(true);
    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("display_name", newName.trim())
        .neq("id", account.id)
        .maybeSingle();

      if (existing) {
        toast.error("That username is already taken");
        setNameSaving(false);
        return;
      }

      // Update profile
      const { error: updateErr } = await supabase
        .from("user_profiles")
        .update({ display_name: newName.trim(), updated_at: new Date().toISOString() })
        .eq("id", account.id);

      if (updateErr) throw updateErr;

      // Update leaderboard entry
      await syncLeaderboardRating(account.id, newName.trim());

      toast.success("Username updated");
      setEditingName(false);
      // Force page refresh to pick up new name
      window.location.reload();
    } catch {
      toast.error("Failed to update username");
    } finally {
      setNameSaving(false);
    }
  };

  if (account) {
    return (
      <Layout>
        <div className="container max-w-md py-12 space-y-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Your Account</h1>
            <p className="text-sm text-muted-foreground">Signed in as {account.email}</p>
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {(account.displayName || account.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="New username"
                      className="h-8 text-sm"
                      maxLength={30}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveName} disabled={nameSaving}>
                      <Check size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingName(false)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{account.displayName || "Puzzler"}</p>
                    <button
                      onClick={() => { setNewName(account.displayName || ""); setEditingName(true); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit username"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{account.email}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your progress is synced across devices automatically.
            </p>
          </div>

          {/* Subscription status */}
          {(() => {
            const isAdmin = account.isAdmin;
            const premiumAccess = hasPremiumAccess({ isAdmin, subscribed });
            const showUpgrade = shouldShowUpgradeCTA({ isAdmin, subscribed });

            if (isAdmin) {
              return (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Puzzlecraft+ (Admin)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full access enabled via admin override.
                  </p>
                </div>
              );
            }
            if (subscribed) {
              return (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Puzzlecraft+</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active{subscriptionEnd ? ` · Renews ${new Date(subscriptionEnd).toLocaleDateString()}` : ""}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => openCustomerPortal()}>
                    Manage Subscription
                  </Button>
                </div>
              );
            }
            if (showUpgrade) {
              return (
                <Button variant="outline" className="w-full gap-2" onClick={() => setUpgradeOpen(true)}>
                  <Sparkles size={14} />
                  Upgrade to Puzzlecraft+
                </Button>
              );
            }
            return (
              <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles size={12} />
                  Puzzlecraft+ — Coming Soon
                </div>
              </div>
            );
          })()}

          <Button variant="outline" className="w-full" onClick={() => { signOut(); navigate("/"); }}>
            Sign Out
          </Button>

          <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else navigate("/");
      } else {
        if (password.length < 6) { setError("Password must be at least 6 characters"); setSubmitting(false); return; }
        const res = await signUp(email, password, displayName || undefined);
        if (res.error) setError(res.error);
        else setSignupSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <Layout>
        <div className="container max-w-md py-12 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong>{email}</strong>. Click the link to activate your account, then come back and sign in.
            </p>
            <Button variant="outline" className="w-full" onClick={() => { setSignupSuccess(false); setTab("login"); }}>
              Back to Sign In
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-md py-12 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Account</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to sync your progress across devices. Playing as a guest? No worries — everything still works.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); setError(""); }}>
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display Name (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Puzzler" className="pl-9" maxLength={50} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="pl-9" required minLength={6} />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
