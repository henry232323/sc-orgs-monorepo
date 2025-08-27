import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DiscordLoginButton } from '../components/ui';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-32 w-32 border-2 border-white/20 border-t-white'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-start justify-center bg-transparent pt-20'>
      <div className='max-w-md w-full space-y-8 p-8'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-white mb-2'>SC-Orgs</h1>
          <p className='text-white/80'>
            Sign in to manage your Star Citizen organizations
          </p>
        </div>

        <div className='bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-xl p-8'>
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-white mb-2'>
                Welcome Back
              </h2>
              <p className='text-white/80'>
                Sign in with your Discord account to continue
              </p>
            </div>

            <DiscordLoginButton
              variant='primary'
              size='lg'
              className='w-full'
              onClick={login}
            />

            <div className='text-center'>
              <p className='text-xs text-white/60'>
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
