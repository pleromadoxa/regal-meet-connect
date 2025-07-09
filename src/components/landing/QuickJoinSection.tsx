
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users } from 'lucide-react';
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
    <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl font-bold flex items-center justify-center gap-3">
          <Video className="h-8 w-8 text-blue-400" />
          Join Meeting
        </CardTitle>
        <p className="text-blue-200 mt-2">Enter your details to join an existing meeting</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium text-white/90 mb-2 block">Your Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 h-12"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-white/90 mb-2 block">Meeting ID</label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter meeting ID..."
            className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 h-12"
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={handleJoin}
            disabled={!name.trim() || !roomId.trim() || isLoading}
            className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
          >
            <Video className="h-5 w-5 mr-3" />
            {isLoading ? 'Validating...' : 'Join Meeting'}
          </Button>
          
          <Button
            onClick={generateRoomId}
            variant="outline"
            className="w-full h-12 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold backdrop-blur-sm"
          >
            <Users className="h-5 w-5 mr-2" />
            Generate Meeting ID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
