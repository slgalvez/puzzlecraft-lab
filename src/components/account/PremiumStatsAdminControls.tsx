/**
 * PremiumStatsAdminControls.tsx
 * Admin-only demo data controls. Import ONLY in AdminPreview.
 */
import { useState } from "react";
import { generateDemoSolves, clearDemoSolves, hasDemoData } from "@/lib/demoStats";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2 } from "lucide-react";

export function PremiumStatsAdminControls({ onRefresh }: { onRefresh?: () => void }) {
  const [demoActive, setDemoActive] = useState(hasDemoData());

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!demoActive ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            generateDemoSolves(25);
            setDemoActive(true);
            onRefresh?.();
          }}
          className="gap-1.5 text-xs"
        >
          <Sparkles size={12} />
          Generate Stats Demo
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            clearDemoSolves();
            setDemoActive(false);
            onRefresh?.();
          }}
          className="gap-1.5 text-xs text-destructive"
        >
          <Trash2 size={12} />
          Clear Demo Data
        </Button>
      )}
    </div>
  );
}
