
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { useNavigate } from 'react-router-dom';
import { generateMeetingCode } from '@/lib/meeting';

export const CreateMeetingSection = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { createMeeting } = useMeetingActions();
  const navigate = useNavigate();

  const handleCreateMeeting = async () => {
    if (!title.trim()) {
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }

    setIsCreating(true);
    try {
      const meetingId = generateMeetingCode();
      const result = await createMeeting(meetingId, title, description);
      
      if (result) {
        // Navigate to the meeting as host
        navigate(`/meeting/${meetingId}?host=true&userName=${encodeURIComponent(user.email || 'Host')}`);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="py-12 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
            Create Your Meeting
          </h2>
          <p className="text-lg md:text-xl text-slate-300">
            Start a new video conference in seconds
          </p>
        </div>

        <Card className="glass-morphism shadow-2xl border-border/40">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-foreground flex items-center text-lg md:text-xl">
              <Plus className="h-5 w-5 mr-2 text-primary" />
              New Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">
                Meeting Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter meeting title"
                className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 h-12 md:h-14"
              />
            </div>

            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter meeting description"
                className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 min-h-[80px] md:min-h-[100px] resize-none"
              />
            </div>

            <Button
              onClick={handleCreateMeeting}
              disabled={!title.trim() || isCreating}
              variant="premium"
              size="lg"
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Meeting...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Create & Start Meeting
                </>
              )}
            </Button>

            {!user && (
              <p className="text-center text-muted-foreground text-sm">
                You need to be signed in to create meetings
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
