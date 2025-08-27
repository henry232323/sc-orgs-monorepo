import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from '../ui';
import { Event } from '../../types/event';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: Event[];
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  onClose,
  date,
  events,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (durationMinutes?: number) => {
    if (!durationMinutes) return '';
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Events on ${formatDate(date)}`}
      size='lg'
    >
      <div className='max-h-96 overflow-y-auto space-y-4 pr-2'>
        {events.length === 0 ? (
          <div className='text-center py-8'>
            <CalendarIcon className='w-12 h-12 text-tertiary mx-auto mb-3' />
            <p className='text-tertiary'>No events scheduled for this day.</p>
          </div>
        ) : (
          events.map(event => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              onClick={onClose}
              className='block p-4 rounded-[var(--radius-glass-md)] bg-glass-hover border border-glass-border hover:bg-glass-elevated hover:border-glass-hover transition-all duration-[var(--duration-normal)] group'
            >
              {/* Event Title */}
              <h3 className='text-lg font-semibold text-primary mb-2 group-hover:text-brand-secondary transition-colors'>
                {event.title}
              </h3>

              {/* Event Details */}
              <div className='space-y-2 text-sm text-secondary'>
                {/* Time */}
                <div className='flex items-center space-x-2'>
                  <ClockIcon className='w-4 h-4 text-tertiary' />
                  <span>
                    {formatTime(event.start_time)}
                    {event.duration_minutes && (
                      <span className='text-tertiary ml-1'>
                        ({formatDuration(event.duration_minutes)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Location */}
                {event.location && (
                  <div className='flex items-center space-x-2'>
                    <MapPinIcon className='w-4 h-4 text-tertiary' />
                    <span className='truncate'>{event.location}</span>
                  </div>
                )}

                {/* Max Participants */}
                {event.max_participants && (
                  <div className='flex items-center space-x-2'>
                    <UserGroupIcon className='w-4 h-4 text-tertiary' />
                    <span>Max {event.max_participants} participants</span>
                  </div>
                )}

                {/* Description Preview */}
                {event.description && (
                  <div className='mt-3'>
                    <p className='text-tertiary text-xs line-clamp-2'>
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Event Actions */}
              <div className='mt-3 flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  {!event.is_public && (
                    <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400'>
                      Private
                    </span>
                  )}
                  {event.max_participants && (
                    <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-secondary text-white'>
                      Limited
                    </span>
                  )}
                </div>

                <span className='text-xs text-tertiary group-hover:text-secondary transition-colors'>
                  Click to view details →
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {events.length > 0 && (
        <div className='mt-6 pt-4 border-t border-glass-border'>
          <p className='text-xs text-tertiary text-center'>
            Showing {events.length} event{events.length !== 1 ? 's' : ''} for
            this day
          </p>
        </div>
      )}
    </Dialog>
  );
};

export default DayEventsModal;
