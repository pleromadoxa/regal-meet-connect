import { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthPage } from '@/components/AuthPage';
import { useRegalMailCallback } from '@/hooks/useRegalMailCallback';
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0612] via-[#160a26] to-[#1a0d2e] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-400" />
      </div>
    );
  }

  if (user) return null;

  return <AuthPage onAuthSuccess={handleAuthSuccess} regalMailLoading={regalMailLoading} />;
};

export default Auth;
