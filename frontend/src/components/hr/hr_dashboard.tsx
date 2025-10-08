import React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Paper,
  PageTitle,
  SectionTitle,
  StatLarge,
  StatMedium,
  StatSmall,
  ComponentTitle,
  ComponentSubtitle,
  PaperTitle,
  PaperSubtitle,
} from '../ui';
import {
  useGetHRAnalyticsQuery,
  useGetHRActivitiesQuery,
} from '../../services/apiSlice';
import { usePermissions } from '../../hooks/usePermissions';
import { formatRelativeTime } from '../../utils/activityUtils';
import {
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ClockIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface HRDashboardProps {
  organizationId: string;
}

/**
 * Get the appropriate icon component for an HR activity type
 */
function getHRActivityIcon(activityType: string) {
  switch (activityType) {
    case 'application_submitted':
    case 'application_status_changed':
      return UserPlusIcon;
    case 'onboarding_completed':
      return ClipboardDocumentListIcon;
    case 'performance_review_submitted':
      return TrophyIcon;
    case 'skill_verified':
      return AcademicCapIcon;
    case 'document_acknowledged':
      return DocumentCheckIcon;
    default:
      return ClockIcon;
  }
}

const HRDashboard: React.FC<HRDashboardProps> = ({ organizationId }) => {
  // Fetch HR analytics data
  const { data: hrAnalytics, isLoading: analyticsLoading } = useGetHRAnalyticsQuery({
    organizationId,
  });

  // Fetch recent HR activities
  const { 
    data: recentActivities, 
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities
  } = useGetHRActivitiesQuery({
    organizationId,
    limit: 5, // Show only 5 most recent activities
  });

  // Check user permissions for role-based customization
  const { hasPermission } = usePermissions(organizationId);

  // Permission checks for different HR roles
  const canManageApplications = hasPermission('HR_MANAGE_APPLICATIONS') || hasPermission('RECRUITER');
  const canManageOnboarding = hasPermission('HR_MANAGE_ONBOARDING') || hasPermission('HR_MANAGER');
  const canManagePerformance = hasPermission('HR_MANAGE_PERFORMANCE') || hasPermission('SUPERVISOR');
  const canManageSkills = hasPermission('HR_MANAGE_SKILLS') || hasPermission('HR_MANAGER');
  const canManageDocuments = hasPermission('HR_MANAGE_DOCUMENTS') || hasPermission('HR_MANAGER');
  const canViewAnalytics = hasPermission('HR_VIEW_ANALYTICS') || hasPermission('HR_MANAGER');

  // Quick action buttons based on permissions
  const quickActions = [
    ...(canManageApplications ? [{
      title: 'Review Applications',
      description: 'Process pending applications',
      icon: UserPlusIcon,
      href: `/organizations/${organizationId}/hr/applications`,
      variant: 'primary' as const,
      count: hrAnalytics?.metrics.applications.total_received || 0,
    }] : []),
    ...(canManageOnboarding ? [{
      title: 'Onboarding Progress',
      description: 'Track member onboarding',
      icon: ClipboardDocumentListIcon,
      href: `/organizations/${organizationId}/hr/onboarding`,
      variant: 'secondary' as const,
      count: hrAnalytics?.metrics.onboarding.overdue_count || 0,
    }] : []),
    ...(canManagePerformance ? [{
      title: 'Performance Reviews',
      description: 'Conduct performance evaluations',
      icon: TrophyIcon,
      href: `/organizations/${organizationId}/hr/performance`,
      variant: 'secondary' as const,
      count: hrAnalytics?.metrics.performance.reviews_completed || 0,
    }] : []),
    ...(canManageSkills ? [{
      title: 'Skills Matrix',
      description: 'Manage member skills',
      icon: AcademicCapIcon,
      href: `/organizations/${organizationId}/hr/skills`,
      variant: 'secondary' as const,
      count: hrAnalytics?.metrics.skills.total_skills_tracked || 0,
    }] : []),
    ...(canManageDocuments ? [{
      title: 'Document Library',
      description: 'Manage HR documents',
      icon: DocumentTextIcon,
      href: `/organizations/${organizationId}/hr/documents`,
      variant: 'secondary' as const,
    }] : []),
  ];

  return (
    <div className='space-y-4 lg:space-y-[var(--spacing-section)] responsive-container'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <PageTitle className="responsive-text-lg">HR Management</PageTitle>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-[var(--gap-button)]'>
          {canViewAnalytics && (
            <Button variant='glass' size='sm' className="touch-friendly">
              <ChartBarIcon className='w-5 h-5 mr-2' />
              Analytics
            </Button>
          )}
          <Button variant='glass' size='sm' className="touch-friendly">
            <DocumentTextIcon className='w-5 h-5 mr-2' />
            Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {canViewAnalytics && (
        <div>
          <SectionTitle className='mb-4 lg:mb-[var(--spacing-card-lg)] responsive-text-lg'>
            Key Metrics
          </SectionTitle>
          <div className='responsive-grid-1-2-4 gap-3 lg:gap-[var(--gap-grid-md)]'>
            {/* Applications Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-mobile-reduced'
            >
              <UserPlusIcon className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-[var(--spacing-tight)]' style={{ color: 'var(--color-text-tertiary)' }} />
              <StatLarge className='mb-[var(--spacing-tight)] responsive-text-lg'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.applications.total_received || 0}
              </StatLarge>
              <PaperSubtitle className='mb-[var(--spacing-tight)] responsive-text-sm'>Applications</PaperSubtitle>
              <div className='responsive-text-sm' style={{ color: 'var(--color-success)' }}>
                {analyticsLoading ? '...' : `${((hrAnalytics?.metrics.applications.approval_rate || 0) * 100).toFixed(1)}% approved`}
              </div>
            </Paper>

            {/* Onboarding Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-mobile-reduced'
            >
              <ClipboardDocumentListIcon className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-[var(--spacing-tight)]' style={{ color: 'var(--color-text-tertiary)' }} />
              <StatLarge className='mb-[var(--spacing-tight)] responsive-text-lg'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.onboarding.total_started || 0}
              </StatLarge>
              <PaperSubtitle className='mb-[var(--spacing-tight)] responsive-text-sm'>Onboarding</PaperSubtitle>
              <div className='responsive-text-sm' style={{ color: 'var(--color-warning)' }}>
                {analyticsLoading ? '...' : `${hrAnalytics?.metrics.onboarding.overdue_count || 0} overdue`}
              </div>
            </Paper>

            {/* Performance Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-mobile-reduced'
            >
              <TrophyIcon className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-[var(--spacing-tight)]' style={{ color: 'var(--color-text-tertiary)' }} />
              <StatLarge className='mb-[var(--spacing-tight)] responsive-text-lg'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.performance.reviews_completed || 0}
              </StatLarge>
              <PaperSubtitle className='mb-[var(--spacing-tight)] responsive-text-sm'>Reviews</PaperSubtitle>
              <div className='responsive-text-sm' style={{ color: 'var(--color-success)' }}>
                {analyticsLoading ? '...' : `${(hrAnalytics?.metrics.performance.average_rating || 0).toFixed(1)} avg rating`}
              </div>
            </Paper>

            {/* Skills Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-mobile-reduced'
            >
              <AcademicCapIcon className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-[var(--spacing-tight)]' style={{ color: 'var(--color-text-tertiary)' }} />
              <StatLarge className='mb-[var(--spacing-tight)] responsive-text-lg'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.skills.total_skills_tracked || 0}
              </StatLarge>
              <PaperSubtitle className='mb-[var(--spacing-tight)] responsive-text-sm'>Skills</PaperSubtitle>
              <div className='responsive-text-sm' style={{ color: 'var(--color-info)' }}>
                {analyticsLoading ? '...' : `${((hrAnalytics?.metrics.skills.verification_rate || 0) * 100).toFixed(1)}% verified`}
              </div>
            </Paper>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <SectionTitle className='mb-4 lg:mb-[var(--spacing-card-lg)] responsive-text-lg'>
          Quick Actions
        </SectionTitle>
        <div className='responsive-grid-1-3 gap-3 lg:gap-[var(--gap-grid-md)]'>
          {quickActions.map(action => (
            <Link key={action.title} to={action.href} className='block'>
              <Paper
                variant='elevated'
                size='lg'
                interactive
                className='h-full transition-all duration-[var(--duration-normal)] hover:scale-[var(--scale-hover)] cursor-pointer glass-mobile-reduced touch-friendly'
              >
                <div className='text-center'>
                  <action.icon className='w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-[var(--spacing-element)] group-hover:text-secondary transition-colors duration-[var(--duration-normal)]' style={{ color: 'var(--color-text-tertiary)' }} />
                  <PaperTitle className='mb-[var(--spacing-tight)] responsive-text-base'>
                    {action.title}
                  </PaperTitle>
                  <PaperSubtitle className='mb-[var(--spacing-element)] responsive-text-sm'>
                    {action.description}
                  </PaperSubtitle>
                  {action.count !== undefined && (
                    <div className='mb-[var(--spacing-element)]'>
                      <StatMedium className="responsive-text-lg" style={{ color: 'var(--color-accent-blue)' }}>
                        {action.count}
                      </StatMedium>
                    </div>
                  )}
                  <div className='flex items-center justify-center responsive-text-sm font-medium' style={{ color: 'var(--color-accent-blue)' }}>
                    Open
                    <ArrowRightIcon className='w-4 h-4 ml-[var(--spacing-tight)]' />
                  </div>
                </div>
              </Paper>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className='responsive-grid-1-2 gap-4 lg:gap-[var(--gap-grid-lg)]'>
        {/* Recent Activity */}
        <div>
          <SectionTitle className='mb-4 lg:mb-[var(--spacing-card-lg)] responsive-text-lg'>
            Recent Activity
          </SectionTitle>
          <Paper variant='glass' size='lg' className="glass-mobile-reduced">
            {activitiesLoading ? (
              // Loading state
              <div className='space-y-4'>
                {[1, 2, 3].map(i => (
                  <div key={i} className='animate-pulse'>
                    <div className='flex items-start p-[var(--spacing-element)]' style={{ gap: 'var(--spacing-element)' }}>
                      <div className='w-10 h-10 flex-shrink-0 rounded-lg' style={{ backgroundColor: 'var(--color-glass-bg)' }}></div>
                      <div className='flex-1' style={{ gap: 'var(--spacing-tight)' }}>
                        <div className='h-4 rounded w-3/4 mb-[var(--spacing-tight)]' style={{ backgroundColor: 'var(--color-glass-bg)' }}></div>
                        <div className='h-3 rounded w-full mb-[var(--spacing-tight)]' style={{ backgroundColor: 'var(--color-glass-bg-hover)' }}></div>
                        <div className='h-3 rounded w-1/4' style={{ backgroundColor: 'var(--color-glass-bg-hover)' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activitiesError ? (
              // Error state
              <div className='text-center' style={{ padding: 'var(--spacing-loose) 0' }}>
                <ExclamationTriangleIcon className='w-12 h-12 mx-auto mb-[var(--spacing-element)]' style={{ color: 'var(--color-error)' }} />
                <ComponentTitle className='mb-[var(--spacing-tight)]'>
                  Failed to Load Activities
                </ComponentTitle>
                <ComponentSubtitle className='mb-[var(--spacing-element)]'>
                  Unable to fetch recent HR activities
                </ComponentSubtitle>
                <Button variant='secondary' onClick={() => refetchActivities()}>
                  Try Again
                </Button>
              </div>
            ) : !recentActivities?.data?.length ? (
              // Empty state
              <div className='text-center' style={{ padding: 'var(--spacing-section) 0' }}>
                <ClockIcon className='w-16 h-16 mx-auto mb-[var(--spacing-element)]' style={{ color: 'var(--color-text-tertiary)' }} />
                <ComponentTitle className='mb-[var(--spacing-tight)]'>
                  No Recent Activity
                </ComponentTitle>
                <ComponentSubtitle>
                  HR activities will appear here as they occur in your organization.
                </ComponentSubtitle>
              </div>
            ) : (
              // Activity list
              <div style={{ gap: 'var(--spacing-element)' }} className='flex flex-col'>
                {recentActivities.data.map((activity) => {
                  const ActivityIcon = getHRActivityIcon(activity.activity_type);
                  return (
                    <div key={activity.id} className='flex items-start rounded-lg' style={{ gap: 'var(--spacing-element)', padding: 'var(--spacing-element)', backgroundColor: 'var(--color-glass-bg-hover)' }}>
                      <div className='w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0' style={{ backgroundColor: 'var(--color-glass-bg)' }}>
                        <ActivityIcon className='w-5 h-5' style={{ color: 'var(--color-text-tertiary)' }} />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <ComponentTitle className='text-sm mb-1'>
                          {activity.title}
                        </ComponentTitle>
                        <ComponentSubtitle className='text-sm mb-1'>
                          {activity.description}
                        </ComponentSubtitle>
                        <p className='text-xs' style={{ color: 'var(--color-text-tertiary)' }}>
                          {formatRelativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Paper>
        </div>

        {/* Alerts & Notifications */}
        <div>
          <SectionTitle className='mb-4 lg:mb-[var(--spacing-card-lg)] responsive-text-lg'>
            Alerts & Notifications
          </SectionTitle>
          <Paper variant='glass' size='lg' className="glass-mobile-reduced">
            <div style={{ gap: 'var(--spacing-element)' }} className='flex flex-col'>
              {/* High priority alerts */}
              <div className='flex items-start rounded-lg border' style={{ gap: 'var(--spacing-element)', padding: 'var(--spacing-element)', backgroundColor: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
                <div className='w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0' style={{ backgroundColor: 'var(--color-warning-bg)' }}>
                  <ExclamationTriangleIcon className='w-5 h-5' style={{ color: 'var(--color-warning)' }} />
                </div>
                <div className='flex-1 min-w-0'>
                  <ComponentTitle className='text-sm mb-1'>
                    Overdue Onboarding
                  </ComponentTitle>
                  <ComponentSubtitle className='text-sm mb-1'>
                    {hrAnalytics?.metrics.onboarding.overdue_count || 0} members have overdue onboarding tasks
                  </ComponentSubtitle>
                  <StatSmall style={{ color: 'var(--color-warning)' }}>
                    Action Required
                  </StatSmall>
                </div>
              </div>

              {/* Medium priority alerts */}
              <div className='flex items-start rounded-lg border' style={{ gap: 'var(--spacing-element)', padding: 'var(--spacing-element)', backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}>
                <div className='w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0' style={{ backgroundColor: 'var(--color-info-bg)' }}>
                  <ClipboardDocumentListIcon className='w-5 h-5' style={{ color: 'var(--color-info)' }} />
                </div>
                <div className='flex-1 min-w-0'>
                  <ComponentTitle className='text-sm mb-1'>
                    Pending Applications
                  </ComponentTitle>
                  <ComponentSubtitle className='text-sm mb-1'>
                    {hrAnalytics?.metrics.applications.total_received || 0} applications awaiting review
                  </ComponentSubtitle>
                  <StatSmall style={{ color: 'var(--color-info)' }}>
                    Review Needed
                  </StatSmall>
                </div>
              </div>

              {/* Success notifications */}
              <div className='flex items-start rounded-lg border' style={{ gap: 'var(--spacing-element)', padding: 'var(--spacing-element)', backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)' }}>
                <div className='w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0' style={{ backgroundColor: 'var(--color-success-bg)' }}>
                  <TrophyIcon className='w-5 h-5' style={{ color: 'var(--color-success)' }} />
                </div>
                <div className='flex-1 min-w-0'>
                  <ComponentTitle className='text-sm mb-1'>
                    Performance Goals Met
                  </ComponentTitle>
                  <ComponentSubtitle className='text-sm mb-1'>
                    {((hrAnalytics?.metrics.performance.goals_completion_rate || 0) * 100).toFixed(0)}% of performance goals completed this quarter
                  </ComponentSubtitle>
                  <StatSmall style={{ color: 'var(--color-success)' }}>
                    Great Progress!
                  </StatSmall>
                </div>
              </div>
            </div>
          </Paper>
        </div>
      </div>

      {/* Skill Gaps Overview */}
      {canViewAnalytics && hrAnalytics?.metrics.skills.skill_gaps && hrAnalytics.metrics.skills.skill_gaps.length > 0 && (
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Skill Gaps Analysis
          </SectionTitle>
          <Paper variant='glass-subtle' size='lg'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]'>
              {hrAnalytics.metrics.skills.skill_gaps.slice(0, 6).map((gap, index) => (
                <div key={index} className='text-center rounded-lg' style={{ padding: 'var(--spacing-element)', backgroundColor: 'var(--color-glass-bg-hover)' }}>
                  <ComponentTitle className='text-sm mb-[var(--spacing-tight)]'>
                    {gap.skill_name}
                  </ComponentTitle>
                  <div className='mb-[var(--spacing-tight)]'>
                    <StatMedium style={{ color: 'var(--color-warning)' }}>
                      {gap.current_count}/{gap.required_count}
                    </StatMedium>
                  </div>
                  <div className='text-xs mb-[var(--spacing-tight)]' style={{ color: 'var(--color-text-tertiary)' }}>
                    {gap.gap_percentage.toFixed(0)}% gap
                  </div>
                  <div className='w-full rounded-full h-2' style={{ backgroundColor: 'var(--color-glass-bg)' }}>
                    <div
                      className='h-2 rounded-full'
                      style={{
                        backgroundColor: 'var(--color-warning)',
                        width: `${Math.max(0, 100 - gap.gap_percentage)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Paper>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;