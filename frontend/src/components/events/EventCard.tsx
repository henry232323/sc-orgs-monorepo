import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../../types/event';
import { Paper, Chip, LimitedMarkdown } from '../ui';
import { convertCodesToNames } from '../../utils/languageMapping';
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';

interface EventCardProps {
  event: Event;
  formatRelativeTime: (timestamp: number) => string;
  showTags?: boolean;
  showDescription?: boolean;
  className?: string;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  formatRelativeTime,
  showTags = true,
  showDescription = true,
  className = '',
}) => {
  return (
    <Link to={`/events/${event.id}`} className={`block group ${className}`}>
      <Paper
        variant='glass'
        size='lg'
        className='transition-all duration-200 group-hover:scale-[1.01] group-hover:shadow-lg cursor-pointer'
      >
        <div
          className='flex items-start justify-between'
          style={{ marginBottom: 'var(--spacing-tight)' }}
        >
          <div className='flex-1'>
            <h3
              className='text-xl font-semibold text-white group-hover:text-brand-secondary transition-colors'
              style={{ marginBottom: 'var(--spacing-tight)' }}
            >
              {event.title}
            </h3>

            {showDescription && event.description && (
              <div style={{ marginBottom: 'var(--spacing-element)' }}>
                <LimitedMarkdown
                  content={event.description}
                  className='text-sm line-clamp-3'
                />
              </div>
            )}

            {showTags && (
              <div
                className='space-y-2'
                style={{ marginBottom: 'var(--spacing-element)' }}
              >
                <div className='flex flex-wrap gap-1'>
                  <span className='text-xs text-white/60'>Languages:</span>
                  {Array.isArray(event.languages) && event.languages.length > 0 ? (
                    convertCodesToNames(event.languages).map(language => (
                      <Chip key={language} variant='status' size='sm'>
                        {language}
                      </Chip>
                    ))
                  ) : (
                    <Chip variant='status' size='sm'>English</Chip>
                  )}
                </div>
                <div className='flex flex-wrap gap-1'>
                  <span className='text-xs text-white/60'>Play Style:</span>
                  {Array.isArray(event.playstyle_tags) &&
                  event.playstyle_tags.length > 0 ? (
                    event.playstyle_tags.map(tag => (
                      <Chip key={tag} variant='status' size='sm'>
                        {tag}
                      </Chip>
                    ))
                  ) : (
                    <span className='text-xs text-white/40'>
                      None specified
                    </span>
                  )}
                </div>
                <div className='flex flex-wrap gap-1'>
                  <span className='text-xs text-white/60'>Activity:</span>
                  {Array.isArray(event.activity_tags) &&
                  event.activity_tags.length > 0 ? (
                    event.activity_tags.map(tag => (
                      <Chip key={tag} variant='status' size='sm'>
                        {tag}
                      </Chip>
                    ))
                  ) : (
                    <span className='text-xs text-white/40'>
                      None specified
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Event Details */}
            <div className='flex flex-wrap items-center gap-3 text-sm text-white/60'>
              <div className='flex items-center space-x-2'>
                <CalendarIcon className='w-4 h-4 flex-shrink-0' />
                <span>{formatRelativeTime(event.start_time)}</span>
              </div>
              <div className='flex items-center space-x-2'>
                <MapPinIcon className='w-4 h-4 flex-shrink-0' />
                <span>{event.location || 'Location TBD'}</span>
              </div>
              <div className='flex items-center space-x-2'>
                <PlusIcon className='w-4 h-4 flex-shrink-0' />
                <span>
                  {event.max_participants || 'Unlimited'} participants
                </span>
              </div>
              {Array.isArray(event.languages) && event.languages.length > 0 && (
                <div className='flex items-center space-x-2'>
                  <LanguageIcon className='w-4 h-4 flex-shrink-0' />
                  <span>{convertCodesToNames(event.languages).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className='ml-6 flex flex-col items-end space-y-2'>
            <div className='text-right'>
              <div className='text-sm text-white/60 font-medium'>
                View Details →
              </div>
              <span className='text-xs text-white/40'>
                {event.is_public ? 'Public Event' : 'Private Event'}
              </span>
            </div>
          </div>
        </div>
      </Paper>
    </Link>
  );
};

export default EventCard;
