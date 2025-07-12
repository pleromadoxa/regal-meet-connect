
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video, Users, Shield, Zap } from 'lucide-react';
import { CreateMeetingSection } from '@/components/landing/CreateMeetingSection';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleJoinMeeting = (name: string, roomId: string, hostStatus?: boolean) => {
    const params = new URLSearchParams({
      userName: name,
      ...(hostStatus && { host: 'true' })
    });
    navigate(`/meeting/${roomId}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="h-8 w-8 text-orange-400" />
            <span className="text-2xl font-bold text-white">Regal Meet</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-white hover:text-orange-400"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              onClick={() => navigate('/auth')}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-white mb-6">
            Connect Beyond
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"> Distance</span>
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience crystal-clear video conferences with real-time captions, 
            seamless screen sharing, and enterprise-grade security. 
            Your meetings, elevated.
          </p>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/40">
              <Users className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">HD Video Quality</h3>
              <p className="text-slate-300">Crystal clear video and audio for professional meetings</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/40">
              <Shield className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
              <p className="text-slate-300">End-to-end encryption keeps your conversations safe</p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/40">
              <Zap className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-slate-300">Join meetings instantly with no downloads required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Join Section */}
      <QuickJoinSection onJoinMeeting={handleJoinMeeting} />

      {/* Create Meeting Section */}
      <CreateMeetingSection />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-slate-700/40">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Video className="h-6 w-6 text-orange-400" />
            <span className="text-xl font-bold text-white">Regal Meet</span>
          </div>
          <p className="text-slate-400">
            © 2024 Regal Meet. Connecting people across the globe.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
