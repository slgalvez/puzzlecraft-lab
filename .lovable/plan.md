

# Universal Share Button Standardization

## Summary
Create a single `ShareButton` component using Lucide's `Upload` icon (square + upward arrow, iMessage-style). Replace all share triggers across the app to use it, routing through the unified `executeShare()` handler. No layout redesign — only icon + handler standardization.

## New file

### `src/components/ui/ShareButton.tsx`
Reusable share button. Wraps the existing `Button` component for consistent variants/sizes.

```tsx
import { forwardRef } from "react";
import { Upload, CheckCheck, RefreshCw } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareButtonProps extends Omit<ButtonProps, "children"> {
  label?: string;            // omit for icon-only
  onShare: () => void | Promise<void>;
  busy?: boolean;            // shows spinner
  copied?: boolean;          // shows checkmark + "Copied"
  iconSize?: number;         // default 18 (h-[18px])
}

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
  ({ label, onShare, busy, copied, iconSize = 18, className, variant, size, ...rest }, ref) => {
    const Icon = busy ? RefreshCw : copied ? CheckCheck : Upload;
    const isIconOnly = !label;
    return (
      <Button
        ref={ref}
        variant={variant}
        size={isIconOnly ? (size ?? "icon") : size}
        onClick={() => { if (!busy) void onShare(); }}
        disabled={busy || rest.disabled}
        aria-label={label ?? "Share"}
        className={cn("gap-1.5", className)}
        {...rest}
      >
        <Icon className={cn(busy && "animate-spin")} style={{ width: iconSize, height: iconSize }} />
        {label && <span>{busy ? "Preparing…" : copied ? "Copied" : label}</span>}
      </Button>
    );
  }
);
ShareButton.displayName = "ShareButton";
```

## Replacements (all routed through `executeShare` already in place)

| File | Current | After |
|------|---------|-------|
| `src/components/puzzles/CompletionPanel.tsx` | `<Share>` / `<ImageIcon>` swap, two button blocks | `<ShareButton label="Share Your Record" busy={sharing} copied={copied} onShare={handleShare} />` (prominent) and `<ShareButton variant="outline" label="Share" ... />` (inline) |
| `src/pages/DailyPuzzle.tsx` | `<Share size={14} />` + manual button | `<ShareButton variant="outline" size="sm" label="Share" onShare={handleShareCompletion} />` (extract inline handler into a memoized callback) |
| `src/components/daily/DailyPostSolve.tsx` | `<Share size={13} /> Share result` + custom `handleShare` using `navigator.share` | Refactor `handleShare` to call `executeShare(text)` from `shareUtils`, replace button with `<ShareButton variant="outline" size="sm" label="Share result" onShare={handleShare} />` |
| `src/pages/CraftPuzzle.tsx` (line 1020) | `<Share /> Send Puzzle` | `<ShareButton label="Send Puzzle" onShare={handleShare} className="w-full" />` |
| `src/pages/CraftPreviewPage.tsx` (line 758) | `<Share /> Send Puzzle` + `navigator.share` directly | Update `handleShare` to call `executeShare(shareText)` from `shareUtils` (remove direct `navigator.share`), replace button with `<ShareButton label="Send Puzzle" onShare={handleShare} className="w-full" />` |
| `src/pages/SharedCraftPuzzle.tsx` (line 580) | `<Share size={16} /> Share Your Result` + custom `handleShareResult` using `navigator.share` | Refactor `handleShareResult` to call `executeShare(text)` from `shareUtils`, replace button with `<ShareButton label="Share Your Result" copied={copied} onShare={handleShareResult} className="w-full rounded-xl h-12 font-semibold" />` |
| `src/components/puzzles/MilestoneModal.tsx` (line 223) | `<Share2 size={15} /> Share` (custom `<button>`) | `<ShareButton variant="outline" label={sharing ? "..." : "Share"} busy={sharing} onShare={() => generateAndShare(...)} className="rounded-2xl px-4 py-3" />` — keeps existing visual treatment |
| `src/components/admin/QASharePreviews.tsx` (line 100) | `<Share2 size={10} /> Share` | `<ShareButton variant="ghost" size="sm" label="Share" iconSize={12} onShare={() => handleShare(text)} className="h-7 px-2 text-[10px] flex-1" />` |

## Style rules

- **Icon**: `Upload` from `lucide-react`. Default `18px`; small contexts override to `12-14px`.
- **Variants preserved**: `default` (primary CTA), `outline` (secondary), `ghost` (compact rows).
- **Modes**:
  - Icon-only: omit `label` prop → renders `size="icon"` (h-10 w-10) by default.
  - Icon + label: pass `label` → renders normal button with icon + text.
- **No new colors** — inherits from existing `Button` variants.

## Behavior contract

- Every share button calls `executeShare(text, url?)` from `src/lib/shareUtils.ts`.
- Removes direct `navigator.share` / `navigator.clipboard` calls in:
  - `DailyPostSolve.tsx`
  - `CraftPreviewPage.tsx`
  - `SharedCraftPuzzle.tsx`
- Toasts/copied-state remain in caller via `executeShare` return value (`"shared" | "copied" | "error"`).
- `CompletionPanel`'s special "share-with-image-card" path (via `useSolveShareCard`) is preserved — `ShareButton` just renders the trigger; the handler still tries the visual card first, then falls back to `executeShare`.

## Out of scope

- `MilestoneShareCard.tsx` and `useSolveShareCard.ts` internals (they generate image blobs and call `navigator.share({ files })` — different API surface; unchanged).
- Replacing the `Share2` icon usage in `About.tsx` (decorative section icon, not an action).
- Layout/sizing changes beyond icon swap.
- New share destinations.

## Verification

1. Every share trigger uses `<ShareButton>` and `Upload` icon.
2. No remaining `Share` / `Share2` Lucide imports in action buttons (only decorative usage in `About.tsx`).
3. No direct `navigator.share` calls outside `shareUtils.ts`, `useSolveShareCard.ts`, and `MilestoneShareCard.tsx`.
4. CompletionPanel PB → image card path still works on native; falls back to text share elsewhere.
5. Visual parity: existing button widths, variants, and toast behavior unchanged.

