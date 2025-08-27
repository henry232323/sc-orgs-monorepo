import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
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

  useEffect(() => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (dateString) {
        onChangeRef.current(dateString);
      }
    }
  }, [selectedDate]);

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

    // Return undefined when not open (no cleanup needed)
    return undefined;
  }, [isOpen, updateDropdownPosition]);

  const formatDisplayValue = () => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {label && (
        <label className='block text-sm font-semibold text-primary mb-[var(--spacing-tight)]'>
          {label}
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
        <span className={value ? 'text-primary' : 'text-muted'}>
          {value ? formatDisplayValue() : placeholder}
        </span>
        <CalendarIcon className='w-5 h-5 text-tertiary' />
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
              width: dropdownPosition.width,
            }}
          >
            {/* Header */}
            <div className='bg-glass-subtle border-b border-glass p-4'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-primary'>
                  Select Date
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className='text-tertiary hover:text-primary transition-colors duration-[var(--duration-normal)] p-1 rounded-[var(--radius-button)]'
                >
                  ×
                </button>
              </div>

              <div className='flex items-center justify-between'>
                <button
                  onClick={() => navigateMonth('prev')}
                  className='p-2 hover:bg-glass-hover rounded-[var(--radius-button)] transition-colors duration-[var(--duration-normal)]'
                >
                  <ChevronLeftIcon className='w-5 h-5 text-tertiary hover:text-primary' />
                </button>
                <h4 className='text-primary font-medium'>
                  {currentMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h4>
                <button
                  onClick={() => navigateMonth('next')}
                  className='p-2 hover:bg-glass-hover rounded-[var(--radius-button)] transition-colors duration-[var(--duration-normal)]'
                >
                  <ChevronRightIcon className='w-5 h-5 text-tertiary hover:text-primary' />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className='p-4'>
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
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DatePicker;
