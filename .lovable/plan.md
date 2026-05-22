# Noindex the /showcase route

Add a `noindex, nofollow` meta tag scoped to the `/showcase` route only, so search engines skip the trailer page while the rest of the site stays indexable.

## Approach

Use `react-helmet-async` (per the project's per-route head pattern). The page is JS-rendered, so a client-side Helmet `<meta name="robots">` is sufficient — Googlebot executes JS and will honor it.

## Files

**Install**
- `react-helmet-async`

**Edited**
- `src/main.tsx` — wrap the app in `<HelmetProvider>` (one-time setup)
- `src/pages/Showcase.tsx` — add at the top of the component:
  ```tsx
  <Helmet>
    <meta name="robots" content="noindex, nofollow" />
  </Helmet>
  ```

## Out of scope

- No changes to `index.html` (sitewide indexing stays on)
- No sitemap changes (the project has no sitemap including `/showcase`)
- No robots.txt edits
