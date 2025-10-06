import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ChartBarIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface HRNavigationTabsProps {
  className?: string;
}

const HRNavigationTabs: React.FC<HRNavigationTabsProps> = ({ className = '' }) => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  const location = useLocation();

  const tabs = [
    {
      name: 'Dashboard',
      href: `/organizations/${spectrumId}/hr/dashboard`,
      icon: ChartBarIcon,
    },
    {
      name: 'Applications',
      href: `/organizations/${spectrumId}/hr/applications`,
      icon: BriefcaseIcon,
    },
    {
      name: 'Performance',
      href: `/organizations/${spectrumId}/hr/performance`,
      icon: ClipboardDocumentListIcon,
    },
    {
      name: 'Skills',
      href: `/organizations/${spectrumId}/hr/skills`,
      icon: AcademicCapIcon,
    },
    {
      name: 'Documents',
      href: `/organizations/${spectrumId}/hr/documents`,
      icon: DocumentTextIcon,
    },
  ];

  return (
    <div className={`border-b border-glass ${className}`}>
      <nav className='flex space-x-8 px-[var(--spacing-card-lg)]'>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-[var(--duration-normal)] ${
                isActive
                  ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]'
                  : 'border-transparent text-tertiary hover:text-primary hover:border-glass-hover'
              }`}
            >
              <tab.icon
                className={`-ml-0.5 mr-2 h-5 w-5 transition-all duration-[var(--duration-normal)] ${
                  isActive
                    ? 'text-[var(--color-accent-blue)]'
                    : 'text-muted group-hover:text-primary group-hover:scale-110'
                }`}
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default HRNavigationTabs;