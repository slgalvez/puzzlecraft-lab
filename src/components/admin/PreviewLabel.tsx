/**
 * Inline "Preview Data" pill rendered inside key components when QA preview
 * mode is active. Acts as a defense-in-depth indicator alongside the global
 * sticky banner — critical for screenshots/QA reports where the banner may
 * be cropped out.
 *
 * Renders nothing when preview is inactive (admin-gated context returns false).
 */
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface PreviewLabelProps {
  /** Override label text. Defaults to "Preview Data". */
  label?: string;
  /** Force-show even when preview is inactive (used in AdminPreview hub previews). */
  alwaysShow?: boolean;
  className?: string;
}

export function PreviewLabel({ label = "Preview Data", alwaysShow = false, className }: PreviewLabelProps) {
  const { active } = usePreviewMode();
  if (!active && !alwaysShow) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "text-[9px] font-semibold uppercase tracking-wider",
        "bg-primary/10 text-primary border border-primary/20",
        className,
      )}
    >
      <Eye size={9} className="opacity-80" />
      {label}
    </span>
  );
}

export default PreviewLabel;
