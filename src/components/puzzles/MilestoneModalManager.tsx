/**
 * useMilestoneModal
 *
 * Bridges the existing milestone system (checkMilestones, getUncelebratedIds,
 * markCelebrated) to the new MilestoneModal component.
 *
 * How it works:
 * - Overrides the default sonner toast behaviour in checkMilestones by
 *   polling for uncelebrated milestone IDs after every solve.
 * - When new uncelebrated IDs appear, opens the modal.
 * - On dismiss, marks them as celebrated so the modal never re-fires.
 *
 * Usage: mount <MilestoneModalManager /> once inside PublicRoutes in App.tsx.
 * It renders nothing until a milestone fires, then renders the modal.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getUncelebratedIds,
  markCelebrated,
  getAllMilestones,
  type MilestoneIcon,
} from "@/lib/milestones";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";

// ── Manager component — mount once in App.tsx ─────────────────────────────

export function MilestoneModalManager() {
  const [queue, setQueue] = useState<MilestoneToShow[]>([]);

  const checkForNew = useCallback(() => {
    const uncelebrated = getUncelebratedIds();
    if (uncelebrated.size === 0) return;

    const allMilestones = getAllMilestones();
    const toShow: MilestoneToShow[] = allMilestones
      .filter((m) => m.state === "achieved" && uncelebrated.has(m.id))
      .map((m) => ({ id: m.id, label: m.label, icon: m.icon as MilestoneIcon }));

    if (toShow.length > 0) {
      setQueue(toShow);
    }
  }, []);

  // Poll every 2s — lightweight since it's just reading localStorage
  useEffect(() => {
    checkForNew();
    const interval = setInterval(checkForNew, 2000);
    return () => clearInterval(interval);
  }, [checkForNew]);

  const handleDismiss = useCallback(() => {
    const ids = queue.map((m) => m.id);
    markCelebrated(ids);
    setQueue([]);
  }, [queue]);

  if (queue.length === 0) return null;

  return <MilestoneModal milestones={queue} onDismiss={handleDismiss} />;
}
