
import { Button } from '@/components/ui/button';
import { Crown, RefreshCw, Settings, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminAccessButton } from '@/components/AdminAccessButton';

interface DashboardHeaderProps {
  displayName: string;
  userEmail: string;
  isRefreshing: boolean;
  onRefreshMeetings: () => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
}

export const DashboardHeader = ({
  displayName,
  userEmail,
  isRefreshing,
  onRefreshMeetings,
  onNavigateToSettings,
  onSignOut
}: DashboardHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-8">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-2xl">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
            Regal Meetings Dashboard
          </h1>
          <p className="text-blue-200 text-sm lg:text-base">
            Welcome back, {displayName || userEmail || 'User'}!
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end lg:justify-start gap-2 lg:gap-4 overflow-x-auto">
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
