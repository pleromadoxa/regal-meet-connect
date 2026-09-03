import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Loader2, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { AuthHeroStrip } from '@/components/auth/AuthHeroStrip';
import { AuthProductShowcase } from '@/components/auth/AuthProductShowcase';
import { RegalMailAuthPanel } from '@/components/auth/RegalMailAuthPanel';
import {
  CALENDAR_PRODUCT_NAME,
  COMPANY_LEGAL_NAME,
  COMPANY_NAME,
  PRODUCT_NAME,
  type RegalProduct,
} from '@/constants/site';
import { regalMailSignupUrl } from '@/constants/regalMail';
import {
  REGAL_MAIL_DOMAIN,
  REGAL_MAIL_LOGO_ALT,
  REGAL_MAIL_LOGO_SRC,
} from '@/constants/regalMailProduct';
import { cn } from '@/lib/utils';

interface AuthPageProps {
  regalMailLoading?: boolean;
  redirectTo?: string;
}

export const AuthPage = ({ regalMailLoading, redirectTo = '/dashboard' }: AuthPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const prefillEmail = searchParams.get('email')?.trim() || '';

  const activeProduct: RegalProduct = redirectTo.startsWith('/calendar') ? 'calendar' : 'meeting';
  const productName = activeProduct === 'calendar' ? CALENDAR_PRODUCT_NAME : PRODUCT_NAME;
  const signupUrl = regalMailSignupUrl(redirectTo);

  useEffect(() => {
    const prefill = searchParams.get('email')?.trim();
    if (prefill && !prefill.includes('@')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('email', `${prefill}@${REGAL_MAIL_DOMAIN}`);
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const setMode = (next: 'signin' | 'signup') => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'signup') params.set('mode', 'signup');
        else params.delete('mode');
        return params;
      },
      { replace: true }
    );
  };

  return (
    <div className="relative min-h-screen-safe overflow-x-clip bg-[#0a0a0a] text-white">
      <LandingBackground />
      <LandingHeader user={null} onSignOut={() => {}} activeProduct={activeProduct} variant="auth" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-12 xl:gap-16">
          <section className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:pt-4">
            <div
              className="landing-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-4 py-1.5 text-xs font-medium text-orange-200/90"
              style={{ animationDelay: '0.05s' }}
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              {COMPANY_NAME} · {productName}
            </div>

            <div className="landing-fade-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {mode === 'signin' ? 'Sign in with Regal Mail' : 'Create your Regal Mail'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50 sm:text-base">
                {mode === 'signin'
                  ? `${productName} uses your @${REGAL_MAIL_DOMAIN} account — no separate signup here.`
                  : `Get a @${REGAL_MAIL_DOMAIN} address first, then return here to open ${productName}.`}
              </p>
            </div>

            <div
              className="landing-fade-up mt-6 inline-flex rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md"
              style={{ animationDelay: '0.14s' }}
            >
              {([
                { id: 'signin' as const, label: 'Sign in' },
                { id: 'signup' as const, label: 'Get Regal Mail' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    mode === tab.id
                      ? 'bg-orange-500 text-white shadow-[0_0_24px_rgba(255,107,53,0.35)]'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              className="landing-fade-up mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl sm:p-8"
              style={{ animationDelay: '0.18s' }}
            >
              {regalMailLoading ? (
                <div className="py-12 text-center text-white/70">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-400" />
                  <p className="mb-2 text-lg font-semibold text-white">Completing Regal Mail sign-in…</p>
                  <p className="text-sm text-white/50">Linking your @{REGAL_MAIL_DOMAIN} identity to {productName}</p>
                </div>
              ) : mode === 'signin' ? (
                <RegalMailAuthPanel initialEmail={prefillEmail} />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <img
                      src={REGAL_MAIL_LOGO_SRC}
                      alt={REGAL_MAIL_LOGO_ALT}
                      className="h-14 w-14 shrink-0 rounded-xl object-contain"
                    />
                    <div>
                      <p className="text-base font-bold text-white">Your Regal identity</p>
                      <p className="mt-1 text-sm text-white/55">
                        Meeting, Calendar, and Mail share one @{REGAL_MAIL_DOMAIN} account.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm text-white/60">
                    <li className="flex gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                      Choose your professional @regalmail.me address on Regal Mail.
                    </li>
                    <li className="flex gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                      After signup, come back here and sign in with the same credentials.
                    </li>
                  </ul>

                  <Button
                    asChild
                    variant="premium"
                    className="h-12 w-full rounded-xl shadow-[0_0_32px_rgba(255,107,53,0.3)]"
                  >
                    <a href={signupUrl} target="_blank" rel="noopener noreferrer">
                      Create @{REGAL_MAIL_DOMAIN} account
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setMode('signin')}
                  >
                    I already have Regal Mail
                  </Button>

                  <p className="text-center text-xs leading-relaxed text-white/40">
                    By continuing, you agree to our{' '}
                    <Link to="/terms" className="text-orange-400/90 hover:text-orange-300">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-orange-400/90 hover:text-orange-300">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>

            <AuthHeroStrip product={activeProduct} />

            <p className="mt-8 text-center text-xs text-white/30">
              © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}
            </p>
          </section>

          <AuthProductShowcase product={activeProduct} className="hidden lg:block" />
        </div>
      </main>

      <Footer className="relative z-10 border-white/10 bg-transparent" />
    </div>
  );
};
