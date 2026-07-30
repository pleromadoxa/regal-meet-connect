import { Radio, Users, Wifi, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MeetingMediaMode, ParticipantMediaRole } from '@/lib/meetingTopology';

interface LargeMeetingBannerProps {
  mediaMode: MeetingMediaMode;
  mediaRole: ParticipantMediaRole;
  participantCount: number;
  sfuAvailable: boolean;
  connectionError?: string | null;
  onRetryConnection?: () => void;
}

export function LargeMeetingBanner({
  mediaMode,
  mediaRole,
  participantCount,
  sfuAvailable,
  connectionError,
  onRetryConnection,
}: LargeMeetingBannerProps) {
  if (connectionError) {
    return (
      <div className="border-b border-red-500/30 bg-red-500/15 px-4 py-2 text-center text-xs text-red-100 safe-area-inset-top">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {connectionError}
          </span>
          {onRetryConnection && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-red-300/30 text-red-50 hover:bg-red-500/20"
              onClick={onRetryConnection}
            >
              Retry connection
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (participantCount <= 100) return null;

  const modeLabel =
    mediaMode === 'sfu'
      ? 'Cloudflare SFU'
      : mediaMode === 'host-hub'
        ? 'Host relay'
        : 'Mesh';

  const roleLabel = mediaRole === 'listener' ? 'Listener — receive only' : 'Speaker';

  return (
    <div className="border-b border-orange-500/20 bg-orange-500/10 px-4 py-2 text-center text-xs text-orange-100/90 safe-area-inset-top">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {participantCount} participants
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5" />
          {modeLabel}
          {!sfuAvailable && mediaMode === 'host-hub' && ' (SFU pending setup)'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" />
          {roleLabel}
        </span>
      </div>
    </div>
  );
}
