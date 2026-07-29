import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { completeRegalMailSignIn, isRegalMailAuthAvailable } from '@/services/regalMailAuth';
import { useToast } from '@/hooks/use-toast';

function stripRegalMailProviderFromUrl() {
  const url = new URL(window.location.href);
  const redirect = url.searchParams.get('redirect');
  url.searchParams.delete('provider');
  if (!redirect) url.searchParams.delete('redirect');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

/** Completes Regal Mail magic-link → Meeting session when returning to /auth?provider=regal-mail */
export function useRegalMailCallback(onSuccess?: () => void): {
  regalMailLoading: boolean;
} {
  const location = useLocation();
  const { toast } = useToast();
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const handledRef = useRef(false);

  const [regalMailLoading, setRegalMailLoading] = useState(
    () =>
      new URLSearchParams(location.search).get('provider') === 'regal-mail' &&
      isRegalMailAuthAvailable()
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('provider') !== 'regal-mail' || !isRegalMailAuthAvailable()) {
      setRegalMailLoading(false);
      return;
    }
    if (handledRef.current) return;

    let cancelled = false;
    setRegalMailLoading(true);

    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const completed = await completeRegalMailSignIn();
        if (cancelled) return;

        handledRef.current = true;
        stripRegalMailProviderFromUrl();
        setRegalMailLoading(false);

        if (completed) {
          toast({ title: 'Welcome!', description: 'Signed in with Regal Mail.' });
          onSuccessRef.current?.();
        } else {
          toast({
            title: 'Regal Mail link expired',
            description: 'Request a new sign-in link and try again.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        if (cancelled) return;
        handledRef.current = true;
        stripRegalMailProviderFromUrl();
        setRegalMailLoading(false);
        toast({
          title: 'Regal Mail sign-in failed',
          description: err instanceof Error ? err.message : 'Could not complete sign-in',
          variant: 'destructive',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, toast]);

  return { regalMailLoading };
}
