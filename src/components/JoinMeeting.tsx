
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Video, UserPlus } from 'lucide-react';

interface JoinMeetingProps {
  onJoinMeeting: (name: string, roomId: string, isHost: boolean) => void;
}

export const JoinMeeting = ({ onJoinMeeting }: JoinMeetingProps) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostRoomId, setHostRoomId] = useState('');

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 12).toUpperCase();
    setHostRoomId(id);
  };

  const handleJoinMeeting = () => {
    onJoinMeeting(name, roomId, false);
  };

  const handleStartMeeting = () => {
    onJoinMeeting(hostName, hostRoomId, true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl shadow-2xl">
              <Crown className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white drop-shadow-2xl mb-4">
            Regal Meet
          </h1>
          <p className="text-xl text-blue-200 font-medium">
            Professional video conferencing made simple
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Join Meeting Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-blue-300" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                Join Meeting
              </CardTitle>
              <p className="text-blue-200 font-medium">
                Enter an existing meeting
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">
                  Your Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-white/20 border-white/30 text-white placeholder-white/80 h-14 text-lg font-medium rounded-xl focus:bg-white/25 focus:border-white/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">
                  Meeting ID
                </label>
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter meeting ID"
                  className="bg-white/20 border-white/30 text-white placeholder-white/80 h-14 text-lg font-medium rounded-xl focus:bg-white/25 focus:border-white/50 transition-all"
                />
              </div>
              <Button
                onClick={handleJoinMeeting}
                disabled={!name.trim() || !roomId.trim()}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Join Meeting
              </Button>
            </CardContent>
          </Card>

          {/* Host Meeting Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-orange-300" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                Host Meeting
              </CardTitle>
              <p className="text-orange-200 font-medium">
                Start your own meeting
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">
                  Your Name
                </label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-white/20 border-white/30 text-white placeholder-white/80 h-14 text-lg font-medium rounded-xl focus:bg-white/25 focus:border-white/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">
                  Meeting ID
                </label>
                <div className="flex space-x-3">
                  <Input
                    value={hostRoomId}
                    onChange={(e) => setHostRoomId(e.target.value.toUpperCase())}
                    placeholder="Auto-generated ID"
                    className="bg-white/20 border-white/30 text-white placeholder-white/80 h-14 text-lg font-medium rounded-xl focus:bg-white/25 focus:border-white/50 transition-all flex-1"
                  />
                  <Button
                    onClick={generateRoomId}
                    variant="outline"
                    className="h-14 px-6 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50 font-semibold rounded-xl transition-all"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleStartMeeting}
                disabled={!hostName.trim() || !hostRoomId.trim()}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Crown className="h-5 w-5 mr-3" />
                Start Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
