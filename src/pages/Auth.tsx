
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/AuthPage';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  return <AuthPage onAuthSuccess={handleAuthSuccess} />;
};

export default Auth;
