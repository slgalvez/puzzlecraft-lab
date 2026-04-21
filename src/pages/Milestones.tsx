/**
 * Milestones.tsx — /milestones
 *
 * Thin wrapper around the shared <MilestonesSection /> component used inside
 * Stats. This page renders the full version (with "Coming Up" locked list)
 * plus a heading + total achieved counter. The milestone redesign now lives
 * primarily inside Stats; this page remains as an optional drill-down.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { getAllMilestones } from "@/lib/milestones";
import { Button } from "@/components/ui/button";
import { MilestonesSection } from "@/components/stats/MilestonesSection";

export default function Milestones() {
  const navigate = useNavigate();

  const allMilestones    = useMemo(() => getAllMilestones(), []);
  const totalAchieved    = allMilestones.filter((m) => m.state === "achieved").length;
  const totalCount       = allMilestones.length;

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl">
        <div className="mb-1">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Milestones
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {totalAchieved === 0
            ? "Every milestone you earn is part of who you are here."
            : totalAchieved === totalCount
              ? "You've done everything. That's all of them."
              : `${totalAchieved} of ${totalCount} earned.`}
        </p>

        <MilestonesSection />

        {totalAchieved === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border/60 p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Start earning</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Solve your first puzzle to unlock "First Crack." Every milestone after that builds from there.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/daily")}>
              Play today's challenge
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
