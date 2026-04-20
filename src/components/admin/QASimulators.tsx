/**
 * QASimulators — admin-only component triggers that mount real production
 * components (CompletionPanel, DailyPostSolve, CompletionSheet, MilestoneModal)
 * with mock fixture data. No DB writes, no localStorage mutations occur because
 * we render in isolated overlay portals and never call recordSolve / etc.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Wand2, Trophy, X } from "lucide-react";
import { PreviewLabel } from "@/components/admin/PreviewLabel";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import { CompletionSheet } from "@/components/puzzles/CompletionSheet";
import DailyPostSolve from "@/components/daily/DailyPostSolve";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";
import { localDateStr } from "@/lib/calendarActivity";

type SimKind = null | "completion" | "daily" | "craft" | "milestone";

const MOCK_MILESTONES: MilestoneToShow[] = [
  { id: "streak-7", label: "7-Day Streak", icon: "flame" },
  { id: "solves-50", label: "50 Puzzles Solved", icon: "trophy" },
];

export default function QASimulators() {
  const [active, setActive] = useState<SimKind>(null);
  const today = localDateStr(new Date());

  const close = () => setActive(null);

  return (
    <section className="rounded-xl border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Sparkles size={11} className="text-primary" /> Easy-complete simulators
        </h3>
        <PreviewLabel alwaysShow label="Mock State" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Open production completion components with mock data. No persistence.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="justify-start h-9 text-xs gap-1.5"
          onClick={() => setActive("completion")}>
          <Sparkles size={12} /> Puzzle solved
        </Button>
        <Button size="sm" variant="outline" className="justify-start h-9 text-xs gap-1.5"
          onClick={() => setActive("daily")}>
          <Calendar size={12} /> Daily completed
        </Button>
        <Button size="sm" variant="outline" className="justify-start h-9 text-xs gap-1.5"
          onClick={() => setActive("craft")}>
          <Wand2 size={12} /> Craft solved
        </Button>
        <Button size="sm" variant="outline" className="justify-start h-9 text-xs gap-1.5"
          onClick={() => setActive("milestone")}>
          <Trophy size={12} /> Milestone unlocked
        </Button>
      </div>

      {/* ── Puzzle solved → CompletionPanel inside framed overlay ── */}
      {active === "completion" && (
        <SimOverlay onClose={close} title="CompletionPanel preview">
          <CompletionPanel
            time={184}
            difficulty="medium"
            category="crossword"
            seed={42}
            accuracy={0.97}
            assisted={false}
            hintsUsed={0}
            mistakesCount={1}
            onPlayAgain={close}
          />
        </SimOverlay>
      )}

      {/* ── Daily completed → DailyPostSolve ── */}
      {active === "daily" && (
        <SimOverlay onClose={close} title="DailyPostSolve preview">
          <DailyPostSolve
            solveTime={201}
            dateStr={today}
            displayDate={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            category="crossword"
            difficulty="medium"
            streakCount={7}
            isNew
          />
        </SimOverlay>
      )}

      {/* ── Craft solved → CompletionSheet (real bottom-sheet) ── */}
      {active === "craft" && (
        <CompletionSheet
          open
          time={222}
          difficulty="medium"
          category="word-search"
          accuracy={1}
          assisted={false}
          hintsUsed={0}
          mistakesCount={0}
          onPlayAgain={close}
        />
      )}

      {/* ── Milestone modal ── */}
      {active === "milestone" && (
        <MilestoneModal milestones={MOCK_MILESTONES} onDismiss={close} />
      )}
    </section>
  );
}

/* ── Reusable framed overlay for non-modal components ── */
function SimOverlay({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-border/40 bg-background rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{title}</span>
            <PreviewLabel alwaysShow label="Mock" />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
