
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users, Crown, LogOut, Shield, Plus, Shuffle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPanel } from './AdminPanel';

interface JoinMeetingProps {
  onJoinMeeting: (name: string, roomId: string) => void;
}

export const JoinMeeting = ({ onJoinMeeting }: JoinMeetingProps) => {
  const [roomId, setRoomId] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const { profile, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const generateRoomId = () => {
    // Generate shorter 4-character room ID
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(id);
  };

  const createNewMeeting = () => {
    // Generate a new meeting ID and join immediately
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    if (profile?.display_name) {
      onJoinMeeting(profile.display_name, id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.display_name && roomId) {
      onJoinMeeting(profile.display_name, roomId);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (showAdmin && isAdmin) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header with Admin and Sign Out */}
        <div className="flex justify-between items-center">
          {isAdmin && !adminLoading && (
            <Button
              onClick={() => setShowAdmin(true)}
              variant="outline"
              className="bg-orange-500/20 border-orange-400 text-orange-100 hover:bg-orange-400/30 font-medium backdrop-blur-sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
          )}
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-white/20 border-white text-white hover:bg-white/30 font-medium ml-auto backdrop-blur-sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Regal Meet</h1>
              <p className="text-blue-200">Premium Video Conferencing</p>
            </div>
          </div>
          {profile?.display_name && (
            <p className="text-white/80">Welcome back, {profile.display_name}!</p>
          )}
        </div>

        {/* Create New Meeting Button */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-6">
            <Button
              onClick={createNewMeeting}
              disabled={!profile?.display_name}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-lg transition-all duration-200 transform hover:scale-105 mb-4"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Meeting
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-900 px-2 text-white/60">or</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join Existing Meeting Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white flex items-center justify-center space-x-2">
              <Video className="h-6 w-6" />
              <span>Join Meeting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="roomId" className="text-sm font-medium text-blue-100">
                  Meeting ID
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="roomId"
                    type="text"
                    placeholder="Enter meeting ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-orange-400"
                    required
                  />
                  <Button
                    type="button"
                    onClick={generateRoomId}
                    variant="outline"
                    className="bg-blue-500/20 border-blue-400 text-blue-100 hover:bg-blue-400/30 font-medium backdrop-blur-sm"
                  >
                    <Shuffle className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!profile?.display_name || !roomId}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <Users className="h-5 w-5 mr-2" />
                Join Meeting
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="text-blue-200">
            <Video className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">HD Video</p>
          </div>
          <div className="text-blue-200">
            <Users className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Multi-User</p>
          </div>
          <div className="text-blue-200">
            <Crown className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Premium Quality</p>
          </div>
        </div>
      </div>
    </div>
  );
};
