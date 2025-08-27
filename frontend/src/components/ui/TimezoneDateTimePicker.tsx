import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import {
  COMMON_TIMEZONES,
  getUserTimezone,
  findBestTimezoneMatch,
  convertLocalToUTC,
  formatDateTimeWithTimezone,
} from '../../utils/timezone';

interface TimezoneDateTimePickerProps {
  value: string; // UTC datetime string
  onChange: (utcValue: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  required?: boolean;
}

const TimezoneDateTimePicker: React.FC<TimezoneDateTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date and time',
  error,
  className = '',
  timezone,
  onTimezoneChange,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [selectedTime, setSelectedTime] = useState<{
    hour: number;
    minute: number;
  }>({ hour: 12, minute: 0 });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  // Update the ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize timezone if not set
  useEffect(() => {
    if (!timezone) {
      const userTz = getUserTimezone();
      const bestMatch = findBestTimezoneMatch(userTz);
      onTimezoneChange(bestMatch);
    }
  }, [timezone, onTimezoneChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside both the picker container and the portal dropdown
      const isOutsidePicker =
        pickerRef.current && !pickerRef.current.contains(target);
      const isOutsidePortal =
        portalRef.current && !portalRef.current.contains(target);

      if (isOutsidePicker && isOutsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected date and time when UTC value changes
  useEffect(() => {
    if (value) {
      const utcDate = new Date(value);
      const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
      
      setSelectedDate(localDate);
      setSelectedTime({
        hour: localDate.getHours(),
        minute: localDate.getMinutes(),
      });
    }
  }, [value, timezone]);

  // Calculate dropdown position when opened or when page scrolls
  const updateDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    updateDropdownPosition();
  }, [updateDropdownPosition]);

  // Listen for scroll and resize events to update position
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }

    return undefined;
  }, [isOpen, updateDropdownPosition]);

  const formatDisplayValue = () => {
    if (!value) return '';
    return formatDateTimeWithTimezone(value, timezone);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentView('time');
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedTime({ hour, minute });
    
    // Convert local time to UTC and update
    if (selectedDate) {
      const localDateTime = new Date(selectedDate);
      localDateTime.setHours(hour, minute, 0, 0);
      
      const localDateTimeString = localDateTime.toISOString().slice(0, 16);
      const utcDateTime = convertLocalToUTC(localDateTimeString, timezone);
      
      onChangeRef.current(utcDateTime);
    }
    
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      timeSlots.push({ hour, minute });
    }
  }

  const selectedTimezone = COMMON_TIMEZONES.find(tz => tz.value === timezone);

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {label && (
        <label className='block text-sm font-semibold text-primary mb-[var(--spacing-tight)]'>
          {label}
          {required && <span className='text-error ml-1'>*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className={`glass-button w-full px-4 py-3 text-primary flex items-center justify-between transition-all duration-[var(--duration-normal)] ${
          error ? 'border-error' : ''
        }`}
      >
        <div className='flex flex-col items-start'>
          <span className={value ? 'text-primary' : 'text-muted'}>
            {value ? formatDisplayValue() : placeholder}
          </span>
          {selectedTimezone && (
            <span className='text-xs text-muted mt-1'>
              {selectedTimezone.label}
            </span>
          )}
        </div>
        <div className='flex items-center space-x-2'>
          <CalendarIcon className='w-5 h-5 text-tertiary' />
          <ClockIcon className='w-5 h-5 text-tertiary' />
          <GlobeAltIcon className='w-5 h-5 text-tertiary' />
        </div>
      </button>

      {error && <p className='mt-1 text-sm text-error'>{error}</p>}

      {/* Portal Dropdown - Rendered in document.body */}
      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            className='fixed bg-dark-glass border-glass rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-xl)] backdrop-blur-[var(--blur-glass-strong)] overflow-hidden z-[9999]'
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 400),
            }}
          >
            {/* Header */}
            <div className='bg-white/5 border-b border-white/10 p-4'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-white'>
                  {currentView === 'date' ? 'Select Date' : 'Select Time'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className='text-white/60 hover:text-white transition-colors'
                >
                  ×
                </button>
              </div>

              {/* Timezone Selector */}
              <div className='mb-4'>
                <label className='block text-sm font-medium text-white/80 mb-2'>
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => onTimezoneChange(e.target.value)}
                  className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className='bg-gray-800'>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {currentView === 'date' && (
                <div className='flex items-center justify-between'>
                  <button
                    onClick={() => navigateMonth('prev')}
                    className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                  >
                    <ChevronLeftIcon className='w-5 h-5 text-white/80' />
                  </button>
                  <h4 className='text-white font-medium'>
                    {currentMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h4>
                  <button
                    onClick={() => navigateMonth('next')}
                    className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                  >
                    <ChevronRightIcon className='w-5 h-5 text-white/80' />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className='p-4'>
              {currentView === 'date' ? (
                // Date Picker
                <div className='space-y-4'>
                  {/* Day Headers */}
                  <div className='grid grid-cols-7 gap-1 text-center'>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      day => (
                        <div
                          key={day}
                          className='text-xs font-medium text-white/60 py-2'
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Grid */}
                  <div className='grid grid-cols-7 gap-1'>
                    {getDaysInMonth(currentMonth).map((date, index) => (
                      <button
                        key={index}
                        onClick={() => date && handleDateSelect(date)}
                        disabled={!date}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                          !date
                            ? 'invisible'
                            : isToday(date)
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                              : isSelected(date)
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {date?.getDate()}
                      </button>
                    ))}
                  </div>

                  {/* Navigation to Time */}
                  <button
                    onClick={() => setCurrentView('time')}
                    className='w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors'
                  >
                    Continue to Time Selection
                  </button>
                </div>
              ) : (
                // Time Picker
                <div className='space-y-4'>
                  <div className='grid grid-cols-4 gap-2 max-h-64 overflow-y-auto'>
                    {timeSlots.map(({ hour, minute }) => {
                      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      const isSelectedTime =
                        selectedTime.hour === hour &&
                        selectedTime.minute === minute;

                      return (
                        <button
                          key={`${hour}-${minute}`}
                          onClick={() => handleTimeSelect(hour, minute)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isSelectedTime
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {timeString}
                        </button>
                      );
                    })}
                  </div>

                  {/* Back to Date */}
                  <button
                    onClick={() => setCurrentView('date')}
                    className='w-full py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors'
                  >
                    Back to Date Selection
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TimezoneDateTimePicker;
