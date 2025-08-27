import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import NotificationCenter from '../notifications/NotificationCenter';
import ProfileDropdown from '../ui/ProfileDropdown';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Organizations', href: '/organizations', icon: BuildingOfficeIcon },
    { name: 'Events', href: '/events', icon: CalendarIcon },
  ];

  return (
    <header className='relative z-40'>
      <nav className='bg-dark-glass border-b border-glass-border backdrop-blur-[var(--blur-glass-strong)]'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            {/* Logo */}
            <div className='flex items-center'>
              <Link to='/' className='flex items-center space-x-2'>
                <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                  <span className='text-white font-bold text-sm'>SC</span>
                </div>
                <span className='text-xl font-bold text-white hidden sm:block'>
                  Star Citizen Organizations
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className='hidden md:flex items-center space-x-8'>
              {navigation.map(item => (
                <Link
                  key={item.name}
                  to={item.href}
                  className='flex items-center space-x-2 text-white/80 hover:text-white transition-colors duration-200'
                >
                  <item.icon className='w-5 h-5' />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Right side - Auth buttons and user menu */}
            <div className='flex items-center space-x-4'>
              {/* Theme Toggle */}
              {/* TODO: Re-add theme toggle when ThemeToggle component is created */}

              {/* Notifications */}
              {isAuthenticated && (
                <div className='relative'>
                  <button
                    ref={notificationButtonRef}
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className='p-2 rounded-lg data-hover:bg-white/10 transition-colors relative cursor-pointer'
                  >
                    <BellIcon className='w-5 h-5 text-white' />
                    {/* Notification badge */}
                    <span
                      className='absolute -top-1 -right-1 w-3 h-3 rounded-full shadow-[var(--shadow-sm)] border backdrop-blur-sm'
                      style={{
                        backgroundColor: 'rgb(214 0 255)',
                        borderColor: 'rgba(214 0 255 / 0.3)',
                      }}
                    ></span>
                  </button>
                  <NotificationCenter
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    buttonRef={notificationButtonRef}
                  />
                </div>
              )}

              {/* User Menu or Login Button */}
              {isAuthenticated ? (
                <ProfileDropdown user={user} onLogout={logout} />
              ) : (
                <div className='flex items-center space-x-3'>
                  <Button
                    variant='text'
                    size='md'
                    onClick={() => (window.location.href = '/auth')}
                    className='text-white hover:text-white/80'
                  >
                    Sign In
                  </Button>
                  <Button
                    variant='primary'
                    size='md'
                    onClick={() => (window.location.href = '/auth')}
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className='md:hidden'>
              <button className='p-2 rounded-lg text-white hover:bg-white/10 transition-colors'>
                <Bars3Icon className='w-6 h-6' />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
