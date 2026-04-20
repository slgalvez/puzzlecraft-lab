

# Share Behavior Standardization — Native / SMS / Clipboard Cascade

## Summary

Upgrade `executeShare()` in `src/lib/shareUtils.ts` to a three-tier cascade. Native share gets clean separation of `text` and `url`; SMS and clipboard get a combined string. SMS path waits ~120ms before resolving so the navigation can commit.

## The cascade

```text
executeShare(text, shareUrl?)
  ├─ Tier 1: navigator.share({ text, url? })   ← desktop Safari, iOS, Android, PWA
  │     • text passed AS-IS (no URL appended)
  │     • shareUrl passed separately as `url`
  │     • AbortError → return "error" (terminal, no fallback)
  │     • other throw / unsupported → fall to Tier 2
  ├─ Tier 2: sms: deep link (mobile only)
  │     • body = text + "\n" + shareUrl (if shareUrl not already in text)
  │     • window.location.href = `sms:?&body=<encoded>`
  │     • await ~120ms before returning "shared"
  └─ Tier 3: navigator.clipboard.writeText(fullText)
        • success → "copied"
        • failure → "error"
```

Mobile detection helper:
```ts
const isMobile = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile === true;
```

## Changes

### 1. `src/lib/shareUtils.ts` — rewrite `executeShare`

```ts
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  const uaData = (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData;
  return uaData?.mobile === true;
}

export async function executeShare(
  text: string,
  shareUrl?: string,
): Promise<"shared" | "copied" | "error"> {
  // Combined string for SMS/clipboard (avoid double-append if caller already inlined the URL)
  const fullText =
    shareUrl && !text.includes(shareUrl) ? `${text}\n${shareUrl}` : text;

  // Tier 1: native share sheet — keep text and url separate
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const payload: ShareData = shareUrl ? { text, url: shareUrl } : { text };
      await navigator.share(payload);
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "error";
      // fall through to Tier 2
    }
  }

  // Tier 2: SMS composer on mobile
  if (isMobile()) {
    try {
      const body = encodeURIComponent(fullText);
      window.location.href = `sms:?&body=${body}`;
      // Give the navigation a moment to commit before resolving
      await new Promise((resolve) => setTimeout(resolve, 120));
      return "shared";
    } catch {
      // fall through to Tier 3
    }
  }

  // Tier 3: clipboard
  try {
    await navigator.clipboard.writeText(fullText);
    return "copied";
  } catch {
    return "error";
  }
}
```

### 2. Admin Preview — no changes needed

`QASharePreviews.tsx`, `AdminPreview.tsx`, and `PreviewModeContext.tsx` do not gate share. Once Tier 2/3 land, every preview button automatically gets the cascade.

### 3. Callers — already routed through `executeShare`

No further refactors. All callers from the previous standardization pass keep working unchanged.

### 4. Memory update

Append to `mem://features/share-system.md`:
> `executeShare` is a 3-tier cascade: native share → `sms:?&body=` on mobile → clipboard.
> - Native share keeps `text` and `url` separate (no URL inlined into text).
> - SMS/clipboard use a combined `text\nurl` string.
> - SMS path awaits ~120ms after assigning `location.href` before resolving.
> - AbortError from native share is terminal — no fallback fires.
> - Admin Preview uses the same pipeline; no preview-specific branch.

## Edge cases

| Environment | Tier | Result |
|---|---|---|
| Desktop Chrome/Firefox | 3 | Clipboard with full `text\nurl` |
| Desktop Safari (macOS 13+) | 1 | Native sheet, text + url separate |
| iOS Safari / PWA | 1 | iOS share sheet (Messages, Mail, AirDrop) |
| Android Chrome / PWA | 1 | Android share sheet |
| Mobile webview without `navigator.share` | 2 | SMS composer pre-filled with `text\nurl` |
| User cancels native sheet | 1 (AbortError) | Returns `"error"`, no fallback |
| Admin Preview, any device | Same as above | Real share fires with mock text |

## Out of scope

- `useSolveShareCard.ts` and `MilestoneShareCard.tsx` (image-blob `navigator.share({ files })`, unchanged).
- Toast strings/labels in callers.
- Analytics on which tier fired.
- URL shortening.

## Verification

1. Desktop Chrome on `/admin-preview` → clipboard receives `text + "\n" + url`.
2. iOS Safari → native sheet shows separate preview/url; iMessage shows nice link card.
3. Android Chrome PWA → native sheet.
4. Hypothetical mobile browser without `navigator.share` → SMS composer opens; caller's "shared" toast does not flash before navigation.
5. User cancels native sheet → no fallback toast, no SMS opened.
6. Admin Preview share buttons fire the real cascade.

