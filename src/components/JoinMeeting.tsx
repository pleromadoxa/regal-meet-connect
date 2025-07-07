
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Crown, Video, UserPlus } from 'lucide-react';

interface JoinMeetingProps {
  onJoinMeeting: (name: string, roomId: string, isHost: boolean) => void;
}

export const JoinMeeting = ({ onJoinMeeting }: JoinMeetingProps) => {
  const [userName, setUserName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostMeetingId, setHostMeetingId] = useState('');

  const generateMeetingId = () => {
    const id = Math.random().toString(36).substring(2, 12).toUpperCase();
    setHostMeetingId(id);
    return id;
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && meetingId.trim()) {
      onJoinMeeting(userName.trim(), meetingId.trim(), false);
    }
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (hostName.trim()) {
      const generatedId = hostMeetingId || generateMeetingId();
      onJoinMeeting(hostName.trim(), generatedId, true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Header */}
        <div className="lg:col-span-2 text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl shadow-2xl">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-2xl">
              Regal Meet
            </h1>
          </div>
          <p className="text-xl text-blue-200 font-medium">
            Premium video conferencing for everyone
          </p>
        </div>

        {/* Join Meeting Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-blue-500/20 rounded-full w-fit">
              <Video className="h-6 w-6 text-blue-300" />
            </div>
            <CardTitle className="text-2xl text-white font-bold">Join Meeting</CardTitle>
            <p className="text-blue-200">Enter an existing meeting</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinMeeting} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Your Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400 focus:ring-blue-400/30 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Meeting ID</label>
                <Input
                  type="text"
                  placeholder="Enter meeting ID"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400 focus:ring-blue-400/30 h-12"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Join Meeting
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Host Meeting Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-orange-500/20 rounded-full w-fit">
              <Crown className="h-6 w-6 text-orange-300" />
            </div>
            <CardTitle className="text-2xl text-white font-bold">Host Meeting</CardTitle>
            <p className="text-orange-200">Start your own meeting</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMeeting} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Your Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-orange-400 focus:ring-orange-400/30 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Meeting ID</label>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Auto-generated"
                    value={hostMeetingId}
                    onChange={(e) => setHostMeetingId(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-orange-400 focus:ring-orange-400/30 h-12"
                  />
                  <Button
                    type="button"
                    onClick={() => setHostMeetingId(generateMeetingId())}
                    variant="outline"
                    className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 px-4 h-12"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <Crown className="mr-2 h-5 w-5" />
                Start Meeting
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
