import React from 'react';
import { UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Organization } from '../../types/organization';

interface RecentActivityProps {
  organization: Organization;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ organization }) => {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-medium text-white'>Recent Activity</h2>
        <p className='text-sm text-white/60'>
          Recent activity and updates for this organization
        </p>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center space-x-3 p-3 bg-white/5 rounded-lg'>
          <div className='w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center'>
            <UserGroupIcon className='w-4 h-4 text-white' />
          </div>
          <div className='flex-1'>
            <p className='text-white text-sm'>
              <span className='font-semibold'>Organization created</span> on
              SC-Orgs
            </p>
            <p className='text-white/60 text-xs'>
              {formatDate(organization.created_at)}
            </p>
          </div>
        </div>

        <div className='flex items-center space-x-3 p-3 bg-white/5 rounded-lg'>
          <div className='w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center'>
            <CheckCircleIcon className='w-4 h-4 text-white' />
          </div>
          <div className='flex-1'>
            <p className='text-white text-sm'>
              <span className='font-semibold'>Registration completed</span> on
              SC-Orgs
            </p>
            <p className='text-white/60 text-xs'>
              {organization.updated_at
                ? formatDate(organization.updated_at)
                : 'Recently'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
