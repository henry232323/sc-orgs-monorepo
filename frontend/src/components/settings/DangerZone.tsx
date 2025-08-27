import React, { useState } from 'react';
import { Button } from '../ui';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface DangerZoneProps {
  className?: string;
}

const DangerZone: React.FC<DangerZoneProps> = ({ className = '' }) => {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      // TODO: Implement account deletion API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Redirect to logout
      alert('Account deleted successfully');
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`bg-red-500/10 border border-red-500/20 rounded-[var(--radius-paper)] p-6 backdrop-blur-sm ${className}`}>
      <h2 className='text-xl font-semibold text-red-200 mb-6 flex items-center'>
        <ExclamationTriangleIcon className='w-5 h-5 mr-2 text-red-400' />
        Danger Zone
      </h2>

      <div className='space-y-4'>
        <div className='p-4 bg-red-500/20 rounded-[var(--radius-input)]'>
          <h3 className='text-lg font-medium text-red-200 mb-2'>
            Delete Account
          </h3>
          <p className='text-red-300 text-sm mb-4'>
            Once you delete your account, there is no going back. Please be
            certain.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant='outline'
              onClick={() => setShowDeleteConfirm(true)}
              className='border-red-400 text-red-200 hover:bg-red-500/20'
            >
              <TrashIcon className='w-4 h-4 mr-2' />
              Delete Account
            </Button>
          ) : (
            <div className='space-y-3'>
              <p className='text-red-300 text-sm font-medium'>
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div className='flex space-x-3'>
                <Button
                  variant='outline'
                  onClick={() => setShowDeleteConfirm(false)}
                  className='border-white/20 text-white hover:bg-white/10'
                >
                  Cancel
                </Button>
                <Button
                  variant='outline'
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className='border-red-400 text-red-200 hover:bg-red-500/20'
                >
                  <TrashIcon className='w-4 h-4 mr-2' />
                  {isDeletingAccount
                    ? 'Deleting...'
                    : 'Yes, Delete My Account'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DangerZone;