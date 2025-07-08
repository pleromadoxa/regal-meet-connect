
import { Button } from '@/components/ui/button';
import { Crown, RefreshCw, Settings, LogOut } from 'lucide-react';

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
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-2xl">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            Regal Meetings Dashboard
          </h1>
          <p className="text-blue-200">Welcome back, {displayName || userEmail || 'User'}!</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button
          onClick={onRefreshMeetings}
          disabled={isRefreshing}
          variant="secondary"
          size="sm"
          className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          onClick={onNavigateToSettings}
          variant="secondary"
          size="sm"
          className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button
          onClick={onSignOut}
          variant="destructive"
          size="sm"
          className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 backdrop-blur-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
