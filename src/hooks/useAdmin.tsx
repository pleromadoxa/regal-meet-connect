
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
  const [logs, setLogs] = useState<PlatformUsageLog[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      setIsAdmin(data || false);
      
      if (data) {
        await Promise.all([
          fetchUsers(),
          fetchLogs(),
          fetchCountryStats()
        ]);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Get all profiles first
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Combine the data
      const usersWithProfiles = profiles?.map((profile: any) => ({
        id: profile.id,
        email: '', // We can't access auth.users directly
        created_at: profile.created_at,
        profile: {
          display_name: profile.display_name
        },
        roles: userRoles?.filter((role: any) => role.user_id === profile.id).map((role: any) => role.role) || []
      })) || [];

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('platform_usage_logs')
        .select(`
          *,
          profiles (
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchCountryStats = async () => {
    try {
      const { data } = await supabase
        .from('platform_usage_logs')
        .select('country')
        .not('country', 'is', null);

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
      await supabase.rpc('log_platform_usage', {
        _user_id: user.id,
        _action: action,
        _country: country
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  return {
    users,
    logs,
    countryStats,
    isAdmin,
    loading,
    assignRole,
    logAction,
    refreshData: () => Promise.all([fetchUsers(), fetchLogs(), fetchCountryStats()])
  };
};
