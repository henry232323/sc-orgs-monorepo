import ViewAnalytics from './ViewAnalytics';
import { useGetEventAnalyticsQuery } from '@/services/apiSlice.ts';
import { Paper } from '../ui';

interface EventAnalyticsProps {
  eventId: string;
  className?: string;
}

// This file causes the page to fail to load if it's named EventAnalytics instead of BEventAnalytics.
// Christ knows why
export default function BEventAnalytics(props: EventAnalyticsProps) {
  const {eventId, className = ''} = props;

  const {
    data: analytics,
    isLoading,
    error
  } = useGetEventAnalyticsQuery({
    eventId,
    includeViewers: false, // Privacy: don't show who viewed
  });

  if (isLoading) {
    return (
      <Paper variant='glass' size='lg' className={className}>
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white/20'></div>
        </div>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant='glass' size='lg' className={className}>
        <div className='text-center py-8'>
          <p className='text-red-400 mb-2'>Failed to load analytics</p>
          <p className='text-sm text-white/60'>
            You may not have permission to view analytics for this event
          </p>
        </div>
      </Paper>
    );
  }

  return (
    <ViewAnalytics
      analytics={analytics!}
      title='Event Page Views'
      showRecentViewers={false}
      className={className}
    />
  );
}
