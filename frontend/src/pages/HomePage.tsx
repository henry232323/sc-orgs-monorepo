import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Paper, Chip, UpvoteButton, RegisterOrganizationButton } from '../components/ui';
import EventCard from '../components/events/EventCard';
import {
  BuildingOfficeIcon,
  CalendarIcon,
  UserGroupIcon,
  StarIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import {
  useGetFeaturedOrganizationsQuery,
  useGetHomePageStatsQuery,
  useGetUpcomingEventsHomeQuery,
} from '../services/apiSlice';
import { Organization, Event } from '../types';

const HomePage: React.FC = () => {
  // Fetch real data from backend
  const { data: featuredOrganizations, isLoading: isLoadingOrgs } =
    useGetFeaturedOrganizationsQuery({ limit: 3 });

  const { data: stats, isLoading: isLoadingStats } = useGetHomePageStatsQuery();

  const { data: upcomingEvents, isLoading: isLoadingEvents } =
    useGetUpcomingEventsHomeQuery({ limit: 5 });

  // Format stats for display
  const formattedStats = [
    {
      label: 'Active Organizations',
      value: stats?.activeOrganizations?.toString() || '0',
      icon: BuildingOfficeIcon,
    },
    {
      label: 'Upcoming Events',
      value: stats?.upcomingEvents?.toString() || '0',
      icon: CalendarIcon,
    },
    {
      label: 'Total Members',
      value: stats?.totalMembers?.toLocaleString() || '0',
      icon: UserGroupIcon,
    },
    {
      label: 'Total Upvotes',
      value: stats?.totalUpvotes?.toLocaleString() || '0',
      icon: StarIcon,
    },
  ];

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

  return (
    <div>
      {/* Hero Section */}
      <div className='relative overflow-hidden'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24'>
          <div className='text-center'>
            <h1 className='text-5xl md:text-6xl font-bold text-primary mb-[var(--spacing-card-lg)]'>
              Welcome to{' '}
              <span className='bg-gradient-to-r from-[var(--color-brand-secondary)] to-[var(--color-brand-primary)] bg-clip-text text-transparent'>
                Star Citizen Organizations
              </span>
            </h1>
            <p className='text-xl text-secondary mb-[var(--spacing-section)] max-w-3xl mx-auto'>
              Connect with fellow pilots, join organizations, and participate in
              epic events across the vast Star Citizen universe. Your adventure
              starts here.
            </p>
            <div className='flex flex-col sm:flex-row gap-[var(--spacing-element)] justify-center'>
              <Link to='/organizations'>
                <Button variant='primary' size='lg'>
                  <BuildingOfficeIcon className='w-6 h-6 mr-2' />
                  Browse Organizations
                </Button>
              </Link>
              <Link to='/events'>
                <Button variant='glass' size='lg'>
                  <CalendarIcon className='w-6 h-6 mr-2' />
                  View Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-[var(--spacing-section)]'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
          {isLoadingStats
            ? // Loading skeleton for stats
              [...Array(4)].map((_, index) => (
                <Paper
                  key={index}
                  variant='glass-strong'
                  size='md'
                  className='text-center animate-pulse'
                >
                  <div className='w-8 h-8 bg-glass-elevated rounded mx-auto mb-3'></div>
                  <div className='h-8 bg-glass-elevated rounded mb-1'></div>
                  <div className='h-4 bg-glass-elevated rounded'></div>
                </Paper>
              ))
            : formattedStats.map((stat, index) => (
                <Paper
                  key={index}
                  variant='glass-strong'
                  size='md'
                  className='text-center glass-interactive'
                >
                  <stat.icon className='w-8 h-8 text-tertiary mx-auto mb-3' />
                  <div className='text-3xl font-bold text-primary mb-1'>
                    {stat.value}
                  </div>
                  <div className='text-sm text-tertiary'>{stat.label}</div>
                </Paper>
              ))}
        </div>
      </div>

      {/* Featured Organizations */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='flex items-center justify-between mb-[var(--spacing-section)]'>
          <h2 className='text-3xl font-bold text-primary'>
            Featured Organizations
          </h2>
          <Link to='/organizations'>
            <Button variant='glass'>
              View All
              <ArrowRightIcon className='w-4 h-4 ml-2' />
            </Button>
          </Link>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
          {isLoadingOrgs ? (
            // Loading skeleton for organizations
            [...Array(3)].map((_, index) => (
              <Paper
                key={index}
                variant='glass-strong'
                size='lg'
                className='animate-pulse'
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-glass-elevated rounded-lg'></div>
                    <div className='flex-1'>
                      <div className='h-5 bg-glass-elevated rounded mb-2'></div>
                      <div className='h-4 bg-glass-elevated rounded w-2/3'></div>
                    </div>
                  </div>
                </div>
                <div className='h-4 bg-glass-elevated rounded mb-4'></div>
                <div className='flex gap-2 mb-4'>
                  <div className='h-6 bg-glass-elevated rounded w-16'></div>
                  <div className='h-6 bg-glass-elevated rounded w-20'></div>
                </div>
                <div className='h-10 bg-glass-elevated rounded'></div>
              </Paper>
            ))
          ) : featuredOrganizations && featuredOrganizations.length > 0 ? (
            featuredOrganizations.map((org: Organization) => (
              <Paper
                key={org.rsi_org_id}
                variant='glass-strong'
                size='lg'
                interactive
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-lg flex items-center justify-center'>
                      <BuildingOfficeIcon className='w-6 h-6 text-white' />
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-white'>
                        {org.name}
                      </h3>
                      <div className='flex items-center space-x-2 text-sm text-white/60'>
                        <UserGroupIcon className='w-4 h-4' />
                        <span>{org.total_members || 0} members</span>
                        <StarIcon className='w-4 h-4' />
                        <span>{org.total_upvotes || 0} upvotes</span>
                      </div>
                    </div>
                  </div>
                  <UpvoteButton
                    spectrumId={org.rsi_org_id}
                    currentUpvotes={org.total_upvotes || 0}
                    variant='compact'
                    size='sm'
                    showCount={false}
                  />
                </div>
                <p className='text-white/80 text-sm mb-4'>
                  {org.description || 'No description available.'}
                </p>
                <div className='flex flex-wrap gap-2 mb-4'>
                  {org.playstyle_tags?.slice(0, 3).map((tag: string) => (
                    <Chip key={tag} variant='status' size='sm'>
                      {tag}
                    </Chip>
                  )) || (
                    <Chip variant='status' size='sm'>
                      General
                    </Chip>
                  )}
                </div>
                <Link to={`/organizations/${org.rsi_org_id}`}>
                  <Button variant='outline' className='w-full'>
                    View Organization
                    <ArrowRightIcon className='w-4 h-4 ml-2' />
                  </Button>
                </Link>
              </Paper>
            ))
          ) : (
            <div className='md:col-span-3'>
              <Paper variant='glass' size='lg' className='text-center'>
                <BuildingOfficeIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-white mb-2'>
                  No featured organizations yet
                </h3>
                <p className='text-white/80 mb-6'>
                  Check back later for featured organizations or create your
                  own!
                </p>
                <RegisterOrganizationButton variant='primary' />
              </Paper>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='flex items-center justify-between mb-8'>
          <h2 className='text-3xl font-bold text-white'>Upcoming Events</h2>
          <Link to='/events'>
            <Button variant='outline'>
              View All
              <ArrowRightIcon className='w-4 h-4 ml-2' />
            </Button>
          </Link>
        </div>
        <div className='overflow-x-auto pb-4'>
          <div className='flex gap-6 min-w-max'>
            {isLoadingEvents ? (
              // Loading skeleton for events
              [...Array(5)].map((_, index) => (
                <div key={index} className='w-[28rem] flex-shrink-0'>
                  <Paper
                    variant='glass'
                    size='lg'
                    className='animate-pulse h-full'
                  >
                    <div className='flex items-start justify-between mb-4'>
                      <div className='flex items-center space-x-3'>
                        <div className='w-12 h-12 bg-white/20 rounded-lg'></div>
                        <div className='flex-1'>
                          <div className='h-5 bg-white/20 rounded mb-2'></div>
                          <div className='h-4 bg-white/20 rounded w-1/2'></div>
                        </div>
                      </div>
                    </div>
                    <div className='flex gap-2 mb-4'>
                      <div className='h-6 bg-white/20 rounded w-16'></div>
                      <div className='h-6 bg-white/20 rounded w-20'></div>
                    </div>
                    <div className='h-10 bg-white/20 rounded'></div>
                  </Paper>
                </div>
              ))
            ) : upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event: Event) => (
                <div key={event.id} className='w-[28rem] flex-shrink-0'>
                  <EventCard
                    event={event}
                    formatRelativeTime={(timestamp: number) =>
                      formatRelativeTime(new Date(timestamp))
                    }
                    showTags={true}
                    showDescription={true}
                  />
                </div>
              ))
            ) : (
              <div className='w-full min-w-max'>
                <Paper variant='glass' size='lg' className='text-center'>
                  <CalendarIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-white mb-2'>
                    No upcoming events
                  </h3>
                  <p className='text-white/80 mb-6'>
                    Check back later for new events or create your own!
                  </p>
                  <Link to='/events/create'>
                    <Button variant='primary'>
                      <CalendarIcon className='w-5 h-5 mr-2' />
                      Create Event
                    </Button>
                  </Link>
                </Paper>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <h2 className='text-3xl font-bold text-white text-center mb-12'>
          Why Choose Star Citizen Organizations?
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          <Paper variant='glass' size='lg' className='text-center'>
            <ShieldCheckIcon className='w-12 h-12 text-white/60 mx-auto mb-4' />
            <h3 className='text-xl font-semibold text-white mb-3'>
              Verified Organizations
            </h3>
            <p className='text-white/80'>
              All organizations are verified and registered, ensuring a safe and
              trustworthy community for all members.
            </p>
          </Paper>
          <Paper variant='glass' size='lg' className='text-center'>
            <RocketLaunchIcon className='w-12 h-12 text-white/60 mx-auto mb-4' />
            <h3 className='text-xl font-semibold text-white mb-3'>
              Epic Events
            </h3>
            <p className='text-white/80'>
              Participate in organized events, missions, and operations with
              fellow pilots from across the verse.
            </p>
          </Paper>
          <Paper variant='glass' size='lg' className='text-center'>
            <GlobeAltIcon className='w-12 h-12 text-white/60 mx-auto mb-4' />
            <h3 className='text-xl font-semibold text-white mb-3'>
              Global Community
            </h3>
            <p className='text-white/80'>
              Connect with players from around the world, share experiences, and
              build lasting friendships in the Star Citizen universe.
            </p>
          </Paper>
        </div>
      </div>

      {/* CTA Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <Paper variant='glass' size='xl' className='text-center'>
          <h2 className='text-3xl font-bold text-white mb-4'>
            Ready to Start Your Journey?
          </h2>
          <p className='text-white/80 mb-8 max-w-2xl mx-auto'>
            Join thousands of pilots who have already found their place in the
            Star Citizen community. Register an organization, join existing ones,
            or participate in epic events.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <RegisterOrganizationButton variant='primary' size='lg' />
            <Link to='/organizations'>
              <Button variant='outline' size='lg'>
                <UserGroupIcon className='w-6 h-6 mr-2' />
                Join Organization
              </Button>
            </Link>
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default HomePage;
