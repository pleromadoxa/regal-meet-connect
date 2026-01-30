
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface WaitingRoomProps {
  meetingTitle?: string;
}

export const WaitingRoom = ({ meetingTitle = "Meeting" }: WaitingRoomProps) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">Waiting for host</h1>
          <p className="text-zinc-400">
            You are in the waiting room for <span className="font-semibold text-white">{meetingTitle}</span>.
            The host will let you in shortly.
          </p>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
            While you wait
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-sm text-zinc-400">Check your audio and video settings</div>
            <div className="text-sm text-zinc-400">Prepare your presentation materials</div>
          </div>
        </div>
      </div>
    </div>
  );
};
