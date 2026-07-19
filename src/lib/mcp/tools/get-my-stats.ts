import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_my_stats",
  title: "Get my Puzzlecraft stats",
  description:
    "Return the signed-in user's per-puzzle-type rating breakdown from the type leaderboards (crossword, sudoku, nonogram, etc.).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("type_leaderboard_entries")
      .select("puzzle_type, rating, skill_tier, solve_count")
      .eq("user_id", ctx.getUserId())
      .order("rating", { ascending: false });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return {
        content: [{ type: "text", text: "No per-type ratings yet — solve a puzzle to get started." }],
        structuredContent: { types: [] },
      };
    }
    const lines = rows.map(
      (r) => `${r.puzzle_type}: ${r.rating} (${r.skill_tier}, ${r.solve_count} solves)`,
    );
    return {
      content: [{ type: "text", text: lines.join("\n") }],
      structuredContent: { types: rows },
    };
  },
});
