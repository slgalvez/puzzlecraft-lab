import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import getMyStats from "./tools/get-my-stats";
import getLeaderboard from "./tools/get-leaderboard";

// Build issuer from the project ref (Vite inlines this literal at build time,
// so this stays import-safe — no runtime env read). mcp-js requires the direct
// supabase.co issuer, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "puzzlecraft-mcp",
  title: "Puzzlecraft",
  version: "0.1.0",
  instructions:
    "Tools for the Puzzlecraft puzzle app. Use `get_my_profile` for the signed-in player's overall rating and tier, `get_my_stats` for their rating per puzzle type, and `get_leaderboard` for the global top players.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, getMyStats, getLeaderboard],
});
