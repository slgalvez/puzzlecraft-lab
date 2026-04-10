

## Problem

The Privacy Policy and Terms of Service links both point to `https://puzzlecraftapp.com/privacy` and `https://puzzlecraftapp.com/terms`, which are empty/non-existent pages.

## Fix

Replace those URLs with routes inside the app itself (`/privacy` and `/terms`), and create two simple static pages with placeholder legal text. This ensures the links always work regardless of external domains.

### Changes

1. **Create `src/pages/Privacy.tsx`** — static page with standard privacy policy content (data collection, cookies, contact info placeholder) using the existing `Layout` component.

2. **Create `src/pages/Terms.tsx`** — static page with standard terms of service content using the existing `Layout` component.

3. **Update `src/App.tsx`** — add routes for `/privacy` and `/terms` inside the public routes.

4. **Update `src/pages/Account.tsx`** (lines 286–288 and 528–530) — change `<a href="https://puzzlecraftapp.com/...">` to `<Link to="/privacy">` and `<Link to="/terms">` (React Router links instead of external anchors). Remove `target="_blank"`.

