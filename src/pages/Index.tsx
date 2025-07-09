
import { useState, useEffect } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { AuthPage } from '@/components/AuthPage';
import { AdminAccessButton } from '@/components/AdminAccessButton';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';
import { CreateMeetingSection } from '@/components/landing/CreateMeetingSection';
import Dashboard from './Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';

const Index = () => {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const { isAuthenticated, loading, user } = useAuth();
  const { toast } = useToast();

  // Check for active meeting on component mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const storedMeeting = localStorage.getItem('currentMeeting');
      
      if (storedMeeting) {
        try {
          const meetingData = JSON.parse(storedMeeting);
          const timeElapsed = Date.now() - meetingData.timestamp;
          const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
          
          // Check if session is still valid and user matches
          if (timeElapsed < sessionTimeout && meetingData.userId === user.id) {
            console.log('Resuming previous meeting session:', meetingData);
            setMeetingId(meetingData.meetingId);
            setUserName(meetingData.userName);
            setIsHost(meetingData.isHost);
            setIsInMeeting(true);
            
            toast({
              title: "Rejoining Meeting",
              description: `Returning to meeting: ${meetingData.meetingId}`
            });
          } else {
            // Clear expired session
            localStorage.removeItem('currentMeeting');
          }
        } catch (error) {
          console.error('Error parsing stored meeting data:', error);
          localStorage.removeItem('currentMeeting');
        }
      }
    }
  }, [isAuthenticated, user?.id, toast]);

  const handleJoinMeeting = (name: string, roomId: string, hostStatus: boolean = false) => {
    if (!name.trim() || !roomId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and meeting ID",
        variant: "destructive"
      });
      return;
    }
    
    setUserName(name);
    setMeetingId(roomId);
    setIsHost(hostStatus);
    setIsInMeeting(true);
    setShowDashboard(false);
    
    toast({
      title: "Joining Meeting",
      description: `Welcome to Regal Meet, ${name}!${hostStatus ? ' You are the host.' : ''}`
    });
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setMeetingId('');
    setUserName('');
    setIsHost(false);
    
    toast({
      title: "Meeting Ended",
      description: "You have left the meeting"
    });
  };

  const handleAuthSuccess = () => {
    toast({
      title: "Authentication Successful",
      description: "Welcome to Regal Meet!"
    });
  };

  const handleNavigateToDashboard = () => {
    setIsInMeeting(false);
    setShowDashboard(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (isInMeeting) {
    return (
      <VideoConference 
        meetingId={meetingId}
        userName={userName}
        isHost={isHost}
        onLeaveMeeting={handleLeaveMeeting}
        onNavigateToDashboard={handleNavigateToDashboard}
      />
    );
  }

  if (showDashboard) {
    return <Dashboard onJoinMeeting={handleJoinMeeting} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-500 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-500 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="absolute top-6 right-6 z-10 flex space-x-2">
          <Button
            onClick={() => setShowDashboard(true)}
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 shadow-lg backdrop-blur-sm transition-all duration-200"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <AdminAccessButton />
        </div>

        {/* Main Content */}
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-6xl space-y-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
                Regal Meet
              </h1>
              <p className="text-xl text-blue-200 mb-2">Connect with anyone, anywhere</p>
              <p className="text-lg text-white/70">Professional video conferencing made simple</p>
            </div>

            {/* Meeting Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <QuickJoinSection onJoinMeeting={handleJoinMeeting} />
              <CreateMeetingSection onJoinMeeting={handleJoinMeeting} />
            </div>

            {/* Features */}
            <div className="text-center mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-white/80 p-4">
                  <div className="text-3xl mb-2">🎥</div>
                  <h3 className="font-semibold mb-1">HD Video</h3>
                  <p className="text-sm">Crystal clear video calls</p>
                </div>
                <div className="text-white/80 p-4">
                  <div className="text-3xl mb-2">🔒</div>
                  <h3 className="font-semibold mb-1">Secure</h3>
                  <p className="text-sm">End-to-end encrypted</p>
                </div>
                <div className="text-white/80 p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-semibold mb-1">Fast</h3>
                  <p className="text-sm">Join meetings instantly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
