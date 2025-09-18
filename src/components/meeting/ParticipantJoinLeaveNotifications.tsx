import React, { useEffect, useState } from 'react';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JoinLeaveEvent {
  id: string;
  userName: string;
  type: 'join' | 'leave';
  timestamp: number;
}

interface ParticipantJoinLeaveNotificationsProps {
  participants: Array<{
    user_id: string;
    user_name: string;
    joined_at: string;
  }>;
  currentUserId: string;
}

export const ParticipantJoinLeaveNotifications = ({
  participants,
  currentUserId
}: ParticipantJoinLeaveNotificationsProps) => {
  const [previousParticipants, setPreviousParticipants] = useState(participants);
  const [recentEvents, setRecentEvents] = useState<JoinLeaveEvent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Find new participants (joined)
    const newParticipants = participants.filter(current =>
      !previousParticipants.find(prev => prev.user_id === current.user_id) &&
      current.user_id !== currentUserId
    );

    // Find removed participants (left)
    const leftParticipants = previousParticipants.filter(prev =>
      !participants.find(current => current.user_id === prev.user_id) &&
      prev.user_id !== currentUserId
    );

    // Handle join events
    newParticipants.forEach(participant => {
      const event: JoinLeaveEvent = {
        id: `join-${participant.user_id}-${Date.now()}`,
        userName: participant.user_name,
        type: 'join',
        timestamp: Date.now()
      };

      setRecentEvents(prev => [...prev, event]);

      toast({
        title: "Participant Joined",
        description: `${participant.user_name} joined the meeting`,
        duration: 3000,
      });

      // Remove event after animation
      setTimeout(() => {
        setRecentEvents(prev => prev.filter(e => e.id !== event.id));
      }, 4000);
    });

    // Handle leave events
    leftParticipants.forEach(participant => {
      const event: JoinLeaveEvent = {
        id: `leave-${participant.user_id}-${Date.now()}`,
        userName: participant.user_name,
        type: 'leave',
        timestamp: Date.now()
      };

      setRecentEvents(prev => [...prev, event]);

      toast({
        title: "Participant Left",
        description: `${participant.user_name} left the meeting`,
        duration: 3000,
      });

      // Remove event after animation
      setTimeout(() => {
        setRecentEvents(prev => prev.filter(e => e.id !== event.id));
      }, 4000);
    });

    setPreviousParticipants(participants);
  }, [participants, previousParticipants, currentUserId, toast]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {recentEvents.map(event => (
        <div
          key={event.id}
          className={`
            flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm
            border animate-slide-in-right
            ${event.type === 'join' 
              ? 'bg-green-500/20 border-green-500/30 text-green-100' 
              : 'bg-red-500/20 border-red-500/30 text-red-100'
            }
          `}
        >
          <div className={`p-2 rounded-full ${
            event.type === 'join' ? 'bg-green-500/30' : 'bg-red-500/30'
          }`}>
            {event.type === 'join' ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <UserMinus className="w-4 h-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {event.userName}
            </p>
            <p className="text-xs opacity-75">
              {event.type === 'join' ? 'Joined the meeting' : 'Left the meeting'}
            </p>
          </div>
        </div>
      ))}
      
      {/* Participant count indicator */}
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-600/30 text-slate-200">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};