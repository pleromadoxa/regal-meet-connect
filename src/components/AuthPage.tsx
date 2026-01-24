
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Mail, Lock, User, Shield, Zap, Globe } from 'lucide-react';
import { Footer } from './Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlatformLogging } from '@/hooks/usePlatformLogging';
import heroImage from '@/assets/hero-conference.png';

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully signed in to Regal Meet"
        });
        onAuthSuccess();
      } else {
        // Use the live domain for email redirects
        const redirectUrl = window.location.hostname === 'localhost' 
          ? `${window.location.origin}/` 
          : 'http://meeting.lwteensministrytrainingportal.org/';
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: displayName
            }
          }
        });

        if (error) throw error;

        // Log user signup activity (not sign in - that's handled in useAuth)
        if (!isLogin) {
          setTimeout(() => logActivity('user_signup', undefined), 1000);
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account"
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-orange-500/30 grid lg:grid-cols-2">
      {/* Left Column - Form */}
      <div className="flex flex-col justify-between relative overflow-hidden p-6 sm:p-12">
        {/* Background Gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[128px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[128px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg shadow-orange-500/20">
              <Video className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Regal Meet</span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto relative z-10 my-12 animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400">
              {isLogin ? 'Enter your details to sign in' : 'Start your journey with us today'}
            </p>
          </div>

          <Card className="bg-slate-900/50 backdrop-blur-lg border-white/10 shadow-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleAuth} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Display Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-orange-400 transition-colors" />
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all h-11"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-orange-400 transition-colors" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-orange-400 transition-colors" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all h-11"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-slate-400 hover:text-white transition-colors text-sm font-medium hover:underline underline-offset-4"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-slate-500 text-xs relative z-10">
          &copy; {new Date().getFullYear()} Regal Meet. All rights reserved.
        </div>
      </div>

      {/* Right Column - Hero Image */}
      <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-purple-700/20 z-10"></div>
        <img
          src={heroImage}
          alt="Conference"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-20"></div>

        <div className="absolute bottom-0 left-0 right-0 p-12 z-30 space-y-6">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Connect with your team anywhere, anytime.
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Experience crystal clear video, seamless collaboration, and enterprise-grade security for all your meetings.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-slate-200 bg-white/5 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-sm font-medium">Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-200 bg-white/5 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                <Zap className="h-5 w-5 text-orange-400" />
                <span className="text-sm font-medium">Lightning Fast</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-200 bg-white/5 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                <Globe className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">Global Network</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-200 bg-white/5 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                <Video className="h-5 w-5 text-purple-400" />
                <span className="text-sm font-medium">HD Video & Audio</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
