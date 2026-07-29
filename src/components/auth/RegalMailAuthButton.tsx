import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Link2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isRegalMailEmail, normalizeRegalMailInput } from '@/constants/regalMail';
import {
  REGAL_MAIL_DOMAIN,
  REGAL_MAIL_LOGO_ALT,
  REGAL_MAIL_LOGO_SRC,
  REGAL_MAIL_WEB_URL,
} from '@/constants/regalMailProduct';
import {
  isRegalMailAuthAvailable,
  sendRegalMailMagicLink,
  signInWithRegalMailPassword,
} from '@/services/regalMailAuth';

type RegalMailSignInMode = 'password' | 'magic-link';

export const RegalMailAuthButton = ({
  initialEmail = '',
  disabled,
  onStatus,
}: {
  initialEmail?: string;
  disabled?: boolean;
  onStatus?: (status: { type: 'error' | 'success'; message: string } | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RegalMailSignInMode>('password');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  if (!isRegalMailAuthAvailable()) return null;

  const normalizedEmail = normalizeRegalMailInput(email);
  const emailValid = Boolean(normalizedEmail && isRegalMailEmail(normalizedEmail));

  const setStatus = (status: { type: 'error' | 'success'; message: string } | null) => {
    setLocalStatus(status);
    onStatus?.(status);
  };

  const handleOpen = () => {
    setEmail(initialEmail);
    setPassword('');
    setMode('password');
    setLocalStatus(null);
    setOpen(true);
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await signInWithRegalMailPassword(email, password);
      setOpen(false);
      setPassword('');
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Regal Mail sign-in failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await sendRegalMailMagicLink(email);
      setStatus({
        type: 'success',
        message: `Magic link sent to ${normalizedEmail}. Open it on this device to finish signing in.`,
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not send Regal Mail link',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gradient-to-r from-purple-500/20 to-pink-500/10 hover:from-purple-500/30 hover:to-pink-500/20 border border-purple-400/30 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
      >
        <img
          src={REGAL_MAIL_LOGO_SRC}
          alt={REGAL_MAIL_LOGO_ALT}
          className="h-10 w-10 rounded-lg object-contain shrink-0"
        />
        <span>Sign in with Regal Mail</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#120a1f] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Regal Mail sign-in</DialogTitle>
            <DialogDescription className="text-white/60">
              Use your @{REGAL_MAIL_DOMAIN} password or a one-time email link — same account as{' '}
              {REGAL_MAIL_WEB_URL}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <img
              src={REGAL_MAIL_LOGO_SRC}
              alt={REGAL_MAIL_LOGO_ALT}
              className="h-12 w-12 rounded-lg object-contain shrink-0"
            />
            <div>
              <p className="text-sm font-bold text-white">{REGAL_MAIL_LOGO_ALT}</p>
              <p className="text-xs text-white/50">@{REGAL_MAIL_DOMAIN}</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 rounded-xl bg-black/30 border border-white/10">
            {([
              { id: 'password' as const, label: 'Password', icon: KeyRound },
              { id: 'magic-link' as const, label: 'Email link', icon: Link2 },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setLocalStatus(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === tab.id
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {localStatus && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                localStatus.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
              }`}
            >
              {localStatus.message}
            </div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Regal Mail address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="text"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you or you@${REGAL_MAIL_DOMAIN}`}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Regal Mail password"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {email && !emailValid && (
                <p className="text-xs text-amber-300/90 px-1">
                  Only @{REGAL_MAIL_DOMAIN} addresses can sign in with Regal Mail.
                </p>
              )}

              <div className="flex justify-end -mt-1">
                <a
                  href={`${REGAL_MAIL_WEB_URL}/reset-password`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-purple-400 hover:text-purple-300"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                disabled={loading || !emailValid || !password.trim()}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {loading ? 'Signing in…' : 'Sign in with password'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Regal Mail address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="text"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${REGAL_MAIL_DOMAIN}`}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {email && !emailValid && (
                <p className="text-xs text-amber-300/90 px-1">
                  Only @{REGAL_MAIL_DOMAIN} addresses can sign in with Regal Mail.
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !emailValid}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {loading ? 'Sending link…' : 'Email me a sign-in link'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
