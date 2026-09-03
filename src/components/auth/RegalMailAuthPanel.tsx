import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, KeyRound, Link2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const authInputClass =
  'h-12 rounded-xl border-white/12 bg-[#111111] pl-10 text-white placeholder:text-white/30 focus-visible:ring-orange-500/40';

interface RegalMailAuthPanelProps {
  initialEmail?: string;
  disabled?: boolean;
  onStatus?: (status: { type: 'error' | 'success'; message: string } | null) => void;
}

export const RegalMailAuthPanel = ({
  initialEmail = '',
  disabled,
  onStatus,
}: RegalMailAuthPanelProps) => {
  const [mode, setMode] = useState<RegalMailSignInMode>('password');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  if (!isRegalMailAuthAvailable()) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Regal Mail sign-in is not configured for this environment. Contact your administrator.
      </div>
    );
  }

  const normalizedEmail = normalizeRegalMailInput(email);
  const emailValid = Boolean(normalizedEmail && isRegalMailEmail(normalizedEmail));

  const setStatus = (status: { type: 'error' | 'success'; message: string } | null) => {
    setLocalStatus(status);
    onStatus?.(status);
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await signInWithRegalMailPassword(email, password);
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
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <img
          src={REGAL_MAIL_LOGO_SRC}
          alt={REGAL_MAIL_LOGO_ALT}
          className="h-12 w-12 shrink-0 rounded-lg object-contain"
        />
        <div>
          <p className="text-sm font-bold text-white">{REGAL_MAIL_LOGO_ALT}</p>
          <p className="text-xs text-white/50">
            One @{REGAL_MAIL_DOMAIN} account for Meeting, Calendar, and Mail.
          </p>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
        {([
          { id: 'password' as const, label: 'Password', icon: KeyRound },
          { id: 'magic-link' as const, label: 'Email link', icon: Link2 },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setStatus(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              mode === tab.id
                ? 'border border-orange-500/30 bg-orange-500/20 text-orange-200'
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
              ? 'border border-red-500/30 bg-red-500/10 text-red-200'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
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
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${REGAL_MAIL_DOMAIN}`}
                className={authInputClass}
                disabled={disabled || loading}
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
                className={`${authInputClass} pl-4 pr-12`}
                disabled={disabled || loading}
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
            <p className="px-1 text-xs text-amber-300/90">
              Use your @{REGAL_MAIL_DOMAIN} address — Meeting does not create separate accounts.
            </p>
          )}

          <div className="-mt-1 flex justify-end">
            <a
              href={`${REGAL_MAIL_WEB_URL}/reset-password`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-orange-400 hover:text-orange-300"
            >
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            disabled={disabled || loading || !emailValid || !password.trim()}
            variant="premium"
            className="h-12 w-full rounded-xl shadow-[0_0_32px_rgba(255,107,53,0.3)]"
          >
            {loading ? 'Signing in…' : 'Sign in with Regal Mail'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/90">Regal Mail address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="text"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${REGAL_MAIL_DOMAIN}`}
                className={authInputClass}
                disabled={disabled || loading}
              />
            </div>
          </div>

          {email && !emailValid && (
            <p className="px-1 text-xs text-amber-300/90">
              Use your @{REGAL_MAIL_DOMAIN} address — Meeting does not create separate accounts.
            </p>
          )}

          <Button
            type="submit"
            disabled={disabled || loading || !emailValid}
            variant="premium"
            className="h-12 w-full rounded-xl shadow-[0_0_32px_rgba(255,107,53,0.3)]"
          >
            {loading ? 'Sending link…' : 'Email me a sign-in link'}
          </Button>
        </form>
      )}

      <p className="text-center text-xs leading-relaxed text-white/40">
        Same account as{' '}
        <a
          href={REGAL_MAIL_WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-orange-400/90 hover:text-orange-300"
        >
          {REGAL_MAIL_WEB_URL.replace('https://', '')}
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
};
