import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Button,
  Paper,
  Page,
  PageContainer,
  SectionTitle,
  ConfirmationDialog,
  CalendarDropdown,
  FullMarkdown,
  AdminActionsDropdown,
} from '../ui';
import type { AdminAction } from '../ui/AdminActionsDropdown';
import { convertCodesToNames } from '@/utils/languageMapping.ts';
import {
  useGetEventQuery,
  useRegisterForEventMutation,
  useUnregisterFromEventMutation,
  useGetEventRegistrationsQuery,
  useGetOrganizationQuery,
  useDeleteEventMutation,
  useGetEventNotificationUsageQuery,
  useMarkEventNotificationsAsReadMutation,
  useGetEventRatingSummaryQuery,
} from '@/services/apiSlice.ts';
import { useAuth } from '../../contexts/AuthContext';
import EventReviewsList from './EventReviewsList';
import ReviewEligibilityButton from './ReviewEligibilityButton';
import EventOwnerNotificationForm from './EventOwnerNotificationForm';
import {
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  TagIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  StarIcon,
  LockClosedIcon,
  GlobeAltIcon,
  BellIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { createCalendarEvent } from '@/utils/calendar.ts';
import BEventAnalytics from '@/components/analytics/BEventAnalytics.tsx';

interface EventDetailProps {
  event?: any;
}

const EventDetail: React.FC<EventDetailProps> = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State for notification form
  const [showNotificationForm, setShowNotificationForm] = useState(false);

  const {
    data: event,
    isLoading,
    error,
  } = useGetEventQuery(id || '', { skip: !id });

  const [registerForEvent, { isLoading: isRegistering }] =
    useRegisterForEventMutation();
  const [unregisterFromEvent, { isLoading: isUnregistering }] =
    useUnregisterFromEventMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [markEventNotificationsAsRead] =
    useMarkEventNotificationsAsReadMutation();

  const { data: registrationsData, isLoading: registrationsLoading } =
    useGetEventRegistrationsQuery(id || '', { skip: !id });

  const registrations = registrationsData?.data || [];
  const participantCount = registrations.length;

  // Fetch organization data separately using Spectrum ID
  const { data: organization, isLoading: organizationLoading } =
    useGetOrganizationQuery(event?.organization_spectrum_id || '', {
      skip: !event?.organization_spectrum_id,
    });

  // Fetch rating summary for the event
  const { data: ratingSummary } = useGetEventRatingSummaryQuery(id || '', {
    skip: !id,
  });

  const [isOwner, setIsOwner] = useState(false);

  // Fetch notification usage for event owners
  const { data: notificationUsage } = useGetEventNotificationUsageQuery(
    { eventId: id || '' },
    { skip: !id || !isOwner }
  );
  const [hasJoined, setHasJoined] = useState(false);
  const participantsRef = useRef<HTMLDivElement>(null);

  // Check ownership and registration status when event or user changes
  useEffect(() => {
    if (event && user) {
      setIsOwner(event.created_by === user.id);
    }
  }, [event, user]);

  // Mark event notifications as read when viewing the event page
  useEffect(() => {
    if (event && user && id) {
      markEventNotificationsAsRead(id).catch(error => {
        // Silently handle errors - don't show to user as this is a background operation
        console.debug('Failed to mark event notifications as read:', error);
      });
    }
  }, [event, user, id, markEventNotificationsAsRead]);

  // Check if user is registered for this event
  useEffect(() => {
    if (registrations && user) {
      const userRegistration = registrations.find(
        (reg: any) => reg.user_id === user.id
      );
      setHasJoined(!!userRegistration);
    }
  }, [registrations, user]);

  const handleEdit = () => {
    navigate(`/events/${id}/edit`);
  };

  const handleClone = () => {
    if (!event) return;

    // Clone the event by navigating to create page with pre-filled data
    const cloneData = {
      organization_id: event.organization_spectrum_id, // Use RSI org ID for cloning
      title: `${event.title} (Copy)`,
      description: event.description,
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      end_time: new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000 +
          (event.duration_minutes || 120) * 60 * 1000
      ),
      duration_minutes: event.duration_minutes,
      location: event.location,
      languages: event.languages,
      playstyle_tags: event.playstyle_tags || [],
      activity_tags: event.activity_tags || [],
      max_participants: event.max_participants,
      is_public: event.is_public,
      registration_deadline: event.registration_deadline
        ? new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
        : undefined, // 6 days from now
    };

    // Store clone data in sessionStorage and navigate to create page
    sessionStorage.setItem('eventCloneData', JSON.stringify(cloneData));
    navigate('/events/create');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;

    try {
      await deleteEvent(id).unwrap();
      navigate('/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
      // You could add a toast notification here
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleJoinEvent = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!id) return;

    try {
      await registerForEvent({ eventId: id }).unwrap();
      setHasJoined(true);
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  };

  const handleLeaveEvent = async () => {
    if (!id) return;

    try {
      await unregisterFromEvent({ eventId: id }).unwrap();
      setHasJoined(false);
    } catch (error) {
      console.error('Failed to leave event:', error);
    }
  };

  const getTimeUntilEvent = (dateValue: string | Date | number) => {
    if (!dateValue) return 'Unknown';
    const eventDate = new Date(dateValue);
    const now = new Date();
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
    return `In ${Math.ceil(diffDays / 30)} months`;
  };

  const formatEventDate = (dateValue: string | Date | number) => {
    if (!dateValue) return 'No date set';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to ensure tags are arrays (no longer needed for parsing JSON strings)
  const ensureArray = (tags: string | string[]): string[] => {
    return Array.isArray(tags) ? tags : [];
  };

  // Helper function to check if event has already started (for join/leave buttons)
  const isEventPast = (event: any): boolean => {
    if (!event?.start_time) return false;
    const eventDate = new Date(event.start_time);
    const now = new Date();
    return eventDate < now;
  };


  // Helper function to calculate and format duration
  const formatDuration = (startTime: number, endTime: number): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();

    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Round to nearest large unit
    if (diffDays >= 1) {
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    } else if (diffHours >= 1) {
      return diffHours === 1 ? '1 hour' : `${diffHours} hours`;
    } else {
      return diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
    }
  };

  // Function to scroll to participants section
  const scrollToParticipants = () => {
    participantsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-transparent'>
        <div className='animate-spin rounded-full h-32 w-32 border-2 border-glass border-t-[var(--color-accent-blue)]'></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <PageContainer>
        <div className='text-center py-12'>
          <h2 className='text-2xl font-semibold text-red-400 mb-4'>
            Event not found
          </h2>
          <p className='text-gray-400 mb-6'>
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Link to='/events'>
            <Button variant='primary'>Back to Events</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const headerActions = (
    <div className='flex items-center gap-[var(--spacing-element)]'>
      <Link to='/events'>
        <Button variant='glass'>
          <ArrowLeftIcon className='w-4 h-4 mr-2' />
          Back to Events
        </Button>
      </Link>
      <div className='flex items-center space-x-3'>
        {!isEventPast(event) && (
          <Button
            variant={hasJoined ? 'outline' : 'primary'}
            onClick={hasJoined ? handleLeaveEvent : handleJoinEvent}
            disabled={isRegistering || isUnregistering}
          >
            {isRegistering || isUnregistering ? (
              <>
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2'></div>
                {hasJoined ? 'Leaving...' : 'Joining...'}
              </>
            ) : hasJoined ? (
              <>
                <XMarkIcon className='w-5 h-5 mr-2' />
                Leave Event
              </>
            ) : (
              <>
                <CheckIcon className='w-5 h-5 mr-2' />
                Join Event
              </>
            )}
          </Button>
        )}
        {isOwner && (
          <AdminActionsDropdown
            actions={[
              {
                id: 'notify',
                label: `Notify (${10 - (notificationUsage?.notifications_sent || 0)})`,
                icon: BellIcon as any,
                onClick: () => setShowNotificationForm(true),
                disabled: (notificationUsage?.notifications_sent || 0) >= 10,
              },
              {
                id: 'analytics',
                label: 'Analytics',
                icon: ChartBarIcon as any,
                onClick: () => {
                  const analyticsElement = document.getElementById('event-analytics');
                  analyticsElement?.scrollIntoView({ behavior: 'smooth' });
                },
                separator: true,
              },
              {
                id: 'edit',
                label: 'Edit Event',
                icon: PencilIcon as any,
                onClick: handleEdit,
              },
              {
                id: 'clone',
                label: 'Clone Event',
                icon: DocumentDuplicateIcon as any,
                onClick: handleClone,
                separator: true,
              },
              {
                id: 'delete',
                label: isDeleting ? 'Deleting...' : 'Delete Event',
                icon: TrashIcon as any,
                onClick: handleDelete,
                variant: 'danger' as const,
                disabled: isDeleting,
              },
            ] as AdminAction[]}
          />
        )}
      </div>
    </div>
  );

  return (
    <Page
      title={event.title}
      headerActions={headerActions}
      width='lg'
      padding='desktop'
    >
      {/* Event metadata - moved from subtitle */}
      <div className='flex items-center space-x-4 text-secondary mb-[var(--spacing-component)]'>
        <span className='flex items-center'>
          <CalendarIcon className='w-5 h-5 mr-2' />
          {getTimeUntilEvent(event.start_time)}
        </span>
        <span className='flex items-center'>
          <MapPinIcon className='w-5 h-5 mr-2' />
          {event.location}
        </span>
        <span className='flex items-center'>
          <UserGroupIcon className='w-5 h-5 mr-2' />
          {event.max_participants} participants max
        </span>
      </div>

      {/* Event Overview */}
      <Paper variant='glass' size='xl'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Main Content */}
          <div className='lg:col-span-2'>
            <SectionTitle>About This Event</SectionTitle>
            {event.description ? (
              <FullMarkdown
                content={event.description}
                className='text-lg leading-relaxed mb-6'
              />
            ) : (
              <p className='text-white/80 text-lg leading-relaxed mb-6'>
                No description available.
              </p>
            )}

            {/* Event Stats */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-white'>
                  {event.max_participants}
                </div>
                <div className='text-sm text-white/60'>Max Participants</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-white'>
                  {participantCount}
                </div>
                <div className='text-sm text-white/60'>
                  Current Participants
                </div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-white'>
                  {event.max_participants
                    ? event.max_participants - participantCount
                    : '∞'}
                </div>
                <div className='text-sm text-white/60'>Available Spots</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-white'>
                  {ratingSummary?.average_rating ? ratingSummary.average_rating.toFixed(1) : 'N/A'}
                </div>
                <div className='text-sm text-white/60'>
                  Rating {ratingSummary?.total_reviews ? `(${ratingSummary.total_reviews})` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className='space-y-4'>
            {/* Hosting Organization or Creator */}
            <div className='space-y-3'>
              <h4 className='text-sm font-semibold text-white/80 flex items-center'>
                {event.organization_spectrum_id ? (
                  <>
                    <UserGroupIcon className='w-4 h-4 mr-2' />
                    Hosted by Organization
                  </>
                ) : (
                  <>
                    <UserIcon className='w-4 h-4 mr-2' />
                    Event Creator
                  </>
                )}
              </h4>
              {event.organization_spectrum_id ? (
                // Organization info
                organizationLoading ? (
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-lg flex items-center justify-center'>
                      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white/60'></div>
                    </div>
                    <div>
                      <div className='h-4 bg-white/20 rounded w-24 mb-1'></div>
                      <div className='h-3 bg-white/10 rounded w-16'></div>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center space-x-3'>
                    <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-lg flex items-center justify-center'>
                      {organization?.icon_url ? (
                        <img
                          src={organization.icon_url}
                          alt={organization.name}
                          className='w-10 h-10 rounded-lg object-cover'
                        />
                      ) : (
                        <UserIcon className='w-6 h-6 text-white' />
                      )}
                    </div>
                    <div>
                      <h5 className='text-sm font-semibold text-white'>
                        {organization?.name || 'Unknown Organization'}
                      </h5>
                      <p className='text-xs text-white/60'>
                        {organization?.rsi_org_id
                          ? `RSI ID: ${organization.rsi_org_id}`
                          : 'Organization details not available'}
                      </p>
                      {organization?.rsi_org_id && (
                        <Link
                          to={`/organizations/${organization.rsi_org_id}`}
                          className='text-xs text-white hover:text-white/80 transition-colors font-medium'
                        >
                          View Organization →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              ) : (
                // Creator info for orgless events
                <div className='flex items-center space-x-3'>
                  <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-lg flex items-center justify-center overflow-hidden'>
                    {event?.creator_avatar ? (
                      <img
                        src={event.creator_avatar}
                        alt={event.creator_handle || 'Event Creator'}
                        className='w-12 h-12 rounded-lg object-cover'
                      />
                    ) : (
                      <UserIcon className='w-6 h-6 text-white' />
                    )}
                  </div>
                  <div>
                    <Link 
                      to={`/profile/${event?.creator_handle}`}
                      className='text-sm font-semibold text-white hover:text-brand-secondary transition-colors'
                    >
                      {event?.creator_handle || 'Event Creator'}
                    </Link>
                    <p className='text-xs text-white/60'>Created this event</p>
                  </div>
                </div>
              )}
            </div>

            {/* Event Badges */}
            <div className='space-y-3'>
              {/* Active Status - Hidden */}
              {/* <div className='flex items-center justify-between p-3 bg-white/10 rounded-lg'>
                <span className='text-sm font-semibold text-white/80'>
                  Status
                </span>
                <span className='px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm'>
                  {event.is_active ? 'Active' : 'Inactive'}
                </span>
              </div> */}

              <div className='flex items-center justify-between p-3 bg-white/10 rounded-lg'>
                <span className='text-sm font-semibold text-white/80'>
                  Visibility
                </span>
                <div className='flex items-center'>
                  {event.is_public ? (
                    <>
                      <GlobeAltIcon className='w-4 h-4 mr-2 text-blue-400' />
                      <span className='px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm'>
                        Public
                      </span>
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className='w-4 h-4 mr-2 text-orange-400' />
                      <span className='px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm'>
                        Private
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className='p-3 bg-white/10 rounded-lg'>
                <span className='text-sm font-semibold text-white/80 block mb-2'>
                  Languages
                </span>
                <div className='flex flex-wrap gap-2'>
                  {event.languages && event.languages.length > 0 ? (
                    convertCodesToNames(event.languages).map((lang, index) => (
                      <span
                        key={index}
                        className='px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm'
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className='px-3 py-1 bg-white/20 text-white rounded-full text-sm'>
                      English
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='space-y-2'>
              <CalendarDropdown
                event={createCalendarEvent({
                  title: event.title,
                  description: event.description || undefined,
                  location: event.location || undefined,
                  start_time: event.start_time,
                  end_time: event.end_time,
                  duration_hours: 2, // Default to 2 hours for events
                })}
                variant='outline'
                className='w-full'
              />
              <Button
                variant='outline'
                className='w-full justify-center'
                onClick={scrollToParticipants}
              >
                <UserGroupIcon className='w-5 h-5 mr-2' />
                View Participants
              </Button>
              <Button variant='outline' className='w-full justify-center'>
                <MapPinIcon className='w-5 h-5 mr-2' />
                Get Directions
              </Button>
            </div>
          </div>
        </div>
      </Paper>

      {/* Event Details */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Date and Time */}
        <Paper variant='glass' size='lg'>
          <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
            <ClockIcon className='w-6 h-6 mr-3 text-white/60' />
            Date and Time
          </h3>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-white/80'>Start</span>
              <span className='text-white'>
                {formatEventDate(event.start_time)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-white/80'>End</span>
              <span className='text-white'>
                {formatEventDate(event.end_time)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-white/80'>Duration</span>
              <span className='text-white'>
                {formatDuration(event.start_time, event.end_time)}
              </span>
            </div>
          </div>
        </Paper>

        {/* Event Tags */}
        <Paper variant='glass' size='lg'>
          <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
            <TagIcon className='w-6 h-6 mr-3 text-white/60' />
            Event Tags
          </h3>

          {/* Playstyle Tags */}
          {ensureArray(event.playstyle_tags || []).length > 0 && (
            <div className='mb-4'>
              <h4 className='text-sm font-medium text-white/80 mb-2'>
                Playstyle
              </h4>
              <div className='flex flex-wrap gap-2'>
                {ensureArray(event.playstyle_tags || []).map((tag: string) => (
                  <span
                    key={tag}
                    className='px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity Tags */}
          {ensureArray(event.activity_tags || []).length > 0 && (
            <div>
              <h4 className='text-sm font-medium text-white/80 mb-2'>
                Activities
              </h4>
              <div className='flex flex-wrap gap-2'>
                {ensureArray(event.activity_tags || []).map((tag: string) => (
                  <span
                    key={tag}
                    className='px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Show message if no tags */}
          {ensureArray(event.playstyle_tags || []).length === 0 &&
            ensureArray(event.activity_tags || []).length === 0 && (
              <p className='text-white/60 text-sm'>
                No tags specified for this event.
              </p>
            )}
        </Paper>
      </div>

      {/* Participants - Full Width */}
      <div ref={participantsRef}>
        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center'>
              <UserGroupIcon className='w-6 h-6 mr-3 text-secondary' />
              <SectionTitle>
                Participants ({participantCount}/
                {event.max_participants || 'Unlimited'})
              </SectionTitle>
            </div>
            <Button variant='outline' size='sm'>
              View All
            </Button>
          </div>
          {registrationsLoading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p className='text-gray-400 mt-2'>Loading participants...</p>
            </div>
          ) : participantCount === 0 ? (
            <div className='text-center py-8'>
              <UserIcon className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-white mb-2'>
                Be the first to join!
              </h3>
              <p className='text-gray-400 mb-4'>
                No one has registered for this event yet. Be the first!
              </p>
              {!hasJoined && isAuthenticated && !isEventPast(event) && (
                <Button
                  variant='primary'
                  size='lg'
                  onClick={handleJoinEvent}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2'></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckIcon className='w-5 h-5 mr-2' />
                      Join Event
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
                {registrations
                  .slice(0, 8)
                  .map((registration: any, i: number) => (
                    <div key={registration.id || i} className='text-center'>
                      <div className='w-16 h-16 bg-gradient-to-r from-white/20 to-white/10 rounded-xl flex items-center justify-center mx-auto mb-3'>
                        {registration.avatar_url ? (
                          <img
                            src={registration.avatar_url}
                            alt={registration.username}
                            className='w-16 h-16 rounded-xl object-cover'
                          />
                        ) : (
                          <UserIcon className='w-8 h-8 text-white' />
                        )}
                      </div>
                      <Link 
                        to={`/profile/${registration.username}`}
                        className='text-white text-sm font-semibold hover:text-brand-secondary transition-colors'
                      >
                        {registration.username || `Participant ${i + 1}`}
                      </Link>
                      <p className='text-white/60 text-xs'>
                        {new Date(
                          registration.registered_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>

              {!hasJoined && isAuthenticated && !isEventPast(event) && (
                <div className='text-center pt-4 border-t border-white/10'>
                  <p className='text-white/80 mb-4'>
                    Interested in joining this event?
                  </p>
                  <Button
                    variant='primary'
                    size='lg'
                    onClick={handleJoinEvent}
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2'></div>
                        Joining...
                      </>
                    ) : (
                      <>
                        <CheckIcon className='w-5 h-5 mr-2' />
                        Join Event
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </Paper>
      </div>

      {/* Event Reviews */}
      {isEventPast(event) && (
        <Paper variant='glass' size='xl'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center'>
              <StarIcon className='w-6 h-6 mr-3 text-secondary' />
              <SectionTitle>Event Reviews</SectionTitle>
            </div>
            <ReviewEligibilityButton
              eventId={id || ''}
              eventTitle={event.title}
              isEventPast={isEventPast(event)}
              userAttended={hasJoined}
              variant='primary'
              size='md'
            />
          </div>
          <EventReviewsList
            eventId={id || ''}
            eventTitle={event.title}
            showHeader={false}
          />
        </Paper>
      )}

      {/* Event Analytics - Only visible to event owners */}
      {isOwner && (
        <div id='event-analytics'>
          <BEventAnalytics eventId={id || ''} />
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title='Delete Event'
        message={`Are you sure you want to delete "${event?.title}"? This action cannot be undone and will remove all event data and registrations.`}
        confirmText='Delete Event'
        cancelText='Cancel'
        variant='danger'
        isLoading={isDeleting}
      />

      {/* Event Owner Notification Form */}
      <EventOwnerNotificationForm
        eventId={id || ''}
        isOpen={showNotificationForm}
        onClose={() => setShowNotificationForm(false)}
        notificationsRemaining={
          10 - (notificationUsage?.notifications_sent || 0)
        }
        onNotificationSent={() => {
          // The query will automatically refetch due to cache invalidation
          // from the sendEventNotification mutation
        }}
      />
    </Page>
  );
};

export default EventDetail;
