

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let isInitialized = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Only fetch profile if we don't already have it or if user changed
            if (!profile || profile.id !== session.user.id) {
              try {
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
                
                if (profileError && profileError.code !== 'PGRST116') {
                  console.error('Error fetching profile:', profileError);
                } else if (profileData) {
                  setProfile(profileData);
                }
              } catch (error) {
                console.error('Error fetching profile:', error);
              }
            }
          } else {
            setProfile(null);
          }
          
          if (!isInitialized) {
            setLoading(false);
            isInitialized = true;
          }
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (mounted && session) {
          setSession(session);
          setUser(session.user);
          
          // Fetch user profile only if we have a session
          if (session.user) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching profile:', profileError);
              } else if (profileData) {
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }
          }
        }
        
        if (mounted && !isInitialized) {
          setLoading(false);
          isInitialized = true;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted && !isInitialized) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          isInitialized = true;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user
  };
};
