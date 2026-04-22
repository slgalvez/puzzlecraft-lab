

# Delete `/craft-v2` and surface the Modern tab

## 1. Delete craft v2 (route + page)

`/craft-v2` was an admin alias rendering `CraftPreviewPage.tsx` — the live `/craft` page already uses the production `CraftPuzzle.tsx`. The alias is redundant.

- **`src/App.tsx`** — Remove the `import CraftPreviewPage` line and the `<Route path="/craft-v2" ...>` block (and its comment).
- **`src/pages/CraftPreviewPage.tsx`** — Delete the file.
- Verify no other references remain (already searched — only `App.tsx` and the file itself reference it).

## 2. Make the Modern tab visible

Root cause: 11 tabs in a `flex overflow-x-auto` strip on a 907px viewport pushes some tabs offscreen with no scroll affordance. The Modern tab is at index 2 so it should be visible, but text-xs + flex-1 + min-w-0 collapses labels and makes the strip easy to miss.

**`src/pages/AdminPreview.tsx`** — Replace the single-row `TabsList` with a 2-row wrap layout so every tab is visible without scrolling, and add a subtle "NEW" pip on the Modern tab so it's discoverable:

```tsx
<TabsList className="w-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1 h-auto bg-muted/50 p-1 rounded-xl">
  <TabsTrigger value="qa" className="text-xs">QA Mode</TabsTrigger>
  <TabsTrigger value="modern" className="text-xs relative">
    Modern
    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
  </TabsTrigger>
  {/* …rest unchanged… */}
</TabsList>
```

Also bump default tab from `qa` → `modern` so admins land directly on the refreshed previews:

```tsx
<Tabs defaultValue="modern" className="w-full">
```

## Files

- `src/App.tsx` — remove import + route
- `src/pages/CraftPreviewPage.tsx` — delete file
- `src/pages/AdminPreview.tsx` — wrap TabsList into a grid, add NEW pip on Modern, set defaultValue="modern"

## Verification

1. Visiting `/craft-v2` → 404 (NotFound route).
2. `/admin-preview` lands on Modern tab by default.
3. All 11 tabs visible without horizontal scrolling at 907px viewport.
4. `/craft` (production craft page) unaffected.

