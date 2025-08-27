import React from 'react';
import { Link } from 'react-router-dom';
import {
  XMarkIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Sidebar, SidebarItem, SidebarSection } from '../ui';
import { User } from '../../types/user';
import { isTemporaryRsiHandle } from '../../utils/userUtils';
import { navigation, quickActions } from '../../config/navigation';

interface MobileSidebarProps {
  user: User | null;
  isAuthenticated: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  user,
  isAuthenticated,
  isOpen,
  onClose,
}) => {
  return (
    <nav className='lg:hidden'>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className={`fixed inset-0 z-50 bg-black/80 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar className='h-full'>
            <div className='flex items-center justify-between h-16 px-6 border-b border-glass'>
              <div className='flex items-center space-x-3'>
                <h1 className='text-xl font-bold text-primary'>SC-Orgs</h1>
                {isAuthenticated && user && (
                  <div className='flex items-center space-x-2'>
                    <div className='w-6 h-6 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center overflow-hidden'>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.rsi_handle}
                          className='w-6 h-6 rounded-full object-cover'
                        />
                      ) : (
                        <UserIcon className='w-4 h-4 text-white' />
                      )}
                    </div>
                    <span className='text-sm text-white/80 truncate max-w-20'>
                      {user.rsi_handle}
                      {isTemporaryRsiHandle(user.rsi_handle) && (
                        <span className='text-xs text-yellow-400 ml-1'>
                          (Unverified)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className='p-2 rounded-lg data-hover:bg-white/10 cursor-pointer'
              >
                <XMarkIcon className='w-6 h-6 text-white/80' />
              </button>
            </div>

                <div className='flex-1 overflow-y-auto p-4 space-y-6'>
                  <SidebarSection title='Navigation'>
                    {navigation.map(item => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className='group flex items-center gap-3 rounded-[var(--radius-nav)] px-3 py-2 text-sm leading-normal transition-all duration-[var(--duration-normal)] cursor-pointer border text-tertiary border-transparent hover:bg-glass-hover hover:text-primary hover:shadow-[var(--shadow-glass-md)] hover:scale-[var(--scale-button-hover)] hover:border-glass-hover active:scale-[var(--scale-button-active)]'
                      >
                        <span className='size-5 transition-all duration-[var(--duration-normal)] text-muted group-hover:text-primary group-hover:scale-110'>
                          <item.icon />
                        </span>
                        <span className='truncate'>{item.name}</span>
                      </Link>
                    ))}
                  </SidebarSection>

                  <SidebarSection title='Quick Actions'>
                    {quickActions.map(action => (
                      <Link
                        key={action.name}
                        to={action.href}
                        onClick={onClose}
                        className='group flex items-center gap-3 rounded-[var(--radius-nav)] px-3 py-2 text-sm leading-normal transition-all duration-[var(--duration-normal)] cursor-pointer border text-tertiary border-transparent hover:bg-glass-hover hover:text-primary hover:shadow-[var(--shadow-glass-md)] hover:scale-[var(--scale-button-hover)] hover:border-glass-hover active:scale-[var(--scale-button-active)]'
                      >
                        <span className='size-5 transition-all duration-[var(--duration-normal)] text-muted group-hover:text-primary group-hover:scale-110'>
                          <action.icon />
                        </span>
                        <span className='truncate'>{action.name}</span>
                      </Link>
                    ))}
                  </SidebarSection>

                  <SidebarSection title='Support'>
                    <a
                      href='https://discord.com/invite/N4Gy8py8J4'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-3 px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
                    >
                      <QuestionMarkCircleIcon className='w-5 h-5' />
                      Help & Support
                    </a>
                    <SidebarItem
                      icon={<BookOpenIcon />}
                      onClick={() => console.log('Documentation clicked')}
                    >
                      Documentation
                    </SidebarItem>
                  </SidebarSection>
                </div>
              </Sidebar>
        </div>
    </nav>
  );
};

export default MobileSidebar;
