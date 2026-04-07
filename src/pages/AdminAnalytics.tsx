/**
 * AdminAnalytics.tsx  ← NEW FILE
 * src/pages/AdminAnalytics.tsx
 *
 * Admin-only page showing:
 *  - User signups (email, display name, join date)
 *  - Activity metrics (solves, last seen, session estimate)
 *  - Simple engagement overview
 *
 * Gated by isAdmin — regular users get a 404-style redirect.
 *
 * Route: /admin-analytics
 * Add to App.tsx inside PublicRoutes:
 *   import AdminAnalytics from "./pages/AdminAnalytics";
 *   <Route path="/admin-analytics" element={<AdminAnalytics />} />
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users, Clock, Activity, TrendingUp,
  ArrowLeft, RefreshCw, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  solveCount: number;
  lastActive: string | null;
  isSubscribed: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return formatDate(iso);
}

function downloadCSV(users: UserRow[]) {
  const header = "Email,Display Name,Joined,Solves,Last Active,Subscribed";
  const rows = users.map((u) =>
    [u.email, u.displayName ?? "", formatDate(u.createdAt),
     u.solveCount, formatRelative(u.lastActive), u.isSubscribed ? "Yes" : "No"]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `puzzlecraft-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-primary" />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"joined" | "activity" | "solves">("joined");
  const [refreshKey, setRefreshKey] = useState(0);

  // Gate: admin only
  useEffect(() => {
    if (account && !account.isAdmin) navigate("/");
  }, [account, navigate]);

  // Fetch data
  useEffect(() => {
    if (!account?.isAdmin) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Fetch profiles
        const { data: profiles, error: profErr } = await supabase
          .from("user_profiles")
          .select("id, display_name, is_premium, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (profErr) throw profErr;

        // Fetch progress (last active + solve counts)
        const { data: progress } = await supabase
          .from("user_progress")
          .select("user_id, solves, updated_at");

        // Fetch auth emails via admin API
        // Note: supabase.auth.admin.listUsers() requires service role key.
        // Since we're on the client, we query user_profiles which stores email.
        const { data: authData } = await supabase
          .from("user_profiles")
          .select("id, email")
          .limit(500) as any;

        const emailMap: Record<string, string> = {};
        if (authData) {
          for (const row of authData) {
            if (row.id && row.email) emailMap[row.id] = row.email;
          }
        }

        const progressMap: Record<string, { solveCount: number; lastActive: string | null }> = {};
        if (progress) {
          for (const p of progress) {
            const solves = Array.isArray(p.solves) ? p.solves.length : 0;
            progressMap[p.user_id] = { solveCount: solves, lastActive: p.updated_at };
          }
        }

        const rows: UserRow[] = (profiles ?? []).map((p: any) => ({
          id:           p.id,
          email:        emailMap[p.id] ?? `user-${p.id.slice(0, 6)}`,
          displayName:  p.display_name,
          createdAt:    p.created_at,
          isSubscribed: !!p.is_premium,
          solveCount:   progressMap[p.id]?.solveCount ?? 0,
          lastActive:   progressMap[p.id]?.lastActive ?? null,
        }));

        setUsers(rows);
      } catch (err: any) {
        setError(err.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [account, refreshKey]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const subscribed = users.filter((u) => u.isSubscribed).length;
    const totalSolves = users.reduce((s, u) => s + u.solveCount, 0);
    const now = Date.now();
    const activeToday    = users.filter((u) => u.lastActive && now - new Date(u.lastActive).getTime() < 86_400_000).length;
    const activeThisWeek = users.filter((u) => u.lastActive && now - new Date(u.lastActive).getTime() < 7 * 86_400_000).length;
    return { total, subscribed, totalSolves, activeToday, activeThisWeek };
  }, [users]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let rows = [...users];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      if (sortBy === "joined")   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "activity") return new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime();
      if (sortBy === "solves")   return b.solveCount - a.solveCount;
      return 0;
    });
    return rows;
  }, [users, search, sortBy]);

  if (!account?.isAdmin) return null;

  return (
    <Layout>
      <div className="container py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate("/admin-preview")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft size={14} /> Admin Preview
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">User Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Admin only — not visible to users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => downloadCSV(filtered)}
              disabled={loading || filtered.length === 0}
            >
              <Download size={13} /> Export CSV
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard icon={Users}     label="Total users"    value={stats.total} />
          <StatCard icon={Activity}  label="Active today"   value={stats.activeToday}    sub="last 24h" />
          <StatCard icon={TrendingUp} label="Active this week" value={stats.activeThisWeek} sub="last 7 days" />
          <StatCard icon={Clock}     label="Total solves"   value={stats.totalSolves.toLocaleString()} />
          <StatCard icon={Users}     label="Subscribed"     value={stats.subscribed}     sub={`${stats.total > 0 ? Math.round(stats.subscribed / stats.total * 100) : 0}% of users`} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-1">
            {(["joined", "activity", "solves"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                  sortBy === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "joined" ? "Newest" : s === "activity" ? "Last active" : "Most solves"}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* User table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-secondary/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>User</span>
              <span className="text-right">Solves</span>
              <span className="text-right">Last active</span>
              <span className="text-right">Joined</span>
              <span className="text-right">Plan</span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {search ? "No users match that search." : "No users yet."}
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[560px] overflow-y-auto">
                {filtered.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-secondary/20 transition-colors"
                  >
                    {/* User */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.displayName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>

                    {/* Solves */}
                    <span className="font-mono text-sm text-foreground text-right shrink-0">
                      {user.solveCount}
                    </span>

                    {/* Last active */}
                    <span className="text-xs text-muted-foreground text-right shrink-0 min-w-[70px]">
                      {formatRelative(user.lastActive)}
                    </span>

                    {/* Joined */}
                    <span className="text-xs text-muted-foreground text-right shrink-0 min-w-[80px]">
                      {formatDate(user.createdAt)}
                    </span>

                    {/* Plan */}
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0",
                      user.isSubscribed
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {user.isSubscribed ? "Plus" : "Free"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2.5 border-t bg-secondary/30 text-xs text-muted-foreground">
              {filtered.length} of {users.length} users
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
