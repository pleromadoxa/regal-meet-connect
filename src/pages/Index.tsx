
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video, Users, Shield, Zap, CheckCircle2, Globe, Heart } from 'lucide-react';
import { Footer } from '@/components/Footer';
import heroImage from '@/assets/hero-conference.png';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const joinMeetingId = searchParams.get('join');
    if (user) {
      if (joinMeetingId) {
        navigate(`/meeting/${joinMeetingId}`);
      } else {
        navigate('/dashboard');
      }
    } else if (joinMeetingId) {
      navigate(`/meeting/${joinMeetingId}`);
    }
  }, [user, navigate, searchParams]);


  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-slate-100 font-sans selection:bg-orange-500/30">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[128px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[128px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
              <Video className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Regal Meeting</span>
          </div>

          <div className="flex items-center space-x-3 md:space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              {['Features', 'Security', 'About'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                  {item}
                </a>
              ))}
            </nav>
            <div className="w-px h-6 bg-white/10 hidden md:block"></div>
            {user ? (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Sign In
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 transition-all hover:scale-105"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 md:pt-32 md:pb-24">
        {/* Hero Section */}
        <section className="container mx-auto px-4 text-center mb-24 md:mb-32">
          <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Premium Video Meetings <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
                With Regal Meeting
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Experience the next generation of video conferencing with Regal Meeting. Crystal clear audio,
              HD video, and collaborative tools designed for professional and meaningful connections.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto h-12 px-8 bg-white text-slate-950 hover:bg-slate-200 font-semibold text-lg transition-all hover:scale-105"
              >
                Start Meeting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-lg transition-all"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 md:mt-24 relative max-w-6xl mx-auto animate-fade-in-up delay-200">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm group">
              <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img
                src={heroImage}
                alt="App Interface"
                className="w-full h-auto transform transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>

            {/* Floating Stats Cards */}
            <div className="hidden md:block absolute -right-8 top-1/4 bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-xl animate-float">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Security</p>
                  <p className="text-sm font-bold text-white">End-to-End Encrypted</p>
                </div>
              </div>
            </div>

            <div className="hidden md:block absolute -left-8 bottom-1/4 bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-xl animate-float" style={{animationDelay: '1.5s'}}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Globe className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Global</p>
                  <p className="text-sm font-bold text-white">Low Latency Network</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 mb-24 md:mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Regal Meeting?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Built with the latest WebRTC technology to ensure your meetings run smoothly,
              securely, and efficiently. The professional choice for video conferencing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Users className="h-8 w-8 text-orange-400" />,
                title: "Crystal Clear Quality",
                desc: "1080p video and HD audio powered by advanced compression algorithms."
              },
              {
                icon: <Shield className="h-8 w-8 text-purple-400" />,
                title: "Secure by Design",
                desc: "Your privacy is our priority with enterprise-grade encryption standards."
              },
              {
                icon: <Zap className="h-8 w-8 text-pink-400" />,
                title: "Instant Access",
                desc: "No downloads required. Join meetings directly from your browser."
              },
              {
                icon: <Globe className="h-8 w-8 text-blue-400" />,
                title: "Global Infrastructure",
                desc: "Distributed servers worldwide ensure minimal latency wherever you are."
              },
              {
                icon: <Heart className="h-8 w-8 text-red-400" />,
                title: "Built with Care",
                desc: "Designed specifically for ministry and community connection."
              },
              {
                icon: <CheckCircle2 className="h-8 w-8 text-green-400" />,
                title: "Rich Features",
                desc: "Screen sharing, chat, reactions, and more included out of the box."
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                <div className="mb-4 p-3 bg-white/5 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="container mx-auto px-4 mb-24">
          <div className="bg-gradient-to-r from-orange-600 to-purple-700 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 pattern-grid-lg opacity-20"></div>
            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to transform your meetings?
              </h2>
              <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                Join thousands of users experiencing the future of connection.
                Free to start, no credit card required.
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-white text-purple-700 hover:bg-slate-100 font-bold text-lg h-14 px-10 rounded-full shadow-2xl transition-transform hover:scale-105"
              >
                Get Started Now
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
