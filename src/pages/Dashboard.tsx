
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { CreateMeetingCard } from '@/components/dashboard/CreateMeetingCard';
import { QuickJoinCard } from '@/components/dashboard/QuickJoinCard';
import { MeetingList } from '@/components/MeetingList';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { meetings, loading, fetchMeetings, removeMeeting } = useMeetingManagement();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
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
    navigate(`/meeting/${roomId}?${params.toString()}`);
  };

  const handleJoinAsHost = (meetingId: string, title: string) => {
    const userName = profile?.display_name || user?.email || 'Host';
    handleJoinMeeting(userName, meetingId, true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero">
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

        <MeetingList 
          meetings={meetings} 
          loading={loading} 
          onJoinAsHost={handleJoinAsHost}
          onDeleteMeeting={handleDeleteMeeting}
        />
      </div>
    </div>
  );
};

export default Dashboard;
