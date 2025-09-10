

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';

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
  const { logUserSignIn, logUserSignOut } = usePlatformLogging();

  useEffect(() => {
    let mounted = true;
    let isInitializing = false;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted || isInitializing) return;

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
          
          // Log sign-in activity when it's actually a sign-in (not token refresh)
          if (event === 'SIGNED_IN') {
            setTimeout(() => logUserSignIn(), 1000); // Delay to ensure user state is set
          }
          
          if (session?.user) {
            // Only fetch profile if we don't already have it or if user changed
            if (!profile || profile.id !== session.user.id) {
              try {
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (profileError) {
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
          
          setLoading(false);
        }
      }
    );

    // Initialize auth state
    const initializeAuth = async () => {
      if (isInitializing || !mounted) return;
      
      isInitializing = true;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          throw error;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch user profile if we have a session
          if (session?.user) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (profileError) {
                console.error('Error fetching profile:', profileError);
              } else if (profileData) {
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } finally {
        isInitializing = false;
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Log sign out before clearing state
      if (user) {
        await logUserSignOut();
      }
      
      // Clear all stored meeting data first
      localStorage.removeItem('currentMeeting');
      localStorage.removeItem('recentMeetings');
      
      // Clear any other app-specific storage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meeting-') || key.includes('participant')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      // Force redirect to landing page after successful sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, try to clear local state and redirect
      localStorage.clear();
      window.location.href = '/';
    }
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
