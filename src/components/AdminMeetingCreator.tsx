
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';

interface AdminMeetingCreatorProps {
  onCreateMeeting: (meetingId: string, title: string, description?: string) => Promise<any>;
}

export const AdminMeetingCreator = ({ onCreateMeeting }: AdminMeetingCreatorProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
      await onCreateMeeting(meetingId, title, description);
      
      // Reset form on success
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Plus className="h-5 w-5 mr-2 text-orange-400" />
          Create New Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="meeting-title" className="text-orange-200">
            Meeting Title
          </Label>
          <Input
            id="meeting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-description" className="text-orange-200">
            Description (Optional)
          </Label>
          <Textarea
            id="meeting-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter meeting description"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleCreateMeeting}
          disabled={!title.trim() || isCreating}
          className="w-full bg-orange-500/80 hover:bg-orange-600/80 text-white"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Meeting
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
