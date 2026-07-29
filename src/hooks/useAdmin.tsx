import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  profile: {
    display_name: string | null;
  } | null;
  roles: string[];
}

interface Meeting {
  id: string;
  meeting_id: string;
  host_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  status: string;
  host_profile?: {
    display_name: string | null;
  };
}

interface PlatformUsageLog {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
  } | null;
}

interface CountryStats {
  country: string;
  count: number;
}

export const useAdmin = () => {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [logs, setLogs] = useState<PlatformUsageLog[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      checkAdminStatus();
    } else {
      setLoading(false);
      setIsAdmin(false);
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data || false);
      }
      
      if (data) {
        await Promise.all([
          fetchUsers(),
          fetchMeetings(),
          fetchLogs(),
          fetchCountryStats()
        ]);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Get all users using the admin function
      const { data: users, error: usersError } = await supabase.rpc('get_all_users_admin');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Combine the data
      const usersWithProfiles = users?.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        profile: {
          display_name: user.display_name
        },
        roles: userRoles?.filter((role: any) => role.user_id === user.id).map((role: any) => role.role) || []
      })) || [];

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMeetings = async () => {
    try {
      // Fetch all meetings with host profile information
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError);
        return;
      }

      // Get profiles for host information
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name');

      if (profilesError) {
        console.error('Error fetching profiles for meetings:', profilesError);
      }

      // Combine meeting data with host profiles
      const meetingsWithHosts: Meeting[] = meetingsData?.map(meeting => ({
        id: meeting.id,
        meeting_id: meeting.meeting_id,
        host_id: meeting.host_id,
        title: meeting.title,
        description: meeting.description,
        is_active: meeting.is_active,
        created_at: meeting.created_at,
        status: meeting.status || 'active',
        host_profile: profilesData?.find(profile => profile.id === meeting.host_id) || null
      })) || [];

      setMeetings(meetingsWithHosts);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      // Fetch logs and profiles separately, then join manually
      const { data: logsData, error: logsError } = await supabase
        .from('platform_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name');

      if (profilesError) {
        console.error('Error fetching profiles for logs:', profilesError);
      }

      // Manually join the data
      const logsWithProfiles: PlatformUsageLog[] = logsData?.map(log => ({
        id: log.id,
        user_id: log.user_id,
        action: log.action,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        country: log.country,
        created_at: log.created_at,
        profiles: profilesData?.find(profile => profile.id === log.user_id) || null
      })) || [];

      setLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchCountryStats = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_usage_logs')
        .select('country')
        .not('country', 'is', null);

      if (error) {
        console.error('Error fetching country stats:', error);
        return;
      }

      if (data) {
        const countryCounts = data.reduce((acc: Record<string, number>, log: any) => {
          const country = log.country || 'Unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {});

        const stats: CountryStats[] = Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count: count as number }))
          .sort((a, b) => b.count - a.count);

        setCountryStats(stats);
      }
    } catch (error) {
      console.error('Error fetching country stats:', error);
    }
  };

  const assignRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role,
          assigned_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role updated to ${role}`
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const logAction = async (action: string, country?: string) => {
    if (!user) return;

    try {
      // Use the enhanced edge function for better logging
      const { data, error } = await supabase.functions.invoke('log-activity', {
        body: {
          action,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error logging action:', error);
      } else {
        console.log('Action logged with enhanced data:', data);
      }
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const createMeeting = async (meetingId: string, title: string, description?: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a meeting",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('Admin creating meeting:', { meeting_id: meetingId, title, description });
      
      // Check if meeting ID already exists
      const { data: existingMeeting } = await supabase
        .from('meetings')
        .select('meeting_id')
        .eq('meeting_id', meetingId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingMeeting) {
        throw new Error('Meeting ID already exists. Please try again.');
      }

      // Create the meeting
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          meeting_id: meetingId,
          host_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          is_active: true,
          status: 'active'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error creating meeting:', error);
        throw new Error(`Failed to create meeting: ${error.message}`);
      }
      
      console.log('Meeting created successfully:', data);
      
      toast({
        title: "Meeting Created",
        description: `Meeting "${title}" created successfully with ID: ${meetingId}`
      });

      // Refresh meetings list
      await fetchMeetings();
      
      return data;
      
    } catch (error) {
      console.error('Error in createMeeting:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Failed to Create Meeting",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      console.log('Admin deleting meeting:', meetingId);
      
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) {
        console.error('Error deleting meeting:', error);
        throw new Error(`Failed to delete meeting: ${error.message}`);
      }
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      });
      
      // Refresh meetings list
      await fetchMeetings();
      
      console.log('Meeting deleted successfully');
    } catch (error) {
      console.error('Error in deleteMeeting:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return {
    users,
    meetings,
    logs,
    countryStats,
    isAdmin,
    loading,
    assignRole,
    logAction,
    createMeeting,
    deleteMeeting,
    refreshData: () => Promise.all([fetchUsers(), fetchMeetings(), fetchLogs(), fetchCountryStats()])
  };
};
