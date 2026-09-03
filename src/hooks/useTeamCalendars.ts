import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface TeamCalendar {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamCalendarMember {
  id: string;
  team_calendar_id: string;
  user_id?: string | null;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export const useTeamCalendars = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendars, setCalendars] = useState<TeamCalendar[]>([]);
  const [members, setMembers] = useState<TeamCalendarMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendars = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('team_calendars').select('*').order('name');
      if (error) {
        if (error.code === '42P01') { setCalendars([]); return; }
        throw error;
      }
      setCalendars(data ?? []);
    } catch (err) {
      console.error('Team calendars fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMembers = useCallback(async (calendarId: string) => {
    const { data, error } = await supabase
      .from('team_calendar_members')
      .select('*')
      .eq('team_calendar_id', calendarId);
    if (!error) setMembers(data ?? []);
  }, []);

  const createCalendar = async (name: string, color = 'purple', description?: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('team_calendars')
      .insert({ name, color, description, owner_id: user.id })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('team_calendar_members').insert({
      team_calendar_id: data.id,
      user_id: user.id,
      email: user.email!,
      role: 'owner',
    });

    setCalendars((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Team calendar created', description: `"${name}" is ready for your team.` });
    return data;
  };

  const addMember = async (calendarId: string, email: string, role: 'editor' | 'viewer' = 'viewer') => {
    const { data, error } = await supabase
      .from('team_calendar_members')
      .insert({ team_calendar_id: calendarId, email: email.trim().toLowerCase(), role })
      .select()
      .single();
    if (error) throw error;
    setMembers((prev) => [...prev, data]);
    toast({ title: 'Member added', description: `${email} can now view this team calendar.` });
    return data;
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('team_calendar_members').delete().eq('id', memberId);
    if (error) throw error;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  useEffect(() => {
    if (user) fetchCalendars();
  }, [user, fetchCalendars]);

  return {
    calendars,
    members,
    loading,
    createCalendar,
    addMember,
    removeMember,
    fetchMembers,
    refetch: fetchCalendars,
  };
};
