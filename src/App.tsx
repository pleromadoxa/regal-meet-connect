
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
import { useKeepAlive } from "@/hooks/useKeepAlive";

import { AudioMeeting } from "./pages/AudioMeeting";
import { SplashScreen } from "./components/SplashScreen";
import { useState } from "react";

const queryClient = new QueryClient();

const KeepAliveBoundary = () => {
  useKeepAlive();
  return null;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('regal-splash-shown') === '1'
  );

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && (
          <SplashScreen
            onComplete={() => {
              sessionStorage.setItem('regal-splash-shown', '1');
              setSplashDone(true);
            }}
          />
        )}
        <BrowserRouter>
          <KeepAliveBoundary />
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
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
