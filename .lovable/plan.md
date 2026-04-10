

## iOS Polish Audit — Findings and Plan

### Issues Found

**1. IOSPlayTab bottom content clipped by tab bar**
The Play tab uses `pb-8` (32px) for bottom padding, but the tab bar is `h-14` (56px) plus safe-area inset. On iPhones with home indicators, the Customize button and bottom content will be partially hidden behind the tab bar.
**Fix:** Change `pb-8` to `pb-24` (~96px) to clear the 56px tab bar + safe-area inset reliably.

**2. IOSCustomizeSheet close button too small for touch**
The close `X` button uses `p-1.5` (6px padding each side), making the total touch target ~30px. Apple HIG requires 44px minimum.
**Fix:** Change `p-1.5` to `p-2.5` and add `min-w-[44px] min-h-[44px] flex items-center justify-center` for proper touch target.

**3. PuzzleTypePicker close button too small**
Same issue — close button is `h-8 w-8` (32px), below the 44px iOS minimum.
**Fix:** Increase to `h-10 w-10` (40px visual, still passes with 44px effective due to padding).

**4. IOSTabBar tap targets lack minimum height enforcement**
Tab buttons rely on `py-1.5` padding alone. On smaller text, the total height can dip below 44px.
**Fix:** Add `min-h-[44px]` to each tab button to guarantee the Apple-minimum touch target.

**5. Stats link row in IOSPlayTab too small for touch**
The "X puzzles solved → Stats" link uses `py-2 px-1` — roughly 36px tall. Easy to miss-tap.
**Fix:** Increase to `py-3 px-2` for a comfortable 44px+ touch target.

**6. Difficulty pill buttons in IOSCustomizeSheet too short**
The difficulty pills use `py-1.5` (~36px total height). Tight for finger taps.
**Fix:** Change to `py-2` to bring them to ~40px, closer to the 44px guideline.

### Items Verified as Fine (NOT TOUCHED)

- **Layout/structure**: No changes to tab order, section order, or feature placement
- **Safe-area top**: Layout.tsx correctly applies `env(safe-area-inset-top)` via inline style
- **CompletionSheet**: Already has `pb-[env(safe-area-inset-bottom)]` and proper z-indexing
- **PuzzleToolbar**: Already has `pb-[env(safe-area-inset-bottom)]` and adequate button sizes
- **MobileNumberPad**: Already uses `min-h-[44px]` per button
- **Scroll behavior**: `ios-scroll-container` class applies `overscroll-behavior-y: none` correctly
- **Keyboard avoidance**: `useKeyboardAvoidance` + `MobileLetterInput` with `fontSize: 16px` prevents iOS zoom
- **WeeklyPackCard**: Touch target is the full card — adequate
- **Favourites/All Puzzles grid**: Cards have `p-3.5`/`p-4` — adequate touch area
- **Bottom sheets**: All use `animate-in slide-in-from-bottom` with safe-area bottom padding

### Summary

6 touch-target and spacing polish fixes. Zero layout, structure, or feature changes.

