import React, { useState } from 'react';
import { SettingsCard, ToggleSwitch } from '../ui';
import { BellIcon } from '@heroicons/react/24/outline';

interface NotificationPreferencesProps {
  className?: string;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  organization_updates: boolean;
  event_reminders: boolean;
  security_alerts: boolean;
  marketing: boolean;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: true,
    organization_updates: true,
    event_reminders: true,
    security_alerts: true,
    marketing: false,
  });

  const toggleNotification = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SettingsCard
      title='Notification Preferences'
      icon={BellIcon}
      iconColor='text-brand-primary'
      className={className}
    >
      <div className='space-y-4'>
        <ToggleSwitch
          checked={notifications.email}
          onChange={() => toggleNotification('email')}
          label='Email'
          description='Receive email notifications'
        />
        <ToggleSwitch
          checked={notifications.push}
          onChange={() => toggleNotification('push')}
          label='Push'
          description='Receive push notifications'
        />
        <ToggleSwitch
          checked={notifications.organization_updates}
          onChange={() => toggleNotification('organization_updates')}
          label='Organization Updates'
          description='Get updates about your organizations'
        />
        <ToggleSwitch
          checked={notifications.event_reminders}
          onChange={() => toggleNotification('event_reminders')}
          label='Event Reminders'
          description='Receive event reminders'
        />
        <ToggleSwitch
          checked={notifications.security_alerts}
          onChange={() => toggleNotification('security_alerts')}
          label='Security Alerts'
          description='Get security-related alerts'
        />
        <ToggleSwitch
          checked={notifications.marketing}
          onChange={() => toggleNotification('marketing')}
          label='Marketing'
          description='Receive marketing communications'
        />
      </div>
    </SettingsCard>
  );
};

export default NotificationPreferences;