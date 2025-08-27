import React from 'react';
import { Paper, Chip } from '../ui';
import { EyeIcon, UserGroupIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { ViewAnalytics as ViewAnalyticsType } from '../../types/analytics';

interface ViewAnalyticsProps {
  analytics: ViewAnalyticsType;
  title?: string;
  showRecentViewers?: boolean;
  className?: string;
}

const ViewAnalytics: React.FC<ViewAnalyticsProps> = ({
  analytics,
  title = 'View Analytics',
  showRecentViewers = false,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const viewTime = new Date(timestamp);
    const diffInMs = now.getTime() - viewTime.getTime();
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  return (
    <Paper variant='glass' size='lg' className={className}>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center'>
            <EyeIcon className='w-5 h-5 text-blue-400' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-white'>{title}</h3>
            <p className='text-sm text-white/60'>Last 30 days</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-white mb-1'>
              {analytics.total_views.toLocaleString()}
            </div>
            <div className='text-sm text-white/60'>Total Views</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-white mb-1'>
              {analytics.unique_views.toLocaleString()}
            </div>
            <div className='text-sm text-white/60'>Unique Viewers</div>
          </div>
        </div>

        {/* Views by Date */}
        {analytics.views_by_date.length > 0 && (
          <div>
            <h4 className='text-sm font-medium text-white/80 mb-3 flex items-center gap-2'>
              <CalendarDaysIcon className='w-4 h-4' />
              Daily Views
            </h4>
            <div className='space-y-2'>
              {analytics.views_by_date.slice(0, 7).map(day => (
                <div key={day.date} className='flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg'>
                  <span className='text-sm text-white/80'>
                    {formatDate(day.date)}
                  </span>
                  <Chip variant='default' size='sm'>
                    {day.unique_views} view{day.unique_views !== 1 ? 's' : ''}
                  </Chip>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Viewers */}
        {showRecentViewers && analytics.recent_viewers && analytics.recent_viewers.length > 0 && (
          <div>
            <h4 className='text-sm font-medium text-white/80 mb-3 flex items-center gap-2'>
              <UserGroupIcon className='w-4 h-4' />
              Recent Viewers
            </h4>
            <div className='space-y-2'>
              {analytics.recent_viewers.slice(0, 5).map(viewer => (
                <div key={viewer.user_id} className='flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center overflow-hidden'>
                      {viewer.avatar_url ? (
                        <img
                          src={viewer.avatar_url}
                          alt={viewer.rsi_handle}
                          className='w-8 h-8 rounded-full object-cover'
                        />
                      ) : (
                        <UserGroupIcon className='w-4 h-4 text-white' />
                      )}
                    </div>
                    <span className='text-sm text-white/80'>
                      {viewer.rsi_handle}
                    </span>
                  </div>
                  <span className='text-xs text-white/50'>
                    {formatRelativeTime(viewer.viewed_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {analytics.total_views === 0 && (
          <div className='text-center py-8'>
            <EyeIcon className='w-12 h-12 text-white/20 mx-auto mb-3' />
            <p className='text-white/60'>No views recorded yet</p>
            <p className='text-sm text-white/40 mt-1'>
              Views will appear here once people visit this page
            </p>
          </div>
        )}
      </div>
    </Paper>
  );
};

export default ViewAnalytics;
