import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

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
  name: "get_leaderboard",
  title: "Get Puzzlecraft leaderboard",
  description:
    "Return the top Puzzlecraft players by overall rating. Use `limit` (1-50, default 10) to control how many rows come back.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("How many top players to return. Default 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const n = limit ?? 10;
    const { data, error } = await sb(ctx)
      .from("leaderboard_entries")
      .select("display_name, rating, skill_tier, solve_count")
      .order("rating", { ascending: false })
      .limit(n);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = data ?? [];
    const lines = rows.map(
      (r, i) =>
        `${i + 1}. ${r.display_name} — ${r.rating} (${r.skill_tier}, ${r.solve_count} solves)`,
    );
    return {
      content: [
        { type: "text", text: lines.length ? lines.join("\n") : "Leaderboard is empty." },
      ],
      structuredContent: { entries: rows },
    };
  },
});
