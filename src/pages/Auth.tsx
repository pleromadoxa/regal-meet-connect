import { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthPage } from '@/components/AuthPage';
import { useRegalMailCallback } from '@/hooks/useRegalMailCallback';
import { RegalPageLoader } from '@/components/layout/RegalPageLoader';
import { sanitizeRedirectPath } from '@/constants/site';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'));

  useDocumentTitle('Sign in');

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  const handleAuthSuccess = useCallback(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  const { regalMailLoading } = useRegalMailCallback(handleAuthSuccess);

  if (loading) {
    return <RegalPageLoader message="Checking session…" />;
  }

  if (user) return null;

  return <AuthPage regalMailLoading={regalMailLoading} redirectTo={redirectTo} />;
};

export default Auth;
