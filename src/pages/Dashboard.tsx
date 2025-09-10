
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { CreateMeetingCard } from '@/components/dashboard/CreateMeetingCard';
import { QuickJoinCard } from '@/components/dashboard/QuickJoinCard';
import { RecentMeetingsCard } from '@/components/dashboard/RecentMeetingsCard';
import { MeetingList } from '@/components/MeetingList';
import { Footer } from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRecentMeetings } from '@/hooks/useRecentMeetings';

const Dashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { meetings, loading, fetchMeetings, removeMeeting } = useMeetingManagement();
  const { addRecentMeeting } = useRecentMeetings();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    // Only redirect to auth if we're not loading and definitely have no user
    if (!authLoading && !user) {
      // Add a small delay to prevent race conditions on refresh
      const timeoutId = setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    
    if (user) {
      fetchMeetings();
    }
  }, [user, authLoading, navigate]);

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
        .update({ display_name: displayName })
        .eq('id', user.id);
      
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await removeMeeting(meetingId);
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const handleJoinMeeting = (name: string, roomId: string, hostStatus?: boolean) => {
    const params = new URLSearchParams({
      userName: name,
      ...(hostStatus && { host: 'true' })
    });
    
    // Add to recent meetings
    addRecentMeeting(roomId, `Meeting ${roomId}`, hostStatus || false);
    
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
    handleJoinMeeting(userName, meetingId, true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to auth');
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8 safe-area-inset-top safe-area-inset-bottom">
          <DashboardHeader 
            displayName={profile?.display_name || ''}
            userEmail={user?.email || ''}
            isRefreshing={loading}
            onRefreshMeetings={fetchMeetings}
            onNavigateToSettings={() => navigate('/settings')}
            onSignOut={signOut}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
            <ProfileCard 
              userName={profile?.display_name || ''}
              displayName={displayName}
              userEmail={user?.email || ''}
              isEditingProfile={isEditingProfile}
              onSetUserName={setDisplayName}
              onSetDisplayName={setDisplayName}
              onSetIsEditingProfile={setIsEditingProfile}
              onUpdateProfile={handleUpdateProfile}
            />
            <CreateMeetingCard />
            <QuickJoinCard onJoinMeeting={handleJoinMeeting} />
          </div>

          <div className="mb-8">
            <RecentMeetingsCard onJoinMeeting={handleJoinRecentMeeting} />
          </div>

          <MeetingList 
            meetings={meetings} 
            loading={loading} 
            onJoinAsHost={handleJoinAsHost}
            onDeleteMeeting={handleDeleteMeeting}
          />
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;
