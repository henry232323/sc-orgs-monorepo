import React from 'react';
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { Sidebar, SidebarItem, SidebarSection } from '../ui';
import { User } from '../../types/user';
import { navigation, quickActions } from '../../config/navigation';

interface DesktopSidebarProps {
  user: User | null;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = () => {
  return (
    <div className='hidden lg:block'>
      <Sidebar className='fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 z-30'>
        <div className='p-6'>
          <div className='mb-8'>
            <h2 className='text-lg font-semibold text-secondary mb-2'>
              Navigation
            </h2>
            <p className='text-sm text-muted'>Explore the platform</p>
          </div>

          <div className='space-y-6'>
            <SidebarSection title='Main Navigation'>
              {navigation.map(item => (
                <SidebarItem
                  key={item.name}
                  href={item.href}
                  icon={<item.icon />}
                >
                  {item.name}
                </SidebarItem>
              ))}
            </SidebarSection>

            <SidebarSection title='Quick Actions'>
              {quickActions.map(action => (
                <SidebarItem
                  key={action.name}
                  href={action.href}
                  icon={<action.icon />}
                >
                  {action.name}
                </SidebarItem>
              ))}
            </SidebarSection>

            <SidebarSection title='Support & Resources'>
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
        </div>
      </Sidebar>
    </div>
  );
};

export default DesktopSidebar;
