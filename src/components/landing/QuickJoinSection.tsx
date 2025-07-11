
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users, Sparkles, Play } from 'lucide-react';
import { useMeetingValidation } from '@/hooks/useMeetingValidation';

interface QuickJoinSectionProps {
  onJoinMeeting: (name: string, roomId: string, isHost: boolean) => void;
}

export const QuickJoinSection = ({ onJoinMeeting }: QuickJoinSectionProps) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { validateMeetingId } = useMeetingValidation();

  const handleJoin = async () => {
    if (!name.trim() || !roomId.trim()) return;
    
    setIsLoading(true);
    
    try {
      const isValid = await validateMeetingId(roomId);
      if (isValid) {
        onJoinMeeting(name.trim(), roomId.trim(), false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateRoomId = () => {
    const newRoomId = Math.random().toString(36).substring(2, 12).toUpperCase();
    setRoomId(newRoomId);
  };

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-600/30 to-cyan-600/30 backdrop-blur-3xl border border-blue-300/50 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/30 transition-all duration-700 hover:scale-[1.02] hover:border-blue-300/70">
      {/* Enhanced background effects with stronger colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/20 to-transparent animate-pulse"></div>
      
      {/* Enhanced floating particles */}
      <div className="absolute top-6 right-6 w-3 h-3 bg-blue-300/90 rounded-full animate-ping"></div>
      <div className="absolute bottom-10 left-8 w-2 h-2 bg-cyan-300/90 rounded-full animate-pulse animation-delay-1000"></div>
      <div className="absolute top-1/2 right-4 w-1 h-1 bg-white/80 rounded-full animate-ping animation-delay-500"></div>
      
      <CardHeader className="text-center relative z-10 pb-8">
        <CardTitle className="text-white text-3xl font-bold flex items-center justify-center gap-4 group-hover:text-blue-200 transition-colors duration-500">
          <div className="relative">
            <Video className="h-10 w-10 text-blue-300 group-hover:text-blue-200 transition-colors duration-500 animate-pulse" />
            <div className="absolute inset-0 h-10 w-10 text-blue-300 blur-sm opacity-50 animate-ping"></div>
          </div>
          <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
            Join Meeting
          </span>
        </CardTitle>
        <p className="text-blue-100/95 mt-4 font-semibold text-lg drop-shadow-sm group-hover:text-blue-50 transition-colors duration-500">
          Enter your details to join an existing meeting
        </p>
      </CardHeader>
      
      <CardContent className="space-y-10 relative z-10 px-8 pb-8">
        <div className="space-y-4">
          <label className="text-sm font-bold text-white/95 mb-4 block flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-lg">Your Name</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="bg-white/25 backdrop-blur-xl border-white/50 text-white placeholder-white/80 focus:border-blue-300/80 focus:ring-2 focus:ring-blue-300/40 h-16 text-xl font-semibold hover:bg-white/30 transition-all duration-500 focus:shadow-xl focus:shadow-blue-500/30 rounded-xl"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div className="space-y-4">
          <label className="text-sm font-bold text-white/95 mb-4 block flex items-center gap-3">
            <Video className="h-5 w-5 text-blue-300" />
            <span className="text-lg">Meeting ID</span>
          </label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter meeting ID..."
            className="bg-white/25 backdrop-blur-xl border-white/50 text-white placeholder-white/80 focus:border-blue-300/80 focus:ring-2 focus:ring-blue-300/40 h-16 text-xl font-semibold hover:bg-white/30 transition-all duration-500 focus:shadow-xl focus:shadow-blue-500/30 rounded-xl"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div className="space-y-6 pt-6">
          <Button
            onClick={handleJoin}
            disabled={!name.trim() || !roomId.trim() || isLoading}
            className="relative w-full h-18 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-2xl shadow-2xl hover:shadow-3xl hover:shadow-blue-500/50 transform hover:scale-[1.02] transition-all duration-500 border-0 overflow-hidden group/btn rounded-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10 flex items-center justify-center gap-4 py-2">
              <Play className="h-7 w-7 animate-pulse" />
              <span>{isLoading ? 'Validating...' : 'Join Meeting'}</span>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
          </Button>
          
          <Button
            onClick={generateRoomId}
            variant="outline"
            className="w-full h-16 border-white/60 bg-white/15 backdrop-blur-xl text-white hover:bg-white/25 hover:border-white/80 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] group/gen rounded-xl"
          >
            <Users className="h-6 w-6 mr-4 group-hover/gen:animate-bounce" />
            <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text">
              Generate Meeting ID
            </span>
          </Button>
        </div>
      </CardContent>
      
      {/* Enhanced corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-400/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-cyan-400/30 to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
    </Card>
  );
};
