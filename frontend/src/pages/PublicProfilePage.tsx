import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Paper, Chip, PageContainer, EventViewToggle } from '../components/ui';
import EventCard from '../components/events/EventCard';
import OrganizationCard from '../components/organizations/OrganizationCard';
import { useGetPublicUserProfileQuery } from '../services/apiSlice';
import {
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  StarIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const PublicProfilePage: React.FC = () => {
  const { rsiHandle } = useParams<{ rsiHandle: string }>();
  
  const {
    data: profileData,
    isLoading,
    error,
  } = useGetPublicUserProfileQuery(rsiHandle || '', {
    skip: !rsiHandle,
  });

  // State for events view mode
  const [eventsViewMode, setEventsViewMode] = React.useState<'list' | 'calendar'>('list');

  // Show loading state
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-glass border-t-[var(--color-brand-secondary)] mx-auto mb-4'></div>
          <h2 className='text-2xl font-bold text-primary mb-2'>
            Loading Profile
          </h2>
          <p className='text-tertiary'>Fetching profile data...</p>
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
            Failed to load the profile. The user may not exist or their profile may be private.
          </p>
          <Link to='/organizations'>
            <Button variant='primary'>Back to Organizations</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!profileData) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <UserIcon className='w-32 h-32 text-muted mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-primary mb-2'>
            Profile Not Found
          </h2>
          <p className='text-tertiary mb-4'>
            The user profile you're looking for doesn't exist or is not publicly available.
          </p>
          <Link to='/organizations'>
            <Button variant='primary'>Back to Organizations</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { user, organizations, events, stats } = profileData;

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

  // Separate upcoming and past events
  const upcomingEvents = events.filter(event => new Date(event.start_time) > new Date());
  const pastEvents = events.filter(event => new Date(event.start_time) <= new Date());

  return (
    <PageContainer width='lg' padding='desktop'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <h1 className='text-[length:var(--text-page-title)] font-bold text-primary leading-[var(--leading-tight)] mb-2'>
            {user.rsi_handle}
          </h1>
          <div className='flex items-center space-x-4 text-white/80'>
            <span className='flex items-center'>
              <UserIcon className='w-5 h-5 mr-2' />
              Public Profile
            </span>
            <span className='flex items-center'>
              <ClockIcon className='w-5 h-5 mr-2' />
              Joined {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Overview */}
      <Paper variant='glass' size='xl'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Main Content */}
          <div>
            <div className='flex items-center space-x-6 mb-6'>
              <div className='w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]'>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.rsi_handle}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <UserIcon className='w-full h-full text-primary p-4' />
                )}
              </div>
              <div>
                <h2 className='text-2xl font-semibold text-white mb-2'>
                  {user.rsi_handle}
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {user.is_rsi_verified && (
                    <Chip
                      variant='status'
                      size='sm'
                      className='bg-green-500/20 text-green-400'
                    >
                      Star Citizen Verified
                    </Chip>
                  )}
                  <Chip variant='status' size='sm'>
                    Public Profile
                  </Chip>
                </div>
              </div>
            </div>

            <p className='text-white/80 text-lg leading-relaxed mb-6'>
              Star Citizen player and community member. Check out their organizations and events below.
            </p>
          </div>

          {/* Profile Stats */}
          <div>
            <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
              <StarIcon className='w-6 h-6 mr-3 text-white/60' />
              Profile Statistics
            </h3>

            <div className='grid grid-cols-2 gap-4 mb-6'>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {stats.totalOrganizations}
                </div>
                <div className='text-white/60 text-sm'>Organizations</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {stats.totalEvents}
                </div>
                <div className='text-white/60 text-sm'>Events</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {stats.totalUpvotes}
                </div>
                <div className='text-white/60 text-sm'>Upvotes</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                </div>
                <div className='text-white/60 text-sm'>Avg Rating</div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>RSI Handle</span>
                <span className='text-white'>{user.rsi_handle}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Verified</span>
                <span className='text-white'>
                  {user.is_rsi_verified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Joined</span>
                <span className='text-white'>{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Paper>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Organizations */}
        <div>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl font-semibold text-white'>
              Organizations ({organizations.length})
            </h2>
            <Link to='/organizations'>
              <Button variant='outline'>
                View All
                <ArrowRightIcon className='w-4 h-4 ml-2' />
              </Button>
            </Link>
          </div>
          {organizations.length > 0 ? (
            <div className='space-y-4'>
              {organizations.slice(0, 3).map(org => (
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
                  No Organizations
                </h3>
                <p className='text-white/60'>
                  This user hasn't joined any organizations yet.
                </p>
              </div>
            </Paper>
          )}
        </div>

        {/* Upcoming Events */}
        <div>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl font-semibold text-white'>
              Upcoming Events ({upcomingEvents.length})
            </h2>
            <Link to='/events'>
              <Button variant='outline'>
                View All
                <ArrowRightIcon className='w-4 h-4 ml-2' />
              </Button>
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
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
                <p className='text-white/60'>
                  This user doesn't have any upcoming events.
                </p>
              </div>
            </Paper>
          )}
        </div>
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-2'>
              <ClockIcon className='w-5 h-5 text-gray-400' />
              <h3 className='text-xl font-semibold text-white'>
                Past Events ({pastEvents.length})
              </h3>
            </div>
            <div className='flex items-center space-x-3'>
              <EventViewToggle
                value={eventsViewMode}
                onChange={setEventsViewMode}
                size='sm'
                label='View'
              />
              <Link to='/events'>
                <Button variant='outline' size='sm'>
                  View All Events
                </Button>
              </Link>
            </div>
          </div>

          <div className='space-y-3'>
            {pastEvents.slice(0, 5).map(event => (
              <div
                key={event.id}
                className='flex items-center justify-between p-3 bg-white/5 rounded-lg'
              >
                <div className='flex-1'>
                  <h4 className='text-white font-medium'>{event.title}</h4>
                  <p className='text-white/60 text-sm'>
                    {new Date(event.start_time).toLocaleDateString()} at{' '}
                    {new Date(event.start_time).toLocaleTimeString()}
                  </p>
                </div>
                <Link to={`/events/${event.id}`}>
                  <Button variant='outline' size='sm'>
                    View Details
                  </Button>
                </Link>
              </div>
            ))}
            {pastEvents.length > 5 && (
              <div className='text-center pt-2'>
                <Link to='/events'>
                  <Button variant='outline' size='sm'>
                    View All {pastEvents.length} Past Events
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Paper>
      )}
    </PageContainer>
  );
};

export default PublicProfilePage;