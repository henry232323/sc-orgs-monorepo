import React from 'react';
import { Button } from '../ui';
import {
  UserIcon,
  MapPinIcon,
  GlobeAltIcon,
  StarIcon,
  PencilIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface ProfileDisplayProps {
  profile: {
    rsi_handle: string;
    location?: string;
    bio?: string;
    website_url?: string;
  };
  isOwnProfile?: boolean;
  onEdit?: () => void;
  className?: string;
}

const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  isOwnProfile = false,
  onEdit,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Header */}
      <div className='bg-glass border-glass rounded-[var(--radius-glass-lg)] p-[var(--spacing-card-lg)] backdrop-blur-[var(--blur-glass-md)] shadow-[var(--shadow-glass-md)]'>
        <div className='flex items-start justify-between mb-[var(--spacing-card-lg)]'>
          <div className='flex items-center space-x-[var(--spacing-card-lg)]'>
            <div className='w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]'>
              <UserIcon className='w-full h-full text-primary p-4' />
            </div>

            <div>
              <h1 className='text-2xl font-bold text-primary'>
                {profile.rsi_handle}
              </h1>
              <p className='text-secondary'>@{profile.rsi_handle}</p>
              {profile.location && (
                <div className='flex items-center mt-2 text-sm text-tertiary'>
                  <MapPinIcon className='w-4 h-4 mr-1' />
                  {profile.location}
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && onEdit && (
            <Button
              variant='glass'
              onClick={onEdit}
              className='flex items-center space-x-2'
            >
              <PencilIcon className='w-4 h-4' />
              <span>Edit Profile</span>
            </Button>
          )}
        </div>

        {profile.bio && (
          <div className='mb-[var(--spacing-card-lg)]'>
            <p className='text-secondary leading-relaxed'>{profile.bio}</p>
          </div>
        )}

        {/* Profile Stats */}
        <div className='grid grid-cols-3 gap-4 pt-4 border-t border-glass'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-[var(--color-accent-blue)]'>
              {/* TODO: Add actual stats */}0
            </div>
            <div className='text-sm text-tertiary'>Organizations</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-[var(--color-accent-purple)]'>
              {/* TODO: Add actual stats */}0
            </div>
            <div className='text-sm text-tertiary'>Events</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-tertiary'>
              {/* TODO: Add actual stats */}0
            </div>
            <div className='text-sm text-slate-600 dark:text-slate-400'>
              Comments
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700'>
        <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center'>
          <UserIcon className='w-5 h-5 mr-2 text-var(--color-accent-blue)' />
          Basic Information
        </h3>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <label className='block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1'>
              Username
            </label>
            <p className='text-slate-900 dark:text-white font-medium'>
              {profile.rsi_handle}
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1'>
              Display Name
            </label>
            <p className='text-slate-900 dark:text-white font-medium'>
              {profile.rsi_handle}
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1'>
              Timezone
            </label>
            <p className='text-slate-900 dark:text-white font-medium'>
              {/* TODO: Add actual timezone */}
            </p>
          </div>
        </div>
      </div>

      {/* Social Links */}
      {(profile.rsi_handle || profile.website_url) && (
        <div className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700'>
          <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center'>
            <GlobeAltIcon className='w-5 h-5 mr-2 text-var(--color-accent-blue)' />
            Social Links
          </h3>

          <div className='space-y-3'>
            {profile.rsi_handle && (
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center'>
                  <StarIcon className='w-4 h-4 text-white' />
                </div>
                <div>
                  <p className='text-sm font-medium text-slate-900 dark:text-white'>
                    RSI Handle
                  </p>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    {profile.rsi_handle}
                  </p>
                </div>
              </div>
            )}

            {profile.website_url && (
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center'>
                  <LinkIcon className='w-4 h-4 text-white' />
                </div>
                <div>
                  <p className='text-sm font-medium text-slate-900 dark:text-white'>
                    Website
                  </p>
                  <a
                    href={profile.website_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-var(--color-accent-blue) hover:text-var(--color-accent-purple) transition-colors'
                  >
                    {profile.website_url}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences Summary */}
      {isOwnProfile && (
        <div className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700'>
          <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center'>
            <StarIcon className='w-5 h-5 mr-2 text-var(--color-accent-blue)' />
            Privacy & Preferences
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg'>
              <span className='text-sm text-slate-700 dark:text-slate-300'>
                Public Profile
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  true // TODO: Add actual public profile preference
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {true // TODO: Add actual public profile preference
                  ? 'Public'
                  : 'Private'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg'>
              <span className='text-sm text-slate-700 dark:text-slate-300'>
                Online Status
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  true // TODO: Add actual online status preference
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {true // TODO: Add actual online status preference
                  ? 'Visible'
                  : 'Hidden'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg'>
              <span className='text-sm text-slate-700 dark:text-slate-300'>
                Email Notifications
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  true // TODO: Add actual email notifications preference
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {true // TODO: Add actual email notifications preference
                  ? 'Enabled'
                  : 'Disabled'}
              </span>
            </div>

            <div className='flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg'>
              <span className='text-sm text-slate-700 dark:text-slate-300'>
                Push Notifications
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  true // TODO: Add actual push notifications preference
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {true // TODO: Add actual push notifications preference
                  ? 'Enabled'
                  : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDisplay;
