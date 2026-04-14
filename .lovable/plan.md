

# Fix Build Error — Add Rollup External

## Problem
`src/lib/appRating.ts` dynamically imports `@nicepng/capacitor-in-app-review`, which isn't installed. Vite/Rollup treats this as an error during build.

## Fix
In `vite.config.ts`, add `"@nicepng/capacitor-in-app-review"` to the existing `build.rollupOptions.external` array (line 68), alongside the two already-externalized Capacitor plugins.

```ts
external: ["@revenuecat/purchases-capacitor", "@capacitor/browser", "@nicepng/capacitor-in-app-review"],
```

## Files changed

| File | Change |
|------|--------|
| `vite.config.ts` | Add one entry to `external` array |

