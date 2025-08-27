import React from 'react';
import { UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { User } from '../../types/user';
import { isTemporaryRsiHandle } from '../../utils/userUtils';

interface ProfileButtonProps {
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

const ProfileButton: React.FC<ProfileButtonProps> = ({
  user,
  onToggle,
  buttonRef,
}) => {
  return (
    <button
      ref={buttonRef}
      onClick={onToggle}
      className='flex items-center space-x-2 p-2 rounded-lg data-hover:bg-white/10 transition-colors cursor-pointer'
    >
      <div className='w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center overflow-hidden'>
        {user?.discord_avatar ? (
          <img
            src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`}
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
            <span className='text-xs text-yellow-400 ml-1'>(Unverified)</span>
          )}
        </p>
      </div>
      <ChevronDownIcon className='w-4 h-4 text-white/80' />
    </button>
  );
};

export default ProfileButton;
