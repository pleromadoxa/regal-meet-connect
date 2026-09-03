
import { AdminPanel } from '@/components/AdminPanel';
import { RegalAppShell } from '@/components/layout/RegalAppShell';
import { RegalPageLoader } from '@/components/layout/RegalPageLoader';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { LandingBackground } from '@/components/landing/LandingBackground';

const AdminDashboard = () => {
  const { isAdmin, loading, logAction } = useAdmin();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      logAction('admin_dashboard_accessed');
    }
  }, [isAdmin, logAction]);

  if (loading) {
    return <RegalPageLoader message="Loading admin…" />;
  }

  if (!isAdmin) {
    return (
      <div className="relative flex min-h-screen-safe flex-col bg-[#0a0a0a] text-white">
        <LandingBackground />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold">Access denied</h1>
          <p className="mb-8 max-w-md text-white/50">You don&apos;t have permission to access the admin dashboard.</p>
          <Button asChild variant="premium">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RegalAppShell
      title="Admin"
      subtitle="Platform administration"
      activeProduct="meeting"
      user={user}
      profile={profile}
      onSignOut={signOut}
      maxWidthClass="max-w-[1600px]"
      showSettingsLink={false}
    >
      <AdminPanel />
    </RegalAppShell>
  );
};

export default AdminDashboard;
