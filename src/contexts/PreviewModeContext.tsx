/**
 * QA Preview Mode — admin-only, session-scoped context.
 *
 * Holds in-memory mock state so admins can inspect any UI variant
 * (calendar, friends, messaging, share previews) without solving real
 * puzzles, generating real activity, or contaminating localStorage / DB.
 *
 * Strict isolation: when `active`, components MUST read exclusively from
 * `previewProfile` — never merge with real data sources.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Eye, RotateCcw, X, Crown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import {
  buildCalendarFixture, buildFriendsFixture,
  type PreviewScenario, type CalendarFixture, type FriendsFixture, type FriendsVariant,
} from "@/lib/previewFixtures";

export interface PreviewProfile {
  active: boolean;
  isPlus: boolean;
  scenario: PreviewScenario;
  friendsVariant: FriendsVariant;
  calendar: CalendarFixture;
  friends: FriendsFixture;
}

interface PreviewModeContextValue {
  active: boolean;
  isPlus: boolean;
  scenario: PreviewScenario;
  friendsVariant: FriendsVariant;
  profile: PreviewProfile;

  enterPreview: (scenario?: PreviewScenario) => void;
  exitPreview: () => void;
  togglePlus: () => void;
  setIsPlus: (v: boolean) => void;
  setScenario: (s: PreviewScenario) => void;
  setFriendsVariant: (v: FriendsVariant) => void;
  resetPreview: () => void;
}

const NEUTRAL: PreviewProfile = {
  active: false,
  isPlus: false,
  scenario: "none",
  friendsVariant: "empty",
  calendar: { completions: [], solves: [], dailyData: {}, craftDates: [] },
  friends: { friends: [], daily: [], activity: [] },
};

const PreviewModeContext = createContext<PreviewModeContextValue>({
  ...NEUTRAL,
  profile: NEUTRAL,
  enterPreview: () => {},
  exitPreview: () => {},
  togglePlus: () => {},
  setIsPlus: () => {},
  setScenario: () => {},
  setFriendsVariant: () => {},
  resetPreview: () => {},
});

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}

export function PreviewModeProvider({ children }: { children: ReactNode }) {
  const { account } = useUserAccount();
  const isAdmin = !!account?.isAdmin;

  const [active, setActive] = useState(false);
  const [isPlus, setIsPlusState] = useState(false);
  const [scenario, setScenarioState] = useState<PreviewScenario>("none");
  const [friendsVariant, setFriendsVariantState] = useState<FriendsVariant>("populated");

  // Recompute fixtures only when scenario / variant changes
  const calendar = useMemo(() => buildCalendarFixture(scenario), [scenario]);
  const friends = useMemo(() => buildFriendsFixture(friendsVariant), [friendsVariant]);

  const profile = useMemo<PreviewProfile>(() => ({
    active, isPlus, scenario, friendsVariant, calendar, friends,
  }), [active, isPlus, scenario, friendsVariant, calendar, friends]);

  const enterPreview = useCallback((s: PreviewScenario = "mixed") => {
    if (!isAdmin) return;
    setScenarioState(s);
    setActive(true);
  }, [isAdmin]);

  const exitPreview = useCallback(() => {
    setActive(false);
    setScenarioState("none");
    setFriendsVariantState("empty");
    setIsPlusState(false);
  }, []);

  const togglePlus = useCallback(() => setIsPlusState((v) => !v), []);
  const setIsPlus = useCallback((v: boolean) => setIsPlusState(v), []);
  const setScenario = useCallback((s: PreviewScenario) => {
    if (!isAdmin) return;
    setScenarioState(s);
  }, [isAdmin]);
  const setFriendsVariant = useCallback((v: FriendsVariant) => {
    if (!isAdmin) return;
    setFriendsVariantState(v);
  }, [isAdmin]);

  /** Clear all injected data → neutral baseline. Stays in preview mode. */
  const resetPreview = useCallback(() => {
    if (!isAdmin) return;
    setScenarioState("none");
    setFriendsVariantState("empty");
  }, [isAdmin]);

  // Non-admins always get an inert provider
  const value: PreviewModeContextValue = isAdmin
    ? {
        active, isPlus, scenario, friendsVariant, profile,
        enterPreview, exitPreview, togglePlus, setIsPlus,
        setScenario, setFriendsVariant, resetPreview,
      }
    : {
        ...NEUTRAL, profile: NEUTRAL,
        enterPreview: () => {}, exitPreview: () => {},
        togglePlus: () => {}, setIsPlus: () => {},
        setScenario: () => {}, setFriendsVariant: () => {},
        resetPreview: () => {},
      };

  return (
    <PreviewModeContext.Provider value={value}>
      {isAdmin && active && <PreviewBanner />}
      {children}
    </PreviewModeContext.Provider>
  );
}

/* ── Sticky banner ── */

const SCENARIO_LABEL: Record<PreviewScenario, string> = {
  "none": "No activity",
  "partial": "Partial activity",
  "full": "Full activity",
  "daily-only": "Daily only",
  "quickplay-only": "Quick-play only",
  "craft-only": "Craft only",
  "mixed": "Mixed activity",
};

function PreviewBanner() {
  const { isPlus, scenario, exitPreview, resetPreview, togglePlus } = usePreviewMode();

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-primary/95 px-3 py-1.5 text-primary-foreground shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 min-w-0">
        <Eye size={13} className="shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">QA Preview</span>
        <span className="text-[10px] opacity-80 hidden sm:inline">·</span>
        <button
          onClick={togglePlus}
          className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-primary-foreground/15 px-2 py-0.5 hover:bg-primary-foreground/25 transition-colors"
        >
          {isPlus && <Crown size={9} />} {isPlus ? "Plus" : "Free"}
        </button>
        <span className="text-[10px] opacity-80 hidden sm:inline">·</span>
        <span className="text-[10px] opacity-90 truncate">{SCENARIO_LABEL[scenario]}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          to="/admin-preview"
          className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] font-semibold hover:bg-primary-foreground/20 transition-colors"
        >
          <ExternalLink size={10} /> QA Hub
        </Link>
        <button
          onClick={resetPreview}
          className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] font-semibold hover:bg-primary-foreground/20 transition-colors"
          title="Clear injected data, stay in preview"
        >
          <RotateCcw size={10} /> Reset
        </button>
        <button
          onClick={exitPreview}
          className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-[10px] font-semibold hover:bg-primary-foreground/20 transition-colors"
        >
          <X size={10} /> Exit
        </button>
      </div>
    </div>
  );
}
