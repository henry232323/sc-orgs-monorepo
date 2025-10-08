/**
 * Responsive Design Utilities for HR Components
 * 
 * This file contains utilities and constants for implementing responsive design
 * improvements across all HR components, optimizing for mobile, tablet, and desktop.
 */

// Breakpoint constants matching CSS custom properties
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Responsive spacing utilities
export const RESPONSIVE_SPACING = {
  // Container padding that adapts to screen size
  containerPadding: {
    mobile: 'px-4 py-4',
    tablet: 'px-6 py-6', 
    desktop: 'px-8 py-8',
  },
  
  // Section gaps that scale with screen size
  sectionGap: {
    mobile: 'space-y-4',
    tablet: 'space-y-6',
    desktop: 'space-y-8',
  },
  
  // Component gaps
  componentGap: {
    mobile: 'gap-3',
    tablet: 'gap-4',
    desktop: 'gap-6',
  },
  
  // Grid gaps
  gridGap: {
    mobile: 'gap-3',
    tablet: 'gap-4',
    desktop: 'gap-6',
  },
} as const;

// Responsive grid layouts
export const RESPONSIVE_GRIDS = {
  // Dashboard metrics grid
  metricsGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  
  // Quick actions grid
  actionsGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  
  // Form fields grid
  formGrid: 'grid grid-cols-1 md:grid-cols-2',
  
  // Card grid for lists
  cardGrid: 'grid grid-cols-1 lg:grid-cols-2',
  
  // Skills matrix grid
  skillsGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const;

// Responsive typography classes
export const RESPONSIVE_TEXT = {
  // Page titles that scale down on mobile
  pageTitle: 'text-2xl sm:text-3xl lg:text-4xl',
  
  // Section titles
  sectionTitle: 'text-lg sm:text-xl lg:text-2xl',
  
  // Component titles
  componentTitle: 'text-base sm:text-lg',
  
  // Body text
  body: 'text-sm sm:text-base',
  
  // Captions
  caption: 'text-xs sm:text-sm',
} as const;

// Mobile-optimized glass effects
export const MOBILE_GLASS_EFFECTS = {
  // Reduced blur for better mobile performance
  subtle: 'backdrop-blur-sm md:backdrop-blur-md',
  medium: 'backdrop-blur-md md:backdrop-blur-lg',
  strong: 'backdrop-blur-lg md:backdrop-blur-xl',
  
  // Simplified shadows on mobile
  shadow: 'shadow-sm md:shadow-md lg:shadow-lg',
} as const;

// Responsive button layouts
export const RESPONSIVE_BUTTONS = {
  // Stack buttons on mobile, inline on desktop
  actionGroup: 'flex flex-col sm:flex-row',
  
  // Full width on mobile, auto on desktop
  primaryAction: 'w-full sm:w-auto',
  
  // Button spacing
  buttonGap: 'gap-3 sm:gap-4',
} as const;

// Form layout utilities
export const RESPONSIVE_FORMS = {
  // Form container
  container: 'w-full max-w-4xl mx-auto',
  
  // Form sections
  section: 'space-y-4 md:space-y-6',
  
  // Field groups
  fieldGroup: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  
  // Full width fields
  fullWidth: 'col-span-1 md:col-span-2',
} as const;

// Sidebar and navigation responsive utilities
export const RESPONSIVE_NAVIGATION = {
  // Sidebar that collapses on mobile
  sidebar: 'w-full md:w-64 flex-shrink-0',
  
  // Main content area
  mainContent: 'flex-1 min-w-0',
  
  // Navigation layout
  layout: 'flex flex-col md:flex-row',
  
  // Mobile menu toggle
  mobileToggle: 'block md:hidden',
  
  // Desktop navigation
  desktopNav: 'hidden md:block',
} as const;

// Performance optimization utilities
export const PERFORMANCE_OPTIMIZATIONS = {
  // Reduce animations on mobile for better performance
  reduceMotion: 'motion-reduce:transition-none motion-reduce:transform-none',
  
  // Optimize glass effects for mobile
  mobileGlass: 'glass-mobile-reduced md:glass',
  
  // Lazy loading classes
  lazyLoad: 'opacity-0 transition-opacity duration-300',
  lazyLoaded: 'opacity-100',
} as const;

// Touch-friendly sizing
export const TOUCH_FRIENDLY = {
  // Minimum touch target size (44px)
  minTouch: 'min-h-[44px] min-w-[44px]',
  
  // Button padding for touch
  buttonPadding: 'px-4 py-3 sm:px-3 sm:py-2',
  
  // Checkbox/radio sizing
  checkboxSize: 'w-5 h-5 sm:w-4 sm:h-4',
  
  // Icon sizing
  iconSize: 'w-6 h-6 sm:w-5 sm:h-5',
} as const;

// Utility functions
export const getResponsiveClasses = (
  mobile: string,
  tablet?: string,
  desktop?: string
): string => {
  const classes = [mobile];
  if (tablet) classes.push(`md:${tablet}`);
  if (desktop) classes.push(`lg:${desktop}`);
  return classes.join(' ');
};

export const combineResponsiveClasses = (...classGroups: string[]): string => {
  return classGroups.filter(Boolean).join(' ');
};

// Hook for detecting screen size (client-side only)
export const useScreenSize = () => {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }

  const [screenSize, setScreenSize] = React.useState({
    isMobile: window.innerWidth < BREAKPOINTS.md,
    isTablet: window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg,
    isDesktop: window.innerWidth >= BREAKPOINTS.lg,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        isMobile: window.innerWidth < BREAKPOINTS.md,
        isTablet: window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg,
        isDesktop: window.innerWidth >= BREAKPOINTS.lg,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// Import React for the hook
import React from 'react';