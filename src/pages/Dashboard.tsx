import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MeetingList } from '@/components/MeetingList';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Crown, Plus, Settings, Video, LogOut, User, Edit, RefreshCw } from 'lucide-react';
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
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }
          
          if (profile?.display_name) {
            setUserName(profile.display_name);
            setDisplayName(profile.display_name);
          } else {
            // Use email as fallback if no display name
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

  // Fetch meetings on component mount and when user changes
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
        
        // Refresh meetings list
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
      // Refresh meetings list after deletion
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-2xl">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                Regal Meet Dashboard
              </h1>
              <p className="text-blue-200">Welcome back, {displayName || user?.email || 'User'}!</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={handleRefreshMeetings}
              disabled={isRefreshing}
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleNavigateToSettings}
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              size="sm"
              className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60 backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/90">Display Name</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={isEditingProfile ? displayName : userName}
                      onChange={(e) => isEditingProfile ? setDisplayName(e.target.value) : setUserName(e.target.value)}
                      placeholder="Enter your display name"
                      className="bg-white/20 border-white/30 text-white placeholder-white/60"
                      disabled={!isEditingProfile}
                    />
                    <Button
                      onClick={isEditingProfile ? handleUpdateProfile : () => setIsEditingProfile(true)}
                      variant="outline"
                      size="sm"
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  {isEditingProfile && (
                    <Button
                      onClick={() => setIsEditingProfile(false)}
                      variant="outline"
                      size="sm"
                      className="mt-2 border-white/30 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-white/90">Email</label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-white/10 border-white/20 text-white/70"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Join - Enhanced UI */}
            <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border-blue-400/30 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center text-lg">
                  <Video className="h-6 w-6 mr-3 text-blue-300" />
                  Quick Join Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-white/90 mb-2 block">Meeting ID</label>
                  <Input
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="Enter meeting ID..."
                    className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                  />
                </div>
                <Button
                  onClick={handleJoinMeetingById}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 border-0"
                >
                  <Video className="h-6 w-6 mr-3" />
                  Join Meeting Now
                </Button>
              </CardContent>
            </Card>

            {/* Create Meeting - Enhanced UI */}
            <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border-orange-400/30 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center text-lg">
                  <Crown className="h-6 w-6 mr-3 text-orange-300" />
                  Host New Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 border-0">
                      <Plus className="h-6 w-6 mr-3" />
                      Create New Meeting
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-white/20 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl">Create New Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div>
                        <label className="text-sm font-medium text-white/90 mb-2 block">Meeting Title</label>
                        <Input
                          value={newMeetingTitle}
                          onChange={(e) => setNewMeetingTitle(e.target.value)}
                          placeholder="Enter meeting title..."
                          className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 h-12"
                          disabled={isCreatingMeeting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/90 mb-2 block">Description (Optional)</label>
                        <Textarea
                          value={newMeetingDescription}
                          onChange={(e) => setNewMeetingDescription(e.target.value)}
                          placeholder="Enter meeting description..."
                          className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 resize-none"
                          rows={3}
                          disabled={isCreatingMeeting}
                        />
                      </div>
                      <div className="flex space-x-3 pt-4">
                        <Button
                          onClick={() => setIsCreateDialogOpen(false)}
                          variant="outline"
                          className="flex-1 border-white/30 text-white hover:bg-white/10 bg-white/5 h-12"
                          disabled={isCreatingMeeting}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateMeeting}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12 shadow-lg"
                          disabled={isCreatingMeeting}
                        >
                          {isCreatingMeeting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              Create Meeting
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Meetings List */}
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
