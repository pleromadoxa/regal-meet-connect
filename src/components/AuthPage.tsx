import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, User, Video, Shield, Zap, Globe, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import authHero from '@/assets/auth-hero.jpg';
import logo from '@/assets/regal-logo.png';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { logActivity } = usePlatformLogging();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'Successfully signed in to Regal Meet' });
        onAuthSuccess();
      } else {
        const redirectUrl =
          window.location.hostname === 'localhost'
            ? `${window.location.origin}/`
            : 'http://meeting.lwteensministrytrainingportal.org/';
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
        });
        if (error) throw error;
        setTimeout(() => logActivity('user_signup', undefined), 1000);
        // Fire-and-forget welcome email; don't block UX if not configured
        supabase.functions
          .invoke('send-welcome-email', { body: { email, name: displayName } })
          .catch((err) => console.warn('Welcome email failed:', err));
        toast({ title: 'Account Created!', description: 'Welcome to Regal Meeting — check your inbox.' });
      }
    } catch (error: any) {
      toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: 'Enterprise Security', color: 'text-emerald-400' },
    { icon: Zap, label: 'Lightning Fast', color: 'text-orange-400' },
    { icon: Globe, label: 'Global Network', color: 'text-blue-400' },
    { icon: Camera, label: 'HD Video & Audio', color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0612]">
      {/* Left panel: form */}
      <div className="relative flex-1 flex flex-col px-6 sm:px-10 lg:px-16 py-8 bg-gradient-to-br from-[#0a0612] via-[#0d0818] to-[#160a26]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Regal Meeting" className="h-11 w-11 rounded-xl shadow-lg shadow-orange-500/30" />
          <span className="text-white font-bold text-xl tracking-tight">Regal Meeting</span>
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
                  <label className="text-sm font-semibold text-white/90">Password</label>
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

                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-center text-sm text-white/50 hover:text-white transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-white/30">
          © 2026 Regal Meeting. All rights reserved.
        </div>
      </div>

      {/* Right panel: hero image + features */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-end overflow-hidden">
        <img
          src={authHero}
          alt="Regal Meeting video call experience"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0612] via-transparent to-transparent" />

        <div className="relative z-10 p-10 xl:p-16 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Connect with your team
              <br />
              anywhere, anytime.
            </h2>
            <p className="mt-4 text-white/70 max-w-lg">
              Experience crystal clear video, seamless collaboration, and enterprise-grade security
              for all your meetings.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xl">
            {features.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10"
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-white text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
