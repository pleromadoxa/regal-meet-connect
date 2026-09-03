
import { Suspense, lazy } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from './pages/Index';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import { SessionManager } from './components/SessionManager';
import { useKeepAlive } from '@/hooks/useKeepAlive';
import { AuthProvider } from '@/hooks/useAuth';
import { RegalPageLoader } from '@/components/layout/RegalPageLoader';

const Join = lazy(() => import('./pages/Join'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Calendar = lazy(() => import('./pages/Calendar'));
const CalendarBook = lazy(() => import('./pages/CalendarBookPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Meeting = lazy(() => import('./pages/Meeting'));
const AudioMeeting = lazy(() =>
  import('./pages/AudioMeeting').then((m) => ({ default: m.AudioMeeting }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const PageLoader = () => <RegalPageLoader />;

const KeepAliveBoundary = () => {
  useKeepAlive();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="regal-meeting-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <KeepAliveBoundary />
              <SessionManager />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/join/:meetingId?" element={<Join />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/calendar/book/:slug" element={<CalendarBook />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/meeting/:meetingId" element={<Meeting />} />
                  <Route path="/audio-meeting/:meetingId" element={<AudioMeeting />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
