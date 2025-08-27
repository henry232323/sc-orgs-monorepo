import React from 'react';
import ViewAnalytics from '../analytics/ViewAnalytics';
import { useGetOrganizationAnalyticsQuery } from '@/services/apiSlice.ts';
import { Paper } from '../ui';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface OrganizationAnalyticsProps {
  organizationId: string;
}

const OrganizationAnalytics: React.FC<OrganizationAnalyticsProps> = ({
  organizationId,
}) => {
  // Fetch organization analytics
  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useGetOrganizationAnalyticsQuery({
    spectrumId: organizationId,
    includeViewers: false,
  });

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center'>
            <ChartBarIcon className='w-5 h-5 text-blue-400' />
          </div>
          <div>
            <h2 className='text-xl font-semibold text-white'>
              Organization Analytics
            </h2>
            <p className='text-sm text-white/60'>
              View insights and engagement metrics for your organization
            </p>
          </div>
        </div>

        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white/20'></div>
          </div>
        </Paper>
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center'>
            <ChartBarIcon className='w-5 h-5 text-blue-400' />
          </div>
          <div>
            <h2 className='text-xl font-semibold text-white'>
              Organization Analytics
            </h2>
            <p className='text-sm text-white/60'>
              View insights and engagement metrics for your organization
            </p>
          </div>
        </div>

        <Paper variant='glass' size='lg'>
          <div className='text-center py-8'>
            <p className='text-red-400 mb-2'>Failed to load analytics</p>
            <p className='text-sm text-white/60'>
              You may not have permission to view analytics for this organization
            </p>
          </div>
        </Paper>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center'>
          <ChartBarIcon className='w-5 h-5 text-blue-400' />
        </div>
        <div>
          <h2 className='text-xl font-semibold text-white'>
            Organization Analytics
          </h2>
          <p className='text-sm text-white/60'>
            View insights and engagement metrics for your organization
          </p>
        </div>
      </div>

      {analytics && (
        <ViewAnalytics
          analytics={analytics}
          title='Organization Page Views'
          showRecentViewers={false}
        />
      )}
    </div>
  );
};

export default OrganizationAnalytics;
