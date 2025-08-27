import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGetCurrentUserQuery } from '../services/apiSlice';
import { Button, SettingsPageLayout } from '../components/ui';
import OrganizationManagement from '../components/settings/OrganizationManagement';
import DiscordServersSettings from '../components/settings/DiscordServersSettings';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const {
    data: user,
    isLoading,
    error,
  } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-2 border-glass border-t-[var(--color-accent-blue)] mx-auto mb-4'></div>
          <h2 className='text-2xl font-bold text-primary mb-2'>
            Loading Settings
          </h2>
          <p className='text-tertiary'>
            Please wait while we load your settings...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='max-w-md w-full space-y-8 p-8'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-gradient mb-2'>SC-Orgs</h1>
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[var(--radius-paper)] p-4 mb-6'>
              <p className='text-red-800 dark:text-red-200 font-medium'>
                Error Loading Settings
              </p>
              <p className='text-red-600 dark:text-red-300 text-sm mt-1'>
                Failed to load your profile settings. Please try again.
              </p>
            </div>
            <div className='space-y-4'>
              <Button
                variant='primary'
                size='lg'
                className='w-full'
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
              <Button
                variant='outline'
                size='lg'
                className='w-full'
                onClick={() => logout()}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='max-w-md w-full space-y-8 p-8'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-gradient mb-2'>SC-Orgs</h1>
            <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-[var(--radius-paper)] p-4 mb-6'>
              <p className='text-yellow-800 dark:text-yellow-200 font-medium'>
                Authentication Required
              </p>
              <p className='text-yellow-600 dark:text-yellow-300 text-sm mt-1'>
                You must be logged in to access settings.
              </p>
            </div>
            <div className='space-y-4'>
              <Link to='/login'>
                <Button variant='primary' size='lg' className='w-full'>
                  Go to Login
                </Button>
              </Link>
              <Link to='/'>
                <Button variant='outline' size='lg' className='w-full'>
                  Return Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <SettingsPageLayout
      title='Settings'
      subtitle='Manage your account security and preferences'
      headerActions={
        <Link
          to='/profile'
          className='p-2 text-white/60 hover:text-white transition-colors'
        >
          <ArrowLeftIcon className='w-5 h-5' />
        </Link>
      }
    >
      <div className='space-y-6'>
        {/* Security Settings */}
        {/* <SecuritySettings /> */}

        {/* Organization Management */}
        <OrganizationManagement />

        {/* Discord Servers */}
        <DiscordServersSettings />

        {/* Notification Preferences */}
        {/* <NotificationPreferences /> */}

        {/* Privacy Settings */}
        {/* <PrivacySettings /> */}

        {/* Danger Zone */}
        {/* <DangerZone /> */}
      </div>
    </SettingsPageLayout>
  );
};

export default SettingsPage;
