import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { trackNavigation } from "@/lib/navigation";
import { pruneStaleProgress } from "@/lib/puzzleProgress";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import PuzzleLibrary from "./pages/PuzzleLibrary";
import PuzzleGenerator from "./pages/PuzzleGenerator";
import DailyPuzzle from "./pages/DailyPuzzle";
import PlayPuzzle from "./pages/PlayPuzzle";
import QuickPlay from "./pages/QuickPlay";
import SurprisePlay from "./pages/SurprisePlay";
import SharedPuzzle from "./pages/SharedPuzzle";
import About from "./pages/About";
import Help from "./pages/Help";
import Stats from "./pages/Stats";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import CraftPuzzle from "./pages/CraftPuzzle";
import PlayCraftPuzzle from "./pages/PlayCraftPuzzle";
import SharedCraftPuzzle from "./pages/SharedCraftPuzzle";
import Account from "./pages/Account";
import AdminPreview from "./pages/AdminPreview";
import CraftPreviewPage from "./pages/CraftPreviewPage";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminViewAsStats from "./pages/AdminViewAsStats";
import AdminHomepagePreview from "./pages/AdminHomepagePreview";
import AdminPremiumEmails from "./pages/AdminPremiumEmails";
import Milestones from "./pages/Milestones";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { UserAccountProvider } from "./contexts/UserAccountContext";
import { ViewAsUserProvider } from "./contexts/ViewAsUserContext";
import { PreviewModeProvider } from "./contexts/PreviewModeContext";
import DataMergeModal from "./components/account/DataMergeModal";
import { MilestoneModalManager } from "./components/puzzles/MilestoneModalManager";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useRatingSync } from "@/hooks/useRatingSync";
// Private app — completely separate auth system (custom JWT, separate DB tables)
import { isNativeApp } from "./lib/appMode";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/private/PrivateRoute";
import Login from "./pages/private/Login";
import PrivateHome from "./pages/private/PrivateHome";
import AdminConversationView from "./pages/private/AdminConversationView";
import AdminConversations from "./pages/private/AdminConversations";
import AdminUsers from "./pages/private/AdminUsers";
import AdminFailedLogins from "./pages/private/AdminFailedLogins";
import UserConversation from "./pages/private/UserConversation";
import PrivateSettings from "./pages/private/PrivateSettings";
import ForYou from "./pages/private/ForYou";
import LocationView from "./pages/private/LocationView";

const queryClient = new QueryClient();
pruneStaleProgress();

function NavigationTracker() {
  const location = useLocation();
  useEffect(() => { trackNavigation(); }, [location.pathname]);
  return null;
}

/*
 * ──────────────────────────────────────────────────────────────
 * Mounts global background hooks that need to live above all routes.
 * Renders nothing — purely side-effects.
 * ──────────────────────────────────────────────────────────────
 */
function GlobalHooks() {
  // Syncs the player's computed rating to Supabase after every solve,
  // and restores it on reinstall/new device from Supabase.
  useRatingSync();
  return null;
}

/*
 * ──────────────────────────────────────────────────────────────
 * AUTH ISOLATION — Two completely independent authentication systems:
 *
 * 1. MAIN ACCOUNT (UserAccountProvider)
 *    - Supabase Auth (email/password)
 *    - Tables: user_profiles, user_progress
 *    - localStorage: puzzlecraft-* keys
 *    - Routes: /account and all public puzzle routes
 *
 * 2. SECRET SYSTEM (AuthProvider)
 *    - Custom JWT via private-login edge function
 *    - Tables: authorized_users, profiles, conversations, messages
 *    - localStorage: private_session, private_last_active
 *    - sessionStorage: private_access_grant
 *    - Routes: /p/*
 *
 * These systems share NO sessions, tokens, user IDs, or data.
 * Each provider is scoped to its own route group below.
 * ──────────────────────────────────────────────────────────────
 */

/** Wraps public routes with the main account system */
function PublicRoutes() {
  const { onboardingComplete, completeOnboarding } = useOnboarding();
  const native = isNativeApp();

  // If this is a shared craft puzzle link (/s/:id), skip onboarding entirely.
  // The recipient came from a friend's share — that IS their first experience.
  // Marking onboarding complete so they don't see it when they open the app properly.
  const isShareLink = window.location.pathname.startsWith("/s/");
  if (isShareLink && !onboardingComplete) {
    completeOnboarding();
  }

  // Onboarding only shows inside the native iOS/Android app shell
  if (native && !onboardingComplete && !isShareLink) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <UserAccountProvider>
      <ViewAsUserProvider>
        <PreviewModeProvider>
          <GlobalHooks />
          <DataMergeModal />
          {/* Global milestone celebration modal — fires after any solve */}
          <MilestoneModalManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/puzzles" element={<PuzzleLibrary />} />
            <Route path="/generate" element={<PuzzleGenerator />} />
            <Route path="/generate/:type" element={<PuzzleGenerator />} />
            <Route path="/daily" element={<DailyPuzzle />} />
            <Route path="/play/:id" element={<PlayPuzzle />} />
            <Route path="/play" element={<SharedPuzzle />} />
            <Route path="/quick-play/:type" element={<QuickPlay />} />
            <Route path="/surprise" element={<SurprisePlay />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/milestones" element={<Milestones />} />
            <Route path="/craft" element={<CraftPuzzle />} />
            <Route path="/craft/play" element={<PlayCraftPuzzle />} />
            <Route path="/s/:id" element={<SharedCraftPuzzle />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin-preview" element={<AdminPreview />} />
            {/* /craft-v2 — admin alias for the live craft experience (production page) */}
            <Route path="/craft-v2" element={<CraftPreviewPage />} />
            <Route path="/admin-preview/homepage" element={<AdminHomepagePreview />} />
             <Route path="/admin/premium-emails" element={<AdminPremiumEmails />} />
             <Route path="/admin-analytics" element={<AdminAnalytics />} />
             <Route path="/admin-view-as-stats" element={<AdminViewAsStats />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </PreviewModeProvider>
      </ViewAsUserProvider>
    </UserAccountProvider>
  );
}

/** Wraps private routes with the secret auth system */
function PrivateRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="" element={<PrivateRoute><PrivateHome /></PrivateRoute>} />
        <Route path="conversations" element={<PrivateRoute><AdminConversations /></PrivateRoute>} />
        <Route path="conversation" element={<PrivateRoute><UserConversation /></PrivateRoute>} />
        <Route path="conversation/:conversationId" element={<PrivateRoute><AdminConversationView /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
        <Route path="failed-logins" element={<PrivateRoute><AdminFailedLogins /></PrivateRoute>} />
        <Route path="for-you" element={<PrivateRoute><ForYou /></PrivateRoute>} />
        <Route path="location" element={<PrivateRoute><LocationView /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute><PrivateSettings /></PrivateRoute>} />
      </Routes>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavigationTracker />
        <ScrollToTop />
        <Routes>
          {/* Main account system — public puzzle routes */}
          <Route path="/*" element={<PublicRoutes />} />
          {/* Secret system — completely isolated auth (hidden in native app) */}
          {!isNativeApp() && <Route path="/p/*" element={<PrivateRoutes />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
