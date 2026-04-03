# Advanced PuzzleCraft Architecture Summary

This document outlines the core architectural components and data structures implemented for the PuzzleCraft platform.

## 1. Data Models & Templates
- **`src/lib/craftTemplates.ts`**: Defines the `CraftTemplate` interface and the `CRAFT_TEMPLATES` registry. This powers the "Start from a template" feature in the puzzle creation flow, providing pre-seeded word lists, clues, and metadata for various occasions (Birthday, Anniversary, etc.).
- **`src/lib/weeklyPacks.ts`**: Manages the weekly curated puzzle drops. It uses a deterministic seeding mechanism based on ISO week numbers to ensure all users see the same pack. It includes logic for premium-only early access (Friday) vs. public access (Sunday).

## 2. UI Components
- **`src/components/craft/CraftTemplateSelector.tsx`**: A specialized UI component for selecting puzzle templates. It handles the expansion/collapse logic and provides a visual grid of available themes.
- **`src/components/ios/WeeklyPackCard.tsx`**: A high-fidelity card component for the dashboard. It displays the current weekly pack, tracks completion progress via `localStorage`, and handles the "Unlock" state based on user subscription status.
- **`src/components/stats/ActivityCalendar.tsx`**: A monthly calendar view for tracking daily challenge history. It visualizes streaks and completion status, allowing users to replay past daily puzzles.
- **`src/components/craft/CraftAnalyticsCard.tsx`**: A dashboard component that fetches real-time solve data from Supabase. It calculates completion rates, average solve times, and displays a leaderboard of top solvers for shared puzzles.

## 3. State Management
- **Completion Tracking**: Uses `localStorage` keys (e.g., `puzzlecraft_pack_progress`) to persist user progress across sessions.
- **Premium Access**: Integrated via `src/lib/premiumAccess.ts` to gate content and provide early access features.
- **Supabase Integration**: Analytics are driven by `shared_puzzles` and `craft_recipients` tables, allowing for real-time feedback on puzzle performance.
