

## Capacitor iOS App Wrapper for Puzzlecraft

### Overview
Wrap the existing Puzzlecraft website in a native iOS shell using Capacitor. The live website stays completely untouched. Secret Lab (`/p/*` routes) is hidden only when running inside the native app.

### App Mode Detection

Create `src/lib/appMode.ts` — a single utility that checks if the app is running inside Capacitor:

```typescript
import { Capacitor } from '@capacitor/core';
export const isNativeApp = () => Capacitor.isNativePlatform();
```

This is the only gate needed. No query parameters, no environment flags. Capacitor provides this natively and it returns `false` on the web, `true` in the iOS shell.

### Changes (all isolated to app mode)

**1. Hide Secret Lab routes in app mode** — `src/App.tsx`
- Wrap the `/p/*` route block with `!isNativeApp()` check
- In app mode, `/p/*` routes simply don't exist (renders NotFound)
- Web users see zero change

**2. Hide puzzle code "unlock" entry point** — `src/pages/Index.tsx`
- The `handleLoadCode` function has a `case 'unlock'` that navigates to `/p/login`
- In app mode, skip this case (treat as "code not found")
- No other changes to the homepage

**3. Remove any other Secret Lab entry points in app mode**
- Search codebase for any other links/references to `/p/` routes and gate them

**4. Install Capacitor dependencies** — `package.json`
- `@capacitor/core` (dependency)
- `@capacitor/cli` (dev dependency)
- `@capacitor/ios` (dependency)

**5. Create Capacitor config** — `capacitor.config.ts`
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0dd25f01e1ba4f7e9dec0610ddea13f1',
  appName: 'Puzzlecraft',
  webDir: 'dist',
  server: {
    url: 'https://0dd25f01-e1ba-4f7e-9dec-0610ddea13f1.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
```

### What stays untouched
- All Secret Lab code remains in the codebase
- All `/p/*` routes work exactly as before on the web
- No UI redesign, no layout changes
- Backend, auth, messaging, calls, location — all unchanged
- PWA functionality unchanged for web users

### After implementation — your steps (on a Mac)

1. Click **"Export to GitHub"** in Lovable, then clone the repo
2. Run `npm install`
3. Run `npx cap add ios` to create the native iOS project
4. Run `npm run build && npx cap sync` to sync web assets
5. Run `npx cap open ios` to open in Xcode
6. Build and run on your iPhone or simulator
7. After any future code changes: `git pull && npm install && npm run build && npx cap sync`

Full guide: https://docs.lovable.dev/tips-tricks/native-mobile-apps

### Technical details

| Item | Detail |
|---|---|
| App mode gate | `Capacitor.isNativePlatform()` — zero config, built-in |
| Routes hidden | `/p/*` (login, conversations, settings, location, admin) |
| Entry points hidden | Puzzle code "unlock" case on homepage |
| Safe areas | Already handled — existing `pwa-safe-top` CSS + `env(safe-area-inset-*)` |
| Session persistence | Capacitor uses WKWebView which persists cookies/localStorage by default |
| Internal navigation | React Router handles all navigation in-app — no external browser opens |

### Scope
- 4 files modified: `App.tsx`, `Index.tsx`, `package.json`, `appMode.ts` (new)
- 1 file created: `capacitor.config.ts`
- No database changes, no edge function changes, no backend changes

