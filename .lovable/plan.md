

# Open iMessage automatically on macOS

## Problem

On a MacBook running Chrome / Firefox / Edge, `navigator.share` is undefined, so the cascade falls all the way through to clipboard. iMessage never opens. Only Safari on macOS gets Tier 1 (and even there the user must pick Messages from the share sheet).

The `sms:` URL scheme is handled by **Messages.app on macOS** the same way it is on iOS — but our Tier 2 check (`isMobile()`) excludes desktop, so we never try it.

## Fix — extend Tier 2 to fire on macOS too

Cascade becomes:

```text
executeShare(text, shareUrl?)
  ├─ Tier 1: navigator.share({ text, url? })          ← Safari macOS, iOS, Android, PWAs
  ├─ Tier 2: sms:&body=… via hidden <a> click         ← any mobile OR macOS desktop
  │     • macOS: opens Messages.app with body pre-filled
  │     • mobile: opens Messages / iMessage composer
  │     • awaits ~150ms before resolving "shared"
  └─ Tier 3: navigator.clipboard.writeText(fullText)  ← Windows / Linux / unknown
```

## Changes — `src/lib/shareUtils.ts`

### 1. Add a macOS detector + a combined "Messages-capable" check

```ts
function isMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Exclude iPadOS 13+ which also uses "Macintosh" but has touch
  const touch = (navigator.maxTouchPoints ?? 0) > 1;
  return /Macintosh/.test(ua) && !touch;
}

function canOpenMessagesApp(): boolean {
  return isMobile() || isMacDesktop();
}
```

### 2. Replace `window.location.href = "sms:…"` with a hidden anchor click

`location.href` assignment is sometimes blocked by Chrome's popup heuristics for non-user-gesture-bound protocol handlers, and it visibly navigates the page. A synthetic anchor click inside the original click handler is the standard pattern for `sms:` / `mailto:` / `tel:` and behaves identically across Safari/Chrome/Firefox on macOS:

```ts
function openSmsComposer(body: string): void {
  const a = document.createElement("a");
  a.href = `sms:?&body=${encodeURIComponent(body)}`;
  // Keep it out of the layout but still clickable
  a.style.position = "fixed";
  a.style.opacity = "0";
  a.style.pointerEvents = "none";
  document.body.appendChild(a);
  a.click();
  // Clean up next tick
  setTimeout(() => a.remove(), 0);
}
```

### 3. Update Tier 2 in `executeShare`

```ts
// Tier 2: Messages composer on any device with a Messages app
if (canOpenMessagesApp()) {
  try {
    openSmsComposer(fullText);
    // Allow Messages.app / iOS Messages to surface before resolving
    await new Promise((r) => setTimeout(r, 150));
    return "shared";
  } catch {
    // fall through to Tier 3
  }
}
```

## Behavior matrix after fix

| Environment | Tier | Result |
|---|---|---|
| **Safari macOS** | 1 | Native share sheet (Messages, Mail, AirDrop) |
| **Chrome / Firefox / Edge on macOS** | **2 (new)** | **Messages.app opens with body pre-filled** |
| iOS Safari / PWA | 1 | iOS share sheet → user picks iMessage |
| Android Chrome / PWA | 1 | Android share sheet |
| Mobile browser without `navigator.share` | 2 | SMS composer |
| Windows / Linux desktop | 3 | Clipboard with `text\nurl` |
| User cancels native sheet | 1 (AbortError) | `"error"`, no fallback |

## First-time prompt

The first time a Mac browser opens `sms:`, macOS asks: *"Do you want to allow this page to open 'Messages'?"* This is the standard, expected protocol-handler prompt. Once accepted (with "Always allow"), it never reappears for the same origin. We don't try to suppress it — that's the OS's job.

## Memory update

Append to `mem://features/share-system.md`:
> Tier 2 (`sms:?&body=`) fires on **mobile OR macOS desktop** (`Macintosh` UA + no touch). On macOS this opens Messages.app with the body pre-filled. Implementation uses a hidden `<a>` click (not `location.href`) for protocol-handler compatibility across Chrome/Firefox/Edge on macOS. iPadOS 13+ is excluded from `isMacDesktop` via `maxTouchPoints > 1` so it still hits Tier 1 (native share).

## Out of scope

- Windows/Linux desktop "open Messages-equivalent" (no equivalent universal protocol).
- Preselecting a recipient (`sms:+1555…?&body=…`) — recipient is left blank so Messages opens to the contact picker.
- Image/file sharing pathways (`MilestoneShareCard`, `useSolveShareCard`) — unchanged.

## Verification

1. **Chrome on MacBook** at `/admin-preview` → click any Share Preview → Messages.app opens with body pre-filled (after one-time permission prompt).
2. **Safari on MacBook** → still opens native share sheet (Tier 1 unchanged).
3. **iOS Safari** → still opens iOS share sheet.
4. **Windows Chrome** → still copies to clipboard.
5. **iPad Safari** → still opens native share sheet (excluded from `isMacDesktop` via touch detection).

