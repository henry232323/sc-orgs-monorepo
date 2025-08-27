import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useGetCurrentUserQuery,
  useGetOrganizationQuery,
  useGetEventsByOrganizationQuery,
  useDeleteOrganizationMutation,
} from '../../services/apiSlice';
import {
  Button,
  Paper,
  Chip,
  PageContainer,
  EventViewToggle,
  UpvoteButton,
  FullMarkdown,
  RsiVerificationNotice,
} from '../ui';

import EventCalendar from '../events/EventCalendar';
import OrganizationRatingDisplay from './OrganizationRatingDisplay';
import {
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  PlusIcon,
  GlobeAltIcon,
  CogIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { Organization } from '../../types/organization';
import { convertCodesToNames } from '../../utils/languageMapping';

interface OrganizationDetailProps {
  organization?: Organization;
}

const OrganizationDetail: React.FC<OrganizationDetailProps> = () => {
  const navigate = useNavigate();
  const { spectrumId } = useParams();
  const { isAuthenticated } = useAuth();
  const { data: user, isLoading: userLoading } = useGetCurrentUserQuery(
    undefined,
    {
      skip: !isAuthenticated,
    }
  );

  // Fetch real organization data
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
  } = useGetOrganizationQuery(spectrumId || '', {
    skip: !spectrumId,
  });

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // State for events view mode
  const [eventsViewMode, setEventsViewMode] = React.useState<
    'list' | 'calendar'
  >('list');

  // Organization delete mutation
  const [deleteOrganization, { isLoading: isDeleting }] =
    useDeleteOrganizationMutation();

  // Get events for this organization
  const { data: eventsData, isLoading: eventsLoading } =
    useGetEventsByOrganizationQuery(
      { spectrumId: organization?.rsi_org_id || '', page: 1, limit: 50 },
      { skip: !organization?.rsi_org_id }
    );

  // Debug logging
  console.log('OrganizationDetail - spectrumId:', spectrumId);
  console.log('OrganizationDetail - organization:', organization);
  console.log('OrganizationDetail - orgLoading:', orgLoading);
  console.log('OrganizationDetail - orgError:', orgError);
  console.log(
    'OrganizationDetail - organization?.rsi_org_id:',
    organization?.rsi_org_id
  );

  // Ensure spectrum_id is always available (it's the same as rsi_org_id for orgs)
  const spectrum_id = organization?.rsi_org_id || spectrumId;
  console.log('OrganizationDetail - computed spectrum_id:', spectrum_id);

  // Helper function to parse dates from SQLite
  const parseDate = (dateString: string | Date | number): Date => {
    if (typeof dateString === 'string') {
      // Handle SQLite datetime format
      if (dateString.includes('-') && dateString.includes(':')) {
        return new Date(dateString);
      }
      // Handle timestamp
      if (!isNaN(Number(dateString))) {
        return new Date(Number(dateString));
      }
    }
    return new Date(dateString);
  };

  // Helper function to format dates
  const formatDate = (dateString: string | Date | number): string => {
    try {
      const date = parseDate(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Invalid Date';
    }
  };

  // Show loading state for user or organization
  if (userLoading || orgLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-brand-secondary mx-auto mb-4'></div>
          <h2 className='text-2xl font-bold text-white mb-2'>
            Loading Organization
          </h2>
          <p className='text-white/80'>
            Please wait while we load the organization details...
          </p>
        </div>
      </div>
    );
  }

  // Show error state for organization
  if (orgError) {
    return (
      <div className='text-center py-12'>
        <ExclamationTriangleIcon className='w-16 h-16 text-red-500 mx-auto mb-4' />
        <h2 className='text-2xl font-semibold text-white mb-4'>
          Error Loading Organization
        </h2>
        <p className='text-white/80 mb-6'>
          Failed to load the organization. Please try again.
        </p>
        <Link to='/organizations'>
          <Button variant='primary'>Back to Organizations</Button>
        </Link>
      </div>
    );
  }

  // Show not found state
  if (!organization) {
    return (
      <div className='text-center py-12'>
        <h2 className='text-2xl font-semibold text-white mb-4'>
          Organization not found
        </h2>
        <p className='text-white/80 mb-6'>
          The organization you're looking for doesn't exist or has been removed.
        </p>
        <Link to='/organizations'>
          <Button variant='primary'>Back to Organizations</Button>
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleJoinOrganization = async () => {
    // TODO: Implement join organization logic
    console.log('Joining organization:', spectrumId);
  };


  return (
    <div className="relative min-h-screen">
      {/* Banner Background */}
      {organization.banner_url && (
        <div 
          className="absolute top-0 left-0 right-0 rounded-t-2xl overflow-hidden"
          style={{
            height: 'auto',
            aspectRatio: '16/9',
          }}
        >
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${organization.banner_url})`,
              backgroundPosition: 'center top',
              maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
            }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <PageContainer width='lg' padding='desktop'>
          {/* RSI Verification Notice for unverified users (only when logged in) */}
          {isAuthenticated && user && !user.is_rsi_verified && (
            <RsiVerificationNotice user={user} />
          )}

      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <h1 className='text-[length:var(--text-page-title)] font-bold text-primary leading-[var(--leading-tight)] mb-2'>
            {organization.name}
          </h1>
          <div className='flex items-center space-x-4 text-white/80'>
            <span className='flex items-center'>
              <BuildingOfficeIcon className='w-5 h-5 mr-2' />
              Organization
            </span>
            <span className='flex items-center'>
              <ClockIcon className='w-5 h-5 mr-2' />
              Created {new Date(organization.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className='flex items-center space-x-3'>
          <UpvoteButton
            spectrumId={organization.rsi_org_id}
            currentUpvotes={organization.total_upvotes || 0}
            variant='default'
            size='md'
            showCount={true}
          />
          {user?.rsi_handle === organization.owner_handle ? (
            <>
              <Button
                variant='outline'
                onClick={() => navigate(`/organizations/${spectrumId}/manage`)}
              >
                <CogIcon className='w-5 h-5 mr-2' />
                Manage
              </Button>
              <Button variant='outline' onClick={handleDelete}>
                <ExclamationTriangleIcon className='w-5 h-5 mr-2' />
                Delete
              </Button>
            </>
          ) : (
            <Button
              variant='primary'
              onClick={handleJoinOrganization}
              disabled={!user?.is_rsi_verified}
            >
              <UserGroupIcon className='w-5 h-5 mr-2' />
              Join Organization
            </Button>
          )}
        </div>
      </div>

      {/* Organization Overview */}
      <Paper variant='glass' size='xl'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Main Content */}
          <div>
            <h2 className='text-2xl font-semibold text-white mb-4'>
              About {organization.name}
            </h2>
            {organization.description ? (
              <FullMarkdown
                content={organization.description}
                className='text-lg leading-relaxed mb-6'
              />
            ) : (
              <p className='text-white/80 text-lg leading-relaxed mb-6'>
                No description available.
              </p>
            )}

            {/* Tags */}
            {((organization.playstyle_tags &&
              organization.playstyle_tags.length > 0) ||
              (organization.focus_tags &&
                organization.focus_tags.length > 0)) && (
              <div className='mt-6'>
                <h4 className='text-lg font-semibold text-white mb-3'>Tags</h4>
                <div className='flex flex-wrap gap-2'>
                  {organization.playstyle_tags?.map((tag, index) => (
                    <Chip
                      key={`playstyle-${index}`}
                      variant='status'
                      size='sm'
                      className='bg-blue-500/20 text-blue-400'
                    >
                      {tag}
                    </Chip>
                  ))}
                  {organization.focus_tags?.map((tag, index) => (
                    <Chip
                      key={`focus-${index}`}
                      variant='status'
                      size='sm'
                      className='bg-green-500/20 text-green-400'
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Organization Details */}
          <div>
            <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
              <BuildingOfficeIcon className='w-6 h-6 mr-3 text-white/60' />
              Organization Details
            </h3>

            {/* Organization Stats */}
            <div className='grid grid-cols-2 gap-4 mb-6'>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {organization.total_members || 0}
                </div>
                <div className='text-white/60 text-sm'>Members</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {eventsData?.total || 0}
                </div>
                <div className='text-white/60 text-sm'>Events</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {organization.is_active ? 'Active' : 'Inactive'}
                </div>
                <div className='text-white/60 text-sm'>Status</div>
              </div>
              <div className='text-center p-3 bg-white/5 rounded-lg'>
                <div className='text-2xl font-bold text-white'>
                  {organization.total_upvotes || 0}
                </div>
                <div className='text-white/60 text-sm'>Upvotes</div>
              </div>
            </div>

            {/* Event Ratings */}
            <div className='mb-6'>
              <h4 className='text-lg font-semibold text-white mb-4 flex items-center'>
                <StarIcon className='w-5 h-5 mr-2 text-white/60' />
                Event Ratings
              </h4>
              <OrganizationRatingDisplay
                organizationId={organization.rsi_org_id}
                organizationName={organization.name}
                variant='compact'
              />
            </div>

            <div className='space-y-3 mb-6'>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>RSI Page</span>
                {spectrum_id ? (
                  <a
                    href={`https://robertsspaceindustries.com/en/orgs/${spectrum_id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-white hover:underline'
                  >
                    View RSI Page
                  </a>
                ) : (
                  <span className='text-white/60'>Loading...</span>
                )}
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Languages</span>
                <div className='flex flex-wrap gap-1 justify-end'>
                  {organization.languages &&
                  (Array.isArray(organization.languages)
                    ? organization.languages.length > 0
                    : true) ? (
                    convertCodesToNames(
                      Array.isArray(organization.languages)
                        ? organization.languages
                        : [organization.languages]
                    ).map((lang, index) => (
                      <Chip key={index} variant='status' size='sm'>
                        {lang}
                      </Chip>
                    ))
                  ) : (
                    <span className='text-white/60'>Not specified</span>
                  )}
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Owner</span>
                <Link 
                  to={`/profile/${organization.owner_handle}`}
                  className='text-white hover:text-brand-secondary transition-colors'
                >
                  {organization.owner_handle ||
                    `User ID: ${organization.owner_handle}`}
                </Link>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Created</span>
                <span className='text-white'>
                  {formatDate(organization.created_at)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-white/80'>Last Updated</span>
                <span className='text-white'>
                  {formatDate(organization.updated_at)}
                </span>
              </div>

              {organization.discord && (
                <div className='flex items-center justify-between'>
                  <span className='text-white/80'>Discord</span>
                  <a
                    href={organization.discord}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-brand-secondary hover:underline'
                  >
                    Join Server
                  </a>
                </div>
              )}
              {organization.website && (
                <div className='flex items-center justify-between'>
                  <span className='text-white/80'>Website</span>
                  <a
                    href={organization.website}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-brand-secondary hover:underline'
                  >
                    Visit Website
                  </a>
                </div>
              )}
              {organization.location && (
                <div className='flex items-center justify-between'>
                  <span className='text-white/80'>Location</span>
                  <span className='text-white'>{organization.location}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className='space-y-[var(--spacing-element)]'>
              <div>
                {spectrum_id ? (
                  <a
                    href={`https://robertsspaceindustries.com/en/orgs/${spectrum_id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Button variant='outline' className='w-full justify-center'>
                      <GlobeAltIcon className='w-5 h-5 mr-2' />
                      View RSI Page
                    </Button>
                  </a>
                ) : (
                  <Button
                    variant='outline'
                    className='w-full justify-center'
                    disabled
                  >
                    <GlobeAltIcon className='w-5 h-5 mr-2' />
                    Loading...
                  </Button>
                )}
              </div>
              <div>
                <Button
                  variant='outline'
                  className='w-full justify-center'
                  onClick={() =>
                    navigate(
                      `/organizations/${organization?.rsi_org_id || ''}/members`
                    )
                  }
                >
                  <UserGroupIcon className='w-5 h-5 mr-2' />
                  View Members
                </Button>
              </div>
              <div>
                <Button variant='outline' className='w-full justify-center'>
                  <ClockIcon className='w-5 h-5 mr-2' />
                  View Events
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Paper>

      {/* Events Section */}
      <div className='space-y-6'>
        {/* Upcoming Events */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-2'>
              <CalendarIcon className='w-5 h-5 text-green-400' />
              <h3 className='text-xl font-semibold text-white'>
                Upcoming Events ({eventsData?.data ? eventsData.data.filter(event => new Date(event.start_time) > new Date()).length : 0})
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

          {eventsLoading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-[var(--color-accent-blue)] mx-auto mb-3'></div>
              <p className='text-tertiary'>Loading events...</p>
            </div>
          ) : (() => {
            const upcomingEvents = eventsData?.data ? eventsData.data.filter(event => new Date(event.start_time) > new Date()) : [];
            
            return upcomingEvents.length > 0 ? (
              eventsViewMode === 'calendar' ? (
                <EventCalendar
                  events={upcomingEvents}
                  className='mb-4'
                  onDateSelect={date => {
                    console.log('Selected date:', date);
                    // TODO: Filter events for selected date
                  }}
                />
              ) : (
                <div className='space-y-3'>
                  {upcomingEvents.slice(0, 5).map(event => (
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
                  {upcomingEvents.length > 5 && (
                    <div className='text-center pt-2'>
                      <Link to='/events'>
                        <Button variant='outline' size='sm'>
                          View All {upcomingEvents.length} Upcoming Events
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className='text-center py-8'>
                <CalendarIcon className='w-16 h-16 text-white/40 mx-auto mb-3' />
                <p className='text-white/80 mb-4'>No upcoming events scheduled</p>
                <Button
                  variant='primary'
                  size='sm'
                  onClick={() =>
                    navigate(`/events/create?org=${organization?.rsi_org_id || ''}`)
                  }
                >
                  <PlusIcon className='w-5 h-5 mr-2' />
                  Create Event
                </Button>
              </div>
            );
          })()}
        </Paper>

        {/* Past Events */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center space-x-2'>
              <ClockIcon className='w-5 h-5 text-gray-400' />
              <h3 className='text-xl font-semibold text-white'>
                Past Events ({eventsData?.data ? eventsData.data.filter(event => new Date(event.start_time) <= new Date()).length : 0})
              </h3>
            </div>
            <Link to='/events'>
              <Button variant='outline' size='sm'>
                View All Events
              </Button>
            </Link>
          </div>

          {eventsLoading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-[var(--color-accent-blue)] mx-auto mb-3'></div>
              <p className='text-tertiary'>Loading events...</p>
            </div>
          ) : (() => {
            const pastEvents = eventsData?.data ? eventsData.data.filter(event => new Date(event.start_time) <= new Date()).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) : [];
            
            return pastEvents.length > 0 ? (
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
            ) : (
              <div className='text-center py-8'>
                <ClockIcon className='w-16 h-16 text-white/40 mx-auto mb-3' />
                <p className='text-white/80'>No past events found</p>
              </div>
            );
          })()}
        </Paper>
      </div>

      {/* Delete Organization Confirmation Modal */}
      {showDeleteConfirm && organization && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-900 border border-red-500/30 rounded-lg p-6 w-full max-w-md mx-4'>
            <div className='text-center'>
              <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20 mb-4'>
                <ExclamationTriangleIcon className='h-6 w-6 text-red-400' />
              </div>
              <h3 className='text-lg font-semibold text-white mb-2'>
                Delete Organization
              </h3>
              <p className='text-white/70 mb-6'>
                Are you sure you want to delete{' '}
                <strong>{organization.name}</strong>? This action cannot be
                undone and will remove all organization data, events, and member
                information.
              </p>

              <div className='flex space-x-3'>
                <Button
                  variant='outline'
                  onClick={() => setShowDeleteConfirm(false)}
                  className='flex-1'
                >
                  Cancel
                </Button>
                <Button
                  variant='danger'
                  onClick={async () => {
                    try {
                      await deleteOrganization(organization.rsi_org_id).unwrap();
                      navigate('/organizations');
                    } catch (error) {
                      console.error('Failed to delete organization:', error);
                    }
                  }}
                  disabled={isDeleting}
                  className='flex-1'
                >
                  {isDeleting ? 'Deleting...' : 'Delete Organization'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </PageContainer>
      </div>
    </div>
  );
};

export default OrganizationDetail;
