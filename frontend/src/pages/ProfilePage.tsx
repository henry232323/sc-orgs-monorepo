import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Paper, Chip, PageTitle, StatLarge, RsiVerificationNotice } from '../components/ui';
import EventCard from '../components/events/EventCard';
import OrganizationCard from '../components/organizations/OrganizationCard';
import { isTemporaryRsiHandle } from '../utils/userUtils';
import {
  useGetCurrentUserQuery,
  useGetUserEventsQuery,
  useGetUserDashboardOrganizationsQuery,
  useGetUserRatingSummaryQuery,
} from '../services/apiSlice';
import {
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  StarIcon,
  PencilIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Interfaces for data that will be implemented later

interface UserActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }> | React.ComponentType<any>;
}

const ProfilePage: React.FC = () => {
  // Fetch real user data from the API
  const { data: user, isLoading, error, refetch } = useGetCurrentUserQuery();



  // Fetch user's registered events
  const { data: userEventsData, isLoading: userEventsLoading } =
    useGetUserEventsQuery({ page: 1, limit: 10 }, { skip: !user });

  // Fetch user's organizations
  const { data: userOrganizations } = useGetUserDashboardOrganizationsQuery(
    undefined,
    { skip: !user }
  );

  // Fetch user's rating summary
  const { data: userRatingSummary } = useGetUserRatingSummaryQuery(undefined, {
    skip: !user,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-2 border-glass border-t-[var(--color-brand-secondary)] mx-auto mb-4'></div>
          <h2 className='text-2xl font-bold text-primary mb-2'>
            Loading Profile
          </h2>
          <p className='text-tertiary'>Fetching your profile data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <ExclamationTriangleIcon className='w-32 h-32 text-error mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-primary mb-2'>
            Error Loading Profile
          </h2>
          <p className='text-tertiary mb-4'>
            Failed to load your profile data. Please try again.
          </p>
          <Button variant='primary' onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show message if no user data
  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <UserIcon className='w-32 h-32 text-muted mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-primary mb-2'>
            No Profile Data
          </h2>
          <p className='text-tertiary mb-4'>
            Unable to load your profile. Please check your authentication.
          </p>
          <Link to='/login'>
            <Button variant='primary'>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }


  // Format dates for display
  const formatDate = (dateString: string | Date | number) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date value:', dateString);
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const formatRelativeTime = (dateString: string | Date | number) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date value:', dateString);
        return 'Invalid Date';
      }
      const now = new Date();
      const diffInHours = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      );

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24)
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      if (diffInHours < 48) return 'Yesterday';
      return formatDate(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Invalid Date';
    }
  };

  // EventCard-compatible formatRelativeTime for timestamps
  const formatRelativeTimeForEvents = (timestamp: number) => {
    const eventDate = new Date(timestamp);
    const now = new Date();
    const diffInMs = eventDate.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return 'Past';
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 14)
      return `${Math.ceil(diffInDays / 7)} week${Math.ceil(diffInDays / 7) > 1 ? 's' : ''}`;
    return `${Math.ceil(diffInDays / 7)} weeks`;
  };

  // User stats based on real data
  const userStats = {
    organizations: userOrganizations?.length || 0,
    events: userEventsData?.data?.length || 0,
    totalMembers: 0, // TODO: Implement total members across user's orgs
    averageRating: userRatingSummary?.average_rating || 0,
  };

  const recentActivity: UserActivity[] = [
    // TODO: Implement real activity tracking
    {
      id: '1',
      type: 'profile_created',
      title: 'Profile Created',
      description:
        'Welcome to SC-Orgs! Your profile has been created successfully.',
      timestamp: formatRelativeTime(user.created_at),
      icon: UserIcon,
    },
  ];

  // Transform user organizations data

  return (
    <div className='min-h-screen p-6'>
      <div className='max-w-7xl mx-auto space-y-8'>
        {/* Profile Header */}
        <Paper variant='glass' size='xl'>
          <div className='flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6'>
            <div className='w-24 h-24 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center flex-shrink-0'>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.rsi_handle}
                  className='w-24 h-24 rounded-full object-cover'
                />
              ) : (
                <UserIcon className='w-12 h-12 text-white' />
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-4 mb-2'>
                <PageTitle as='h1'>
                  {user.rsi_handle}
                  {isTemporaryRsiHandle(user.rsi_handle) && (
                    <span className='text-base text-yellow-400 ml-2'>
                      (Temporary)
                    </span>
                  )}
                </PageTitle>
              </div>
              <p className='text-white/80 mb-3'>
                {isTemporaryRsiHandle(user.rsi_handle)
                  ? 'Star Citizen player looking for adventures in the verse. Complete RSI verification to show your handle.'
                  : `RSI Handle: ${user.rsi_handle}`}
              </p>
              <div className='flex flex-wrap gap-2 mb-4'>
                <Chip variant='status' size='sm'>
                  Discord User
                </Chip>
                {user.is_rsi_verified && (
                  <Chip
                    variant='status'
                    size='sm'
                    className='bg-green-500/20 text-green-400'
                  >
                    Star Citizen Verified
                  </Chip>
                )}
              </div>
              <div className='flex flex-col sm:flex-row gap-4'>
                <Link to='/profile/edit'>
                  <Button variant='primary'>
                    <PencilIcon className='w-4 h-4 mr-2' />
                    Edit Profile
                  </Button>
                </Link>
                <Link to='/settings'>
                  <Button variant='outline'>
                    <Cog6ToothIcon className='w-4 h-4 mr-2' />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Paper>

        {/* Stats Overview */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
          <Paper variant='glass' size='md' className='text-center'>
            <BuildingOfficeIcon className='w-8 h-8 text-white/60 mx-auto mb-3' />
            <StatLarge className='mb-1'>{userStats.organizations}</StatLarge>
            <div className='text-sm text-white/60'>Organizations</div>
          </Paper>
          <Paper variant='glass' size='md' className='text-center'>
            <CalendarIcon className='w-8 h-8 text-white/60 mx-auto mb-3' />
            <div className='text-3xl font-bold text-white mb-1'>
              {userStats.events}
            </div>
            <div className='text-sm text-white/60'>Events</div>
          </Paper>
          <Paper variant='glass' size='md' className='text-center'>
            <UserIcon className='w-8 h-8 text-white/60 mx-auto mb-3' />
            <div className='text-3xl font-bold text-white mb-1'>
              {userStats.totalMembers}
            </div>
            <div className='text-sm text-white/60'>Total Members</div>
          </Paper>
          <Paper variant='glass' size='md' className='text-center'>
            <StarIcon className='w-8 h-8 text-white/60 mx-auto mb-3' />
            <div className='text-3xl font-bold text-white mb-1'>
              {userStats.averageRating ? userStats.averageRating.toFixed(1) : 'N/A'}
            </div>
            <div className='text-sm text-white/60'>
              Avg Rating {userRatingSummary?.total_reviews ? `(${userRatingSummary.total_reviews})` : ''}
            </div>
          </Paper>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* My Organizations */}
          <div>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-semibold text-white'>
                My Organizations
              </h2>
              <Link to='/organizations'>
                <Button variant='outline'>
                  View All
                  <ArrowRightIcon className='w-4 h-4 ml-2' />
                </Button>
              </Link>
            </div>
            {userOrganizations && userOrganizations.length > 0 ? (
              <div className='space-y-4'>
                {userOrganizations.slice(0, 3).map(org => (
                  <OrganizationCard
                    key={org.rsi_org_id}
                    organization={org}
                    showDescription={false}
                    showTags={true}
                    showUpvoteButton={false}
                  />
                ))}
              </div>
            ) : (
              <Paper variant='glass' size='lg'>
                <div className='text-center py-8'>
                  <BuildingOfficeIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-white mb-2'>
                    No Organizations Yet
                  </h3>
                  <p className='text-white/60 mb-4'>
                    Join or register your first organization to get started
                  </p>
                  <Link to='/organizations'>
                    <Button variant='primary'>Browse Organizations</Button>
                  </Link>
                </div>
              </Paper>
            )}
          </div>

          {/* Upcoming Events */}
          <div>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-semibold text-white'>
                Upcoming Events
              </h2>
              <Link to='/events'>
                <Button variant='outline'>
                  View All
                  <ArrowRightIcon className='w-4 h-4 ml-2' />
                </Button>
              </Link>
            </div>
            {userEventsLoading ? (
              <div className='text-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-secondary mx-auto mb-3'></div>
                <p className='text-white/60'>Loading your events...</p>
              </div>
            ) : (() => {
              // Filter for upcoming events only
              const upcomingEvents = userEventsData?.data?.filter(event => 
                new Date(event.start_time) > new Date()
              ) || [];
              
              return upcomingEvents.length > 0 ? (
                <div className='space-y-4'>
                  {upcomingEvents.slice(0, 3).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      formatRelativeTime={formatRelativeTimeForEvents}
                      showTags={false}
                      showDescription={false}
                    />
                  ))}
                </div>
              ) : (
                <Paper variant='glass' size='lg'>
                  <div className='text-center py-8'>
                    <CalendarIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-white mb-2'>
                      No Upcoming Events
                    </h3>
                    <p className='text-white/60 mb-4'>
                      Check out available events or create your own
                    </p>
                    <Link to='/events'>
                      <Button variant='primary'>Browse Events</Button>
                    </Link>
                  </div>
                </Paper>
              );
            })()}
          </div>
        </div>

        {/* RSI Verification Section */}
        <RsiVerificationNotice 
          user={user} 
          onVerificationComplete={() => refetch()}
        />

        {/* Profile Details */}
        <Paper variant='glass' size='lg'>
          <h2 className='text-2xl font-semibold text-white mb-6'>
            Profile Details
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  RSI Handle
                </label>
                <p className='text-white'>
                  {user.rsi_handle}
                  {isTemporaryRsiHandle(user.rsi_handle) && (
                    <span className='text-yellow-400 ml-2'>(Temporary)</span>
                  )}
                </p>
              </div>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  Discord ID
                </label>
                <p className='text-white font-mono text-sm'>
                  {user.discord_id}
                </p>
              </div>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  Discord Email
                </label>
                <p className='text-white'>Not provided</p>
              </div>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  Join Date
                </label>
                <p className='text-white'>{formatDate(user.created_at)}</p>
              </div>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  Last Updated
                </label>
                <p className='text-white'>{formatDate(user.updated_at)}</p>
              </div>
              <div>
                <label className='text-sm font-semibold text-white/60'>
                  RSI Handle
                </label>
                <p className='text-white'>{user.rsi_handle || 'Not set'}</p>
              </div>
            </div>
          </div>
        </Paper>

        {/* Recent Activity */}
        <Paper variant='glass' size='lg'>
          <h2 className='text-2xl font-semibold text-white mb-6'>
            Recent Activity
          </h2>
          <div className='space-y-4'>
            {recentActivity.map(activity => (
              <div
                key={activity.id}
                className='flex items-start space-x-4 p-4 bg-white/5 rounded-lg'
              >
                <div className='w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <activity.icon className='w-5 h-5 text-white/60' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-white'>
                    {activity.title}
                  </h4>
                  <p className='text-sm text-white/60'>
                    {activity.description}
                  </p>
                  <p className='text-xs text-white/40 mt-1'>
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default ProfilePage;
