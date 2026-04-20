

# Global Admin Preview / QA Mode — Refined

## Summary
Build a unified admin-only QA layer for inspecting all major Puzzlecraft states (calendars, messaging, shares, leaderboards, milestones) without real gameplay. Now with strict read isolation, inline preview labels, and a one-click reset.

## Architecture

### 1. Preview Mode Provider — `src/contexts/PreviewModeContext.tsx` (new)
Admin-gated context holding an in-memory preview profile. Never touches localStorage or DB.

```ts
type PreviewProfile = {
  active: boolean;
  isPlus: boolean;
  scenario: "none" | "partial" | "full" | "daily-only" | "quickplay-only" | "craft-only" | "mixed";
  completions: CompletionRecord[];
  solves: SolveRecord[];
  dailyData: Record<string, DailyCompletion>;
  craftDates: string[];
  friends: MockFriend[];
};
```

API: `enterPreview(scenario)`, `exitPreview()`, `togglePlus()`, `setScenario(s)`, **`resetPreview()`** (clears all injected data, sets scenario to `"none"`, keeps `active: true`).

Sticky banner across top whenever active (matches `ViewAsUserContext` style):  
`QA Preview · Plus · Mixed activity · [Reset] · [Exit]`

### 2. Mock data factory — `src/lib/previewFixtures.ts` (new)
Deterministic seeded fixture builders:
- `buildCalendarFixture(scenario)` → completions + dailyData + craftDates spanning current + last month
- `buildFriendsFixture(variant)` → populated / tie / small / empty
- `buildMessagingFixture()` → sent, received, challenge, reveal, completion, milestone bubbles
- `buildMilestoneFixture(id)` → MilestoneToShow

All records tagged `__preview: true`.

### 3. Read isolation (strict)
**Rule: when `preview.active`, components read EXCLUSIVELY from `previewProfile`. No merging.**

Affected sites:
- **`src/pages/Stats.tsx`** — three mutually exclusive branches: `if (preview.active) → preview source` / `else if (isViewAs) → viewAs source` / `else → real localStorage source`. No fallback merging. When preview active, `isPlus` is forced from `preview.isPlus`, ignoring real entitlement.
- **`InlineCalendar`** — same three-branch pattern; calendar data comes from one source only.
- **`SocialTab` / friend leaderboard** — when preview active, render fixture rows only; Supabase queries are skipped entirely (not merged).
- **Share & messaging previews in AdminPreview** — always pull from fixtures regardless, but get the inline label only when `preview.active`.

Real-data hooks (`getProgressStats`, `getDailyStreak`, etc.) are not called at all when preview is active in those components.

### 4. Inline preview labels
Subtle "Preview Data" / "Mock State" pill rendered inside key components when `preview.active`:
- **Calendar** (Stats page) — small `Preview Data` pill in the calendar card header, right-aligned, `text-[10px]` muted with subtle primary tint
- **Friend leaderboard** (Social tab) — same pill in section header
- **Messaging preview section** (AdminPreview) — pill above the bubble stack
- **Share preview cards** (AdminPreview) — pill in the card header

Label component: shared `<PreviewLabel />` in `src/components/admin/PreviewLabel.tsx` (new) — single source of truth for styling. Renders nothing when preview inactive.

Sticky top banner (always shown when active) is the global indicator; inline labels are component-level confirmation that what you're looking at is mock data — critical for screenshots and QA reports where the banner might be cropped.

### 5. Reset control
- `resetPreview()` exposed via context
- **In sticky banner**: "Reset" button between scenario name and Exit
- **In QA Hub**: prominent "Reset Preview State" button at top of scenario switcher
- Behavior: clears `completions`, `solves`, `dailyData`, `craftDates`, `friends`; sets `scenario: "none"`; keeps `active: true` and current `isPlus` toggle. Components immediately re-render to empty/baseline state without exiting preview.

### 6. Admin Preview Hub — `src/pages/AdminPreview.tsx` (extend)
New "QA Mode" tab as first tab:
- **Scenario switcher** (radio): None / Partial / Full / Daily-only / Quick-play-only / Craft-only / Mixed
- **Plus toggle**
- **Reset Preview State** button (with confirmation if non-default scenario active)
- **Quick-jump buttons** (set scenario + navigate):
  - Stats Calendar (Free) / (Plus) / Replay-eligible day / Daily complete / Quick-play-only / Craft-only / Empty
- **Easy-complete simulators**: open existing `CompletionPanel`, `DailyPostSolve`, craft completion sheet, `MilestoneModal` with mock data — no DB writes
- **Share previews** — all 5 builders side-by-side with copy-to-clipboard, each with `<PreviewLabel />`
- **Messaging previews** — live `MessageBubble` instances with fixtures, with `<PreviewLabel />`
- **Friend leaderboard previews** — 4 fixture variants (populated, tie, small, empty), each with `<PreviewLabel />`

### 7. Discoverability
- "QA Preview" entry card in `AdminAnalytics` linking to `/admin-preview`
- Sticky preview banner includes "Open QA Hub" button

### 8. Safety
- Context state only — no localStorage, no DB writes
- All preview records carry `__preview: true`
- Provider is admin-gated (non-admins get noop context)
- Auto-exits preview on logout / admin flag loss
- Real-write functions (`recordSolve`, `recordDailyCompletion`, `upsert_leaderboard_entry`) never invoked from preview pathways

## Files

| File | Action |
|------|--------|
| `src/contexts/PreviewModeContext.tsx` | new — provider, hook, sticky banner with Reset/Exit |
| `src/lib/previewFixtures.ts` | new — deterministic fixture builders |
| `src/components/admin/PreviewLabel.tsx` | new — shared inline "Preview Data" pill |
| `src/App.tsx` | wrap `PublicRoutes` with `PreviewModeProvider` |
| `src/pages/Stats.tsx` | strict 3-branch source selection (preview / viewAs / real); inline label in calendar header |
| `src/pages/AdminPreview.tsx` | new "QA Mode" tab with scenario switcher, reset, quick-jumps, share/messaging/leaderboard preview sections (each labeled) |
| `src/pages/AdminAnalytics.tsx` | QA Preview entry card |
| `src/components/social/SocialTab.tsx` | preview branch with fixtures + inline label; skip Supabase entirely when active |

## Constraints

| Rule | Enforcement |
|------|-------------|
| Read isolation | Strict if/else branches — preview OR viewAs OR real, never merged |
| Inline labels | `<PreviewLabel />` in calendar, leaderboard, messaging, share preview headers when active |
| Reset | Clears injected data, scenario → `"none"`, stays in preview mode |
| Persistence | None — context state only, session-scoped |
| Real writes | Blocked from all preview pathways |
| Admin gating | Non-admins cannot enter preview |
| Visual indicator | Sticky top banner + per-component inline label (defense in depth for screenshots) |

## Out of scope
- Persisting preview state across reloads (intentionally session-only)
- Mocking Stripe / push / call signaling
- Replacing `ViewAsUserContext` (kept — different purpose: real user data)

