import { Link } from 'react-router-dom';
import { ArrowRight, Hash, Link2, LogIn, Shield, Sparkles, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingAppPreview } from '@/components/landing/MeetingAppPreview';
import { QuickJoinSection } from '@/components/landing/QuickJoinSection';
import { COMPANY_NAME, PRODUCT_NAME } from '@/constants/site';

const JOIN_TIPS = [
  {
    icon: Link2,
    title: 'Paste an invite link',
    description: 'Full Regal Meeting URLs are detected automatically.',
  },
  {
    icon: Hash,
    title: 'Or enter your code',
    description: 'Use the 8-character ID shared by the host.',
  },
  {
    icon: Shield,
    title: 'Join as a guest',
    description: 'No account required — sign in with Regal Mail anytime.',
  },
] as const;

interface JoinMeetingHeroProps {
  user: { email?: string | null } | null;
  meetingCode?: string;
  defaultUserName?: string;
  onJoinMeeting: (name: string, roomId: string) => void;
}

export const JoinMeetingHero = ({
  user,
  meetingCode = '',
  defaultUserName = '',
  onJoinMeeting,
}: JoinMeetingHeroProps) => {
  const isInvite = Boolean(meetingCode);

  return (
    <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-12 xl:gap-16">
        <section className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <div
            className="landing-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-4 py-1.5 text-xs font-medium text-orange-200/90"
            style={{ animationDelay: '0.05s' }}
          >
            <Video className="h-3.5 w-3.5 text-orange-400" />
            {isInvite ? 'Meeting invite' : 'Quick join'}
            <ArrowRight className="h-3 w-3 opacity-60" />
          </div>

          <h1
            className="landing-fade-up text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-5xl"
            style={{ animationDelay: '0.1s' }}
          >
            {isInvite ? (
              <>
                You&apos;re invited to
                <br />
                <span className="landing-text-gradient">join a meeting.</span>
              </>
            ) : (
              <>
                Join a
                <br />
                <span className="landing-text-gradient">Regal Meeting.</span>
              </>
            )}
          </h1>

          <p
            className="landing-fade-up mt-4 max-w-md text-sm leading-relaxed text-white/50 sm:text-base"
            style={{ animationDelay: '0.16s' }}
          >
            {isInvite
              ? 'Enter how you want to appear on the call. Your meeting code is already filled in.'
              : `Enter your name and meeting details to connect instantly with ${PRODUCT_NAME}.`}
          </p>

          {isInvite && (
            <div
              className="landing-fade-up mt-5 inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-2.5"
              style={{ animationDelay: '0.2s' }}
            >
              <Hash className="h-4 w-4 text-orange-400" />
              <span className="font-mono text-sm font-semibold tracking-wider text-orange-100">
                {meetingCode}
              </span>
            </div>
          )}

          <div className="landing-fade-up mt-8" style={{ animationDelay: '0.24s' }}>
            <QuickJoinSection
              onJoinMeeting={onJoinMeeting}
              initialMeetingId={meetingCode}
              defaultUserName={defaultUserName}
              highlight={isInvite}
              variant="landing"
            />
          </div>

          {!user ? (
            <p
              className="landing-fade-up mt-5 text-center text-xs text-white/40 lg:text-left"
              style={{ animationDelay: '0.3s' }}
            >
              Have a Regal Mail account?{' '}
              <Link
                to={`/auth${meetingCode ? `?redirect=${encodeURIComponent(`/meeting/${meetingCode}`)}` : ''}`}
                className="font-medium text-orange-300/90 underline-offset-2 hover:text-orange-200 hover:underline"
              >
                Sign in first
              </Link>
            </p>
          ) : (
            <div
              className="landing-fade-up mt-5 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '0.3s' }}
            >
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-white/12 bg-white/5 text-white/75 hover:bg-white/10"
              >
                <Link to="/dashboard">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Open dashboard
                </Link>
              </Button>
              <span className="text-xs text-white/40">Signed in as {user.email}</span>
            </div>
          )}

          <ul
            className="landing-fade-up mt-10 space-y-3 lg:hidden"
            style={{ animationDelay: '0.34s' }}
          >
            {JOIN_TIPS.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/85">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="hidden lg:block" aria-hidden>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-orange-400/90">
            {COMPANY_NAME}
          </p>
          <h2 className="max-w-lg text-3xl font-bold leading-[1.12] tracking-tight text-white xl:text-4xl">
            Walk into the room
            <br />
            <span className="landing-text-gradient">in one click.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
            {PRODUCT_NAME} delivers HD video, crisp audio, and host-controlled lobbies — whether
            you&apos;re joining from a calendar invite or dropping in with a code.
          </p>

          <ul className="mt-6 space-y-3">
            {JOIN_TIPS.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/85">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <MeetingAppPreview />
          </div>

          <p className="mt-4 text-center text-xs text-white/35">
            <LogIn className="mr-1 inline h-3 w-3" />
            Guests can join instantly — hosts manage the room from {PRODUCT_NAME}.
          </p>
        </section>
      </div>
    </main>
  );
};
