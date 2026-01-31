
import React from 'react';
import { Loader2 } from 'lucide-react';

interface WaitingRoomProps {
  meetingTitle?: string;
}

export const WaitingRoom = ({ meetingTitle = "Meeting" }: WaitingRoomProps) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-8">
      {/* Left Column - Image */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 hidden md:block animate-fade-in">
        <img
          src="/regal-wait.jpg"
          alt="Waiting Room"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Column - Status */}
      <div className="w-full max-w-md space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-xl animate-fade-in-up">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          </div>
        </div>

        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-white">Waiting to join Regal Meeting</h1>
          <p className="text-zinc-400">
            You are in the waiting room for <span className="font-semibold text-white">{meetingTitle}</span>.
            The host will admit you shortly.
          </p>
        </div>

        {/* Mobile Image (Visible only on small screens) */}
        <div className="md:hidden rounded-xl overflow-hidden my-6 border border-white/5">
           <img
            src="/regal-wait.jpg"
            alt="Waiting Room"
            className="w-full h-48 object-cover"
          />
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium text-center">
            While you wait
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm text-zinc-400 bg-white/5 p-3 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Check your audio and video settings
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-400 bg-white/5 p-3 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Prepare your presentation materials
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
