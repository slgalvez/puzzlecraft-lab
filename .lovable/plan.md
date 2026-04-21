

# Milestones first-view clarity

Five small additions to `src/pages/Milestones.tsx`. No changes to `milestones.ts` (descriptions and event-based copy already exist). No new files.

## 1. First-view explainer card

Add above the tab pill row, gated on `localStorage.getItem("milestones_seen_intro")`.

- Container: `rounded-2xl bg-secondary/40 px-4 py-3.5 mb-4` (no border emphasis)
- Sparkles icon (lucide, size 14, `text-primary/70`) + heading "How milestones work"
- Body (3 lines max, `text-xs text-muted-foreground leading-snug`):
  > Milestones track how you play. Complete puzzles, build streaks, create and share — each one unlocks as you go. Focus on what's marked **Next**.
- Inline "Got it" button (`text-xs font-semibold text-primary`, right-aligned) → sets `localStorage["milestones_seen_intro"] = "true"` and hides the card via local state.

State: `const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("milestones_seen_intro"));`

## 2. Micro descriptions on every card

Already implemented — `NextCard`, `InProgressCard`, `AchievedCard`, `LockedCard` all render `m.description` under the title with `text-xs text-muted-foreground`. **No change.**

## 3. Strengthen "Up Next" card

In `NextCard`, add a helper line above the progress bar (or above the moment-based italic line):
- Trackable: `"This is your next milestone"` — `text-[10px] text-primary/70 mt-2`
- Event-based: existing `"Moment-based — you'll know when it happens"` line stays as-is, prefixed by the same helper.

## 4. Per-tab empty state

In `TabContent`, compute `isTabEmpty = milestones.every(m => m.state === "locked")` (nothing achieved, nothing in-progress). When true, render an empty-state block IN PLACE OF the Up Next card (other sections — Coming Up — still render below).

Empty-state copy + CTA per tab:

| Tab | Headline | CTA | Route |
|---|---|---|---|
| `solver`  | Solve a puzzle to start unlocking milestones    | Play Daily       | `/daily` |
| `crafter` | Create and send a puzzle to begin               | Create a Puzzle  | `/craft` |
| `social`  | Play or share a puzzle with someone to unlock these | Create a Puzzle | `/craft` |
| `ranked`  | Solve 10 puzzles to earn your Player Rating     | Play Daily       | `/daily` |

Styling: dashed border card (`rounded-2xl border border-dashed border-border/60 p-5 text-center space-y-3`) — matches existing zero-state at the bottom of the page. Small primary `Button size="sm"`.

Pass `navigate` into `TabContent` (currently uses no navigation).

## 5. Removed scope (per user)

- No hover tooltips
- No accordions
- No modals
- No repeated explanations
- Existing global zero-state ("Start earning") at the bottom of the page stays as-is — it only renders when `totalAchieved === 0`, complementary to per-tab guidance.

## Verification

1. Fresh user (no `milestones_seen_intro`): sees explainer card above tabs.
2. Click "Got it" → card disappears; refresh page → still gone.
3. Solver tab with zero progress → shows "Solve a puzzle to start unlocking milestones" + "Play Daily" CTA in dashed card; Coming Up list still visible below.
4. After first solve → Up Next card returns with "This is your next milestone" helper above progress bar.
5. Up Next event-based milestone (e.g. Clean Sheet when you have solves but no clean sheet yet) → shows "This is your next milestone" + "Moment-based — you'll know when it happens".
6. Crafter tab empty → "Create a Puzzle" CTA routes to `/craft`.
7. Returning user with progress: no explainer card, normal cards render unchanged.

