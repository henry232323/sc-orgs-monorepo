import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import {
  calendarProviders,
  handleCalendarClick,
  CalendarEvent,
} from '../../utils/calendar';

interface CalendarDropdownProps {
  event: CalendarEvent;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  event,
  className = '',
  variant = 'outline',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Helper function to get the right icon component
  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'calendar':
        return CalendarIcon;
      case 'envelope':
        return EnvelopeIcon;
      case 'globe':
        return GlobeAltIcon;
      case 'device-tablet':
        return DeviceTabletIcon;
      default:
        return CalendarIcon;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleProviderClick = async (
    provider: (typeof calendarProviders)[0]
  ) => {
    try {
      await handleCalendarClick(provider, event);
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      // You could add a toast notification here
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
    secondary: 'glass-button border-glass hover:border-glass-hover text-white',
    outline:
      'bg-transparent hover:bg-glass-hover border border-glass-hover hover:border-glass-focus text-white',
    ghost: 'hover:bg-glass-hover text-white',
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] 
          font-semibold transition-all duration-[var(--duration-normal)] 
          focus:outline-none focus:ring-2 focus:ring-brand-secondary/50
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isOpen ? 'ring-2 ring-brand-secondary/50' : ''}
        `}
      >
        <CalendarIcon className='w-5 h-5' />
        Add to Calendar
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Portal Dropdown - Rendered in document.body */}
      {isOpen &&
        createPortal(
          <div
            className='fixed bg-dark-glass border border-glass-border rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] z-[9999]'
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            <div className='py-1'>
              {calendarProviders.map(provider => {
                const IconComponent = getIconComponent(provider.iconType);
                return (
                  <button
                    key={provider.name}
                    onClick={() => handleProviderClick(provider)}
                    className='w-full flex items-center px-3 py-2 text-sm text-white hover:bg-white/20 hover:backdrop-blur-sm transition-all duration-150 first:rounded-t-[var(--radius-dropdown)] last:rounded-b-[var(--radius-dropdown)] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/10 last:border-b-0'
                  >
                    <IconComponent className='w-4 h-4 mr-3' />
                    {provider.name}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CalendarDropdown;
