# Advanced / Future Features — Apply Order & Summary
# =====================================================

## FILES IN THIS BATCH

───────────────────────────────────────────────────────────────────────────

1. craftTemplates.ts               CREATE NEW
   src/lib/craftTemplates.ts

   10 themed word/clue sets covering: Birthday, Anniversary, Graduation,
   New Year, Best Friends, Valentine's Day, Thank You, Movie Night,
   Adventure, Sports Fan — plus a "Start from scratch" option.

   Each template has:
   - Pre-filled words array (10 words)
   - Crossword clues per word
   - A cryptogram phrase
   - Compatible puzzle types

   Helper functions:
   - getTemplatesForType(type) — filters to compatible templates
   - getTemplateById(id)

───────────────────────────────────────────────────────────────────────────

2. CraftTemplateSelector.tsx       CREATE NEW
   src/components/craft/CraftTemplateSelector.tsx

   Collapsible template picker shown above the word-entry inputs in
   CraftPuzzle Step 1. Tapping a template card pre-fills the words,
   clues, and phrase into the form. "Start from scratch" collapses
   and clears. Shows word count per template.

   PATCH for CraftPuzzle.tsx Step 1 — add above word inputs:
     <CraftTemplateSelector
       puzzleType={selectedType}
       onSelect={(template) => {
         setWords(template.words);
         if (template.clues) setClues(template.clues);
         if (template.phrase) setPhrase(template.phrase);
       }}
     />

───────────────────────────────────────────────────────────────────────────

3. weeklyPacks.ts                  CREATE NEW
   src/lib/weeklyPacks.ts

   Weekly themed puzzle packs, seeded by ISO week number.
   - 12 rotating themes (Around the World, Silver Screen, etc.)
   - 5 puzzles per pack (crossword, word-search, sudoku, cryptogram, word-fill)
   - Difficulty: easy → medium → medium → hard → hard
   - Release: Sunday midnight for all users, Friday midnight for Plus
   - Progress tracked in localStorage (same pattern as daily challenges)
   - getCurrentWeeklyPack(account) returns pack + isUnlocked + unlocksIn timer

   No Supabase required — packs are deterministic from the week seed.

───────────────────────────────────────────────────────────────────────────

4. WeeklyPackCard.tsx              CREATE NEW
   src/components/ios/WeeklyPackCard.tsx

   Play tab card showing the current week's pack. Shows:
   - Theme emoji + name + description
   - 5 puzzle title pills (green = completed, grey = remaining)
   - Progress bar
   - Lock state with early-access messaging for non-Plus users
   - Tapping navigates to the first incomplete puzzle in the pack

   PATCH for IOSPlayTab.tsx — add between daily card and puzzle types:
     import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";
     <WeeklyPackCard />

   Also update the final section order in IOSPlayTab:
     1. Header (streak pill)
     2. Resume card
     3. Daily challenge card
     4. DailyLeaderboard
     5. WeeklyPackCard        ← NEW (here)
     6. StreakShieldBanner
     7. FriendActivityFeed
     8. Rating nudge card
     9. Puzzle type section
    10. Quick stats row
    11. Customize button

───────────────────────────────────────────────────────────────────────────

5. CraftAnalyticsCard.tsx          CREATE NEW
   src/components/craft/CraftAnalyticsCard.tsx

   Shown when creator taps a sent puzzle in CraftInbox sent tab.
   Displays: recipients, completion rate, avg time, fastest time,
   solver leaderboard with "beat you" labels.

   Reads from shared_puzzles — no new DB table needed.
   Data is already there from the P1 Craft solve_time tracking.

   PATCH for CraftInbox.tsx sent tab:
   When a sent puzzle row is tapped (expand/detail state), render:
     <CraftAnalyticsCard
       shareId={item.shareId}
       puzzleTitle={item.title}
     />

───────────────────────────────────────────────────────────────────────────

6. ActivityCalendar.tsx            CREATE NEW or REPLACE
   src/components/stats/ActivityCalendar.tsx

   Upgrades the existing static activity calendar into an interactive
   replay surface. Tapping a day expands a detail card showing:
   - Completion status and solve time
   - "Play" / "Replay" / "Catch up" button → /daily?date=YYYY-MM-DD

   Month navigation: previous months freely, future months blocked.
   Selected day highlighted with ring + scale animation.

   Also includes patch instructions for DailyPuzzle.tsx:
   Read ?date= param and pass to getTodaysChallenge(dateOverride).

───────────────────────────────────────────────────────────────────────────

## APPLY ORDER (Lovable)

1. craftTemplates.ts           (data file — no UI deps)
2. CraftTemplateSelector.tsx   (imports craftTemplates)
3. weeklyPacks.ts              (data file — no UI deps)
4. WeeklyPackCard.tsx          (imports weeklyPacks + usePremiumAccess)
5. CraftAnalyticsCard.tsx      (standalone — just needs Supabase)
6. ActivityCalendar.tsx        (replace or create)
7. Apply CraftPuzzle patch     (add CraftTemplateSelector to Step 1)
8. Apply IOSPlayTab patch      (add WeeklyPackCard to section order)
9. Apply CraftInbox patch      (expand sent row → CraftAnalyticsCard)
10. Apply DailyPuzzle patch    (read ?date= param for archive replay)

## WHAT THIS BATCH DELIVERS

#27 Craft templates    10 themed word sets eliminate blank-page paralysis.
                       First-craft conversion goes from "I don't know what
                       to write" → "Just replace these birthday words with
                       our inside jokes." Template variety also makes the
                       craft tab feel alive and seasonal.

#28 Weekly packs       Calendar-event cadence: every Sunday a new themed
                       pack drops. Gives Plus users a tangible early-access
                       perk (Friday unlock). Creates editorial marketing
                       content ("This week: Into Space") and push
                       notification hooks ("Your weekly pack just dropped").

#29 Craft analytics    Turns the sent tab from a list into a publishing
                       platform. Creators get completion rates, avg times,
                       solver leaderboards. "62% of your friends finished
                       it — faster than you!" is pure re-engagement fuel
                       and drives more crafting.

#30 Replay calendar    The activity calendar in Stats becomes a playable
                       surface. Missed days turn from guilt into opportunity
                       ("Catch up" button). Completed days are replayable
                       for speed runs. The calendar goes from decoration
                       to destination.
