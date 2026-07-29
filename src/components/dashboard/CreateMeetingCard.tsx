
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Video, Phone } from 'lucide-react';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { generateMeetingCode } from '@/lib/meeting';

export const CreateMeetingCard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [meetingType, setMeetingType] = useState<'video' | 'audio'>('video');
  const { createMeeting } = useMeetingActions();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleCreateMeeting = async () => {
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const meetingId = generateMeetingCode();
      const result = await createMeeting(meetingId, title, description);

      if (result) {
        const route = meetingType === 'audio' ? 'audio-meeting' : 'meeting';
        const hostName =
          profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Host';
        navigate(
          `/${route}/${meetingId}?host=true&userName=${encodeURIComponent(hostName)}`
        );
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
            Meeting Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={meetingType === 'video' ? 'default' : 'outline'}
              onClick={() => setMeetingType('video')}
              className="h-11 md:h-12"
            >
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
            <Button
              type="button"
              variant={meetingType === 'audio' ? 'default' : 'outline'}
              onClick={() => setMeetingType('audio')}
              className="h-11 md:h-12"
            >
              <Phone className="w-4 h-4 mr-2" />
              Audio Only
            </Button>
          </div>
        </div>

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
              Create & Start {meetingType === 'audio' ? 'Audio' : 'Video'} Meeting
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
