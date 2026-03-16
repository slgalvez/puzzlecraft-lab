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
import About from "./pages/About";
import Help from "./pages/Help";
import Stats from "./pages/Stats";
import NotFound from "./pages/NotFound";

// Private app
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/private/PrivateRoute";
import Login from "./pages/private/Login";
import Dashboard from "./pages/private/Dashboard";
import ThreadList from "./pages/private/ThreadList";
import ConversationView from "./pages/private/ConversationView";
import PrivateSettings from "./pages/private/PrivateSettings";

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
            <Route path="/generate/:type" element={<PuzzleGenerator />} />
            <Route path="/daily" element={<DailyPuzzle />} />
            <Route path="/play/:id" element={<PlayPuzzle />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/stats" element={<Stats />} />

            {/* Private app */}
            <Route path="/p/login" element={<Login />} />
            <Route path="/p" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/p/threads" element={<PrivateRoute><ThreadList /></PrivateRoute>} />
            <Route path="/p/threads/:threadId" element={<PrivateRoute><ConversationView /></PrivateRoute>} />
            <Route path="/p/settings" element={<PrivateRoute><PrivateSettings /></PrivateRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
