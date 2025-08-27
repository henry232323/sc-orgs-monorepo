import React, { useRef, useState, useEffect } from 'react';
import {
  Bars3Icon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { Button, DiscordLoginButton } from '../ui';
import NotificationCenter from '../notifications/NotificationCenter';
import ProfileDropdown from '../ui/ProfileDropdown';
import { useGetNotificationsQuery } from '@/services/apiSlice.ts';
import { User } from '@/types';

interface AppHeaderProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  onMobileSidebarToggle: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  isAuthenticated,
  isLoading,
  login,
  logout,
  onMobileSidebarToggle,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Get notification data for unread count
  const { data: notificationsData } = useGetNotificationsQuery(
    { page: 1, limit: 5 },
    {
      skip: !isAuthenticated,
      pollingInterval: 120000, // Poll every 2 minutes
    }
  );

  const unreadCount = notificationsData?.unread_count || 0;

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isNotificationOpen &&
        !notificationButtonRef.current?.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-notification-dropdown]')
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  return (
    <header className='bg-glass backdrop-blur-[var(--blur-glass-medium)] shadow-[var(--shadow-glass-lg)] border-b border-glass sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          <div className='flex items-center lg:hidden'>
            <button
              onClick={onMobileSidebarToggle}
              className='p-2 rounded-lg data-hover:bg-white/10 mr-3 transition-colors cursor-pointer'
            >
              <Bars3Icon className='w-6 h-6 text-white/80' />
            </button>
            <h1 className='text-xl font-bold text-primary'>SC-Orgs</h1>
          </div>

            <div className='hidden lg:block'>
              <h1 className='text-xl font-bold text-primary'>SC-Orgs</h1>
              <p className='text-xs text-muted mt-1'>
                Star Citizen Organization Platform
              </p>
            </div>

            <div className='flex items-center space-x-4'>
              {/* Debug info - only show in development */}
              {import.meta.env.DEV && (
                <div className='text-xs text-white/60 mr-4'>
                  Auth: {isAuthenticated ? 'Yes' : 'No'} | Loading:{' '}
                  {isLoading ? 'Yes' : 'No'}
                </div>
              )}

              {/* Theme Toggle */}
              {/* TODO: Re-add theme toggle when ThemeToggle component is created */}

              {/* Notifications */}
              {isAuthenticated && (
                <div className='relative'>
                  <button
                    ref={notificationButtonRef}
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className='p-2 rounded-lg data-hover:bg-white/10 transition-colors relative cursor-pointer'
                  >
                    <BellIcon className='w-5 h-5 text-white' />
                    {/* Notification badge - only show when there are unread notifications */}
                    {unreadCount > 0 && (
                      <span
                        className='absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-xs font-medium px-1 shadow-[var(--shadow-sm)] border backdrop-blur-sm'
                        style={{
                          backgroundColor: 'rgb(214 0 255)',
                          borderColor: 'rgba(214 0 255 / 0.3)',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationCenter
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    buttonRef={notificationButtonRef}
                  />
                </div>
              )}

              {/* User Menu or Login Button */}
              {isAuthenticated ? (
                <ProfileDropdown user={user} onLogout={logout} />
              ) : (
                <div className='flex items-center space-x-3'>
                  <Button
                    variant='text'
                    size='md'
                    onClick={() => (window.location.href = '/login')}
                  >
                    Sign In
                  </Button>
                  <DiscordLoginButton
                    variant='primary'
                    size='md'
                    onClick={login}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
  );
};

export default AppHeader;
