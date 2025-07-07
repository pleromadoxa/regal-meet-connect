
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MeetingList } from '@/components/MeetingList';
import { useMeetingManagement } from '@/hooks/useMeetingManagement';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Crown, Plus, Settings, Video, LogOut, User } from 'lucide-react';

interface DashboardProps {
  onJoinMeeting: (name: string, roomId: string, isHost: boolean) => void;
}

const Dashboard = ({ onJoinMeeting }: DashboardProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    meetings,
    loading,
    createMeeting,
    removeMeeting,
    fetchMeetings
  } = useMeetingManagement();

  useEffect(() => {
    if (user?.display_name) {
      setUserName(user.display_name);
    }
  }, [user]);

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

    const generatedId = generateMeetingId();
    const result = await createMeeting(generatedId, newMeetingTitle.trim(), newMeetingDescription.trim());
    
    if (result) {
      setIsCreateDialogOpen(false);
      setNewMeetingTitle('');
      setNewMeetingDescription('');
      toast({
        title: "Meeting Created",
        description: `Meeting "${newMeetingTitle}" has been created successfully`
      });
    }
  };

  const handleJoinAsHost = (meetingId: string, title: string) => {
    if (!userName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name first",
        variant: "destructive"
      });
      return;
    }
    onJoinMeeting(userName.trim(), meetingId, true);
  };

  const handleJoinMeetingById = () => {
    if (!userName.trim() || !meetingId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and meeting ID",
        variant: "destructive"
      });
      return;
    }
    onJoinMeeting(userName.trim(), meetingId.trim(), false);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    await removeMeeting(meetingId);
  };

  const handleSignOut = async () => {
    await signOut();
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
              <p className="text-blue-200">Welcome back, {user?.display_name || 'User'}!</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-400/40 text-white hover:bg-red-500/30 hover:border-red-400/60"
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
                  <label className="text-sm font-medium text-white/90">Your Name</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-white/20 border-white/30 text-white placeholder-white/60"
                  />
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

            {/* Quick Join */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Quick Join
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/90">Meeting ID</label>
                  <Input
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="Enter meeting ID"
                    className="bg-white/20 border-white/30 text-white placeholder-white/60"
                  />
                </div>
                <Button
                  onClick={handleJoinMeetingById}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              </CardContent>
            </Card>

            {/* Create Meeting */}
            <Card className="bg-white/10 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Host Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Meeting
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-white/20">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-white/90">Meeting Title</label>
                        <Input
                          value={newMeetingTitle}
                          onChange={(e) => setNewMeetingTitle(e.target.value)}
                          placeholder="Enter meeting title"
                          className="bg-white/20 border-white/30 text-white placeholder-white/60"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/90">Description (Optional)</label>
                        <Textarea
                          value={newMeetingDescription}
                          onChange={(e) => setNewMeetingDescription(e.target.value)}
                          placeholder="Enter meeting description"
                          className="bg-white/20 border-white/30 text-white placeholder-white/60"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setIsCreateDialogOpen(false)}
                          variant="outline"
                          className="flex-1 border-white/30 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateMeeting}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          Create Meeting
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
