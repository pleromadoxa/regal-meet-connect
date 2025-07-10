
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
import { LayoutDashboard, Sparkles, Zap, Shield } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-purple-400/20 border-b-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="text-white text-xl mt-8 text-center animate-pulse">Loading...</div>
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
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Multiple animated gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-orange-900/20 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/30 via-transparent to-pink-900/20 animation-delay-1000 animate-pulse"></div>
      </div>

      {/* Complex Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large floating orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute top-1/4 right-1/3 w-20 h-20 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-lg animate-bounce-slow"></div>
        
        {/* Animated particles */}
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-blue-400/60 rounded-full animate-ping animation-delay-500"></div>
        <div className="absolute top-2/3 left-1/3 w-1 h-1 bg-purple-400/60 rounded-full animate-ping animation-delay-1000"></div>
        <div className="absolute top-1/4 left-3/4 w-3 h-3 bg-orange-400/60 rounded-full animate-pulse animation-delay-700"></div>
      </div>

      {/* Sophisticated Glass Mesh Overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 25%),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 25%),
            linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)
          `
        }}></div>
      </div>

      <div className="relative z-10">
        {/* Enhanced Header with Glass Effect */}
        <div className="absolute top-6 right-6 z-20 flex space-x-3">
          <Button
            onClick={() => setShowDashboard(true)}
            variant="outline"
            size="sm"
            className="bg-white/10 backdrop-blur-2xl border-white/20 text-white/90 hover:bg-white/20 hover:border-white/40 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/20"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <div className="relative">
            <AdminAccessButton />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded blur-xl opacity-50 animate-pulse"></div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-7xl space-y-12">
            {/* Enhanced Hero Section */}
            <div className="text-center mb-16 relative">
              {/* Animated background for hero text */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-orange-600/10 rounded-3xl blur-3xl animate-pulse"></div>
              
              <div className="relative z-10">
                <h1 className="text-7xl md:text-8xl font-bold mb-6 relative">
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent animate-gradient bg-300% drop-shadow-2xl">
                    Regal Meet
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent blur-lg opacity-50 animate-pulse"></div>
                </h1>
                
                <div className="space-y-4">
                  <p className="text-2xl md:text-3xl text-white font-semibold drop-shadow-lg animate-fade-in">
                    Connect with anyone, anywhere
                  </p>
                  <p className="text-lg md:text-xl text-blue-100/90 font-medium drop-shadow-md animate-fade-in animation-delay-300">
                    Professional video conferencing made simple
                  </p>
                </div>

                {/* Animated accent elements */}
                <div className="flex justify-center space-x-8 mt-8">
                  <div className="flex items-center space-x-2 text-white/80 animate-bounce-gentle">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <span className="text-sm font-medium">Premium Quality</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/80 animate-bounce-gentle animation-delay-200">
                    <Zap className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-medium">Lightning Fast</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/80 animate-bounce-gentle animation-delay-400">
                    <Shield className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium">Secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Meeting Options with Sophisticated Glass Effects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
              <div className="transform hover:scale-105 transition-all duration-500 hover:rotate-1">
                <QuickJoinSection onJoinMeeting={handleJoinMeeting} />
              </div>
              <div className="transform hover:scale-105 transition-all duration-500 hover:-rotate-1">
                <CreateMeetingSection onJoinMeeting={handleJoinMeeting} />
              </div>
            </div>

            {/* Enhanced Features Section */}
            <div className="text-center mt-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { emoji: "🎥", title: "4K Video", desc: "Ultra HD video calls", delay: "0ms" },
                  { emoji: "🔒", title: "Military Grade", desc: "End-to-end encrypted", delay: "200ms" },
                  { emoji: "⚡", title: "Instant Join", desc: "Zero-click meetings", delay: "400ms" }
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/20"
                    style={{ animationDelay: feature.delay }}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="text-5xl mb-4 transform group-hover:scale-125 transition-transform duration-300 animate-bounce-gentle">
                        {feature.emoji}
                      </div>
                      <h3 className="font-bold text-xl mb-2 text-white group-hover:text-blue-300 transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300 font-medium">
                        {feature.desc}
                      </p>
                    </div>
                    
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
