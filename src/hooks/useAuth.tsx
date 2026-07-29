import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { signOutRegalMail } from '@/services/regalMailAuth';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

function normalizeProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row || typeof row.id !== 'string') return null;
  const displayName =
    (typeof row.display_name === 'string' && row.display_name.trim()) ||
    (typeof row.full_name === 'string' && row.full_name.trim()) ||
    null;
  return {
    id: row.id,
    display_name: displayName,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
  };
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const { logUserSignIn, logUserSignOut } = usePlatformLogging();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      if (data) {
        setProfile(normalizeProfile(data as Record<string, unknown>));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userRef.current?.id) {
      await fetchProfile(userRef.current.id);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null, event?: string) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      userRef.current = nextSession?.user ?? null;
      setLoading(false);

      if (nextSession?.user) {
        void fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }

      if (event === 'SIGNED_IN') {
        setTimeout(() => logUserSignIn(nextSession?.user?.id), 500);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        userRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      applySession(nextSession, event);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Auth session error:', error);
          setLoading(false);
          return;
        }
        applySession(initialSession);
      })
      .catch((error) => {
        console.error('Auth initialization error:', error);
        if (mounted) setLoading(false);
      });

    const safetyTimer = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile, logUserSignIn]);

  const signOut = useCallback(async () => {
    const currentUser = userRef.current;
    try {
      if (currentUser) {
        await logUserSignOut(currentUser.id);
      }

      localStorage.removeItem('currentMeeting');
      localStorage.removeItem('recentMeetings');
      sessionStorage.removeItem('was-in-meeting');

      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('meeting-') || key.includes('participant')) {
          localStorage.removeItem(key);
        }
      });

      await signOutRegalMail();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  }, [logUserSignOut]);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
