import React, { useState } from 'react';
import { Button, Input, SettingsCard } from '../ui';
import { ShieldCheckIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface SecuritySettingsProps {
  className?: string;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ className = '' }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);

    try {
      // TODO: Implement password change API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // TODO: Show success message
      alert('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <SettingsCard
      title='Security Settings'
      icon={ShieldCheckIcon}
      iconColor='text-var(--color-accent-blue)'
      className={className}
    >
      <form onSubmit={handlePasswordChange} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-white mb-2'>
            Current Password
          </label>
          <div className='relative'>
            <Input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={value => setCurrentPassword(value)}
              placeholder='Enter current password'
              required
            />
            <button
              type='button'
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors'
            >
              {showCurrentPassword ? (
                <EyeSlashIcon className='w-4 h-4' />
              ) : (
                <EyeIcon className='w-4 h-4' />
              )}
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              New Password
            </label>
            <div className='relative'>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={value => setNewPassword(value)}
                placeholder='Enter new password'
                required
              />
              <button
                type='button'
                onClick={() => setShowNewPassword(!showNewPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors'
              >
                {showNewPassword ? (
                  <EyeSlashIcon className='w-4 h-4' />
                ) : (
                  <EyeIcon className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              Confirm New Password
            </label>
            <div className='relative'>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={value => setConfirmPassword(value)}
                placeholder='Confirm new password'
                required
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors'
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className='w-4 h-4' />
                ) : (
                  <EyeIcon className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className='pt-4'>
          <Button
            type='submit'
            variant='primary'
            disabled={
              isChangingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className='flex items-center space-x-2'
          >
            <KeyIcon className='w-4 h-4' />
            <span>
              {isChangingPassword
                ? 'Changing Password...'
                : 'Change Password'}
            </span>
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
};

export default SecuritySettings;