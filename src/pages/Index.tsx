
import { useState, useEffect } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { JoinMeeting } from '@/components/JoinMeeting';
import { AuthPage } from '@/components/AuthPage';
import { AdminAccessButton } from '@/components/AdminAccessButton';
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
      <div className="relative">
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
        <JoinMeeting onJoinMeeting={handleJoinMeeting} />
      </div>
    </div>
  );
};

export default Index;
