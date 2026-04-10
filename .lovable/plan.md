

# Fix Stats Page Two-Column Layout Breakpoint

## Problem
The two-column layout (left: rating + recent solves, right: puzzle type + daily + endless) uses `lg:grid-cols-[1fr_340px]` which requires 1024px+ width. At your current viewport (894px), everything stacks in a single column, making the right column sections (By Puzzle Type, Daily Challenge, Endless Mode) appear below everything else instead of on the right side.

## Fix
**File: `src/pages/Stats.tsx`**

1. **Line 310**: Change `lg:grid-cols-[1fr_340px]` to `md:grid-cols-[1fr_340px]` so the two-column layout activates at 768px+ instead of 1024px+
2. **Line 521**: Change `lg:sticky lg:top-24` to `md:sticky md:top-24` on the right column so it stays pinned when scrolling

This is a two-line change. The right column content (puzzle type breakdown, daily challenge stats, endless mode stats) is already present in the code — it's just not appearing side-by-side at your viewport width.

