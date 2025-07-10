
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, RefreshCw, Star, Zap, Rocket } from 'lucide-react';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { useToast } from '@/hooks/use-toast';

interface CreateMeetingSectionProps {
  onJoinMeeting: (name: string, roomId: string, isHost: boolean) => void;
  userName?: string;
}

export const CreateMeetingSection = ({ onJoinMeeting, userName }: CreateMeetingSectionProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [hostName, setHostName] = useState(userName || '');
  const { createMeeting } = useMeetingActions();
  const { toast } = useToast();

  const generateMeetingId = () => {
    // Generate a more unique meeting ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`.toUpperCase();
  };

  const handleCreateMeeting = async () => {
    console.log('Starting meeting creation process...');
    
    // Validation
    if (!newMeetingTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a meeting title",
        variant: "destructive"
      });
      return;
    }

    if (!hostName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingMeeting(true);
    
    try {
      const generatedId = generateMeetingId();
      console.log('Generated meeting ID:', generatedId);
      console.log('Creating meeting with:', {
        id: generatedId,
        title: newMeetingTitle.trim(),
        description: newMeetingDescription.trim(),
        hostName: hostName.trim()
      });
      
      const result = await createMeeting(generatedId, newMeetingTitle.trim(), newMeetingDescription.trim());
      console.log('Create meeting result:', result);
      
      if (result && result.meeting_id) {
        console.log('Meeting created successfully, preparing to join...');
        
        // Reset form
        setNewMeetingTitle('');
        setNewMeetingDescription('');
        setIsCreateDialogOpen(false);
        
        toast({
          title: "Meeting Created Successfully!",
          description: `Meeting "${newMeetingTitle}" created with ID: ${result.meeting_id}`,
        });
        
        // Small delay to ensure toast is visible before navigation
        setTimeout(() => {
          console.log('Joining meeting as host:', { hostName: hostName.trim(), meetingId: result.meeting_id });
          onJoinMeeting(hostName.trim(), result.meeting_id, true);
        }, 1000);
        
      } else {
        console.error('Meeting creation failed - no valid result:', result);
        throw new Error('Meeting creation failed - please try again');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-500/20 to-pink-500/20 backdrop-blur-3xl border border-orange-300/30 shadow-2xl hover:shadow-3xl hover:shadow-orange-500/30 transition-all duration-700 hover:scale-[1.02] hover:border-orange-300/50">
      {/* Magnificent background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-pink-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-orange-300/10 to-transparent animate-pulse"></div>
      
      <div className="absolute top-6 right-6 w-3 h-3 bg-orange-300/80 rounded-full animate-ping animation-delay-300"></div>
      <div className="absolute bottom-10 left-8 w-2 h-2 bg-pink-300/80 rounded-full animate-pulse animation-delay-800"></div>
      <div className="absolute top-1/3 right-4 w-1 h-1 bg-yellow-300/80 rounded-full animate-ping animation-delay-600"></div>
      
      <CardHeader className="text-center relative z-10 pb-8">
        <CardTitle className="text-white text-3xl font-bold flex items-center justify-center gap-4 group-hover:text-orange-200 transition-colors duration-500">
          <div className="relative">
            <Crown className="h-10 w-10 text-orange-300 group-hover:text-orange-200 transition-colors duration-500 animate-pulse" />
            <div className="absolute inset-0 h-10 w-10 text-orange-300 blur-sm opacity-50 animate-ping"></div>
          </div>
          <span className="bg-gradient-to-r from-white via-orange-100 to-pink-100 bg-clip-text text-transparent">
            Host Meeting
          </span>
        </CardTitle>
        <p className="text-orange-100/95 mt-4 font-semibold text-lg drop-shadow-sm group-hover:text-orange-50 transition-colors duration-500">
          Create and host your own meeting room
        </p>
      </CardHeader>
      
      <CardContent className="relative z-10 px-8 pb-8">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="relative w-full h-20 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-2xl shadow-2xl hover:shadow-3xl hover:shadow-orange-500/50 transform hover:scale-[1.02] transition-all duration-500 border-0 overflow-hidden group/btn rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-4 py-3">
                <Rocket className="h-8 w-8 animate-pulse" />
                <span>Create New Meeting</span>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-3xl border-orange-300/30 max-w-lg shadow-2xl rounded-2xl">
            {/* Dialog background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 to-pink-500/15 rounded-2xl"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-400/25 to-transparent rounded-2xl"></div>
            
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-white text-2xl flex items-center gap-4 font-bold">
                <Crown className="h-7 w-7 text-orange-300 animate-pulse" />
                Create New Meeting
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-8 pt-6 relative z-10">
              <div className="space-y-4">
                <label className="text-sm font-bold text-white/95 mb-3 block flex items-center gap-3">
                  <Star className="h-5 w-5 text-orange-300" />
                  <span className="text-lg">Your Name</span>
                </label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-white/20 backdrop-blur-xl border-white/40 text-white placeholder-white/70 focus:bg-white/25 focus:border-orange-300/60 h-14 hover:bg-white/25 transition-all duration-500 text-lg font-semibold rounded-xl"
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="space-y-4">
                <label className="text-sm font-bold text-white/95 mb-3 block flex items-center gap-3">
                  <Zap className="h-5 w-5 text-orange-300" />
                  <span className="text-lg">Meeting Title</span>
                </label>
                <Input
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title..."
                  className="bg-white/20 backdrop-blur-xl border-white/40 text-white placeholder-white/70 focus:bg-white/25 focus:border-orange-300/60 h-14 hover:bg-white/25 transition-all duration-500 text-lg font-semibold rounded-xl"
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="space-y-4">
                <label className="text-sm font-bold text-white/95 mb-3 block text-lg">Description (Optional)</label>
                <Textarea
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Enter meeting description..."
                  className="bg-white/20 backdrop-blur-xl border-white/40 text-white placeholder-white/70 focus:bg-white/25 focus:border-orange-300/60 resize-none hover:bg-white/25 transition-all duration-500 text-lg font-medium rounded-xl"
                  rows={4}
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="flex space-x-4 pt-6">
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-white/40 text-white hover:bg-white/15 bg-white/8 backdrop-blur-xl h-14 hover:border-white/60 transition-all duration-500 text-lg font-semibold rounded-xl"
                  disabled={isCreatingMeeting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMeeting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold h-14 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden group/create rounded-xl text-lg"
                  disabled={isCreatingMeeting}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 opacity-0 group-hover/create:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    {isCreatingMeeting ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Crown className="h-5 w-5 mr-3" />
                        Create & Join
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      
      {/* Enhanced corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-300/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-pink-300/20 to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
    </Card>
  );
};
