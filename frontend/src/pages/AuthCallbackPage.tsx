import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        const token = searchParams.get('token');

        if (!token) {
          setError('No authentication token received');
          return;
        }

        // Store the token directly
        localStorage.setItem('auth_token', token);

        // Redirect to dashboard after successful authentication
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(
          err?.data?.error || 'Authentication failed. Please try again.'
        );
      }
    };

    processAuthCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-transparent'>
        <div className='max-w-md w-full space-y-8 p-8'>
          <div className='bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-xl p-8'>
            <div className='text-center space-y-6'>
              <h2 className='text-2xl font-bold text-white mb-2'>
                Authentication Error
              </h2>
              <p className='text-white/80'>{error}</p>
              <Button
                variant='primary'
                onClick={() => navigate('/login')}
                className='w-full'
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-transparent'>
      <div className='max-w-md w-full space-y-8 p-8'>
        <div className='bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-xl p-8'>
          <div className='text-center space-y-6'>
            <div className='animate-spin rounded-full h-32 w-32 border-2 border-white/20 border-t-white mx-auto'></div>
            <h2 className='text-2xl font-bold text-white mb-2'>
              Authenticating...
            </h2>
            <p className='text-white/80'>
              Please wait while we complete your authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
