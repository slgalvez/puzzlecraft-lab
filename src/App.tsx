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
import PrivatePage from "./pages/PrivatePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/puzzles" element={<PuzzleLibrary />} />
          <Route path="/generate/:type" element={<PuzzleGenerator />} />
          <Route path="/daily" element={<DailyPuzzle />} />
          <Route path="/play/:id" element={<PlayPuzzle />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<Help />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/p" element={<PrivatePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
