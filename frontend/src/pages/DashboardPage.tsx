import React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Paper,
  SectionTitle,
  StatLarge,
  Page,
} from '../components/ui';
import EventCard from '../components/events/EventCard';
import OrganizationCard from '../components/organizations/OrganizationCard';
import {
  useGetUserDashboardStatsQuery,
  useGetUserDashboardOrganizationsQuery,
  useGetUserDashboardEventsQuery,
  useGetUserActivityQuery,
} from '../services/apiSlice';
import {
  BuildingOfficeIcon,
  CalendarIcon,
  UserGroupIcon,
  StarIcon,
  BellIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { getActivityIcon, formatRelativeTime as formatActivityTime, getActivityUrl } from '../utils/activityUtils';

const DashboardPage: React.FC = () => {
  // Fetch dashboard data using RTK Query
  const { data: userStats, isLoading: statsLoading } =
    useGetUserDashboardStatsQuery();

  const { data: userOrganizations } = useGetUserDashboardOrganizationsQuery();

  const { data: userEvents } = useGetUserDashboardEventsQuery();

  // Fetch user's recent activity
  const { data: recentActivity = [], isLoading: isActivityLoading } = useGetUserActivityQuery({ limit: 5 });

  // Filter upcoming events from user events and deduplicate
  const upcomingEvents =
    userEvents
      ?.filter(event => new Date(event.start_time) > new Date())
      .filter(
        (event, index, self) =>
          // Remove duplicates by checking if this is the first occurrence of this event ID
          index === self.findIndex(e => e.id === event.id)
      )
      .slice(0, 4) || [];

  // Format relative time for event cards
  const formatRelativeTime = (date: Date | string | number) => {
    const now = new Date();
    let eventDate: Date;
    let diffInMs: number;

    try {
      if (typeof date === 'string') {
        eventDate = new Date(date);
      } else if (typeof date === 'number') {
        eventDate = new Date(date);
      } else if (date instanceof Date) {
        eventDate = date;
      } else {
        console.error('Invalid date format:', typeof date, date);
        return 'Invalid Date';
      }

      // Check if the date is valid
      if (isNaN(eventDate.getTime())) {
        console.error('Invalid date value:', date);
        return 'Invalid Date';
      }

      diffInMs = eventDate.getTime() - now.getTime();
    } catch (error) {
      console.error('Error parsing date:', date, error);
      return 'Invalid Date';
    }

    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return 'Past';
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks`;
    return `${Math.floor(diffInDays / 30)} months`;
  };

  // Use user organizations data directly (limited to 2 for dashboard)
  const myOrganizations = userOrganizations?.slice(0, 2) || [];

  const quickActions = [
    {
      title: 'Register Organization',
      description: 'Start your own Star Citizen organization',
      icon: BuildingOfficeIcon,
      href: '/organizations/create',
      variant: 'primary' as const,
    },
    {
      title: 'Browse Events',
      description: 'Find and join upcoming events',
      icon: CalendarIcon,
      href: '/events',
      variant: 'outline' as const,
    },
    {
      title: 'View Profile',
      description: 'Manage your profile and settings',
      icon: UserGroupIcon,
      href: '/profile',
      variant: 'outline' as const,
    },
  ];

  return (
    <Page
      title='Dashboard'
      subtitle="Welcome back! Here's what's happening in your Star Citizen universe."
      headerActions={
        <>
          <Button variant='glass' size='sm'>
            <BellIcon className='w-5 h-5 mr-2' />
            Notifications
          </Button>
          <Button variant='glass' size='sm'>
            <ChartBarIcon className='w-5 h-5 mr-2' />
            Analytics
          </Button>
        </>
      }
      width='lg'
    >
      {/* Stats Overview */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
        <Paper
          variant='glass-strong'
          size='md'
          className='text-center glass-interactive'
        >
          <BuildingOfficeIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
          <StatLarge className='mb-1'>
            {statsLoading ? '...' : userStats?.totalOrganizations || 0}
          </StatLarge>
          <div className='text-sm text-tertiary'>Organizations</div>
        </Paper>
        <Paper
          variant='glass-strong'
          size='md'
          className='text-center glass-interactive'
        >
          <CalendarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
          <StatLarge className='mb-1'>
            {statsLoading ? '...' : userStats?.totalEvents || 0}
          </StatLarge>
          <div className='text-sm text-tertiary'>Events</div>
        </Paper>
        <Paper
          variant='glass-strong'
          size='md'
          className='text-center glass-interactive'
        >
          <UserGroupIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
          <div className='text-3xl font-bold text-primary mb-1'>
            {statsLoading ? '...' : userStats?.totalUpvotes || 0}
          </div>
          <div className='text-sm text-tertiary'>Upvotes Given</div>
        </Paper>
        <Paper
          variant='glass-strong'
          size='md'
          className='text-center glass-interactive'
        >
          <StarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
          <div className='text-3xl font-bold text-primary mb-1'>
            {statsLoading
              ? '...'
              : userStats?.averageRating?.toFixed(1) || '0.0'}
          </div>
          <div className='text-sm text-tertiary'>Avg Rating</div>
        </Paper>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionTitle className='mb-[var(--spacing-card-lg)]'>
          Quick Actions
        </SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
          {quickActions.map(action => (
            <Link key={action.title} to={action.href} className='block'>
              <Paper
                variant='glass-strong'
                size='lg'
                interactive
                className='h-full transition-all duration-[var(--duration-normal)] hover:scale-[var(--scale-hover)] cursor-pointer'
              >
                <div className='text-center'>
                  <action.icon className='w-12 h-12 text-tertiary mx-auto mb-4 group-hover:text-secondary transition-colors duration-[var(--duration-normal)]' />
                  <h3 className='text-lg font-semibold text-primary mb-2'>
                    {action.title}
                  </h3>
                  <p className='text-secondary text-sm mb-4'>
                    {action.description}
                  </p>
                  <div className='flex items-center justify-center text-[var(--color-accent-blue)] text-sm font-medium'>
                    Get Started
                    <ArrowRightIcon className='w-4 h-4 ml-2' />
                  </div>
                </div>
              </Paper>
            </Link>
          ))}
        </div>
      </div>

      {/* My Organizations */}
      <div>
        <div className='flex items-center justify-between mb-[var(--spacing-card-lg)]'>
          <SectionTitle>My Organizations</SectionTitle>
          <Link to='/organizations'>
            <Button variant='glass'>
              View All
              <ArrowRightIcon className='w-4 h-4 ml-2' />
            </Button>
          </Link>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-md)]'>
          {myOrganizations.map(org => (
            <OrganizationCard
              key={org.rsi_org_id}
              organization={org}
              showDescription={false}
              showTags={false}
              showUpvoteButton={false}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-semibold text-white'>Upcoming Events</h2>
          <Link to='/events'>
            <Button variant='outline'>
              View All
              <ArrowRightIcon className='w-4 h-4 ml-2' />
            </Button>
          </Link>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                formatRelativeTime={(timestamp: number) =>
                  formatRelativeTime(new Date(timestamp))
                }
                showTags={true}
                showDescription={true}
              />
            ))
          ) : (
            <div className='md:col-span-2'>
              <Paper variant='glass' size='lg' className='text-center'>
                <CalendarIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-white mb-2'>
                  No upcoming events
                </h3>
                <p className='text-white/80 mb-6'>
                  You don't have any upcoming events. Browse events to find
                  something to join!
                </p>
                <Link to='/events'>
                  <Button variant='primary'>
                    <CalendarIcon className='w-5 h-5 mr-2' />
                    Browse Events
                  </Button>
                </Link>
              </Paper>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className='text-2xl font-semibold text-white mb-6'>
          Recent Activity
        </h2>
        <Paper variant='glass' size='lg'>
          {isActivityLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white/20'></div>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-white/60'>No recent activity to show</p>
              <p className='text-sm text-white/40 mt-2'>
                Start by joining organizations or registering for events!
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {recentActivity.map(activity => {
                const ActivityIcon = getActivityIcon(activity.type);
                const activityUrl = getActivityUrl(activity.type, activity.entity_id, activity.metadata);
                
                const ActivityContent = (
                  <div className='flex items-start space-x-4 p-4 bg-white/5 rounded-lg'>
                    <div className='w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <ActivityIcon className='w-5 h-5 text-white/60' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h4 className='text-sm font-semibold text-white'>
                        {activity.title}
                      </h4>
                      <p className='text-sm text-white/60'>
                        {activity.description}
                      </p>
                      <p className='text-xs text-white/40 mt-1'>
                        {formatActivityTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                );

                return activityUrl ? (
                  <Link key={activity.id} to={activityUrl} className='block hover:bg-white/5 rounded-lg transition-colors'>
                    {ActivityContent}
                  </Link>
                ) : (
                  <div key={activity.id}>
                    {ActivityContent}
                  </div>
                );
              })}
            </div>
          )}
        </Paper>
      </div>
    </Page>
  );
};

export default DashboardPage;
