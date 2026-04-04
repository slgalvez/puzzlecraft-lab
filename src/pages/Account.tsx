import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Lock, User, Sparkles, Pencil,
  Check, X, Flame, Trophy, Target, Shield,
  ChevronRight, Zap, Star, Crown,
} from "lucide-react";
import UpgradeModal from "@/components/account/UpgradeModal";
import { hasPremiumAccess, shouldShowUpgradeCTA, PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { MONTHLY_PRICE, ANNUAL_PRICE, TRIAL_DAYS } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { syncLeaderboardRating } from "@/lib/leaderboardSync";
import { toast } from "sonner";
import { getProgressStats } from "@/lib/progressTracker";
import { getDailyStreak } from "@/lib/dailyChallenge";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor } from "@/lib/solveScoring";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/appMode";

// ── Plus benefits — single source used in both logged-out and upsell views ───

const PLUS_BENEFITS = [
  {
    icon: Shield,
    label: "Streak Shield",
    sub: "Protect your streak if you miss a day",
  },
  {
    icon: Sparkles,
    label: "Unlimited Create puzzles",
    sub: "10 free/month — unlimited with Plus",
  },
  {
    icon: Trophy,
    label: "Global leaderboard ranking",
    sub: "See where you stand among all players",
  },
  {
    icon: Zap,
    label: "Advanced stats & insights",
    sub: "Rating, skill tier, trends, personal bests",
  },
  {
    icon: Target,
    label: "90-day daily archive",
    sub: "Replay any past daily challenge",
  },
  {
    icon: Flame,
    label: "Extreme & Insane difficulty",
    sub: "Unlock the hardest puzzle tiers",
  },
];

export default function AccountPage() {
  const navigate = useNavigate();
  const native = isNativeApp();
  const { account, signIn, signUp, signOut, subscribed, subscriptionEnd, checkingSubscription, openCustomerPortal } = useUserAccount();
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

  const stats = useMemo(() => getProgressStats(), []);
  const streak = useMemo(() => getDailyStreak(), []);
  const ratingInfo = useMemo(() => {
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
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

  // ── SIGNED IN VIEW ────────────────────────────────────────────────────────

  if (account) {
    const isAdmin = account.isAdmin;
    const premiumAccess = hasPremiumAccess({ subscribed, isAdmin });
    const showUpgrade = shouldShowUpgradeCTA({ subscribed, isAdmin });
    const initial = (account.displayName || account.email)[0]?.toUpperCase();

    return (
      <Layout>
        <div className="container max-w-md py-8 space-y-4 pb-24">

          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Profile card */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-display text-xl font-bold text-primary">{initial}</span>
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
                    <p className="font-semibold text-foreground truncate">{account.displayName || "Puzzler"}</p>
                    <button onClick={() => { setNewName(account.displayName || ""); setEditingName(true); }} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{account.email}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Progress synced across devices ✓</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {stats.totalSolved > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border bg-card p-3 text-center">
                <Target size={14} className="text-primary mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground leading-none">{stats.totalSolved}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Solved</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <Flame size={14} className="text-primary mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground leading-none">{streak.current}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Streak</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <Trophy size={14} className="text-primary mx-auto mb-1" />
                <p className="font-mono text-lg font-bold text-foreground leading-none">
                  {stats.bestTime !== null ? formatTime(stats.bestTime) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Best</p>
              </div>
            </div>
          )}

          {/* Rating */}
          {premiumAccess && ratingInfo && (
            <button onClick={() => navigate("/stats")} className="w-full flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 transition-all active:scale-[0.97]">
              <div className="flex items-center gap-3">
                <Zap size={15} className="text-primary" />
                <div className="text-left">
                  <p className={cn("text-sm font-bold", getTierColor(ratingInfo.tier as any))}>{ratingInfo.tier}</p>
                  <p className="text-[11px] text-muted-foreground">{ratingInfo.rating} rating</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          )}

          {/* Admin */}
          {isAdmin && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-primary" />
                <span className="font-semibold text-foreground">Puzzlecraft+ (Admin)</span>
              </div>
              <p className="text-xs text-muted-foreground">Full access enabled via admin override.</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/admin/premium-emails")}>
                <Crown size={14} className="mr-2" /> Manage Premium Access
              </Button>
            </div>
          )}

          {/* Active subscriber */}
          {subscribed && !isAdmin && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span className="font-semibold text-foreground">Puzzlecraft+</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
              {subscriptionEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subscriptionEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {PLUS_BENEFITS.map(({ label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <Check size={10} className="text-primary shrink-0" />
                    {label}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => openCustomerPortal()} className="w-full">
                Manage Subscription
              </Button>
            </div>
          )}

          {/* Upsell */}
          {showUpgrade && (
            <div className="rounded-2xl border border-primary/20 overflow-hidden">
              <div className="px-5 pt-5 pb-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={16} className="text-primary fill-primary" />
                  <span className="font-display text-lg font-bold text-foreground">Puzzlecraft+</span>
                </div>
                <p className="text-sm text-muted-foreground">Unlock everything — unlimited puzzles, advanced stats, and more.</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-foreground">$2.99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                  <span className="ml-2 text-[11px] text-muted-foreground/60">or $19.99/year</span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2.5 border-t border-border/60">
                {PLUS_BENEFITS.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={13} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 space-y-2">
                <Button onClick={() => setUpgradeOpen(true)} className="w-full h-12 rounded-xl font-semibold text-base gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.25)] active:scale-[0.97] transition-transform">
                  <Sparkles size={16} /> Start Puzzlecraft+
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Cancel anytime · 7-day free trial</p>
              </div>
            </div>
          )}

          {/* Coming soon */}
          {!PUZZLECRAFT_PLUS_LAUNCHED && !isAdmin && (
            <button onClick={() => setUpgradeOpen(true)} className="w-full rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-5 py-4 text-left transition-all active:scale-[0.97]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">Puzzlecraft+ — Coming Soon</span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Unlimited craft puzzles, streak shield, advanced stats, and more. Tap to preview.
              </p>
            </button>
          )}

          {/* Account actions */}
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            {[
              { icon: Shield, label: "Help & FAQ",  onPress: () => navigate("/help"), destructive: false },
              { icon: Shield, label: "Sign out",    onPress: () => { signOut(); navigate("/"); }, destructive: true },
            ].map(({ icon: Icon, label, onPress, destructive }, i, arr) => (
              <button key={label} onClick={onPress} className={cn("w-full flex items-center justify-between px-4 py-3.5 transition-colors active:bg-muted/50", i < arr.length - 1 && "border-b border-border/40")}>
                <div className="flex items-center gap-3">
                  <Icon size={16} className={destructive ? "text-destructive" : "text-muted-foreground"} />
                  <span className={cn("text-sm", destructive ? "text-destructive" : "text-foreground")}>{label}</span>
                </div>
                {!destructive && <ChevronRight size={14} className="text-muted-foreground/50" />}
              </button>
            ))}
          </div>

          <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
        </div>
      </Layout>
    );
  }

  // ── AUTH FORM ─────────────────────────────────────────────────────────────

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

  // ── SIGN UP SUCCESS ───────────────────────────────────────────────────────

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
              Click the link to activate your account, then come back and sign in.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => { setSignupSuccess(false); setTab("login"); }}>
              Back to Sign In
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── LOGGED OUT VIEW ───────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="container max-w-md py-8 space-y-5 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Value prop card */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <h1 className="font-display text-xl font-bold text-foreground">Sign in to Puzzlecraft</h1>
          <p className="text-sm text-muted-foreground">
            Your streaks, stats, and progress sync across all your devices automatically.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Flame,    text: "Protect your streak"   },
              { icon: Trophy,   text: "Climb the leaderboard" },
              { icon: Target,   text: "Track every solve"     },
              { icon: Sparkles, text: "Unlock Puzzlecraft+"   },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon size={12} className="text-primary shrink-0" />
                {text}
              </div>
            ))}
          </div>
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

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <TabsContent value="signup" className="mt-0 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Display name (optional)</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you'll appear on the leaderboard" className="pl-9" maxLength={30} />
                  </div>
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" required autoComplete="email" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required autoComplete={tab === "login" ? "current-password" : "new-password"} />
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={submitting}>
                {submitting ? "..." : tab === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>
          </Tabs>
        </div>

        {/* ── Puzzlecraft+ benefits — full showcase below the form ── */}
        <div className="rounded-2xl border border-primary/20 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 bg-primary/5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Crown size={15} className="text-primary" />
              </div>
              <div>
                <p className="font-display text-base font-bold text-foreground leading-tight">Puzzlecraft+</p>
                <p className="text-[10px] text-muted-foreground">Unlocks after you sign in</p>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-foreground">$2.99</span>
              <span className="text-sm text-muted-foreground">/month</span>
              <span className="text-[11px] text-muted-foreground/50 ml-1">· $19.99/year</span>
            </div>
          </div>

          {/* Benefits list */}
          <div className="px-5 py-4 border-t border-border/60 space-y-3">
            {PLUS_BENEFITS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — directs to sign up tab */}
          <div className="px-5 pb-5">
            <Button
              onClick={() => setTab("signup")}
              className="w-full h-11 rounded-xl font-semibold gap-2"
              variant="outline"
            >
              <Crown size={14} /> Create a free account to get started
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              7-day free trial · Cancel anytime
            </p>
          </div>
        </div>

      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
}
