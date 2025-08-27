import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Button, Paper, Chip } from '../components/ui';
import { useJoinWithInviteMutation } from '../services/apiSlice';
import { useAuth } from '../contexts/AuthContext';

const InviteAcceptPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isJoining, setIsJoining] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    organizationId?: string;
  } | null>(null);

  const [joinWithInvite] = useJoinWithInviteMutation();

  // No automatic redirect - handle login state in the UI

  const handleAcceptInvite = async () => {
    if (!inviteCode) return;

    setIsJoining(true);
    setResult(null);

    try {
      const response = await joinWithInvite({ inviteCode }).unwrap();
      setResult({
        success: true,
        message: 'Successfully joined the organization!',
        organizationId: response.organization_id,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message:
          error?.data?.error ||
          'Failed to join organization. The invite code may be invalid or expired.',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewOrganization = () => {
    if (result?.organizationId) {
      navigate(`/organizations/${result.organizationId}`);
    }
  };

  const handleBackToOrganizations = () => {
    navigate('/organizations');
  };

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-900 text-white flex items-center justify-center p-6'>
        <div className='text-center'>
          <LinkIcon className='w-16 h-16 text-blue-400 mx-auto mb-4' />
          <h1 className='text-2xl font-bold mb-2'>Authentication Required</h1>
          <p className='text-gray-400 mb-6'>
            Please log in to accept this organization invite.
          </p>
          <Button onClick={() => navigate('/auth/login')} variant='primary'>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  if (!inviteCode) {
    return (
      <div className='min-h-screen bg-gray-900 text-white flex items-center justify-center p-6'>
        <div className='text-center'>
          <XCircleIcon className='w-16 h-16 text-red-400 mx-auto mb-4' />
          <h1 className='text-2xl font-bold text-red-400 mb-2'>
            Invalid Invite
          </h1>
          <p className='text-gray-400 mb-6'>
            The invite link appears to be invalid or malformed.
          </p>
          <Button onClick={handleBackToOrganizations} variant='primary'>
            Browse Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 text-white flex items-center justify-center p-6'>
      <div className='w-full max-w-md'>
        <Paper variant='glass' size='lg'>
          <div className='p-8 text-center'>
            {!result ? (
              <>
                {/* Invite Header */}
                <div className='mb-8'>
                  <UsersIcon className='w-16 h-16 text-blue-400 mx-auto mb-4' />
                  <h1 className='text-2xl font-bold text-white mb-2'>
                    Organization Invite
                  </h1>
                  <p className='text-gray-400'>
                    You've been invited to join an organization
                  </p>
                </div>

                {/* Invite Code Display */}
                <div className='mb-8'>
                  <div className='bg-white/10 rounded-lg p-4 mb-4'>
                    <p className='text-sm text-gray-400 mb-2'>Invite Code</p>
                    <code className='text-lg font-mono text-white tracking-wider'>
                      {inviteCode}
                    </code>
                  </div>

                  <div className='flex items-center justify-center space-x-2 text-sm text-gray-400'>
                    <ShieldCheckIcon className='w-4 h-4' />
                    <span>Secure invite from verified organization</span>
                  </div>
                </div>

                {/* User Info */}
                <div className='mb-8'>
                  <div className='flex items-center justify-center space-x-3 mb-4'>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.rsi_handle}
                        className='w-10 h-10 rounded-full object-cover'
                      />
                    ) : (
                      <div className='w-10 h-10 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center'>
                        <span className='text-white font-semibold'>
                          {user.rsi_handle.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className='text-left'>
                      <p className='text-white font-medium'>
                        {user.rsi_handle}
                      </p>
                      <div className='flex items-center space-x-2'>
                        {user.is_rsi_verified && (
                          <Chip className='bg-blue-500/20 text-blue-400 text-xs'>
                            RSI Verified
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className='space-y-3'>
                  <Button
                    onClick={handleAcceptInvite}
                    variant='primary'
                    disabled={isJoining}
                    className='w-full'
                  >
                    {isJoining ? 'Joining Organization...' : 'Accept Invite'}
                  </Button>

                  <Button
                    onClick={handleBackToOrganizations}
                    variant='outline'
                    className='w-full'
                  >
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Result Display */}
                <div className='mb-8'>
                  {result.success ? (
                    <CheckCircleIcon className='w-16 h-16 text-green-400 mx-auto mb-4' />
                  ) : (
                    <XCircleIcon className='w-16 h-16 text-red-400 mx-auto mb-4' />
                  )}

                  <h2
                    className={`text-xl font-bold mb-2 ${
                      result.success ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {result.success
                      ? 'Welcome to the Organization!'
                      : 'Invite Failed'}
                  </h2>

                  <p className='text-gray-400'>{result.message}</p>
                </div>

                {/* Action Buttons */}
                <div className='space-y-3'>
                  {result.success ? (
                    <>
                      <Button
                        onClick={handleViewOrganization}
                        variant='primary'
                        className='w-full'
                      >
                        View Organization
                      </Button>
                      <Button
                        onClick={handleBackToOrganizations}
                        variant='outline'
                        className='w-full'
                      >
                        Browse More Organizations
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setResult(null)}
                        variant='primary'
                        className='w-full'
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleBackToOrganizations}
                        variant='outline'
                        className='w-full'
                      >
                        Browse Organizations
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
