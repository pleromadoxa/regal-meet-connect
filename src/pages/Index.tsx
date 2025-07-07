
import { useState, useEffect } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { JoinMeeting } from '@/components/JoinMeeting';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {!isInMeeting ? (
        <JoinMeeting onJoinMeeting={handleJoinMeeting} />
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
