
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, RefreshCw, Star, Zap } from 'lucide-react';
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
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  };

  const handleCreateMeeting = async () => {
    console.log('Starting meeting creation process...');
    
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
        console.log('Meeting created successfully, joining as host...');
        setIsCreateDialogOpen(false);
        setNewMeetingTitle('');
        setNewMeetingDescription('');
        
        toast({
          title: "Meeting Created",
          description: `Meeting "${newMeetingTitle}" created successfully!`
        });
        
        // Small delay to ensure toast is shown before navigation
        setTimeout(() => {
          onJoinMeeting(hostName.trim(), result.meeting_id, true);
        }, 500);
      } else {
        console.error('Meeting creation failed - no valid result:', result);
        throw new Error('Meeting creation failed - invalid response from server');
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
    <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-500/15 to-red-500/15 backdrop-blur-3xl border border-orange-400/30 shadow-2xl hover:shadow-3xl hover:shadow-orange-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-orange-400/50">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-orange-400/5 to-transparent animate-pulse"></div>
      
      {/* Floating particles effect */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400/60 rounded-full animate-ping animation-delay-500"></div>
      <div className="absolute bottom-8 left-6 w-1 h-1 bg-red-400/60 rounded-full animate-pulse animation-delay-700"></div>
      
      <CardHeader className="text-center relative z-10 pb-6">
        <CardTitle className="text-white text-2xl font-bold flex items-center justify-center gap-3 group-hover:text-orange-300 transition-colors duration-300">
          <div className="relative">
            <Crown className="h-8 w-8 text-orange-300 group-hover:text-orange-200 transition-colors duration-300 animate-pulse" />
            <div className="absolute inset-0 h-8 w-8 text-orange-300 blur-sm opacity-50 animate-ping"></div>
          </div>
          <span className="bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">
            Host Meeting
          </span>
        </CardTitle>
        <p className="text-orange-200/90 mt-3 font-medium drop-shadow-sm group-hover:text-orange-100 transition-colors duration-300">
          Create and host your own meeting room
        </p>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="relative w-full h-18 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xl shadow-2xl hover:shadow-3xl hover:shadow-orange-500/40 transform hover:scale-[1.02] transition-all duration-300 border-0 overflow-hidden group/btn">
              {/* Button background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-4 py-2">
                <Plus className="h-8 w-8 animate-pulse" />
                <span>Create New Meeting</span>
              </div>
              
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-slate-800/95 backdrop-blur-2xl border-white/20 max-w-md shadow-2xl">
            {/* Dialog background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-400/20 to-transparent rounded-lg"></div>
            
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-white text-xl flex items-center gap-3">
                <Crown className="h-6 w-6 text-orange-400 animate-pulse" />
                Create New Meeting
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4 relative z-10">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/95 mb-2 block flex items-center gap-2">
                  <Star className="h-4 w-4 text-orange-400" />
                  Your Name
                </label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-white/15 backdrop-blur-xl border-white/30 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/50 h-12 hover:bg-white/20 transition-all duration-300"
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/95 mb-2 block flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-400" />
                  Meeting Title
                </label>
                <Input
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title..."
                  className="bg-white/15 backdrop-blur-xl border-white/30 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/50 h-12 hover:bg-white/20 transition-all duration-300"
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/95 mb-2 block">Description (Optional)</label>
                <Textarea
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Enter meeting description..."
                  className="bg-white/15 backdrop-blur-xl border-white/30 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/50 resize-none hover:bg-white/20 transition-all duration-300"
                  rows={3}
                  disabled={isCreatingMeeting}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-xl h-12 hover:border-white/50 transition-all duration-300"
                  disabled={isCreatingMeeting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMeeting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group/create"
                  disabled={isCreatingMeeting}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover/create:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    {isCreatingMeeting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
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
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-400/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
    </Card>
  );
};
