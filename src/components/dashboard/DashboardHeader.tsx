
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminAccessButton } from '@/components/AdminAccessButton';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import logo from '@/assets/regal-logo.png';
import { PRODUCT_NAME } from '@/constants/site';

interface DashboardHeaderProps {
  displayName: string;
  userEmail: string;
  avatarUrl?: string | null;
  isRefreshing: boolean;
  onRefreshMeetings: () => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
}

export const DashboardHeader = ({
  displayName,
  userEmail,
  avatarUrl,
  isRefreshing,
  onRefreshMeetings,
  onNavigateToSettings,
  onSignOut
}: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const welcomeName = displayName || userEmail?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-6 md:mb-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <img src={logo} alt="Regal Meeting" className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl shadow-2xl shrink-0" />
        <div className="hidden sm:block h-10 w-px bg-white/15" aria-hidden />
        <ProfileAvatar
          avatarUrl={avatarUrl}
          displayName={welcomeName}
          email={userEmail}
          size="md"
          className="sm:hidden"
        />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg truncate">
            {PRODUCT_NAME}
          </h1>
          <div className="flex items-center gap-2 text-blue-200 text-sm md:text-base">
            <ProfileAvatar
              avatarUrl={avatarUrl}
              displayName={welcomeName}
              email={userEmail}
              size="sm"
              ring={false}
              className="hidden sm:flex"
            />
            <p className="truncate">Welcome back, {welcomeName}!</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2 md:gap-3 lg:gap-4">
        <AdminAccessButton />
        <Button
          onClick={onRefreshMeetings}
          disabled={isRefreshing}
          variant="secondary"
          size={isMobile ? "sm" : "sm"}
          className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isMobile ? '' : 'mr-2'} ${isRefreshing ? 'animate-spin' : ''}`} />
          {!isMobile && 'Refresh'}
        </Button>
        <Button
          onClick={onNavigateToSettings}
          variant="secondary"
          size={isMobile ? "sm" : "sm"}
          className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm flex-shrink-0"
        >
          <Settings className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
          {!isMobile && 'Settings'}
        </Button>
        <Button
          onClick={onSignOut}
          variant="destructive"
          size={isMobile ? "sm" : "sm"}
          className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 backdrop-blur-sm flex-shrink-0"
        >
          <LogOut className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
          {!isMobile && 'Sign Out'}
        </Button>
      </div>
    </div>
  );
};
