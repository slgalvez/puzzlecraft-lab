/**
 * QASharePreviews — renders all share text builders side-by-side using
 * fixture variations. Each card shows the formatted output, char count,
 * and copy/share buttons. Non-mutating — uses real builders only.
 */
import { useMemo, useState } from "react";
import { Share2, Copy, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewLabel } from "@/components/admin/PreviewLabel";
import { cn } from "@/lib/utils";
import {
  buildCompletionShareText, buildDailyShareText, buildCraftShareText,
  executeShare,
} from "@/lib/shareUtils";
import { buildSolveResultShareText } from "@/lib/craftShare";
import { buildShareVariations, type ShareVariation } from "@/lib/previewFixtures";

interface Props {
  /** Optional callback so parent can mirror a share text into the messaging preview. */
  onSendToMessages?: (text: string) => void;
}

function renderVariation(v: ShareVariation): string {
  try {
    if (v.builder === "completion") {
      return buildCompletionShareText(v.params as unknown as Parameters<typeof buildCompletionShareText>[0]).text;
    }
    if (v.builder === "daily") {
      return buildDailyShareText(v.params as unknown as Parameters<typeof buildDailyShareText>[0]);
    }
    if (v.builder === "craft") {
      return buildCraftShareText(v.params as unknown as Parameters<typeof buildCraftShareText>[0]);
    }
    if (v.builder === "solve-result") {
      const p = v.params as { title?: string; type?: string; solveTime?: number; creatorSolveTime?: number | null; url?: string };
      return buildSolveResultShareText(p.title, p.type as never, p.solveTime, p.creatorSolveTime, p.url);
    }
  } catch (e) {
    return `⚠ Render failed: ${(e as Error).message}`;
  }
  return "";
}

export default function QASharePreviews({ onSendToMessages }: Props) {
  const variations = useMemo(() => buildShareVariations(), []);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch { /* noop */ }
  };

  const handleShare = async (text: string) => {
    await executeShare(text);
  };

  return (
    <section className="rounded-xl border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Share2 size={11} className="text-primary" /> Share previews
        </h3>
        <PreviewLabel alwaysShow label="Mock State" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        All four share builders rendered with fixture data. Use copy / share / send-to-messages to verify output.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {variations.map((v) => {
          const text = renderVariation(v);
          const copied = copiedId === v.id;
          return (
            <div key={v.id} className="rounded-lg border border-border/40 bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{v.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{v.description}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-mono tabular-nums",
                  text.length > 280 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                )}>
                  {text.length}/280
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words text-[11px] leading-snug bg-muted/40 rounded p-2 max-h-32 overflow-y-auto font-sans">
                {text}
              </pre>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1 flex-1"
                  onClick={() => handleCopy(v.id, text)}>
                  {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1 flex-1"
                  onClick={() => handleShare(text)}>
                  <Share2 size={10} /> Share
                </Button>
                {onSendToMessages && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1 flex-1"
                    onClick={() => onSendToMessages(text)}
                    title="Render this share text inside the messaging preview below">
                    <MessageSquare size={10} /> Send
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
