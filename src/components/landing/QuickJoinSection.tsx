
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users, Sparkles } from 'lucide-react';
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
    <Card className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl border border-white/20 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-white/40">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/5 to-transparent animate-pulse"></div>
      
      {/* Floating particles effect */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400/60 rounded-full animate-ping"></div>
      <div className="absolute bottom-8 left-6 w-1 h-1 bg-purple-400/60 rounded-full animate-pulse animation-delay-1000"></div>
      
      <CardHeader className="text-center relative z-10 pb-6">
        <CardTitle className="text-white text-2xl font-bold flex items-center justify-center gap-3 group-hover:text-blue-300 transition-colors duration-300">
          <div className="relative">
            <Video className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300 animate-pulse" />
            <div className="absolute inset-0 h-8 w-8 text-blue-400 blur-sm opacity-50 animate-ping"></div>
          </div>
          <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Join Meeting
          </span>
        </CardTitle>
        <p className="text-blue-200/90 mt-3 font-medium drop-shadow-sm group-hover:text-blue-100 transition-colors duration-300">
          Enter your details to join an existing meeting
        </p>
      </CardHeader>
      
      <CardContent className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-white/95 mb-3 block flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Your Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="bg-white/15 backdrop-blur-xl border-white/30 text-white placeholder-white/60 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-400/30 h-14 text-lg font-medium hover:bg-white/20 transition-all duration-300 focus:shadow-lg focus:shadow-blue-500/20"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div className="space-y-3">
          <label className="text-sm font-semibold text-white/95 mb-3 block flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-400" />
            Meeting ID
          </label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter meeting ID..."
            className="bg-white/15 backdrop-blur-xl border-white/30 text-white placeholder-white/60 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-400/30 h-14 text-lg font-medium hover:bg-white/20 transition-all duration-300 focus:shadow-lg focus:shadow-blue-500/20"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleJoin}
            disabled={!name.trim() || !roomId.trim() || isLoading}
            className="relative w-full h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xl shadow-2xl hover:shadow-3xl hover:shadow-blue-500/40 transform hover:scale-[1.02] transition-all duration-300 border-0 overflow-hidden group/btn"
          >
            {/* Button background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10 flex items-center justify-center gap-4">
              <Video className="h-6 w-6 animate-pulse" />
              <span>{isLoading ? 'Validating...' : 'Join Meeting'}</span>
            </div>
            
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
          </Button>
          
          <Button
            onClick={generateRoomId}
            variant="outline"
            className="w-full h-14 border-white/40 bg-white/5 backdrop-blur-xl text-white hover:bg-white/15 hover:border-white/60 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] group/gen"
          >
            <Users className="h-5 w-5 mr-3 group-hover/gen:animate-bounce" />
            <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text">
              Generate Meeting ID
            </span>
          </Button>
        </div>
      </CardContent>
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-400/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
    </Card>
  );
};
