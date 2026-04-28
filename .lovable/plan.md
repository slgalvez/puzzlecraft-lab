# Puzzlecraft+ Pre-TestFlight UX Fixes (Approved + 2 Safeguards)

Six small, surgical fixes plus two reliability safeguards. No backend, no Stripe, no logic rewrites.

## 1. Fix misleading "Check your email" after signup
**File:** `src/pages/Account.tsx` (lines 361–384)
- Drop the `signupSuccess` state branch entirely.
- After successful `signUp`, set `tab = "login"`, prefill the email field, and fire `toast.success("Account created — you can sign in now")`.

## 2. Success toast after Stripe checkout (with safeguards)
**File:** `src/pages/Account.tsx` (signed-in branch)
- Add `useEffect` reading `window.location.search` for `?subscribed=1`.
- **Safeguard A (no replay):** guard the toast with `sessionStorage`:
  ```ts
  if (!sessionStorage.getItem("subscribed_toast_shown")) {
    toast.success("You're now a Puzzlecraft+ member 🎉");
    sessionStorage.setItem("subscribed_toast_shown", "1");
  }
  ```
- **Safeguard B (settle delay):** wrap the refresh call:
  ```ts
  setTimeout(() => { refreshSubscription(); }, 800);
  ```
- After the effect fires, strip the param via `window.history.replaceState({}, "", "/account")`.

## 3. Remove false "error" state during Stripe redirect
**File:** `src/hooks/useSubscription.ts` (line 187)
- Inside the `platform === "stripe"` branch, remove `setResult("error")` after `openStripeCheckout(...)`.
- Leave `result` as `"idle"`. The `try/catch` still sets `"error"` on real failure.

## 4. Distinguish Simulated vs Real Plus
**A. Account page — `src/pages/Account.tsx` (line ~196 Plus card)**
- Read `usePreviewMode()`. When `preview.active && preview.isPlus` and the user is NOT a real subscriber (no Stripe / admin_grant source), show the card with badge "Simulated Plus (Admin)" and a dashed amber border.
- Real subscribers and real admin grants keep the existing "Active" / "Admin" badge unchanged.

**B. Preview banner — `src/contexts/PreviewModeContext.tsx` (line ~166)**
- Change the pill label from `"Plus"` → `"Simulated Plus"` when `isPlus` is true.
- Style it with amber background tint so it's never confused with real entitlement.

## 5. Confirm simulation never persists
- Already true in `PreviewModeContext` (state is only React `useState`, no localStorage, no DB writes).
- Add a brief contract comment at the top of `PreviewModeContext.tsx` documenting: "MUST never persist to localStorage or DB. Simulated state resets on refresh and on exitPreview()."

## 6. Clean up `?subscribed=1` URL
- Handled in #2 via `window.history.replaceState`.

## Files changed
- `src/pages/Account.tsx` — signup flow, success toast/effect with sessionStorage guard + 800ms refresh delay, simulated-Plus label
- `src/hooks/useSubscription.ts` — drop bogus `setResult("error")`
- `src/contexts/PreviewModeContext.tsx` — banner label "Simulated Plus" + amber styling + contract comment

## Verification
- Sign up → no "check your email"; lands on Sign In tab with email prefilled and success toast.
- Stripe success → `/account?subscribed=1` shows toast once, URL becomes `/account`, Plus card flips after ~800ms.
- Navigating back to `/account` in same session → no duplicate toast.
- Slow Stripe redirect on web → no error flash.
- Admin in Preview Mode with Plus on → banner pill reads "Simulated Plus" in amber; Account card (when shown) reads "Simulated Plus (Admin)".
- Refresh → simulation gone.
- No `user_profiles` mutation during any of the above.
