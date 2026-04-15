import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { useViewAsUser } from "@/contexts/ViewAsUserContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Stats from "./Stats";
import Layout from "@/components/layout/Layout";

interface UserOption {
  id: string;
  displayName: string | null;
  rating: number;
  solvesCount: number;
  ratingTier: string;
}

export default function AdminViewAsStats() {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { viewAsUser, loading: viewAsLoading, enterViewAs, exitViewAs } = useViewAsUser();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && !account.isAdmin) navigate("/");
  }, [account, navigate]);

  // Load users
  useEffect(() => {
    if (!account?.isAdmin) return;
    (async () => {
      setLoadingUsers(true);
      const { data, error: err } = await supabase
        .from("user_profiles")
        .select("id, display_name, rating, solves_count, rating_tier")
        .order("solves_count", { ascending: false })
        .limit(200);
      if (err) { setError(err.message); }
      else {
        setUsers((data ?? []).map((u) => ({
          id: u.id,
          displayName: u.display_name,
          rating: u.rating ?? 0,
          solvesCount: u.solves_count ?? 0,
          ratingTier: u.rating_tier ?? "beginner",
        })));
      }
      setLoadingUsers(false);
    })();
  }, [account]);

  // Auto-select from URL param
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (!userId || viewAsUser || !users.length) return;
    const user = users.find((u) => u.id === userId);
    if (user) {
      enterViewAs(user.id, user.displayName ?? "Anonymous").catch((e) =>
        setError(e.message)
      );
    }
  }, [searchParams, users, viewAsUser, enterViewAs]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => (u.displayName ?? "").toLowerCase().includes(q));
  }, [users, search]);

  if (!account?.isAdmin) return null;

  // When viewing as user, render Stats directly
  if (viewAsUser) {
    return <Stats viewAsMode />;
  }

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <button
          onClick={() => navigate("/admin-analytics")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> User Analytics
        </button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          View Stats as User
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Select a user to view their Stats page exactly as they see it.
        </p>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading users…
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y divide-border/40 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {search ? "No users match that search." : "No users found."}
              </div>
            ) : (
              filtered.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.displayName ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.solvesCount} solves · {user.ratingTier} · {user.rating} rating
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={viewAsLoading}
                    onClick={() =>
                      enterViewAs(user.id, user.displayName ?? "Anonymous").catch(
                        (e) => setError(e.message)
                      )
                    }
                  >
                    {viewAsLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Eye size={13} />
                    )}
                    View Stats
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
