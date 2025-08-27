// ========================================
// SC-ORGS DESIGN SYSTEM UTILITIES
// ========================================

/**
 * Theme utility functions for consistent styling across the application.
 * These utilities work with the CSS theme variables defined in app.css
 */

// ===== GLASS MORPHISM PRESETS =====

export const glassPresets = {
  // Basic glass effects
  subtle: 'glass-subtle',
  default: 'glass',
  strong: 'glass-strong',
  elevated: 'glass-elevated',

  // Interactive glass effects
  interactive: 'glass glass-interactive',
  button: 'glass-button',

  // Card variations
  card: 'glass-card',
  cardSm: 'glass-card-sm',
  cardLg: 'glass-card-lg',
  cardXl: 'glass-card-xl',
} as const;

// ===== COLOR UTILITIES =====

export const colors = {
  // Text colors
  text: {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    muted: 'text-muted',
    disabled: 'text-disabled',
  },

  // Background colors
  bg: {
    glass: 'bg-glass',
    glassHover: 'bg-glass-hover',
    glassElevated: 'bg-glass-elevated',
  },

  // Border colors
  border: {
    glass: 'border-glass',
    glassHover: 'border-glass-hover',
    glassFocus: 'border-glass-focus',
  },

  // Status colors
  status: {
    success: {
      text: 'text-success',
      bg: 'bg-success',
      border: 'border-success',
    },
    warning: {
      text: 'text-warning',
      bg: 'bg-warning',
      border: 'border-warning',
    },
    error: {
      text: 'text-error',
      bg: 'bg-error',
      border: 'border-error',
    },
    info: {
      text: 'text-info',
      bg: 'bg-info',
      border: 'border-info',
    },
  },
} as const;

// ===== ANIMATION UTILITIES =====

export const animations = {
  glass: 'animate-glass',
  bounce: 'animate-bounce-subtle',

  // Transform scales (for inline styles)
  scale: {
    hover: 'var(--scale-hover)',
    active: 'var(--scale-active)',
    buttonHover: 'var(--scale-button-hover)',
    buttonActive: 'var(--scale-button-active)',
  },

  // Durations (for inline styles)
  duration: {
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
    slower: 'var(--duration-slower)',
  },

  // Easings (for inline styles)
  ease: {
    glass: 'var(--ease-glass)',
    bounce: 'var(--ease-bounce)',
    smooth: 'var(--ease-smooth)',
  },
} as const;

// ===== SPACING UTILITIES =====

export const spacing = {
  // Card padding (for inline styles)
  card: {
    sm: 'var(--spacing-card-sm)',
    md: 'var(--spacing-card-md)',
    lg: 'var(--spacing-card-lg)',
    xl: 'var(--spacing-card-xl)',
  },

  // Layout spacing (for inline styles)
  section: 'var(--spacing-section)',
  component: 'var(--spacing-component)',
  element: 'var(--spacing-element)',
  tight: 'var(--spacing-tight)',
  loose: 'var(--spacing-loose)',

  // Grid gaps (for inline styles)
  grid: {
    sm: 'var(--gap-grid-sm)',
    md: 'var(--gap-grid-md)',
    lg: 'var(--gap-grid-lg)',
  },
} as const;

// ===== BORDER RADIUS UTILITIES =====

export const radius = {
  // Base radius scale (for inline styles)
  base: {
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
  },

  // Interactive elements (for inline styles)
  interactive: {
    button: 'var(--radius-button)',
    input: 'var(--radius-input)',
    chip: 'var(--radius-chip)',
    toggle: 'var(--radius-toggle)',
  },

  // Layout elements (for inline styles)
  layout: {
    paper: 'var(--radius-paper)',
    modal: 'var(--radius-modal)',
    panel: 'var(--radius-panel)',
    section: 'var(--radius-section)',
  },

  // Navigation elements (for inline styles)
  navigation: {
    nav: 'var(--radius-nav)',
    dropdown: 'var(--radius-dropdown)',
    tooltip: 'var(--radius-tooltip)',
  },

  // Content elements (for inline styles)
  content: {
    image: 'var(--radius-image)',
    media: 'var(--radius-media)',
    code: 'var(--radius-code)',
  },
} as const;

// ===== TYPOGRAPHY UTILITIES =====

export const typography = {
  // Font sizes (for inline styles)
  size: {
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)',
    base: 'var(--text-base)',
    lg: 'var(--text-lg)',
    xl: 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)',
    '4xl': 'var(--text-4xl)',
    '5xl': 'var(--text-5xl)',
    '6xl': 'var(--text-6xl)',
  },

  // Line heights (for inline styles)
  leading: {
    tight: 'var(--leading-tight)',
    snug: 'var(--leading-snug)',
    normal: 'var(--leading-normal)',
    relaxed: 'var(--leading-relaxed)',
    loose: 'var(--leading-loose)',
  },

  // Semantic typography (for inline styles)
  semantic: {
    pageTitle: 'var(--text-page-title)',
    pageSubtitle: 'var(--text-page-subtitle)',
    sectionTitle: 'var(--text-section-title)',
    sectionSubtitle: 'var(--text-section-subtitle)',
    paperTitle: 'var(--text-paper-title)',
    paperSubtitle: 'var(--text-paper-subtitle)',
    componentTitle: 'var(--text-component-title)',
    componentSubtitle: 'var(--text-component-subtitle)',
    navTitle: 'var(--text-nav-title)',
    navItem: 'var(--text-nav-item)',
    button: 'var(--text-button)',
    caption: 'var(--text-caption)',
    statLarge: 'var(--text-stat-large)',
    statMedium: 'var(--text-stat-medium)',
    statSmall: 'var(--text-stat-small)',
  },
} as const;

// ===== COMPONENT BUILDERS =====

/**
 * Build glass morphism classes with optional variants
 */
export const buildGlassClass = (
  variant: keyof typeof glassPresets = 'default',
  interactive = false,
  additionalClasses = ''
): string => {
  const baseClass = glassPresets[variant];
  const interactiveClass =
    interactive && !variant.includes('interactive') ? 'glass-interactive' : '';

  return [baseClass, interactiveClass, additionalClasses]
    .filter(Boolean)
    .join(' ');
};

/**
 * Build status-based styling classes
 */
export const buildStatusClass = (
  status: 'success' | 'warning' | 'error' | 'info',
  elements: ('text' | 'bg' | 'border')[] = ['text', 'bg', 'border']
): string => {
  return elements.map(element => colors.status[status][element]).join(' ');
};

/**
 * Build responsive glass classes for mobile optimization
 */
export const buildResponsiveGlass = (
  desktop: keyof typeof glassPresets,
  _mobile: keyof typeof glassPresets = 'subtle'
): string => {
  return `${glassPresets[desktop]} glass-mobile-reduced`;
};

// ===== THEME HELPERS =====

/**
 * Get CSS variable value (for use in inline styles or JavaScript)
 */
export const getCSSVar = (varName: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
  }
  return `var(${varName})`;
};

/**
 * Common glass morphism combinations for different use cases
 */
export const glassComponents = {
  // Navigation elements
  nav: 'nav-glass',
  navItem: `${glassPresets.button} px-[var(--nav-item-padding)]`,

  // Form elements
  input: 'input-glass',

  // Cards and containers
  heroCard: `${glassPresets.elevated} rounded-[var(--radius-glass-xl)] p-[var(--spacing-card-xl)]`,
  statsCard: `${glassPresets.default} ${glassPresets.interactive} text-center`,
  contentCard: `${glassPresets.cardLg} rounded-[var(--radius-glass-xl)]`,

  // Modals and overlays
  modal: `${glassPresets.elevated} rounded-[var(--radius-glass-xl)] p-[var(--spacing-card-xl)]`,
  dropdown: `${glassPresets.strong} rounded-[var(--radius-glass-md)] p-[var(--spacing-card-sm)]`,

  // Interactive elements
  button: glassPresets.button,
  chip: `${glassPresets.default} ${glassPresets.interactive} rounded-full px-3 py-1`,
  badge: `${glassPresets.subtle} rounded-full px-2 py-1 text-xs`,
} as const;

// ===== LAYOUT UTILITIES =====

/**
 * Common layout patterns using theme variables
 */
export const layouts = {
  // Grid systems
  cardGrid: `grid gap-[var(--gap-grid-md)] grid-cols-1 md:grid-cols-2 lg:grid-cols-3`,
  statsGrid: `grid gap-[var(--gap-grid-sm)] grid-cols-2 md:grid-cols-4`,
  twoColumn: `grid gap-[var(--gap-grid-lg)] grid-cols-1 lg:grid-cols-2`,

  // Flex layouts
  centerStack: `flex flex-col items-center justify-center gap-[var(--spacing-component)]`,
  spaceBetween: `flex items-center justify-between gap-[var(--spacing-element)]`,

  // Container patterns
  pageContainer: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`,
  sectionContainer: `py-[var(--spacing-section)]`,
  componentContainer: `space-y-[var(--spacing-component)]`,
} as const;

// ===== TYPE DEFINITIONS =====

export type GlassVariant = keyof typeof glassPresets;
export type StatusType = 'success' | 'warning' | 'error' | 'info';
export type ColorElement = 'text' | 'bg' | 'border';

// ===== LEGACY COMPATIBILITY =====

/**
 * Legacy theme colors for backward compatibility
 * @deprecated Use the new theme system instead
 */
export const themeColors = {
  // Primary colors (replacing cyber-cyan)
  primary: {
    bg: 'bg-glass',
    text: 'text-primary',
    border: 'border-glass',
    hover: 'hover:bg-glass-hover',
    focus: 'focus:bg-glass-hover',
    active: 'bg-glass-hover',
  },

  // Secondary colors (replacing cyber-pink)
  secondary: {
    bg: 'bg-glass',
    text: 'text-secondary',
    border: 'border-glass',
    hover: 'hover:bg-glass-hover',
    focus: 'focus:bg-glass-hover',
    active: 'bg-glass-hover',
  },

  // Accent colors
  accent: {
    success: {
      bg: 'bg-success',
      text: 'text-success',
      border: 'border-success',
    },
    warning: {
      bg: 'bg-warning',
      text: 'text-warning',
      border: 'border-warning',
    },
    error: {
      bg: 'bg-error',
      text: 'text-error',
      border: 'border-error',
    },
    info: {
      bg: 'bg-info',
      text: 'text-info',
      border: 'border-info',
    },
  },

  // Background variants
  background: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
    tertiary: 'bg-glass',
    elevated: 'bg-glass-elevated',
    glass: 'bg-glass backdrop-blur-[var(--blur-glass-medium)]',
    transparent: 'bg-transparent',
  },

  // Text variants
  text: {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    muted: 'text-muted',
  },

  // Border variants
  border: {
    primary: 'border-glass-hover',
    secondary: 'border-glass',
    subtle: 'border-glass',
  },

  // Interactive states
  interactive: {
    hover: 'hover:bg-glass-hover hover:border-glass-hover',
    focus: 'focus:bg-glass-hover focus:border-glass-focus',
    active: 'bg-glass-hover border-glass-hover',
    disabled: 'opacity-50 cursor-not-allowed',
  },
};

/**
 * Helper function to get consistent color classes (legacy)
 * @deprecated Use the new theme system instead
 */
export const getThemeClass = (
  type: keyof typeof themeColors,
  variant?: string
): string => {
  const colorGroup = themeColors[type];
  if (!colorGroup || typeof colorGroup === 'string') {
    return '';
  }

  if (variant && variant in colorGroup) {
    return (colorGroup as any)[variant];
  }

  // Return first available property for backward compatibility
  return Object.values(colorGroup)[0] as string;
};
