import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  interval?: number; // minutes interval (default: 15)
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select time',
  error,
  className = '',
  interval = 15,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<{
    hour: number;
    minute: number;
  } | null>(
    value
      ? {
          hour: new Date(value).getHours(),
          minute: new Date(value).getMinutes(),
        }
      : null
  );

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
    if (selectedTime) {
      const date = new Date();
      date.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
      onChangeRef.current(date.toTimeString().slice(0, 5));
    }
  }, [selectedTime]);

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
    const [hours, minutes] = value.split(':');
    const date = new Date();
    date.setHours(parseInt(hours || '0'), parseInt(minutes || '0'), 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedTime({ hour, minute });
    setIsOpen(false);
  };

  // Generate time slots based on interval
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      timeSlots.push({ hour, minute });
    }
  }

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
        <ClockIcon className='w-5 h-5 text-tertiary' />
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
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-primary'>
                  Select Time
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className='text-tertiary hover:text-primary transition-colors duration-[var(--duration-normal)] p-1 rounded-[var(--radius-button)]'
                >
                  ×
                </button>
              </div>
            </div>

            {/* Time Grid */}
            <div className='p-4'>
              <div className='grid grid-cols-4 gap-2 max-h-64 overflow-y-auto'>
                {timeSlots.map(({ hour, minute }) => {
                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  const isSelectedTime =
                    selectedTime &&
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
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TimePicker;
