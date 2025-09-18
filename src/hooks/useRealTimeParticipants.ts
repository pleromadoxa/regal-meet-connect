import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  connection_quality: 'good' | 'poor' | 'disconnected';
  location?: string;
  last_seen: string;
}

export const useRealTimeParticipants = (meetingId: string, currentUserId: string, userName: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial participants
  const fetchParticipants = useCallback(async () => {
    if (!meetingId) return;
    
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      console.log('Initial participants loaded:', data?.length || 0);
      
      // Map database participants to our interface
      const mappedParticipants = (data || []).map((p: any) => ({
        ...p,
        is_video_enabled: true, // Default since this field might not exist in DB
        is_audio_enabled: !p.is_muted, // Derive from is_muted
        connection_quality: 'good' as const, // Default value
        last_seen: p.joined_at // Use joined_at as fallback for last_seen
      }));
      
      setParticipants(mappedParticipants);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // Add current user as participant
  const addCurrentUserAsParticipant = useCallback(async () => {
    if (!meetingId || !currentUserId || !userName) return;

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', currentUserId)
        .single();

      if (existing) {
        console.log('Current user already exists as participant');
        return;
      }

      // Add current user as participant  
      const insertData = {
        meeting_id: meetingId,
        user_id: currentUserId,
        user_name: userName,
        is_host: false, // Will be updated by host if needed
        is_muted: false
      };

      const { data, error } = await supabase
        .from('meeting_participants')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error adding current user as participant:', error);
        return;
      }

      console.log('Current user added as participant:', data);
    } catch (error) {
      console.error('Failed to add current user as participant:', error);
    }
  }, [meetingId, currentUserId, userName]);

  // Update participant status
  const updateParticipantStatus = useCallback(async (updates: Partial<Participant>) => {
    if (!meetingId || !currentUserId) return;

    try {
      // Only update fields that exist in the database
      const updateData: any = {};
      
      if (updates.is_muted !== undefined) updateData.is_muted = updates.is_muted;
      if (updates.is_host !== undefined) updateData.is_host = updates.is_host;
      
      const { error } = await supabase
        .from('meeting_participants')
        .update(updateData)
        .eq('meeting_id', meetingId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error updating participant status:', error);
      }
    } catch (error) {
      console.error('Failed to update participant status:', error);
    }
  }, [meetingId, currentUserId]);

  // Remove participant (when leaving)
  const removeParticipant = useCallback(async () => {
    if (!meetingId || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error removing participant:', error);
      } else {
        console.log('Participant removed successfully');
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  }, [meetingId, currentUserId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial data
    fetchParticipants();
    
    // Add current user as participant
    addCurrentUserAsParticipant();

    // Set up real-time subscription
    const channel = supabase
      .channel(`meeting-participants-${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meeting_participants',
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        console.log('Participant joined:', payload.new);
        const newParticipant = payload.new as Participant;
        
        setParticipants(prev => {
          const exists = prev.find(p => p.id === newParticipant.id);
          if (exists) return prev;
          
          const updatedParticipants = [...prev, newParticipant];
          
          // Show join notification if it's not the current user
          if (newParticipant.user_id !== currentUserId) {
            toast({
              title: "Participant Joined",
              description: `${newParticipant.user_name} joined the meeting`,
              duration: 3000
            });
          }
          
          return updatedParticipants;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'meeting_participants',
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        console.log('Participant updated:', payload.new);
        const updatedParticipant = payload.new as Participant;
        
        setParticipants(prev => 
          prev.map(p => 
            p.id === updatedParticipant.id ? updatedParticipant : p
          )
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'meeting_participants',
        filter: `meeting_id=eq.${meetingId}`
      }, (payload) => {
        console.log('Participant left:', payload.old);
        const leftParticipant = payload.old as Participant;
        
        setParticipants(prev => {
          const updated = prev.filter(p => p.id !== leftParticipant.id);
          
          // Show leave notification if it's not the current user
          if (leftParticipant.user_id !== currentUserId) {
            toast({
              title: "Participant Left",
              description: `${leftParticipant.user_name} left the meeting`,
              duration: 3000
            });
          }
          
          return updated;
        });
      })
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
      removeParticipant();
    };
  }, [meetingId, currentUserId, fetchParticipants, addCurrentUserAsParticipant, removeParticipant, toast]);

  // Keep participant alive with periodic updates
  useEffect(() => {
    if (!meetingId || !currentUserId) return;

    const keepAlive = setInterval(() => {
      updateParticipantStatus({ 
        is_muted: false // Only update fields that exist in DB
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(keepAlive);
  }, [meetingId, currentUserId, updateParticipantStatus]);

  return {
    participants,
    isLoading,
    updateParticipantStatus,
    removeParticipant,
    addCurrentUserAsParticipant
  };
};
