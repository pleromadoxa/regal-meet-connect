
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { CreateMeetingCard } from '@/components/dashboard/CreateMeetingCard';
import { QuickJoinCard } from '@/components/dashboard/QuickJoinCard';
import { MeetingList } from '@/components/MeetingList';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { meetings, loading, fetchMeetings } = useMeetingManagement();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchMeetings();
    }
  }, [user, authLoading, navigate, fetchMeetings]);

  const handleJoinMeeting = (name: string, roomId: string, hostStatus?: boolean) => {
    const params = new URLSearchParams({
      userName: name,
      ...(hostStatus && { host: 'true' })
    });
    navigate(`/meeting/${roomId}?${params.toString()}`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <ProfileCard />
          <CreateMeetingCard />
          <QuickJoinCard onJoinMeeting={handleJoinMeeting} />
        </div>

        <MeetingList 
          meetings={meetings} 
          loading={loading} 
          onRefresh={fetchMeetings}
          onJoinMeeting={handleJoinMeeting}
        />
      </div>
    </div>
  );
};

export default Dashboard;
