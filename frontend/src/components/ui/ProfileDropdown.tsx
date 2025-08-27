import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { User } from '@/types';
import { isTemporaryRsiHandle } from '@/utils/userUtils.ts';

// Reusable menu item components
interface ProfileMenuLinkProps {
  to: string;
  children: React.ReactNode;
}

const ProfileMenuLink: React.FC<ProfileMenuLinkProps> = ({ to, children }) => (
  <MenuItem>
    <Link
      to={to}
      className='block px-4 py-2 text-sm text-white data-[focus]:bg-white/20 data-[focus]:backdrop-blur-sm transition-all duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]'
    >
      {children}
    </Link>
  </MenuItem>
);

interface ProfileMenuButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const ProfileMenuButton: React.FC<ProfileMenuButtonProps> = ({ onClick, children }) => (
  <MenuItem>
    <button
      onClick={onClick}
      className='block w-full text-left px-4 py-2 text-sm text-white data-[focus]:bg-white/20 data-[focus]:backdrop-blur-sm transition-all duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] cursor-pointer'
    >
      {children}
    </button>
  </MenuItem>
);

interface ProfileDropdownProps {
  user: User | null;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  onLogout,
}) => {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center space-x-2 p-2 rounded-lg data-[hover]:bg-white/10 data-[focus]:bg-white/10 transition-colors cursor-pointer">
        <div className='w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center overflow-hidden'>
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.rsi_handle}
              className='w-8 h-8 rounded-full object-cover'
            />
          ) : (
            <UserIcon className='w-5 h-5 text-white' />
          )}
        </div>
        <div className='hidden sm:block text-left'>
          <p className='text-sm font-medium text-white truncate max-w-24'>
            {user?.rsi_handle || 'User'}
            {user?.rsi_handle && isTemporaryRsiHandle(user.rsi_handle) && (
              <span className='text-xs text-yellow-400 ml-1'>
                (Unverified)
              </span>
            )}
          </p>
        </div>
        <ChevronDownIcon className='w-4 h-4 text-white/80' />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className='w-56 bg-dark-glass border border-glass-border rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] py-2 z-50 focus:outline-none'
      >
        {/* User info header */}
        <div className='px-4 py-3 border-b border-white/10'>
          <div className='flex items-center space-x-3 mb-2'>
            <div className='w-10 h-10 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center overflow-hidden'>
              {user?.discord_avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`}
                  alt={user.rsi_handle}
                  className='w-10 h-10 rounded-full object-cover'
                />
              ) : (
                <UserIcon className='w-6 h-6 text-white' />
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-white truncate'>
                {user?.rsi_handle || 'User'}
                {user?.rsi_handle && isTemporaryRsiHandle(user.rsi_handle) && (
                  <span className='text-xs text-yellow-400 ml-2'>
                    (Unverified)
                  </span>
                )}
              </p>
              {user?.is_rsi_verified ? (
                <p className='text-xs text-green-400 truncate'>✓ RSI Verified</p>
              ) : (
                <p className='text-xs text-yellow-400'>RSI verification needed</p>
              )}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className='py-1'>
          <ProfileMenuLink to='/profile'>
            Your Profile
          </ProfileMenuLink>
          <ProfileMenuLink to='/settings'>
            Settings
          </ProfileMenuLink>
          <MenuSeparator className='my-1 h-px bg-white/10' />
          <ProfileMenuButton onClick={onLogout}>
            Sign out
          </ProfileMenuButton>
        </div>
      </MenuItems>
    </Menu>
  );
};

export default ProfileDropdown;
