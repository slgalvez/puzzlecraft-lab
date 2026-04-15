/**
 * CraftSharePreview — shows creators what recipients will see
 * as an iMessage-style bubble preview before they tap "Send".
 */

import { buildCraftShareText } from "@/lib/shareText";

interface Props {
  title?: string;
  from?: string;
  url?: string;
  type?: string;
  creatorSolveTime?: number | null;
}

export function CraftSharePreview({ title, from, url, type, creatorSolveTime }: Props) {
  const text = buildCraftShareText({ title, from, url, type, creatorSolveTime });

  if (!text) return null;

  return (
    <div className="mb-4">
      <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
        What they'll see
      </p>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground text-sm whitespace-pre-line leading-relaxed shadow-sm">
          {text}
        </div>
      </div>
    </div>
  );
}
