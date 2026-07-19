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
  name: "get_my_profile",
  title: "Get my Puzzlecraft profile",
  description:
    "Return the signed-in user's Puzzlecraft profile: display name, rating, skill tier, total solves, friend code, and Puzzlecraft+ status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("user_profiles")
      .select(
        "display_name, rating, rating_tier, solves_count, friend_code, is_premium, subscribed",
      )
      .eq("id", ctx.getUserId())
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Profile not found" }], isError: true };
    }

    const summary =
      `Player: ${data.display_name ?? "(unnamed)"}\n` +
      `Rating: ${data.rating ?? 0} (${data.rating_tier ?? "Unrated"})\n` +
      `Solves: ${data.solves_count ?? 0}\n` +
      `Friend code: ${data.friend_code ?? "—"}\n` +
      `Puzzlecraft+: ${data.subscribed ? "active" : "inactive"}`;

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { profile: data },
    };
  },
});
