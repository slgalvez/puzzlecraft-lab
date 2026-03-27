import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
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
import { UserAccountProvider } from "./contexts/UserAccountContext";
import DataMergeModal from "./components/account/DataMergeModal";
// Private app — completely separate auth system (custom JWT, separate DB tables)
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
  return (
    <UserAccountProvider>
      <DataMergeModal />
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
        <Route path="/craft" element={<CraftPuzzle />} />
        <Route path="/craft/play" element={<PlayCraftPuzzle />} />
        <Route path="/s/:id" element={<SharedCraftPuzzle />} />
        <Route path="/account" element={<Account />} />
      </Routes>
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
          {/* Secret system — completely isolated auth */}
          <Route path="/p/*" element={<PrivateRoutes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
