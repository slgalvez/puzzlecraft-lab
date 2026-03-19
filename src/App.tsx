import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

// Private app
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/private/PrivateRoute";
import Login from "./pages/private/Login";
import PrivateHome from "./pages/private/PrivateHome";
import AdminConversationView from "./pages/private/AdminConversationView";
import AdminConversations from "./pages/private/AdminConversations";
import AdminUsers from "./pages/private/AdminUsers";
import UserConversation from "./pages/private/UserConversation";
import PrivateSettings from "./pages/private/PrivateSettings";
import ForYou from "./pages/private/ForYou";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public puzzle site */}
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

            {/* Private app */}
            <Route path="/p/login" element={<Login />} />
            <Route path="/p" element={<PrivateRoute><PrivateHome /></PrivateRoute>} />
            <Route path="/p/conversations" element={<PrivateRoute><AdminConversations /></PrivateRoute>} />
            <Route path="/p/conversation" element={<PrivateRoute><UserConversation /></PrivateRoute>} />
            <Route path="/p/conversation/:conversationId" element={<PrivateRoute><AdminConversationView /></PrivateRoute>} />
            <Route path="/p/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
            <Route path="/p/for-you" element={<PrivateRoute><ForYou /></PrivateRoute>} />
            <Route path="/p/settings" element={<PrivateRoute><PrivateSettings /></PrivateRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
