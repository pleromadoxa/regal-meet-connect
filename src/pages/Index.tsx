
import { useState, useEffect } from 'react';
import { VideoConference } from '@/components/VideoConference';
import { AuthPage } from '@/components/AuthPage';
import { AdminAccessButton } from '@/components/AdminAccessButton';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';
import { CreateMeetingSection } from '@/components/landing/CreateMeetingSection';
import Dashboard from './Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Sparkles, Zap, Shield, Stars, Heart, Rocket } from 'lucide-react';

const Index = () => {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const { isAuthenticated, loading, user } = useAuth();
  const { toast } = useToast();

  // Check for active meeting on component mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const storedMeeting = localStorage.getItem('currentMeeting');
      
      if (storedMeeting) {
        try {
          const meetingData = JSON.parse(storedMeeting);
          const timeElapsed = Date.now() - meetingData.timestamp;
          const sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
          
          // Check if session is still valid and user matches
          if (timeElapsed < sessionTimeout && meetingData.userId === user.id) {
            console.log('Resuming previous meeting session:', meetingData);
            setMeetingId(meetingData.meetingId);
            setUserName(meetingData.userName);
            setIsHost(meetingData.isHost);
            setIsInMeeting(true);
            
            toast({
              title: "Rejoining Meeting",
              description: `Returning to meeting: ${meetingData.meetingId}`
            });
          } else {
            // Clear expired session
            localStorage.removeItem('currentMeeting');
          }
        } catch (error) {
          console.error('Error parsing stored meeting data:', error);
          localStorage.removeItem('currentMeeting');
        }
      }
    }
  }, [isAuthenticated, user?.id, toast]);

  const handleJoinMeeting = (name: string, roomId: string, hostStatus: boolean = false) => {
    if (!name.trim() || !roomId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and meeting ID",
        variant: "destructive"
      });
      return;
    }
    
    setUserName(name);
    setMeetingId(roomId);
    setIsHost(hostStatus);
    setIsInMeeting(true);
    setShowDashboard(false);
    
    toast({
      title: "Joining Meeting",
      description: `Welcome to Regal Meet, ${name}!${hostStatus ? ' You are the host.' : ''}`
    });
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    setMeetingId('');
    setUserName('');
    setIsHost(false);
    
    toast({
      title: "Meeting Ended",
      description: "You have left the meeting"
    });
  };

  const handleAuthSuccess = () => {
    toast({
      title: "Authentication Successful",
      description: "Welcome to Regal Meet!"
    });
  };

  const handleNavigateToDashboard = () => {
    setIsInMeeting(false);
    setShowDashboard(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-pink-600/20 animate-pulse"></div>
        <div className="relative z-10">
          <div className="w-24 h-24 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-purple-400/20 border-b-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-pink-400/10 border-l-pink-400 rounded-full animate-spin animation-delay-300"></div>
          <div className="text-white text-2xl mt-12 text-center animate-pulse font-bold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (isInMeeting) {
    return (
      <VideoConference 
        meetingId={meetingId}
        userName={userName}
        isHost={isHost}
        onLeaveMeeting={handleLeaveMeeting}
        onNavigateToDashboard={handleNavigateToDashboard}
      />
    );
  }

  if (showDashboard) {
    return <Dashboard onJoinMeeting={handleJoinMeeting} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Dark Background with Multiple Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Primary gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700/40 via-transparent to-purple-700/40 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-purple-700/50 via-transparent to-pink-700/40 animation-delay-1000 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-pink-700/40 via-transparent to-blue-700/40 animation-delay-500 animate-pulse"></div>
      </div>

      {/* Enhanced Floating Elements with Better Contrast */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large glowing orbs with stronger colors */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-r from-blue-500/40 to-purple-500/40 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-32 right-32 w-56 h-56 bg-gradient-to-r from-pink-500/40 to-orange-500/40 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 rounded-full blur-2xl animate-float-slow"></div>
        <div className="absolute top-1/4 right-1/4 w-28 h-28 bg-gradient-to-r from-yellow-500/40 to-red-500/40 rounded-full blur-xl animate-bounce-slow"></div>
        
        {/* Enhanced sparkling particles */}
        <div className="absolute top-1/5 left-1/2 w-3 h-3 bg-blue-400/90 rounded-full animate-ping animation-delay-300"></div>
        <div className="absolute top-3/5 left-1/4 w-2 h-2 bg-purple-400/90 rounded-full animate-ping animation-delay-700"></div>
        <div className="absolute top-1/3 left-3/4 w-4 h-4 bg-pink-400/90 rounded-full animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-2/3 w-2 h-2 bg-emerald-400/90 rounded-full animate-ping animation-delay-500"></div>
        
        {/* Floating icons with better visibility */}
        <Stars className="absolute top-1/6 right-1/6 h-6 w-6 text-yellow-400/80 animate-pulse animation-delay-400" />
        <Stars className="absolute bottom-1/3 left-1/5 h-4 w-4 text-blue-400/80 animate-pulse animation-delay-800" />
        <Heart className="absolute top-2/3 right-1/3 h-5 w-5 text-pink-400/80 animate-bounce-gentle animation-delay-600" />
      </div>

      {/* Enhanced Glass Mesh Overlay with Better Opacity */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/15 via-transparent to-transparent"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 30%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 30%),
            radial-gradient(circle at 60% 20%, rgba(255,255,255,0.12) 0%, transparent 25%),
            linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)
          `
        }}></div>
      </div>

      <div className="relative z-10">
        {/* Premium Header with Enhanced Glass Effect */}
        <div className="absolute top-8 right-8 z-20 flex space-x-4">
          <Button
            onClick={() => setShowDashboard(true)}
            variant="outline"
            size="lg"
            className="bg-white/20 backdrop-blur-3xl border-white/40 text-white/95 hover:bg-white/30 hover:border-white/60 shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-blue-500/30 font-semibold text-lg px-6 py-3"
          >
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </Button>
          <div className="relative group">
            <AdminAccessButton />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>

        {/* Spectacular Hero Section with Enhanced Contrast */}
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-8xl space-y-16">
            {/* Enhanced Hero Content with Stronger Background */}
            <div className="text-center mb-20 relative">
              {/* Stronger background for hero text */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 rounded-3xl blur-3xl animate-pulse scale-110"></div>
              
              <div className="relative z-10">
                <h1 className="text-8xl md:text-9xl font-black mb-8 relative">
                  <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent animate-gradient bg-400% drop-shadow-2xl">
                    Regal Meet
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent blur-2xl opacity-60 animate-pulse"></div>
                </h1>
                
                <div className="space-y-6">
                  <p className="text-3xl md:text-4xl text-white font-bold drop-shadow-xl animate-fade-in">
                    Connect with anyone, anywhere
                  </p>
                  <p className="text-xl md:text-2xl text-blue-100/95 font-semibold drop-shadow-lg animate-fade-in animation-delay-300">
                    Professional video conferencing made <span className="text-pink-300 font-bold">beautiful</span>
                  </p>
                </div>

                {/* Enhanced feature badges with better contrast */}
                <div className="flex justify-center flex-wrap gap-8 mt-10">
                  <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/30 animate-bounce-gentle shadow-lg">
                    <Sparkles className="h-6 w-6 text-yellow-300" />
                    <span className="text-white font-semibold text-lg">Premium Quality</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/30 animate-bounce-gentle animation-delay-200 shadow-lg">
                    <Zap className="h-6 w-6 text-blue-300" />
                    <span className="text-white font-semibold text-lg">Lightning Fast</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/30 animate-bounce-gentle animation-delay-400 shadow-lg">
                    <Shield className="h-6 w-6 text-emerald-300" />
                    <span className="text-white font-semibold text-lg">Ultra Secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Meeting Options with Better Backgrounds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <div className="transform hover:scale-105 transition-all duration-700 hover:rotate-1 hover:shadow-2xl hover:shadow-blue-500/30">
                <QuickJoinSection onJoinMeeting={handleJoinMeeting} />
              </div>
              <div className="transform hover:scale-105 transition-all duration-700 hover:-rotate-1 hover:shadow-2xl hover:shadow-orange-500/30">
                <CreateMeetingSection onJoinMeeting={handleJoinMeeting} />
              </div>
            </div>

            {/* Spectacular Features Showcase */}
            <div className="text-center mt-24">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in">
                Why Choose <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">Regal Meet?</span>
              </h2>
              <p className="text-xl text-blue-100/90 mb-16 animate-fade-in animation-delay-300">Experience the future of video conferencing</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                {[
                  { 
                    emoji: "🎥", 
                    title: "4K Ultra HD", 
                    desc: "Crystal clear video quality", 
                    delay: "0ms",
                    gradient: "from-blue-500/20 to-cyan-500/20",
                    hoverGradient: "from-blue-400/30 to-cyan-400/30"
                  },
                  { 
                    emoji: "🔒", 
                    title: "Military Grade Security", 
                    desc: "End-to-end encrypted calls", 
                    delay: "200ms",
                    gradient: "from-emerald-500/20 to-green-500/20",
                    hoverGradient: "from-emerald-400/30 to-green-400/30"
                  },
                  { 
                    emoji: "⚡", 
                    title: "Instant Connection", 
                    desc: "Zero-delay, lightning fast", 
                    delay: "400ms",
                    gradient: "from-yellow-500/20 to-orange-500/20",
                    hoverGradient: "from-yellow-400/30 to-orange-400/30"
                  }
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className={`group relative p-10 rounded-3xl bg-white/8 backdrop-blur-3xl border border-white/20 hover:bg-white/15 hover:border-white/40 transition-all duration-700 hover:scale-110 hover:shadow-3xl transform hover:-translate-y-2`}
                    style={{ animationDelay: feature.delay }}
                  >
                    {/* Dynamic background gradients */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.hoverGradient} rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`}></div>
                    
                    <div className="relative z-10">
                      <div className="text-6xl mb-6 transform group-hover:scale-125 transition-transform duration-500 animate-bounce-gentle">
                        {feature.emoji}
                      </div>
                      <h3 className="font-bold text-2xl mb-4 text-white group-hover:text-blue-200 transition-colors duration-500">
                        {feature.title}
                      </h3>
                      <p className="text-white/80 group-hover:text-white/95 transition-colors duration-500 font-medium text-lg">
                        {feature.desc}
                      </p>
                    </div>
                    
                    {/* Enhanced glow effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action Section */}
            <div className="text-center mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-3xl blur-3xl"></div>
              <div className="relative z-10 p-12">
                <Rocket className="h-16 w-16 text-orange-300 mx-auto mb-6 animate-bounce-gentle" />
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to get started?
                </h3>
                <p className="text-xl text-blue-100/90 mb-8">
                  Join thousands of users who trust Regal Meet for their video conferencing needs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
