import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { buildJoinLink } from '@/lib/meeting';

export function CopyMeetingLinkButton({
  meetingCode,
  className,
  size = 'sm',
}: {
  meetingCode: string;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildJoinLink(meetingCode));
      setCopied(true);
      toast({ title: 'Invite link copied', description: 'Share it with your participants.' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Select and copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  if (size === 'icon') {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        className={className}
        aria-label="Copy meeting invite link"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={copy} className={className}>
      {copied ? <Check className="h-4 w-4 mr-1 text-emerald-400" /> : <Link2 className="h-4 w-4 mr-1" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}
