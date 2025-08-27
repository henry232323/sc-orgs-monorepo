import React from 'react';
import { PageTitle } from './Typography';

// ===== PAGE LAYOUT INTERFACES =====

interface BasePageProps {
  children: React.ReactNode;
  className?: string;
}

interface PageContainerProps extends BasePageProps {
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'mobile' | 'tablet' | 'desktop' | 'custom';
  minHeight?: boolean;
}

interface PageWithHeaderProps extends PageContainerProps {
  title: string;
  subtitle?: string | undefined;
  headerActions?: React.ReactNode;
}

// ===== PAGE LAYOUT COMPONENTS =====

/**
 * Base page container with consistent width, padding, and spacing
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  width = 'lg',
  padding = 'desktop',
  minHeight = true,
  className = '',
}) => {
  const widthClasses = {
    sm: 'max-w-[var(--page-width-sm)]', // 672px - Settings, Profile
    md: 'max-w-[var(--page-width-md)]', // 896px - Forms
    lg: 'max-w-[var(--page-width-lg)]', // 1152px - Lists, Dashboard
    xl: 'max-w-[var(--page-width-xl)]', // 1280px - Analytics
    full: 'max-w-[var(--page-width-full)]', // 100% - Full width
  };

  const paddingClasses = {
    mobile: 'p-[var(--page-padding-mobile)]', // 16px
    tablet: 'p-[var(--page-padding-tablet)]', // 24px
    desktop: 'p-[var(--page-padding-desktop)]', // 32px
    custom: '', // No padding, for custom layouts
  };

  const minHeightClass = minHeight ? 'min-h-screen' : '';

  return (
    <div
      className={`${minHeightClass} ${paddingClasses[padding]} ${className}`}
    >
      <div
        className={`${widthClasses[width]} mx-auto space-y-[var(--page-section-gap)]`}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Standard page with consistent header, padding, and layout
 */
export const Page: React.FC<PageWithHeaderProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  width = 'lg',
  padding = 'desktop',
  minHeight = true,
  className = '',
}) => {
  return (
    <PageContainer
      width={width}
      padding={padding}
      minHeight={minHeight}
      className={className}
    >
      {/* Page Header */}
      <div className='flex items-start justify-between mb-[var(--page-header-margin)]'>
        {subtitle ? (
          <PageTitle subtitle={subtitle}>{title}</PageTitle>
        ) : (
          <PageTitle>{title}</PageTitle>
        )}
        {headerActions && (
          <div className='flex items-center gap-[var(--spacing-element)]'>
            {headerActions}
          </div>
        )}
      </div>

      {/* Page Content */}
      {children}
    </PageContainer>
  );
};

/**
 * Form page with medium width and consistent layout
 */
export const FormPage: React.FC<PageWithHeaderProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
}) => {
  return (
    <Page
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      width='md'
      padding='desktop'
      className={className}
    >
      {children}
    </Page>
  );
};

/**
 * List page with large width and consistent layout
 */
export const ListPage: React.FC<PageWithHeaderProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
}) => {
  return (
    <Page
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      width='lg'
      padding='desktop'
      className={className}
    >
      {children}
    </Page>
  );
};

/**
 * Dashboard page with extra large width and consistent layout
 */
export const DashboardPage: React.FC<PageWithHeaderProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
}) => {
  return (
    <Page
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      width='lg'
      padding='desktop'
      className={className}
    >
      {children}
    </Page>
  );
};

/**
 * Settings page with small width and consistent layout
 */
export const SettingsPage: React.FC<PageWithHeaderProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
}) => {
  return (
    <Page
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      width='sm'
      padding='desktop'
      className={className}
    >
      {children}
    </Page>
  );
};

// Export all page components
export const PageLayouts = {
  PageContainer,
  Page,
  FormPage,
  ListPage,
  DashboardPage,
  SettingsPage,
};

export default Page;
