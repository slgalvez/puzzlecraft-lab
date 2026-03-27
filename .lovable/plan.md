

## Problem

On iPhone, PWA (Add to Home Screen) apps **do not appear as separate apps** in Settings → Location Services. iOS PWAs inherit location permissions from **Safari** itself. The current guidance message incorrectly tells users to "find this app" in Location Services, which doesn't exist.

## Root cause

The `getDeniedGuidance()` function in `src/lib/locationPermission.ts` has an iOS+standalone branch that gives wrong instructions:
> "Go to Settings → Privacy & Security → Location Services → find this app..."

This is incorrect — iOS PWAs share Safari's location permission.

## Plan

**Single file change: `src/lib/locationPermission.ts`**

Update the iOS + standalone guidance to reflect how iOS actually works:

1. **iOS PWA (standalone)** — new text:
   - "Location is blocked. On iPhone, this app uses Safari's location permission."
   - Step 1: Settings → Privacy & Security → Location Services → Safari Websites → set to "While Using"
   - Step 2: Also ensure Location Services is turned on globally
   - "Then close and reopen the app."

2. **iOS Safari browser** — keep current text but slightly refine to also mention ensuring Safari is listed under Location Services.

3. **Unavailable guidance for iOS** — add a note that PWAs rely on Safari's permission being enabled.

No other files need changes — the guidance strings propagate to `useLocationSharing.ts` and all UI surfaces automatically.

## Technical detail

```
// iOS PWA: permissions are inherited from Safari, not listed as separate app
if (ios && standalone) {
  return "Location is blocked. This app uses Safari's location permission on iPhone. " +
    "Go to Settings → Privacy & Security → Location Services → Safari Websites, " +
    "and set to \"While Using the App\". Make sure Location Services is on. " +
    "Then close and reopen the app.";
}
```

