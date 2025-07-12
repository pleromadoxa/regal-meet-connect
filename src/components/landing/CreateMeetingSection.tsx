
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMeetingActions } from '@/hooks/useMeetingActions';
import { useNavigate } from 'react-router-dom';

export const CreateMeetingSection = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { createMeeting } = useMeetingActions();
  const navigate = useNavigate();

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

    if (!user) {
      navigate('/auth');
      return;
    }

    setIsCreating(true);
    try {
      const meetingId = generateMeetingId();
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
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Create Your Meeting
          </h2>
          <p className="text-xl text-slate-300">
            Start a new video conference in seconds
          </p>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/40 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Plus className="h-5 w-5 mr-2 text-orange-400" />
              New Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-orange-400/50 focus:ring-orange-400/20 min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleCreateMeeting}
              disabled={!title.trim() || isCreating}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
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
              <p className="text-center text-slate-400 text-sm">
                You need to be signed in to create meetings
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
