/**
 * Account.tsx — REVAMPED
 * src/pages/Account.tsx
 *
 * Design principles:
 * - Account page = WHO YOU ARE + account management. Not a stats mirror.
 * - Removed: redundant solve/streak/best stats (live on Stats tab)
 * - Removed: verbose benefits grid shown to existing subscribers (they already bought it)
 * - Kept: profile identity, tier/rating (account-relevant), Plus status, nav, legal
 * - Simplified: Plus card for subscribers (compact status + manage, no re-selling)
 * - Simplified: Upgrade prompt for free users (one clean CTA, not a full marketing block)
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Lock, User, Sparkles, Pencil,
  Check, X, Shield, ChevronRight, Crown, Zap,
  BarChart3, Trophy, HelpCircle, LogOut, ExternalLink,
} from "lucide-react";
import UpgradeModal from "@/components/account/UpgradeModal";
import { hasPremiumAccess, shouldShowUpgradeCTA, PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { supabase } from "@/integrations/supabase/client";
import { syncLeaderboardRating } from "@/lib/leaderboardSync";
import { toast } from "sonner";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor } from "@/lib/solveScoring";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/appMode";

const APP_VERSION = "1.0.0";
const WEB_ORIGIN = "https://puzzlecraftapp.com"; // update before launch

export default function AccountPage() {
  const navigate = useNavigate();
  const native = isNativeApp();
  const {
    account, signIn, signUp, signOut,
    subscribed, subscriptionEnd, openCustomerPortal,
  } = useUserAccount();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Rating — account-identity relevant (not a stats duplicate)
  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 10) return null;
    const rating = computePlayerRating(recs);
    return { rating, tier: getSkillTier(rating) };
  }, []);

  const handleSaveName = async () => {
    if (!account || !newName.trim() || newName.trim().length < 2) {
      toast.error("Username must be at least 2 characters");
      return;
    }
    setNameSaving(true);
    try {
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("display_name", newName.trim())
        .neq("id", account.id)
        .maybeSingle();
      if (existing) { toast.error("That username is already taken"); setNameSaving(false); return; }
      const { error: updateErr } = await supabase
        .from("user_profiles")
        .update({ display_name: newName.trim(), updated_at: new Date().toISOString() })
        .eq("id", account.id);
      if (updateErr) throw updateErr;
      await syncLeaderboardRating(account.id, newName.trim());
      toast.success("Username updated");
      setEditingName(false);
      window.location.reload();
    } catch {
      toast.error("Failed to update username");
    } finally {
      setNameSaving(false);
    }
  };

  // ── SIGNED IN ─────────────────────────────────────────────────────────────

  if (account) {
    const isAdmin = account.isAdmin;
    const premiumAccess = hasPremiumAccess({ subscribed, isAdmin });
    const showUpgrade = shouldShowUpgradeCTA({ subscribed, isAdmin });
    const initial = (account.displayName || account.email)[0]?.toUpperCase();

    return (
      <Layout>
        <div className="container max-w-md py-8 pb-24 space-y-4">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* ── Profile card ── */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-primary">{initial}</span>
                </div>
                {/* Tier badge on avatar */}
                {premiumAccess && ratingInfo && (
                  <span className={cn(
                    "absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-background",
                    getTierColor(ratingInfo.tier as any)
                  )}>
                    {ratingInfo.tier}
                  </span>
                )}
              </div>

              {/* Name + email */}
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
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
                    <p className="font-semibold text-foreground truncate">
                      {account.displayName || "Puzzler"}
                    </p>
                    <button
                      onClick={() => { setNewName(account.displayName || ""); setEditingName(true); }}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-manipulation"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{account.email}</p>

                {/* Rating — only when premium + enough solves */}
                {premiumAccess && ratingInfo ? (
                  <button
                    onClick={() => navigate("/stats")}
                    className="mt-1.5 flex items-center gap-1.5 touch-manipulation"
                  >
                    <Zap size={11} className="text-primary" />
                    <span className={cn("text-[11px] font-semibold", getTierColor(ratingInfo.tier as any))}>
                      {ratingInfo.rating} rating
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">→ Stats</span>
                  </button>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Progress synced across devices ✓
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Puzzlecraft+ — ACTIVE (subscriber view) ── */}
          {(subscribed || isAdmin) && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-primary" />
                  <span className="font-semibold text-sm text-foreground">Puzzlecraft+</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                    {isAdmin ? "Admin" : "Active"}
                  </span>
                </div>
              </div>

              {subscriptionEnd && (
                <p className="text-[11px] text-muted-foreground mb-3">
                  Renews {new Date(subscriptionEnd).toLocaleDateString(undefined, {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              )}

              {!isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openCustomerPortal()}
                >
                  Manage Subscription
                </Button>
              )}
            </div>
          )}

          {/* ── Puzzlecraft+ — upgrade prompt (free users, post-launch) ── */}
          {showUpgrade && (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
            >
              <div className="flex items-center gap-3">
                <Crown size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    Upgrade to Puzzlecraft+
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Streak shield, advanced stats, unlimited crafts
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-muted-foreground shrink-0" />
            </button>
          )}

          {/* ── Coming soon (pre-launch) ── */}
          {!PUZZLECRAFT_PLUS_LAUNCHED && !isAdmin && !subscribed && (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-5 py-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Puzzlecraft+ — Coming Soon</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          )}

          {/* ── Navigation ── */}
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            {[
              { icon: BarChart3, label: "Your Stats",   path: "/stats" },
              { icon: Trophy,    label: "Leaderboard",  path: "/leaderboard" },
              { icon: HelpCircle, label: "Help & FAQ",  path: "/help" },
            ].map(({ icon: Icon, label, path }, i, arr) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5",
                  "transition-colors active:bg-muted/50 touch-manipulation",
                  i < arr.length - 1 && "border-b border-border/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/50" />
              </button>
            ))}
          </div>

          {/* ── Sign out ── */}
          <button
            onClick={() => { signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border/50 transition-colors active:bg-muted/50 touch-manipulation"
          >
            <LogOut size={16} className="text-destructive" />
            <span className="text-sm text-destructive">Sign out</span>
          </button>

          {/* ── Legal footer ── */}
          <div className="flex items-center justify-center gap-3 pt-1 pb-2">
            <a
              href={`${WEB_ORIGIN}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground/25 text-[11px]">·</span>
            <a
              href={`${WEB_ORIGIN}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-muted-foreground/25 text-[11px]">·</span>
            <span className="text-[11px] text-muted-foreground/30">v{APP_VERSION}</span>
          </div>

          <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </div>
      </Layout>
    );
  }

  // ── SIGNUP SUCCESS ────────────────────────────────────────────────────────

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
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong>{email}</strong>.
              Click it to activate your account, then come back and sign in.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => { setSignupSuccess(false); setTab("login"); }}>
              Back to Sign In
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── SIGNED OUT ────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="container max-w-md py-8 pb-24 space-y-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Value prop */}
        <div className="rounded-2xl border bg-card p-5 space-y-2">
          <h1 className="font-display text-xl font-bold text-foreground">Sign in to Puzzlecraft</h1>
          <p className="text-sm text-muted-foreground">
            Your streaks, stats, and progress sync automatically across all your devices.
          </p>
        </div>

        {/* Auth form */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); setError(""); }}>
            <TabsList className="w-full rounded-none border-b bg-transparent h-11">
              <TabsTrigger value="login" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
                Create Account
              </TabsTrigger>
            </TabsList>

            <div className="p-5">
              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 rounded-xl" required />
                    </div>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={submitting}>
                    {submitting ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Display Name (optional)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Puzzler" className="pl-9 rounded-xl" maxLength={50} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="pl-9 rounded-xl" required minLength={6} />
                    </div>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={submitting}>
                    {submitting ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Legal */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <a href={`${WEB_ORIGIN}/privacy`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Privacy Policy
          </a>
          <span className="text-muted-foreground/25 text-[11px]">·</span>
          <a href={`${WEB_ORIGIN}/terms`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Terms of Service
          </a>
        </div>

        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </div>
    </Layout>
  );
}
