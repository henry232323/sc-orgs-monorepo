import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Paper, Button } from '../ui';
import EventCard from './EventCard';
import { PlusIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useGetEventsByOrganizationQuery } from '../../services/apiSlice';

interface OrganizationEventListProps {
  spectrumId: string;
  className?: string;
}

const OrganizationEventList: React.FC<OrganizationEventListProps> = ({
  spectrumId,
  className = '',
}) => {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  // Fetch organization events
  const {
    data: eventsData,
    isLoading,
    error,
  } = useGetEventsByOrganizationQuery({
    spectrumId,
    page: 1,
    limit: 100, // Get more events to properly separate upcoming/past
  });

  // Format relative time function
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

  // Separate events into upcoming and past
  const { upcomingEvents, pastEvents } = useMemo(() => {
    if (!eventsData?.data) {
      return { upcomingEvents: [], pastEvents: [] };
    }

    const now = new Date();
    const upcoming = eventsData.data.filter(
      event => new Date(event.start_time) > now
    );
    const past = eventsData.data.filter(
      event => new Date(event.start_time) <= now
    );

    // Sort upcoming events by start time (ascending)
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    // Sort past events by start time (descending - most recent first)
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [eventsData?.data]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Paper variant="glass" size="lg" className="p-6 text-center">
          <CalendarIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Events</h3>
          <p className="text-white/60">
            There was an error loading the organization's events. Please try again later.
          </p>
        </Paper>
      </div>
    );
  }

  const displayedUpcomingEvents = showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0, 3);
  const displayedPastEvents = showAllPast ? pastEvents : pastEvents.slice(0, 3);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Upcoming Events Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              Upcoming Events ({upcomingEvents.length})
            </h3>
          </div>
          <Link to={`/organizations/${spectrumId}/events/create`}>
            <Button variant="primary" size="sm">
              <PlusIcon className="w-4 h-4 mr-1" />
              Create Event
            </Button>
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <Paper variant="glass" size="lg" className="p-6 text-center">
            <CalendarIcon className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-white mb-2">No Upcoming Events</h4>
            <p className="text-white/60 mb-4">
              This organization doesn't have any upcoming events scheduled.
            </p>
            <Link to={`/organizations/${spectrumId}/events/create`}>
              <Button variant="primary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create First Event
              </Button>
            </Link>
          </Paper>
        ) : (
          <div className="space-y-4">
            {displayedUpcomingEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                formatRelativeTime={formatRelativeTime}
                showTags={true}
                showDescription={true}
              />
            ))}
            
            {upcomingEvents.length > 3 && !showAllUpcoming && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllUpcoming(true)}
                >
                  Show All {upcomingEvents.length} Upcoming Events
                </Button>
              </div>
            )}
            
            {showAllUpcoming && upcomingEvents.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllUpcoming(false)}
                >
                  Show Less
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past Events Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">
            Past Events ({pastEvents.length})
          </h3>
        </div>

        {pastEvents.length === 0 ? (
          <Paper variant="glass" size="lg" className="p-6 text-center">
            <ClockIcon className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-white mb-2">No Past Events</h4>
            <p className="text-white/60">
              This organization hasn't hosted any events yet.
            </p>
          </Paper>
        ) : (
          <div className="space-y-4">
            {displayedPastEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                formatRelativeTime={formatRelativeTime}
                showTags={true}
                showDescription={true}
              />
            ))}
            
            {pastEvents.length > 3 && !showAllPast && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllPast(true)}
                >
                  Show All {pastEvents.length} Past Events
                </Button>
              </div>
            )}
            
            {showAllPast && pastEvents.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllPast(false)}
                >
                  Show Less
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationEventList;