/**
 * ShareButton — Universal share button for the entire app.
 *
 * Uses Lucide's `Upload` icon (square + upward arrow, iMessage-style).
 * Wraps the existing `Button` so all variants/sizes are inherited.
 *
 * Modes:
 *   - Icon-only:    omit `label`  → renders `size="icon"` by default
 *   - Icon + label: pass `label`  → renders normal button with icon + text
 *
 * States:
 *   - busy={true}   → spinner + "Preparing…"
 *   - copied={true} → check icon + "Copied"
 *
 * All callers should route their share action through `executeShare()`
 * from `@/lib/shareUtils`. This component intentionally does NOT call
 * any share API itself — it just renders the trigger.
 */
import { forwardRef } from "react";
import { Upload, CheckCheck, RefreshCw } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  /** Omit for icon-only mode. Pass a string for icon + label mode. */
  label?: string;
  /** Handler invoked on click. Should call `executeShare(...)` internally. */
  onShare: () => void | Promise<void>;
  /** Show spinner + "Preparing…" text */
  busy?: boolean;
  /** Show check icon + "Copied" text */
  copied?: boolean;
  /** Icon pixel size. Default 18; small contexts can use 12-14. */
  iconSize?: number;
}

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
  (
    { label, onShare, busy, copied, iconSize = 18, className, variant, size, disabled, ...rest },
    ref,
  ) => {
    const Icon = busy ? RefreshCw : copied ? CheckCheck : Upload;
    const isIconOnly = !label;
    return (
      <Button
        ref={ref}
        variant={variant}
        size={isIconOnly ? (size ?? "icon") : size}
        onClick={() => {
          if (busy) return;
          void onShare();
        }}
        disabled={busy || disabled}
        aria-label={label ?? "Share"}
        className={cn("gap-1.5", className)}
        {...rest}
      >
        <Icon
          className={cn(busy && "animate-spin")}
          style={{ width: iconSize, height: iconSize }}
        />
        {label && <span>{busy ? "Preparing…" : copied ? "Copied" : label}</span>}
      </Button>
    );
  },
);
ShareButton.displayName = "ShareButton";
