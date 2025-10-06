import React from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, SidebarItem, SidebarSection } from '../../ui';
import {
  ChartBarIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface HRSidebarProps {
  className?: string;
}

const HRSidebar: React.FC<HRSidebarProps> = ({ className = '' }) => {
  const { spectrumId } = useParams<{ spectrumId: string }>();

  const hrNavigation = [
    {
      name: 'HR Dashboard',
      href: `/organizations/${spectrumId}/hr/dashboard`,
      icon: ChartBarIcon,
      description: 'Overview and metrics',
    },
    {
      name: 'Applications',
      href: `/organizations/${spectrumId}/hr/applications`,
      icon: BriefcaseIcon,
      description: 'Job applications',
    },
    {
      name: 'Performance',
      href: `/organizations/${spectrumId}/hr/performance`,
      icon: ChartBarIcon,
      description: 'Reviews and goals',
    },
    {
      name: 'Skills',
      href: `/organizations/${spectrumId}/hr/skills`,
      icon: AcademicCapIcon,
      description: 'Skills and certifications',
    },
    {
      name: 'Documents',
      href: `/organizations/${spectrumId}/hr/documents`,
      icon: DocumentTextIcon,
      description: 'Policies and files',
    },
  ];

  const organizationNavigation = [
    {
      name: 'Organization',
      href: `/organizations/${spectrumId}`,
      icon: UserGroupIcon,
      description: 'Main organization page',
    },
    {
      name: 'Management',
      href: `/organizations/${spectrumId}/manage`,
      icon: ClipboardDocumentListIcon,
      description: 'Organization settings',
    },
  ];

  return (
    <Sidebar className={`w-72 ${className}`}>
      <div className='p-[var(--spacing-card-lg)]'>
        <div className='mb-[var(--spacing-section)]'>
          <h2 className='text-[length:var(--text-component-title)] font-semibold text-primary mb-2'>
            HR Management
          </h2>
          <p className='text-[length:var(--text-component-subtitle)] text-tertiary'>
            Human resources tools
          </p>
        </div>

        <div className='space-y-[var(--spacing-section)]'>
          <SidebarSection title='HR Modules'>
            {hrNavigation.map(item => (
              <SidebarItem
                key={item.name}
                href={item.href}
                icon={<item.icon className='w-5 h-5' />}
                className='group'
              >
                <div className='flex-1'>
                  <div className='text-sm font-medium'>{item.name}</div>
                  <div className='text-xs text-muted group-hover:text-tertiary transition-colors'>
                    {item.description}
                  </div>
                </div>
              </SidebarItem>
            ))}
          </SidebarSection>

          <SidebarSection title='Organization'>
            {organizationNavigation.map(item => (
              <SidebarItem
                key={item.name}
                href={item.href}
                icon={<item.icon className='w-5 h-5' />}
                className='group'
              >
                <div className='flex-1'>
                  <div className='text-sm font-medium'>{item.name}</div>
                  <div className='text-xs text-muted group-hover:text-tertiary transition-colors'>
                    {item.description}
                  </div>
                </div>
              </SidebarItem>
            ))}
          </SidebarSection>
        </div>
      </div>
    </Sidebar>
  );
};

export default HRSidebar;