import React from 'react';

// ===== TYPOGRAPHY COMPONENT INTERFACES =====

interface BaseTypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

interface PageTitleProps extends BaseTypographyProps {
  subtitle?: string;
}

interface SectionTitleProps extends BaseTypographyProps {
  subtitle?: string;
}

interface PaperTitleProps extends BaseTypographyProps {
  subtitle?: string;
}

// ===== PAGE-LEVEL TYPOGRAPHY =====

/**
 * Main page title - Use for primary page headers like "Dashboard", "Organizations"
 * Size: 36px (--text-page-title)
 */
export const PageTitle: React.FC<PageTitleProps> = ({
  children,
  subtitle,
  className = '',
  as: Component = 'h1',
}) => {
  return (
    <div className={className}>
      <Component
        className='text-[length:var(--text-page-title)] font-bold text-primary leading-[var(--leading-tight)]'
        style={{ fontSize: 'var(--text-page-title)' }}
      >
        {children}
      </Component>
      {subtitle && (
        <p
          className='text-secondary mt-2 leading-[var(--leading-normal)]'
          style={{ fontSize: 'var(--text-page-subtitle)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

/**
 * Page subtitle - Use for descriptive text under page titles
 * Size: 18px (--text-page-subtitle)
 */
export const PageSubtitle: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
}) => {
  return (
    <Component
      className={`text-secondary leading-[var(--leading-normal)] ${className}`}
      style={{ fontSize: 'var(--text-page-subtitle)' }}
    >
      {children}
    </Component>
  );
};

// ===== SECTION-LEVEL TYPOGRAPHY =====

/**
 * Section title - Use for major sections within a page
 * Size: 24px (--text-section-title)
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  subtitle,
  className = '',
  as: Component = 'h2',
}) => {
  return (
    <div className={className}>
      <Component
        className='text-primary font-semibold leading-[var(--leading-tight)]'
        style={{ fontSize: 'var(--text-section-title)' }}
      >
        {children}
      </Component>
      {subtitle && (
        <p
          className='text-tertiary mt-1 leading-[var(--leading-normal)]'
          style={{ fontSize: 'var(--text-section-subtitle)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

/**
 * Section subtitle - Use for descriptions under section titles
 * Size: 16px (--text-section-subtitle)
 */
export const SectionSubtitle: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
}) => {
  return (
    <Component
      className={`text-tertiary leading-[var(--leading-normal)] ${className}`}
      style={{ fontSize: 'var(--text-section-subtitle)' }}
    >
      {children}
    </Component>
  );
};

// ===== PAPER/CARD TYPOGRAPHY =====

/**
 * Paper title - Use for card/paper headers
 * Size: 20px (--text-paper-title)
 */
export const PaperTitle: React.FC<PaperTitleProps> = ({
  children,
  subtitle,
  className = '',
  as: Component = 'h3',
}) => {
  return (
    <div className={className}>
      <Component
        className='text-primary font-semibold leading-[var(--leading-tight)]'
        style={{ fontSize: 'var(--text-paper-title)' }}
      >
        {children}
      </Component>
      {subtitle && (
        <p
          className='text-tertiary mt-1 leading-[var(--leading-normal)]'
          style={{ fontSize: 'var(--text-paper-subtitle)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

/**
 * Paper subtitle - Use for descriptions in cards/papers
 * Size: 14px (--text-paper-subtitle)
 */
export const PaperSubtitle: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
}) => {
  return (
    <Component
      className={`text-tertiary leading-[var(--leading-normal)] ${className}`}
      style={{ fontSize: 'var(--text-paper-subtitle)' }}
    >
      {children}
    </Component>
  );
};

// ===== COMPONENT TYPOGRAPHY =====

/**
 * Component title - Use for small component headers (modals, dropdowns, etc.)
 * Size: 18px (--text-component-title)
 */
export const ComponentTitle: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'h4',
}) => {
  return (
    <Component
      className={`text-primary font-semibold leading-[var(--leading-tight)] ${className}`}
      style={{ fontSize: 'var(--text-component-title)' }}
    >
      {children}
    </Component>
  );
};

/**
 * Component subtitle - Use for small component descriptions
 * Size: 14px (--text-component-subtitle)
 */
export const ComponentSubtitle: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'p',
}) => {
  return (
    <Component
      className={`text-tertiary leading-[var(--leading-normal)] ${className}`}
      style={{ fontSize: 'var(--text-component-subtitle)' }}
    >
      {children}
    </Component>
  );
};

// ===== STATISTICS TYPOGRAPHY =====

/**
 * Large statistic - Use for prominent dashboard stats
 * Size: 30px (--text-stat-large)
 */
export const StatLarge: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  return (
    <Component
      className={`text-primary font-bold leading-[var(--leading-tight)] ${className}`}
      style={{ fontSize: 'var(--text-stat-large)' }}
    >
      {children}
    </Component>
  );
};

/**
 * Medium statistic - Use for secondary stats
 * Size: 20px (--text-stat-medium)
 */
export const StatMedium: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  return (
    <Component
      className={`text-primary font-bold leading-[var(--leading-tight)] ${className}`}
      style={{ fontSize: 'var(--text-stat-medium)' }}
    >
      {children}
    </Component>
  );
};

/**
 * Small statistic - Use for inline stats
 * Size: 18px (--text-stat-small)
 */
export const StatSmall: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  return (
    <Component
      className={`text-primary font-bold leading-[var(--leading-tight)] ${className}`}
      style={{ fontSize: 'var(--text-stat-small)' }}
    >
      {children}
    </Component>
  );
};

// ===== UTILITY TYPOGRAPHY =====

/**
 * Caption text - Use for labels, small descriptions
 * Size: 12px (--text-caption)
 */
export const Caption: React.FC<BaseTypographyProps> = ({
  children,
  className = '',
  as: Component = 'span',
}) => {
  return (
    <Component
      className={`text-muted leading-[var(--leading-normal)] ${className}`}
      style={{ fontSize: 'var(--text-caption)' }}
    >
      {children}
    </Component>
  );
};

// Export all components as a single object for easier importing
export const Typography = {
  PageTitle,
  PageSubtitle,
  SectionTitle,
  SectionSubtitle,
  PaperTitle,
  PaperSubtitle,
  ComponentTitle,
  ComponentSubtitle,
  StatLarge,
  StatMedium,
  StatSmall,
  Caption,
};

export default Typography;
