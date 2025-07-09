import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeetingList } from '@/components/MeetingList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickJoinCard } from '@/components/dashboard/QuickJoinCard';
import { CreateMeetingCard } from '@/components/dashboard/CreateMeetingCard';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  onJoinMeeting?: (name: string, roomId: string, isHost: boolean) => void;
}

const Dashboard = ({ onJoinMeeting }: DashboardProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  const {
    meetings,
    loading,
    createMeeting,
    removeMeeting,
    fetchMeetings
  } = useMeetingManagement();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          console.log('Fetching profile for user:', user.id);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }
          
          if (profile?.display_name) {
            setUserName(profile.display_name);
            setDisplayName(profile.display_name);
          } else {
            const fallbackName = user.email?.split('@')[0] || 'User';
            setUserName(fallbackName);
            setDisplayName(fallbackName);
          }
        } catch (error) {
          console.error('Error in fetchProfile:', error);
        }
      }
    };
    
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      console.log('Fetching meetings for user:', user.id);
      fetchMeetings();
    }
  }, [user?.id, fetchMeetings]);

  const generateMeetingId = () => {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a meeting title",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a meeting",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingMeeting(true);
    
    try {
      const generatedId = generateMeetingId();
      console.log('Creating meeting with details:', {
        id: generatedId,
        title: newMeetingTitle.trim(),
        description: newMeetingDescription.trim(),
        hostId: user.id
      });
      
      const result = await createMeeting(generatedId, newMeetingTitle.trim(), newMeetingDescription.trim());
      
      if (result) {
        setIsCreateDialogOpen(false);
        setNewMeetingTitle('');
        setNewMeetingDescription('');
        toast({
          title: "Meeting Created",
          description: `Meeting "${newMeetingTitle}" has been created successfully`
        });
        
        await fetchMeetings();
      } else {
        throw new Error('Failed to create meeting - no result returned');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleJoinAsHost = (meetingId: string, title: string) => {
    if (!userName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please set up your display name first",
        variant: "destructive"
      });
      setIsEditingProfile(true);
      return;
    }
    onJoinMeeting?.(userName.trim(), meetingId, true);
  };

  const handleJoinMeetingById = () => {
    if (!userName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please set up your display name first",
        variant: "destructive"
      });
      setIsEditingProfile(true);
      return;
    }
    
    if (!meetingId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a meeting ID",
        variant: "destructive"
      });
      return;
    }
    
    onJoinMeeting?.(userName.trim(), meetingId.trim(), false);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await removeMeeting(meetingId);
      await fetchMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your display name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          display_name: displayName.trim(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setUserName(displayName.trim());
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your display name has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefreshMeetings = async () => {
    setIsRefreshing(true);
    try {
      await fetchMeetings();
      toast({
        title: "Refreshed",
        description: "Meetings list has been updated"
      });
    } catch (error) {
      console.error('Error refreshing meetings:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh meetings list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavigateToSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader
          displayName={displayName}
          userEmail={user?.email || ''}
          isRefreshing={isRefreshing}
          onRefreshMeetings={handleRefreshMeetings}
          onNavigateToSettings={handleNavigateToSettings}
          onSignOut={handleSignOut}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard
              userName={userName}
              displayName={displayName}
              userEmail={user?.email || ''}
              isEditingProfile={isEditingProfile}
              onSetUserName={setUserName}
              onSetDisplayName={setDisplayName}
              onSetIsEditingProfile={setIsEditingProfile}
              onUpdateProfile={handleUpdateProfile}
            />

            <QuickJoinCard
              meetingId={meetingId}
              onSetMeetingId={setMeetingId}
              onJoinMeeting={handleJoinMeetingById}
            />

            <CreateMeetingCard
              isCreateDialogOpen={isCreateDialogOpen}
              newMeetingTitle={newMeetingTitle}
              newMeetingDescription={newMeetingDescription}
              isCreatingMeeting={isCreatingMeeting}
              onSetIsCreateDialogOpen={setIsCreateDialogOpen}
              onSetNewMeetingTitle={setNewMeetingTitle}
              onSetNewMeetingDescription={setNewMeetingDescription}
              onCreateMeeting={handleCreateMeeting}
              onRefreshMeetings={handleRefreshMeetings}
            />
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Your Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingList
                  meetings={meetings}
                  onJoinAsHost={handleJoinAsHost}
                  onDeleteMeeting={handleDeleteMeeting}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
