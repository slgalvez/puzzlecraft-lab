

## Account Page and Upgrade Modal Redesign

### What changes

**1. `src/components/account/UpgradeModal.tsx` — Full replacement**
- Switches from a Dialog-based modal to a custom iOS-style bottom sheet (slides up from bottom with a drag handle)
- Adds a monthly/annual pricing toggle ($2.99/mo vs $19.99/yr with "Save 44%" badge)
- Expands feature list to 6 items: Streak Shield (highlighted as "Fan favourite"), Unlimited Craft puzzles, Global leaderboard, Advanced stats, 90-day daily archive, Exclusive themes
- Adds social proof stars at the bottom
- Pre-launch state shows "Launching soon" with early-user messaging
- No longer uses Radix Dialog — renders conditionally with a backdrop + fixed-position sheet

**2. `src/pages/Account.tsx` — Full replacement (502 lines)**
- **Signed-in view**: Adds a quick stats row (Solved / Streak / Best time) using `getProgressStats`, `getDailyStreak`, and rating info from `computePlayerRating`. Adds a tappable rating card linking to /stats. Redesigned subscription status block with active benefits grid. "Coming Soon" block is now tappable with a chevron.
- **Logged-out view**: Adds a value proposition card above the auth form (4 bullet points: streak, leaderboard, tracking, Puzzlecraft+). Auth tabs use underline-style indicators instead of rounded pills. Inputs get rounded-xl styling. Puzzlecraft+ teaser appears below the form as a tappable row.
- **Signup success**: Minor visual refresh (larger icon container, rounded-2xl borders).
- New imports: `isNativeApp`, `getProgressStats`, `getDailyStreak`, `getSolveRecords`, `computePlayerRating`, `getSkillTier`, `getTierColor`, `formatTime`, `cn`, plus additional Lucide icons.

### Technical notes
- Both files are drop-in replacements with no new dependencies
- The UpgradeModal no longer uses the Radix Dialog component — it manages its own visibility via the `open` prop and renders a backdrop + sheet directly
- `User` icon is referenced in UpgradeModal line 199 but not imported — will add it to the import list

