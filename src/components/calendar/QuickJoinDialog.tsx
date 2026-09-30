import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPlausibleMeetingCode, normalizeMeetingCodeInput } from '@/lib/quickJoin';

interface QuickJoinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickJoinDialog = ({ open, onOpenChange }: QuickJoinDialogProps) => {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeMeetingCodeInput(code);
    if (!isPlausibleMeetingCode(normalized)) return;
    setJoining(true);
    onOpenChange(false);
    setCode('');
    navigate(`/meeting/${normalized}`);
    setJoining(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#111111] text-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-orange-400" />
            Join Regal Meeting
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Meeting code</Label>
            <Input
              id="join-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              className="border-white/10 bg-black/30 font-mono text-white uppercase tracking-widest"
              autoFocus
            />
          </div>
          <Button type="submit" variant="premium" className="w-full" disabled={joining || !isPlausibleMeetingCode(code)}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join meeting'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
