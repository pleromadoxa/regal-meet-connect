
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Plus, RefreshCw } from 'lucide-react';

interface CreateMeetingCardProps {
  isCreateDialogOpen: boolean;
  newMeetingTitle: string;
  newMeetingDescription: string;
  isCreatingMeeting: boolean;
  onSetIsCreateDialogOpen: (open: boolean) => void;
  onSetNewMeetingTitle: (title: string) => void;
  onSetNewMeetingDescription: (description: string) => void;
  onCreateMeeting: () => void;
}

export const CreateMeetingCard = ({
  isCreateDialogOpen,
  newMeetingTitle,
  newMeetingDescription,
  isCreatingMeeting,
  onSetIsCreateDialogOpen,
  onSetNewMeetingTitle,
  onSetNewMeetingDescription,
  onCreateMeeting
}: CreateMeetingCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border-orange-400/30 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center text-lg">
          <Crown className="h-6 w-6 mr-3 text-orange-300" />
          Host New Meeting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={isCreateDialogOpen} onOpenChange={onSetIsCreateDialogOpen}>
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
                <label className="text-sm font-medium text-white/90 mb-2 block">Meeting Title</label>
                <Input
                  value={newMeetingTitle}
                  onChange={(e) => onSetNewMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title..."
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 h-12"
                  disabled={isCreatingMeeting}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/90 mb-2 block">Description (Optional)</label>
                <Textarea
                  value={newMeetingDescription}
                  onChange={(e) => onSetNewMeetingDescription(e.target.value)}
                  placeholder="Enter meeting description..."
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 focus:bg-white/25 focus:border-white/50 resize-none"
                  rows={3}
                  disabled={isCreatingMeeting}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => onSetIsCreateDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 bg-white/5 h-12"
                  disabled={isCreatingMeeting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onCreateMeeting}
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
                      Create Meeting
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
