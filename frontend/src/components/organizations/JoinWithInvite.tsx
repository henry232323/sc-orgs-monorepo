import React, { useState } from 'react';
import {
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Paper } from '../ui';
import { useJoinWithInviteMutation } from '../../services/apiSlice';

interface JoinWithInviteProps {
  onSuccess?: (organizationId: string) => void;
}

const JoinWithInvite: React.FC<JoinWithInviteProps> = ({ onSuccess }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    organizationId?: string;
  } | null>(null);

  const [joinWithInvite] = useJoinWithInviteMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsJoining(true);
    setResult(null);

    try {
      const response = await joinWithInvite({
        inviteCode: inviteCode.trim(),
      }).unwrap();
      setResult({
        success: true,
        message: 'Successfully joined the organization!',
        organizationId: response.organization_id,
      });
      setInviteCode('');
      onSuccess?.(response.organization_id);
    } catch (error: any) {
      setResult({
        success: false,
        message:
          error?.data?.error ||
          'Failed to join organization. Please check the invite code.',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleReset = () => {
    setInviteCode('');
    setResult(null);
  };

  return (
    <div className='max-w-md mx-auto'>
      <Paper variant='glass-strong' size='lg'>
        <div className='p-[var(--spacing-card-lg)]'>
          <div className='text-center mb-[var(--spacing-card-lg)]'>
            <LinkIcon className='w-12 h-12 text-info mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-primary mb-2'>
              Join Organization
            </h2>
            <p className='text-tertiary'>
              Enter an invite code to join an organization
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className='space-y-[var(--spacing-element)]'
          >
            <div>
              <label className='block text-sm font-medium text-secondary mb-[var(--spacing-tight)]'>
                Invite Code
              </label>
              <input
                type='text'
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder='Enter invite code...'
                className='input-glass w-full px-4 py-3 text-primary placeholder:text-muted text-center font-mono text-lg tracking-wider focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50'
                disabled={isJoining}
              />
            </div>

            {result && (
              <div
                className={`p-4 rounded-[var(--radius-glass-lg)] ${
                  result.success
                    ? 'bg-success border border-success'
                    : 'bg-error border border-error'
                }`}
              >
                <div className='flex items-center space-x-2'>
                  {result.success ? (
                    <CheckCircleIcon className='w-5 h-5 text-success' />
                  ) : (
                    <XCircleIcon className='w-5 h-5 text-error' />
                  )}
                  <span
                    className={`text-sm ${
                      result.success ? 'text-success' : 'text-error'
                    }`}
                  >
                    {result.message}
                  </span>
                </div>
              </div>
            )}

            <div className='flex space-x-3'>
              <Button
                type='button'
                onClick={handleReset}
                variant='outline'
                className='flex-1'
                disabled={isJoining}
              >
                Clear
              </Button>
              <Button
                type='submit'
                variant='primary'
                className='flex-1'
                disabled={isJoining || !inviteCode.trim()}
              >
                {isJoining ? 'Joining...' : 'Join Organization'}
              </Button>
            </div>
          </form>

          {result?.success && (
            <div className='mt-4 text-center'>
              <Button onClick={handleReset} variant='outline' size='sm'>
                Join Another Organization
              </Button>
            </div>
          )}
        </div>
      </Paper>
    </div>
  );
};

export default JoinWithInvite;
