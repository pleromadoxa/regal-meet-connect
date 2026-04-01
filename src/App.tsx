
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Meeting from "./pages/Meeting";
import { SessionManager } from "./components/SessionManager";
import { useKeepAlive } from "./hooks/useKeepAlive";

import { AudioMeeting } from "./pages/AudioMeeting";

const queryClient = new QueryClient();

// Create a wrapper component to use hooks that need to be within providers
const AppContent = () => {
  // Pings Supabase every 30 minutes to prevent the project from pausing on free tiers
  useKeepAlive(30);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionManager />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/meeting/:meetingId" element={<Meeting />} />
          <Route path="/audio-meeting/:meetingId" element={<AudioMeeting />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
