import type { ReactNode } from 'react';
import {
  MeetingReactionsProvider,
  useMeetingReactions,
} from '@/contexts/MeetingReactionsContext';
import { MeetingReactionOverlay } from '@/components/meeting/MeetingReactionOverlay';

interface MeetingReactionsShellProps {
  meetingId?: string;
  userId?: string;
  userName?: string;
  children: ReactNode;
}

function MeetingReactionOverlayBridge() {
  const { particles } = useMeetingReactions();
  return <MeetingReactionOverlay particles={particles} />;
}

export function MeetingReactionsShell({
  meetingId,
  userId,
  userName,
  children,
}: MeetingReactionsShellProps) {
  return (
    <MeetingReactionsProvider meetingId={meetingId} userId={userId} userName={userName}>
      {children}
      <MeetingReactionOverlayBridge />
    </MeetingReactionsProvider>
  );
}
