import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Lock, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import { RegalMailAuthButton } from '@/components/auth/RegalMailAuthButton';
import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { AuthHeroStrip } from '@/components/auth/AuthHeroStrip';
import { isRegalMailAuthAvailable } from '@/services/regalMailAuth';
import { appOrigin, COMPANY_LEGAL_NAME, COMPANY_NAME, PRODUCT_NAME } from '@/constants/site';
import logo from '@/assets/regal-logo.png';

interface AuthPageProps {
  onAuthSuccess: () => void;
  regalMailLoading?: boolean;
  redirectTo?: string;
}

export const AuthPage = ({ onAuthSuccess, regalMailLoading, redirectTo = '/dashboard' }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const { toast } = useToast();
  const { logActivity } = usePlatformLogging();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: `Successfully signed in to ${PRODUCT_NAME}` });
        onAuthSuccess();
      } else {
        const authReturnUrl = `${window.location.hostname === 'localhost' ? window.location.origin : appOrigin()}/auth?redirect=${encodeURIComponent(redirectTo)}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authReturnUrl, data: { display_name: displayName } },
        });
        if (error) throw error;
        setTimeout(() => logActivity('user_signup', undefined), 1000);
        // Fire-and-forget welcome email; don't block UX if not configured
        supabase.functions
          .invoke('send-welcome-email', { body: { email, name: displayName } })
          .catch((err) => console.warn('Welcome email failed:', err));
        toast({ title: 'Account Created!', description: `Welcome to ${PRODUCT_NAME} — check your inbox.` });
      }
    } catch (error: any) {
      toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: 'Enter your email',
        description: 'Type the email for your account, then tap Forgot password.',
        variant: 'destructive',
      });
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appOrigin()}/auth`,
      });
      if (error) throw error;
      toast({
        title: 'Reset link sent',
        description: 'Check your inbox for password reset instructions.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not send reset email';
      toast({ title: 'Reset failed', description: message, variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen-safe flex flex-col lg:flex-row bg-[#0a0612]">
      {/* Left panel: form */}
      <div className="relative flex flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-16 lg:py-8 bg-gradient-to-br from-[#0a0612] via-[#0d0818] to-[#160a26] safe-area-inset-top safe-area-inset-bottom">
        {/* Logo + back to home */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orange-500/50"
            aria-label="Regal Meeting home"
          >
            <img src={logo} alt="" className="h-11 w-11 rounded-xl shadow-lg shadow-orange-500/30" />
            <span className="text-white font-bold text-xl tracking-tight">{PRODUCT_NAME}</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-white/50">
                {isLogin ? 'Enter your details to sign in' : 'Sign up to start meeting'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
              {regalMailLoading ? (
                <div className="py-12 text-center text-white/70">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-400" />
                  <p className="text-lg font-semibold text-white mb-2">Completing Regal Mail sign-in…</p>
                  <p className="text-sm text-white/50">Linking your @regalmail.me identity to Regal Meeting</p>
                </div>
              ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/90">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/90">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white/90">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resettingPassword}
                        className="text-xs font-semibold text-orange-400 hover:text-orange-300 disabled:opacity-50"
                      >
                        {resettingPassword ? 'Sending…' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
                >
                  {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                </Button>

                {isLogin && isRegalMailAuthAvailable() && (
                  <>
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-3 text-white/40 tracking-wider">or</span>
                      </div>
                    </div>
                    <RegalMailAuthButton disabled={loading} />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-center text-sm text-white/50 hover:text-white transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>

                {!isLogin && (
                  <p className="text-center text-xs leading-relaxed text-white/40">
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" className="text-orange-400/90 hover:text-orange-300">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-orange-400/90 hover:text-orange-300">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                )}
              </form>
              )}
            </div>

            <AuthHeroStrip />
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center text-xs text-white/30 sm:mt-8">
          <p>© {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</p>
          <p>
            <Link to="/privacy" className="hover:text-white/50">Privacy</Link>
            {' · '}
            <Link to="/terms" className="hover:text-white/50">Terms</Link>
          </p>
        </div>
      </div>

      <AuthHeroPanel />
    </div>
  );
};


