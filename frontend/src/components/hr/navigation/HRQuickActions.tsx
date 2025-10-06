import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Paper } from '../../ui';
import {
  DocumentPlusIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface HRQuickActionsProps {
  className?: string;
}

const HRQuickActions: React.FC<HRQuickActionsProps> = ({ className = '' }) => {
  const { spectrumId } = useParams<{ spectrumId: string }>();

  const quickActions = [
    {
      title: 'New Application',
      description: 'Review pending applications',
      icon: UserPlusIcon,
      href: `/organizations/${spectrumId}/hr/applications`,
      color: 'blue',
    },
    {
      title: 'Create Review',
      description: 'Start performance review',
      icon: ClipboardDocumentCheckIcon,
      href: `/organizations/${spectrumId}/hr/performance`,
      color: 'green',
    },
    {
      title: 'Add Skill',
      description: 'Track new skills',
      icon: AcademicCapIcon,
      href: `/organizations/${spectrumId}/hr/skills`,
      color: 'purple',
    },
    {
      title: 'Upload Document',
      description: 'Add HR documents',
      icon: DocumentPlusIcon,
      href: `/organizations/${spectrumId}/hr/documents`,
      color: 'yellow',
    },
  ];

  return (
    <Paper 
      variant='glass' 
      size='lg' 
      className={`${className}`}
    >
      <div className='mb-[var(--spacing-card-md)]'>
        <h3 className='text-[length:var(--text-paper-title)] font-semibold text-primary mb-2'>
          Quick Actions
        </h3>
        <p className='text-[length:var(--text-paper-subtitle)] text-tertiary'>
          Common HR tasks and shortcuts
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-[var(--gap-grid-sm)]'>
        {quickActions.map(action => (
          <Link key={action.title} to={action.href} className='block'>
            <div className='group p-[var(--spacing-card-md)] bg-glass-subtle rounded-[var(--radius-paper)] border border-glass hover:bg-glass-hover hover:border-glass-hover transition-all duration-[var(--duration-normal)] cursor-pointer hover:scale-[var(--scale-button-hover)]'>
              <div className='flex items-start space-x-3'>
                <div className={`w-10 h-10 rounded-lg bg-${action.color}-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-[var(--duration-normal)]`}>
                  <action.icon className={`w-5 h-5 text-${action.color}-400`} />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary group-hover:text-secondary transition-colors'>
                    {action.title}
                  </h4>
                  <p className='text-xs text-tertiary group-hover:text-secondary transition-colors mt-1'>
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Paper>
  );
};

export default HRQuickActions;