

## Stats Page Spacing Fix

**Problem**: The Stats page uses custom width classes (`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`) instead of the shared `container` class used by Home, Play, Generate, and all other pages. This causes the header and content to start at a different horizontal position, making the page feel inconsistent.

The Tailwind `container` class is configured project-wide to `max-width: 1400px` at 2xl, centered, with padding `1rem / 1.5rem / 2rem`. Stats currently caps at `max-w-7xl` (1280px) with smaller padding.

**Fix**: One line change in `src/pages/Stats.tsx` (line 266):

Replace:
```
<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
```
With:
```
<div className="container py-6 md:py-10">
```

This makes the Stats page match the exact same horizontal alignment and max-width as every other page. No layout, structure, or feature changes — just swapping to the shared container utility.

