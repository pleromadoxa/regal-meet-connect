import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { regalMailSignupUrl } from '@/constants/regalMail';
import { REGAL_MAIL_DOMAIN } from '@/constants/regalMailProduct';
import { sanitizeRedirectPath } from '@/constants/site';

interface EmailCtaBarProps {
  buttonLabel?: string;
  redirectTo?: string;
}

export const EmailCtaBar = ({
  buttonLabel = 'Create Regal Mail',
  redirectTo = '/dashboard',
}: EmailCtaBarProps) => {
  const safeRedirect = sanitizeRedirectPath(redirectTo);
  const signupUrl = regalMailSignupUrl(safeRedirect);

  return (
    <div
      className="landing-fade-up mx-auto flex w-full max-w-md flex-col items-center gap-3 sm:max-w-lg"
      style={{ animationDelay: '0.28s' }}
    >
      <p className="text-sm text-white/50">
        Get started with your <span className="text-white/80">@{REGAL_MAIL_DOMAIN}</span> account
      </p>
      <Button
        asChild
        variant="premium"
        size="lg"
        className="h-12 w-full rounded-xl px-6 shadow-[0_0_32px_rgba(255,107,53,0.3)] sm:w-auto"
      >
        <a href={signupUrl} target="_blank" rel="noopener noreferrer">
          {buttonLabel}
          <ExternalLink className="ml-1.5 h-4 w-4" />
        </a>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-white/55 hover:bg-white/10 hover:text-white"
      >
        <a href={`/auth?redirect=${encodeURIComponent(safeRedirect)}`}>
          I already have Regal Mail
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </a>
      </Button>
    </div>
  );
};
