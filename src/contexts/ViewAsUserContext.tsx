import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CompletionRecord, ProgressStats } from "@/lib/progressTracker";
import type { SolveRecord } from "@/lib/solveTracker";
import { X, Eye } from "lucide-react";

export interface ViewAsPayload {
  id: string;
  displayName: string;
  completions: CompletionRecord[];
  solves: SolveRecord[];
  dailyData: Record<string, { dateStr: string; time: number; category: string; difficulty: string }>;
  endlessData: any;
  rating: number;
  ratingTier: string;
  solvesCount: number;
}

interface ViewAsUserContextType {
  viewAsUser: ViewAsPayload | null;
  loading: boolean;
  enterViewAs: (userId: string, displayName: string) => Promise<void>;
  exitViewAs: () => void;
}

const ViewAsUserContext = createContext<ViewAsUserContextType | null>(null);

export function useViewAsUser() {
  const ctx = useContext(ViewAsUserContext);
  if (!ctx) throw new Error("useViewAsUser must be used within ViewAsUserProvider");
  return ctx;
}

export function ViewAsUserProvider({ children }: { children: ReactNode }) {
  const [viewAsUser, setViewAsUser] = useState<ViewAsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const enterViewAs = useCallback(async (userId: string, displayName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_user_progress" as any, {
        p_user_id: userId,
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("No progress data found for this user");

      // Fetch profile info
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("rating, rating_tier, solves_count")
        .eq("id", userId)
        .maybeSingle();

      const completions = Array.isArray(row.completions) ? row.completions : [];
      const solves = Array.isArray(row.solves) ? row.solves : [];
      const dailyData = (row.daily_data && typeof row.daily_data === "object") ? row.daily_data : {};
      const endlessData = row.endless_data ?? {};

      setViewAsUser({
        id: userId,
        displayName,
        completions: completions as CompletionRecord[],
        solves: solves as SolveRecord[],
        dailyData: dailyData as any,
        endlessData,
        rating: profile?.rating ?? 0,
        ratingTier: profile?.rating_tier ?? "beginner",
        solvesCount: profile?.solves_count ?? 0,
      });
    } catch (err) {
      console.error("Failed to load user progress:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exitViewAs = useCallback(() => setViewAsUser(null), []);

  return (
    <ViewAsUserContext.Provider value={{ viewAsUser, loading, enterViewAs, exitViewAs }}>
      {viewAsUser && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-primary px-4 py-2">
          <Eye size={14} className="text-primary-foreground" />
          <span className="text-sm font-semibold text-primary-foreground">
            Viewing as {viewAsUser.displayName}
          </span>
          <button
            onClick={exitViewAs}
            className="ml-2 flex items-center gap-1 rounded-md bg-primary-foreground/20 px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
          >
            <X size={12} /> Exit
          </button>
        </div>
      )}
      {children}
    </ViewAsUserContext.Provider>
  );
}
