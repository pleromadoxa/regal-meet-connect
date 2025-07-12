
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Video } from 'lucide-react';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const CreateMeetingCard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createMeeting } = useMeetingActions();
  const navigate = useNavigate();
  const { user } = useAuth();

  const generateMeetingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateMeeting = async () => {
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const meetingId = generateMeetingId();
      const result = await createMeeting(meetingId, title, description);
      
      if (result) {
        // Navigate to the meeting as host
        navigate(`/meeting/${meetingId}?host=true&userName=${encodeURIComponent(user?.email || 'Host')}`);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border-slate-700/40 hover:border-orange-400/30 transition-all duration-300 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white">
          <Video className="h-6 w-6 mr-2 text-orange-400" />
          Create New Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-slate-200 text-sm font-medium">
            Meeting Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title"
            className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-slate-200 text-sm font-medium">
            Description (Optional)
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter meeting description"
            className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20 min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleCreateMeeting}
          disabled={!title.trim() || isCreating}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create & Start Meeting
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
