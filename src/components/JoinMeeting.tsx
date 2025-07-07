
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Dice6, UserPlus, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminPanel } from '@/components/AdminPanel';

interface JoinMeetingProps {
  onJoinMeeting: (name: string, meetingId: string) => void;
}

export const JoinMeeting = ({ onJoinMeeting }: JoinMeetingProps) => {
  const [name, setName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, loading } = useAdmin();

  const generateMeetingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMeetingId(result);
  };

  const handleJoinMeeting = () => {
    if (name.trim() && meetingId.trim()) {
      onJoinMeeting(name, meetingId);
    }
  };

  const handleCreateMeeting = () => {
    if (name.trim()) {
      generateMeetingId();
      setTimeout(() => {
        if (meetingId) {
          onJoinMeeting(name, meetingId);
        }
      }, 100);
    }
  };

  if (showAdmin && isAdmin) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full">
              <Crown className="h-12 w-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Regal Meet</h1>
            <p className="text-blue-200">Premium video conferencing experience</p>
          </div>
        </div>

        {/* User Controls */}
        {user && (
          <div className="flex justify-center space-x-3">
            {isAdmin && !loading && (
              <Button
                onClick={() => setShowAdmin(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg backdrop-blur-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 shadow-lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}

        {/* Main Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-white text-xl">Join a Meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="join" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/10">
                <TabsTrigger 
                  value="join" 
                  className="data-[state=active]:bg-orange-500/80 data-[state=active]:text-white text-white/70"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Meeting
                </TabsTrigger>
                <TabsTrigger 
                  value="create" 
                  className="data-[state=active]:bg-orange-500/80 data-[state=active]:text-white text-white/70"
                >
                  <Dice6 className="h-4 w-4 mr-2" />
                  Create Meeting
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-orange-400 focus:ring-orange-400"
                  />
                </div>

                <TabsContent value="join" className="space-y-4 mt-0">
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter Meeting ID"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-orange-400 focus:ring-orange-400"
                      maxLength={4}
                    />
                  </div>
                  <Button
                    onClick={handleJoinMeeting}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg"
                    disabled={!name.trim() || !meetingId.trim()}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                </TabsContent>

                <TabsContent value="create" className="space-y-4 mt-0">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="Meeting ID"
                      value={meetingId}
                      readOnly
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Button
                      onClick={generateMeetingId}
                      variant="outline"
                      className="bg-gradient-to-r from-blue-500/80 to-blue-600/80 hover:from-blue-600/90 hover:to-blue-700/90 text-white border-white/20 shadow-lg backdrop-blur-sm"
                    >
                      <Dice6 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleCreateMeeting}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg"
                    disabled={!name.trim()}
                  >
                    <Dice6 className="h-4 w-4 mr-2" />
                    Create & Join Meeting
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-blue-200/60 text-sm">
          Experience crystal-clear video calls with enterprise-grade security
        </div>
      </div>
    </div>
  );
};
