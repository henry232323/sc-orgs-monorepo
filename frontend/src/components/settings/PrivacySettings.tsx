import React, { useState } from 'react';
import { SettingsCard, ToggleSwitch, Dropdown } from '../ui';
import { EyeIcon } from '@heroicons/react/24/outline';

interface PrivacySettingsProps {
  className?: string;
}

interface PrivacySettingsState {
  profile_visibility: 'public' | 'friends' | 'private';
  show_online_status: boolean;
  allow_messages: boolean;
  show_activity: boolean;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ className = '' }) => {
  const [privacy, setPrivacy] = useState<PrivacySettingsState>({
    profile_visibility: 'public',
    show_online_status: true,
    allow_messages: true,
    show_activity: true,
  });

  const togglePrivacy = (key: keyof PrivacySettingsState) => {
    if (key === 'profile_visibility') return; // Handle separately
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SettingsCard
      title='Privacy Settings'
      icon={EyeIcon}
      iconColor='text-var(--color-accent-blue)'
      className={className}
    >
      <div className='space-y-4'>
        <div className='flex items-center justify-between p-3 bg-glass-subtle rounded-[var(--radius-input)]'>
          <div>
            <h4 className='text-sm font-medium text-white'>
              Profile Visibility
            </h4>
            <p className='text-xs text-white/60'>
              Control who can see your profile
            </p>
          </div>
          <Dropdown
            value={privacy.profile_visibility}
            onChange={value =>
              setPrivacy(prev => ({
                ...prev,
                profile_visibility: value as
                  | 'public'
                  | 'friends'
                  | 'private',
              }))
            }
            options={[
              {
                value: 'public',
                label: 'Public',
                description: 'Visible to everyone',
              },
              {
                value: 'friends',
                label: 'Friends Only',
                description: 'Visible to friends only',
              },
              {
                value: 'private',
                label: 'Private',
                description: 'Visible only to you',
              },
            ]}
            placeholder='Select visibility'
            className='w-48'
          />
        </div>

        <ToggleSwitch
          checked={privacy.show_online_status}
          onChange={() => togglePrivacy('show_online_status')}
          label='Show Online Status'
          description='Show when you are online'
        />
        <ToggleSwitch
          checked={privacy.allow_messages}
          onChange={() => togglePrivacy('allow_messages')}
          label='Allow Messages'
          description='Allow other users to message you'
        />
        <ToggleSwitch
          checked={privacy.show_activity}
          onChange={() => togglePrivacy('show_activity')}
          label='Show Activity'
          description='Show your recent activity'
        />
      </div>
    </SettingsCard>
  );
};

export default PrivacySettings;