
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
    <Card className="glass-morphism hover:glass-morphism-elevated transition-all duration-300 border-border/40 hover:border-primary/30">
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center text-foreground text-base md:text-lg">
          <Video className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary" />
          Create New Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <label className="text-foreground text-xs md:text-sm font-medium">
            Meeting Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title"
            className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-11 md:h-12"
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-xs md:text-sm font-medium">
            Description (Optional)
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter meeting description"
            className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 min-h-[70px] md:min-h-[80px] resize-none"
          />
        </div>

        <Button
          onClick={handleCreateMeeting}
          disabled={!title.trim() || isCreating}
          variant="premium"
          size="default"
          className="w-full"
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
