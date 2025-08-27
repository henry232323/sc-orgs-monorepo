import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../../types/event';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import DayEventsModal from './DayEventsModal';

interface EventCalendarProps {
  events: Event[];
  onDateSelect?: (date: Date) => void;
  className?: string;
}

const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  onDateSelect,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);

  // Handle opening the modal with events for a specific date
  const handleShowMoreEvents = (date: Date, eventsForDate: Event[]) => {
    setSelectedDate(date);
    setSelectedDateEvents(eventsForDate);
    setModalOpen(true);
  };

  // Get current month's start and end dates
  const monthStart = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  const startDate = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }, [monthStart]);

  const endDate = useMemo(() => {
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay()));
    return end;
  }, [monthEnd]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate, endDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      const dateKey = eventDate.toISOString().split('T')[0];

      if (dateKey) {
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey]!.push(event);
      }
    });

    return grouped;
  }, [events]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.getDate();
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return dateKey ? eventsByDate[dateKey] || [] : [];
  };

  // Get month name
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 ${className}`}
    >
      {/* Calendar Header */}
      <div className='flex items-center justify-between p-4 border-b border-white/20'>
        <h2 className='text-xl font-semibold text-primary'>
          {getMonthName(currentDate)}
        </h2>

        <div className='flex items-center space-x-2'>
          <button
            onClick={goToPreviousMonth}
            className='p-2 text-primary/80 hover:text-primary hover:bg-white/20 rounded-lg transition-colors'
          >
            <ChevronLeftIcon className='w-5 h-5' />
          </button>

          <button
            onClick={goToToday}
            className='px-3 py-1 text-sm bg-var(--color-accent-blue) text-black font-medium rounded-lg hover:bg-var(--color-accent-blue)/80 transition-colors'
          >
            Today
          </button>

          <button
            onClick={goToNextMonth}
            className='p-2 text-primary/80 hover:text-primary hover:bg-white/20 rounded-lg transition-colors'
          >
            <ChevronRightIcon className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className='p-4'>
        {/* Day Headers */}
        <div className='grid grid-cols-7 gap-1 mb-2'>
          {dayNames.map(day => (
            <div
              key={day}
              className='text-center text-sm font-medium text-primary/80 py-2'
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className='grid grid-cols-7 gap-1'>
          {calendarDays.map((date, index) => {
            const eventsForDate = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                className={`
                  min-h-[80px] p-1 border border-white/20
                  ${isCurrentMonthDay ? 'bg-white/10' : 'bg-glass'}
                  ${isTodayDate ? 'ring-2 ring-white/40' : ''}
                  hover:bg-white/20 transition-colors cursor-pointer
                `}
                onClick={() => onDateSelect?.(date)}
              >
                {/* Date Number */}
                <div className='text-right mb-1'>
                  <span
                    className={`
                      text-sm font-medium px-1 py-0.5 rounded
                      ${isCurrentMonthDay ? 'text-primary' : 'text-primary/50'}
                      ${isTodayDate ? 'bg-white/30 text-primary' : ''}
                    `}
                  >
                    {formatDate(date)}
                  </span>
                </div>

                {/* Events */}
                <div className='space-y-1'>
                  {eventsForDate.slice(0, 2).map((event: Event) => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className='block text-xs p-1 bg-var(--color-accent-blue)/20 text-var(--color-accent-blue) rounded truncate hover:bg-var(--color-accent-blue)/30 transition-colors'
                      onClick={e => e.stopPropagation()}
                    >
                      {event.title}
                    </Link>
                  ))}
                  {eventsForDate.length > 2 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleShowMoreEvents(date, eventsForDate);
                      }}
                      className='w-full text-xs text-brand-secondary hover:text-brand-primary text-center py-1 rounded hover:bg-white/10 transition-colors'
                    >
                      +{eventsForDate.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className='p-4 border-t border-white/20'>
        <div className='flex items-center justify-between text-sm text-primary/80'>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <div className='w-3 h-3 bg-var(--color-accent-blue)/20 rounded'></div>
              <span>Events</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-3 h-3 bg-var(--color-accent-blue) rounded'></div>
              <span>Today</span>
            </div>
          </div>

          <div className='text-right'>
            <div className='font-medium text-primary'>
              {events.length} events this month
            </div>
          </div>
        </div>
      </div>

      {/* Day Events Modal */}
      {selectedDate && (
        <DayEventsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          date={selectedDate}
          events={selectedDateEvents}
        />
      )}
    </div>
  );
};

export default EventCalendar;
