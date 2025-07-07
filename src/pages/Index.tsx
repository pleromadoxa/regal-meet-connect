
import { useState } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { JoinMeeting } from '@/components/JoinMeeting';
import { AuthPage } from '@/components/AuthPage';
import { AdminAccessButton } from '@/components/AdminAccessButton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();

  const handleJoinMeeting = (name: string, roomId: string) => {
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
    setIsInMeeting(true);
    
    toast({
      title: "Joining Meeting",
      description: `Welcome to Regal Meet, ${name}!`
    });
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setMeetingId('');
    setUserName('');
    
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {!isInMeeting ? (
        <div className="relative">
          <div className="absolute top-6 right-6 z-10">
            <AdminAccessButton />
          </div>
          <JoinMeeting onJoinMeeting={handleJoinMeeting} />
        </div>
      ) : (
        <VideoConference 
          meetingId={meetingId}
          userName={userName}
          onLeaveMeeting={handleLeaveMeeting}
        />
      )}
    </div>
  );
};

export default Index;
