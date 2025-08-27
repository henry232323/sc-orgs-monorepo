import React from 'react';
import { SettingsCard } from '../ui';
import { DiscordServersList } from '../discord';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface DiscordServersSettingsProps {
  className?: string;
}

const DiscordServersSettings: React.FC<DiscordServersSettingsProps> = ({ className = '' }) => {
  return (
    <SettingsCard
      title='Discord Servers'
      icon={ChatBubbleLeftRightIcon}
      iconColor='text-brand-primary'
      className={className}
    >
      <DiscordServersList />
    </SettingsCard>
  );
};

export default DiscordServersSettings;