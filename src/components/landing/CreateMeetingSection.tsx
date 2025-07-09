
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, RefreshCw } from 'lucide-react';
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
    <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border-orange-400/30 shadow-2xl hover:shadow-3xl transition-all duration-300">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl font-bold flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 text-orange-300" />
          Host Meeting
        </CardTitle>
        <p className="text-orange-200 mt-2">Create and host your own meeting room</p>
      </CardHeader>
      <CardContent>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 border-0">
              <Plus className="h-8 w-8 mr-4" />
              Create New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-white/20 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Create New Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div>
                <label className="text-sm font-medium text-white/90 mb-2 block">Your Name</label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 h-12"
                  disabled={isCreatingMeeting}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/90 mb-2 block">Meeting Title</label>
                <Input
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title..."
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 h-12"
                  disabled={isCreatingMeeting}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/90 mb-2 block">Description (Optional)</label>
                <Textarea
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Enter meeting description..."
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 resize-none"
                  rows={3}
                  disabled={isCreatingMeeting}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 bg-white/5 h-12"
                  disabled={isCreatingMeeting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMeeting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12 shadow-lg"
                  disabled={isCreatingMeeting}
                >
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
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
