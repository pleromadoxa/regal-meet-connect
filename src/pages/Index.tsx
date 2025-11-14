
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video, Users, Shield, Zap } from 'lucide-react';
import { Footer } from '@/components/Footer';
import heroImage from '@/assets/hero-conference.png';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 md:py-6 safe-area-inset-top">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="h-6 w-6 md:h-8 md:w-8 text-orange-400" />
            <span className="text-xl md:text-2xl font-bold text-white">Regal Meet</span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:text-orange-400 hidden sm:flex"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:text-orange-400 hidden sm:flex"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
                <Button 
                  variant="premium"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-24 text-center">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight animate-fade-in">
            Connect Beyond
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"> Distance</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6 font-medium animate-fade-in" style={{animationDelay: '0.1s'}}>
            Powered By the LoveWorld Teens and Youth Ministry
          </p>
          <p className="text-lg md:text-xl text-slate-300 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 animate-fade-in" style={{animationDelay: '0.2s'}}>
            Experience crystal-clear video conferences with real-time captions, 
            seamless screen sharing, and enterprise-grade security. 
            Your meetings, elevated.
          </p>
          
          {/* Hero Image */}
          <div className="mb-12 md:mb-16 animate-scale-in" style={{animationDelay: '0.3s'}}>
            <img 
              src={heroImage} 
              alt="Video conference with diverse participants" 
              className="rounded-2xl shadow-2xl mx-auto max-w-full md:max-w-4xl hover-scale"
            />
          </div>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="glass-morphism rounded-2xl p-6 md:p-8 hover-lift animate-fade-in" style={{animationDelay: '0.4s'}}>
              <Users className="h-10 w-10 md:h-12 md:w-12 text-orange-400 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">HD Video Quality</h3>
              <p className="text-slate-300 text-sm md:text-base">Crystal clear video and audio for professional meetings</p>
            </div>
            <div className="glass-morphism rounded-2xl p-6 md:p-8 hover-lift animate-fade-in" style={{animationDelay: '0.5s'}}>
              <Shield className="h-10 w-10 md:h-12 md:w-12 text-orange-400 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Secure & Private</h3>
              <p className="text-slate-300 text-sm md:text-base">End-to-end encryption keeps your conversations safe</p>
            </div>
            <div className="glass-morphism rounded-2xl p-6 md:p-8 hover-lift animate-fade-in" style={{animationDelay: '0.6s'}}>
              <Zap className="h-10 w-10 md:h-12 md:w-12 text-orange-400 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-slate-300 text-sm md:text-base">Join meetings instantly with no downloads required</p>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
