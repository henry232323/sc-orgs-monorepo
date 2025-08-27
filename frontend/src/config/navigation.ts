import {
  HomeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChartBarIcon,
  ShieldCheckIcon, // New icon for Reputation
} from '@heroicons/react/24/outline';

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export const navigation: NavigationItem[] = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
  { name: 'Organizations', href: '/organizations', icon: BuildingOfficeIcon }, // Renamed
  { name: 'Events', href: '/events', icon: CalendarIcon },
];

export const quickActions: NavigationItem[] = [
  {
    name: 'Register Organization',
    href: '/organizations/create',
    icon: BuildingOfficeIcon,
  },
  { name: 'Create Event', href: '/events/create', icon: CalendarIcon },
  { name: 'User Lookup', href: '/reputation', icon: ShieldCheckIcon },
];
