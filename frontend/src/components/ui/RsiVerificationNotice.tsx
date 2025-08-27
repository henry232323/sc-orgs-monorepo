import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Paper, Button } from './index';
import { useVerifyRsiAccountMutation } from '../../services/apiSlice';

interface RsiVerificationNoticeProps {
  user: {
    verification_code?: string;
    is_rsi_verified: boolean;
    rsi_handle?: string;
  };
  onVerificationComplete?: () => void;
}

const RsiVerificationNotice: React.FC<RsiVerificationNoticeProps> = ({
  user,
  onVerificationComplete,
}) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Code');
  const [rsiHandle, setRsiHandle] = useState(user.rsi_handle || '');
  const [showHandleInput, setShowHandleInput] = useState(false);
  const [verifyRsiAccount, { isLoading: isVerifying }] = useVerifyRsiAccountMutation();

  const handleVerifyRsi = async () => {
    if (!rsiHandle.trim()) return;
    
    try {
      await verifyRsiAccount({ rsi_handle: rsiHandle.trim() }).unwrap();
      onVerificationComplete?.();
      setShowHandleInput(false);
    } catch (error) {
      console.error('Failed to verify RSI account:', error);
    }
  };

  const handleCopyCode = async () => {
    if (user.verification_code) {
      try {
        const codeWithBrackets = `[${user.verification_code}]`;
        await navigator.clipboard.writeText(codeWithBrackets);
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Code'), 2000);
      } catch (error) {
        console.error('Failed to copy verification code:', error);
      }
    }
  };

  const handleOpenRsiProfile = async () => {
    if (user.verification_code) {
      await handleCopyCode();
    }
    // Open RSI profile in new tab
    window.open('https://robertsspaceindustries.com/account/profile', '_blank');
  };

  if (user.is_rsi_verified) {
    return null;
  }

  return (
    <Paper
      variant='glass'
      size='md'
      className='border-yellow-500/20 bg-yellow-500/5 mb-4'
    >
      <div className='flex items-start space-x-3'>
        <InformationCircleIcon className='w-5 h-5 text-yellow-400 mt-1 flex-shrink-0' />
        <div className='flex-1'>
          <h3 className='text-lg font-semibold text-yellow-400 mb-2'>
            RSI Account Verification Required
          </h3>
          <p className='text-white/80 text-sm mb-3'>
            <strong>Note:</strong> Copy this code{' '}
            <code className='bg-white/20 px-1.5 py-0.5 rounded text-brand-secondary font-mono text-sm'>
              [{user.verification_code || 'Loading...'}]
            </code>{' '}
            and place it in your{' '}
            <a
              href='https://robertsspaceindustries.com/account/profile'
              target='_blank'
              rel='noopener noreferrer'
              className='text-brand-secondary hover:underline'
            >
              RSI profile bio
            </a>{' '}
            to verify your Star Citizen account and access full features.
          </p>
          
          <div className='flex flex-wrap gap-2 items-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCopyCode}
              disabled={!user.verification_code}
            >
              {copyButtonText}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleOpenRsiProfile}
              disabled={!user.verification_code}
            >
              Open RSI Profile
            </Button>
            {!showHandleInput ? (
              <Button
                variant='primary'
                size='sm'
                onClick={() => setShowHandleInput(true)}
                disabled={!user.verification_code}
              >
                Complete Verification
              </Button>
            ) : (
              <>
                <input
                  type='text'
                  value={rsiHandle}
                  onChange={e => setRsiHandle(e.target.value)}
                  placeholder='RSI handle'
                  className='px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-brand-secondary'
                />
                <Button
                  variant='primary'
                  onClick={handleVerifyRsi}
                  disabled={!rsiHandle.trim() || isVerifying}
                  size='sm'
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    setShowHandleInput(false);
                    setRsiHandle(user.rsi_handle || '');
                  }}
                  size='sm'
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Paper>
  );
};

export default RsiVerificationNotice;
