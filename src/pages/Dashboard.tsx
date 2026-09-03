import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { CreateMeetingCard } from '@/components/dashboard/CreateMeetingCard';
import { QuickJoinCard } from '@/components/dashboard/QuickJoinCard';
import { RecentMeetingsCard } from '@/components/dashboard/RecentMeetingsCard';
import { MeetingList } from '@/components/MeetingList';
import { RegalAppShell } from '@/components/layout/RegalAppShell';
import { RegalPageLoader } from '@/components/layout/RegalPageLoader';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRecentMeetings } from '@/hooks/useRecentMeetings';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { ScheduleMeetingCard } from '@/components/dashboard/ScheduleMeetingCard';
import { ScheduledMeetingsList } from '@/components/dashboard/ScheduledMeetingsList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/use-toast';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import { parseMeetingCodeFromInput } from '@/lib/meeting';
import { PRODUCT_NAME } from '@/constants/site';

const Dashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { meetings, loading, fetchMeetings, removeMeeting } = useMeetingManagement();
  const { addRecentMeeting } = useRecentMeetings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinPrefill = searchParams.get('join')?.trim() || '';
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const { logPageView, logMeetingJoin, logMeetingCreate } = usePlatformLogging();
  const { toast } = useToast();

  useDocumentTitle('Dashboard');

  useEffect(() => {
    // Only redirect to auth if we're not loading and definitely have no user
    if (!authLoading && !user) {
      const timeoutId = setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    
    if (user) {
      fetchMeetings();
      // Log page view
      logPageView('dashboard', user.id);
    }
  }, [user, authLoading, navigate, fetchMeetings, logPageView]);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ display_name: displayName, full_name: displayName || null })
        .eq('id', user.id);
      
      setIsEditingProfile(false);
      toast({ title: 'Profile updated', description: 'Your display name has been saved.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'Could not save your profile. Try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await removeMeeting(meetingId);
      toast({ title: 'Meeting deleted', description: 'The meeting was removed from your list.' });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: 'Could not delete meeting',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleJoinMeeting = (name: string, roomId: string, hostStatus?: boolean) => {
    const params = new URLSearchParams({
      userName: name,
      ...(hostStatus && { host: 'true' })
    });
    
    // Add to recent meetings
    addRecentMeeting(roomId, `Meeting ${roomId}`, hostStatus || false);
    
    // Log meeting join
    logMeetingJoin(roomId, user?.id);
    
    navigate(`/meeting/${roomId}?${params.toString()}`);
  };

  const handleJoinRecentMeeting = (meetingId: string, title: string, isHost: boolean) => {
    const userName = profile?.display_name || user?.email || (isHost ? 'Host' : 'User');
    const params = new URLSearchParams({
      userName,
      ...(isHost && { host: 'true' })
    });
    
    // Update recent meeting access time
    addRecentMeeting(meetingId, title, isHost);
    
    navigate(`/meeting/${meetingId}?${params.toString()}`);
  };

  const handleJoinAsHost = (meetingId: string, title: string) => {
    const userName = profile?.display_name || user?.email || 'Host';
    // Add to recent meetings
    addRecentMeeting(meetingId, title, true);
    // Log meeting creation/join as host
    logMeetingCreate(meetingId, user?.id);
    handleJoinMeeting(userName, meetingId, true);
  };

  if (authLoading) {
    return <RegalPageLoader message="Loading dashboard…" />;
  }

  if (!user) {
    return <RegalPageLoader message="Redirecting to sign in…" />;
  }

  const avatarUrl = resolveAvatarUrl(profile, user);
  const welcomeName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <RegalAppShell
      title={PRODUCT_NAME}
      subtitle={`Welcome back, ${welcomeName}`}
      activeProduct="meeting"
      user={user}
      profile={profile}
      onSignOut={signOut}
      maxWidthClass="max-w-7xl"
      headerActions={
        <Button
          onClick={fetchMeetings}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-12">
            <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
              <ProfileCard 
                userName={profile?.display_name || ''}
                displayName={displayName}
                userEmail={user?.email || ''}
                avatarUrl={avatarUrl}
                isEditingProfile={isEditingProfile}
                onSetDisplayName={setDisplayName}
                onSetIsEditingProfile={setIsEditingProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            </div>
            <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
              <CreateMeetingCard />
            </div>
            <div className="animate-fade-in" style={{animationDelay: '0.3s'}}>
              <QuickJoinCard
                onJoinMeeting={handleJoinMeeting}
                initialMeetingId={joinPrefill ? parseMeetingCodeFromInput(joinPrefill) : ''}
                defaultUserName={profile?.display_name || user?.email?.split('@')[0] || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8 animate-fade-in" style={{animationDelay: '0.4s'}}>
            <ScheduleMeetingCard />
            <RecentMeetingsCard onJoinMeeting={handleJoinRecentMeeting} />
          </div>

          <div className="mb-8 animate-fade-in" style={{animationDelay: '0.5s'}}>
            <ScheduledMeetingsList />
          </div>

          <div className="animate-fade-in" style={{animationDelay: '0.6s'}}>
            <MeetingList
              meetings={meetings} 
              loading={loading} 
              onJoinAsHost={handleJoinAsHost}
              onDeleteMeeting={handleDeleteMeeting}
            />
          </div>
    </RegalAppShell>
  );
};

export default Dashboard;
