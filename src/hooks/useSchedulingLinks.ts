import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { SITE_URL } from '@/constants/site';

export interface SchedulingLink {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description?: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  create_meeting: boolean;
  created_at: string;
  updated_at: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export const useSchedulingLinks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_scheduling_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01') { setLinks([]); return; }
        throw error;
      }
      setLinks(data ?? []);
    } catch (err) {
      console.error('Scheduling links fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createLink = async (title: string, durationMinutes = 30) => {
    if (!user) throw new Error('Not authenticated');
    const base = slugify(title) || 'meet';
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await supabase
      .from('calendar_scheduling_links')
      .insert({
        user_id: user.id,
        slug,
        title,
        duration_minutes: durationMinutes,
        create_meeting: true,
      })
      .select()
      .single();

    if (error) throw error;
    setLinks((prev) => [data, ...prev]);
    toast({ title: 'Scheduling link created' });
    return data;
  };

  const toggleLink = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('calendar_scheduling_links')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: isActive } : l)));
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from('calendar_scheduling_links').delete().eq('id', id);
    if (error) throw error;
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const bookingUrl = (slug: string) => `${SITE_URL.replace(/\/$/, '')}/calendar/book/${slug}`;

  useEffect(() => {
    if (user) fetchLinks();
  }, [user, fetchLinks]);

  return { links, loading, createLink, toggleLink, deleteLink, bookingUrl, refetch: fetchLinks };
};

export async function fetchPublicSchedulingLink(slug: string): Promise<SchedulingLink | null> {
  const { data, error } = await supabase
    .from('calendar_scheduling_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
