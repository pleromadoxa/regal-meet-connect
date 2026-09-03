import { useState } from 'react';
import { ArrowRight, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RegalMailAuthPanel } from '@/components/auth/RegalMailAuthPanel';
import {
  REGAL_MAIL_DOMAIN,
  REGAL_MAIL_LOGO_ALT,
  REGAL_MAIL_LOGO_SRC,
} from '@/constants/regalMailProduct';
import { isRegalMailAuthAvailable } from '@/services/regalMailAuth';

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

  if (!isRegalMailAuthAvailable()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-semibold text-white transition-all hover:border-white/20 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-60"
      >
        <img
          src={REGAL_MAIL_LOGO_SRC}
          alt={REGAL_MAIL_LOGO_ALT}
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
        />
        <span>Sign in with Regal Mail</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#0d0d0d] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Regal Mail sign-in</DialogTitle>
            <DialogDescription className="text-white/60">
              Use your @{REGAL_MAIL_DOMAIN} account — the same identity across Regal Meeting,
              Calendar, and Mail.
            </DialogDescription>
          </DialogHeader>
          <RegalMailAuthPanel initialEmail={initialEmail} disabled={disabled} onStatus={onStatus} />
        </DialogContent>
      </Dialog>
    </>
  );
};
