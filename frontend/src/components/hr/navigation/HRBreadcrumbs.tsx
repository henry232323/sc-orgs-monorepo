import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useGetOrganizationQuery } from '../../../services/apiSlice';

interface HRBreadcrumbsProps {
  currentPage: string;
  className?: string;
}

const HRBreadcrumbs: React.FC<HRBreadcrumbsProps> = ({ 
  currentPage, 
  className = '' 
}) => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  
  const { data: organization } = useGetOrganizationQuery(spectrumId!, {
    skip: !spectrumId,
  });

  const breadcrumbs = [
    {
      name: organization?.name || 'Organization',
      href: `/organizations/${spectrumId}`,
    },
    {
      name: 'HR',
      href: `/organizations/${spectrumId}/hr/dashboard`,
    },
    {
      name: currentPage,
      href: null, // Current page, no link
    },
  ];

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-tertiary ${className}`}
      aria-label='Breadcrumb'
    >
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.name}>
          {index > 0 && (
            <ChevronRightIcon className='w-4 h-4 text-muted' />
          )}
          {breadcrumb.href ? (
            <Link 
              to={breadcrumb.href}
              className='hover:text-primary transition-colors duration-[var(--duration-normal)] truncate'
            >
              {breadcrumb.name}
            </Link>
          ) : (
            <span className='text-primary font-medium truncate'>
              {breadcrumb.name}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default HRBreadcrumbs;