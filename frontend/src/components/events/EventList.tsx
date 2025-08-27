import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { throttle } from 'lodash';
import {
  Paper,
  Chip,
  RadioGroup,
  ListPage,
  Button,
  EventViewToggle,
} from '../ui';
import EventCard from './EventCard';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  useGetEventsQuery,
  useSearchEventsQuery,
} from '../../services/apiSlice';
import { Switch } from '../ui';
import EventCalendar from './EventCalendar';
import TagManager from '@/components/tags/TagManager.tsx';

const EventList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'participants'>(
    'date'
  );
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>(
    'upcoming'
  );
  const [showPrivateEvents, setShowPrivateEvents] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Convert time filter to API parameter
  const isUpcoming =
    timeFilter === 'all' ? undefined : timeFilter === 'upcoming';

  // Fetch events from backend using unified endpoint
  const {
    data: eventsData,
    isLoading,
    error,
  } = useGetEventsQuery(
    {
      page,
      limit,
      ...(isUpcoming !== undefined && { is_upcoming: isUpcoming }),
      private_only: showPrivateEvents,
    },
    { refetchOnMountOrArgChange: true }
  );

  // Search events if search term is provided
  const { data: searchData, isLoading: isSearching } = useSearchEventsQuery(
    {
      query: searchTerm,
      page,
      limit,
      ...(isUpcoming !== undefined && { is_upcoming: isUpcoming }),
    },
    { skip: !searchTerm.trim() }
  );

  // Use search results if available, otherwise use events from unified endpoint
  const events = searchData?.data || eventsData?.data || [];
  const totalEvents = searchData?.total || eventsData?.total || 0;

  const formatRelativeTime = (timestamp: number) => {
    const eventDate = new Date(timestamp);
    const now = new Date();
    const diffInMs = eventDate.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return 'Past';
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks`;
    return `${Math.floor(diffInDays / 30)} months`;
  };

  // Throttled search function to avoid excessive filtering
  const throttledSearch = useCallback(
    throttle((query: string) => {
      setSearchTerm(query);
    }, 300), // 300ms delay
    []
  );

  // Filter events by tags (client-side filtering for selected tags)
  const filteredEvents = events.filter(event => {
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some(
        tag =>
          (Array.isArray(event.playstyle_tags) &&
            event.playstyle_tags.includes(tag)) ||
          (Array.isArray(event.activity_tags) &&
            event.activity_tags.includes(tag))
      );

    return matchesTags;
  });

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
  };

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return (
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      case 'name':
        return a.title.localeCompare(b.title);
      case 'participants':
        return (a.max_participants || 0) - (b.max_participants || 0);
      default:
        return 0;
    }
  });

  if (isLoading || isSearching) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-transparent'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-white/20 border-t-white mx-auto mb-4'></div>
          <h2 className='text-2xl font-bold text-white mb-2'>Loading Events</h2>
          <p className='text-white/80'>
            Please wait while we fetch the latest events...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-transparent'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-red-400 mb-2'>
            Error Loading Events
          </h2>
          <p className='text-white/80 mb-4'>
            Failed to load events. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className='px-4 py-2 bg-glass text-primary rounded-[var(--radius-button)] hover:bg-glass-hover transition-colors duration-[var(--duration-normal)]'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ListPage
      title='Discover Events'
      subtitle='Find and join exciting Star Citizen events'
      headerActions={
        <Link to='/events/create'>
          <Button variant='primary'>
            <PlusIcon className='w-5 h-5 mr-2' />
            Create Event
          </Button>
        </Link>
      }
    >
      {/* Search and Filters */}
      <Paper variant='glass-strong' size='lg'>
        <div className='space-y-[var(--spacing-card-lg)]'>
          {/* Search Bar and View Toggle */}
          <div className='flex items-center justify-between'>
            <div className='relative flex-1 max-w-md'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted' />
              <input
                type='text'
                placeholder='Search events...'
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  throttledSearch(e.target.value);
                }}
                className='input-glass w-full pl-10 pr-4 py-3 text-primary placeholder:text-muted focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50'
              />
            </div>

            {/* View Mode Toggle */}
            <div className='ml-4'>
              <EventViewToggle
                value={viewMode}
                onChange={setViewMode}
                size='md'
                label='View'
              />
            </div>
          </div>

          <TagManager
            description='Select tags to filter events'
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
          />

          {/* Sort Options */}
          <div className='flex items-center space-x-4'>
            <span className='text-white/80'>Sort by:</span>
            <RadioGroup
              options={[
                { value: 'date', label: 'Date' },
                { value: 'name', label: 'Name' },
                { value: 'participants', label: 'Participants' },
              ]}
              value={sortBy}
              onChange={value =>
                setSortBy(value as 'date' | 'name' | 'participants')
              }
              variant='buttons'
              size='sm'
            />
          </div>

          {/* Time Filter */}
          <div className='flex items-center space-x-4'>
            <span className='text-white/80'>Time:</span>
            <RadioGroup
              options={[
                { value: 'all', label: 'All Events' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past' },
              ]}
              value={timeFilter}
              onChange={value =>
                setTimeFilter(value as 'all' | 'upcoming' | 'past')
              }
              variant='buttons'
              size='sm'
            />
          </div>

          {/* Private Events Toggle */}
          <Switch
            enabled={showPrivateEvents}
            onChange={enabled => setShowPrivateEvents(enabled)}
            label='Show only events from your organizations'
            description="Filter to show only events from organizations you're a member of"
            size='md'
          />
        </div>
      </Paper>

      {/* Results Count - Only show when we have data */}
      {!error && (
        <div className='flex items-center justify-between'>
          <p className='text-white/80'>
            {selectedTags.length > 0 
              ? `Showing ${filteredEvents.length} of ${events.length} events (filtered from ${totalEvents} total)`
              : `Showing ${filteredEvents.length} of ${totalEvents} events`
            }
          </p>
          {selectedTags.length > 0 && (
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-white/50'>Active filters:</span>
              {selectedTags.map(tag => (
                <Chip
                  key={tag}
                  variant='selected'
                  removable
                  onRemove={() => handleRemoveTag(tag)}
                  size='sm'
                >
                  {tag}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Display */}
      {viewMode === 'calendar' ? (
        <EventCalendar
          events={sortedEvents}
          className='mb-6'
          onDateSelect={date => {
            console.log('Selected date:', date);
            // TODO: Filter events for selected date
          }}
        />
      ) : (
        <div className='space-y-4'>
          {sortedEvents.length === 0 ? (
            <Paper variant='glass' size='xl'>
              <div className='text-center'>
                <h3 className='text-xl font-semibold text-white mb-2'>
                  No events found
                </h3>
                <p className='text-white/60'>
                  {searchTerm || selectedTags.length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Check back later for new events'}
                </p>
              </div>
            </Paper>
          ) : (
            sortedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                formatRelativeTime={formatRelativeTime}
                showTags={true}
                showDescription={true}
              />
            ))
          )}
        </div>
      )}

      {/* Results Summary and Pagination */}
      <div className='flex items-center justify-between text-white/60'>
        <div>
          {selectedTags.length > 0 
            ? `Showing ${sortedEvents.length} of ${events.length} events (filtered from ${totalEvents} total)`
            : `Showing ${sortedEvents.length} of ${totalEvents} events`
          }
        </div>

        {/* Pagination */}
        {totalEvents > limit && (
          <div className='flex items-center space-x-2'>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className='px-3 py-1 text-sm bg-glass rounded-[var(--radius-button)] hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-normal)]'
            >
              Previous
            </button>
            <span className='text-sm'>
              Page {page} of {Math.ceil(totalEvents / limit)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(totalEvents / limit)}
              className='px-3 py-1 text-sm bg-glass rounded-[var(--radius-button)] hover:bg-glass-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-normal)]'
            >
              Next
            </button>
          </div>
        )}
      </div>
    </ListPage>
  );
};

export default EventList;
