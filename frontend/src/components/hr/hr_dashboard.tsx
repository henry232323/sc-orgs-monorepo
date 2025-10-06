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
} from '../ui';
import {
  useGetHRAnalyticsQuery,
} from '../../services/apiSlice';
import { usePermissions } from '../../hooks/usePermissions';
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
} from '@heroicons/react/24/outline';

interface HRDashboardProps {
  organizationId: string;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ organizationId }) => {
  // Fetch HR analytics data
  const { data: hrAnalytics, isLoading: analyticsLoading } = useGetHRAnalyticsQuery({
    organizationId,
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
    <div className='space-y-[var(--spacing-section)]'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <PageTitle>HR Management</PageTitle>
        <div className='flex items-center gap-[var(--gap-button)]'>
          {canViewAnalytics && (
            <Button variant='glass' size='sm'>
              <ChartBarIcon className='w-5 h-5 mr-2' />
              Analytics
            </Button>
          )}
          <Button variant='glass' size='sm'>
            <DocumentTextIcon className='w-5 h-5 mr-2' />
            Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {canViewAnalytics && (
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Key Metrics
          </SectionTitle>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
            {/* Applications Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-interactive'
            >
              <UserPlusIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatLarge className='mb-1'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.applications.total_received || 0}
              </StatLarge>
              <div className='text-sm text-tertiary mb-2'>Applications</div>
              <div className='text-xs text-success'>
                {analyticsLoading ? '...' : `${((hrAnalytics?.metrics.applications.approval_rate || 0) * 100).toFixed(1)}% approved`}
              </div>
            </Paper>

            {/* Onboarding Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-interactive'
            >
              <ClipboardDocumentListIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatLarge className='mb-1'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.onboarding.total_started || 0}
              </StatLarge>
              <div className='text-sm text-tertiary mb-2'>Onboarding</div>
              <div className='text-xs text-warning'>
                {analyticsLoading ? '...' : `${hrAnalytics?.metrics.onboarding.overdue_count || 0} overdue`}
              </div>
            </Paper>

            {/* Performance Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-interactive'
            >
              <TrophyIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatLarge className='mb-1'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.performance.reviews_completed || 0}
              </StatLarge>
              <div className='text-sm text-tertiary mb-2'>Reviews</div>
              <div className='text-xs text-success'>
                {analyticsLoading ? '...' : `${(hrAnalytics?.metrics.performance.average_rating || 0).toFixed(1)} avg rating`}
              </div>
            </Paper>

            {/* Skills Metric */}
            <Paper
              variant='glass'
              size='md'
              className='text-center glass-interactive'
            >
              <AcademicCapIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatLarge className='mb-1'>
                {analyticsLoading ? '...' : hrAnalytics?.metrics.skills.total_skills_tracked || 0}
              </StatLarge>
              <div className='text-sm text-tertiary mb-2'>Skills</div>
              <div className='text-xs text-info'>
                {analyticsLoading ? '...' : `${((hrAnalytics?.metrics.skills.verification_rate || 0) * 100).toFixed(1)}% verified`}
              </div>
            </Paper>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <SectionTitle className='mb-[var(--spacing-card-lg)]'>
          Quick Actions
        </SectionTitle>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]'>
          {quickActions.map(action => (
            <Link key={action.title} to={action.href} className='block'>
              <Paper
                variant='elevated'
                size='lg'
                interactive
                className='h-full transition-all duration-[var(--duration-normal)] hover:scale-[var(--scale-hover)] cursor-pointer'
              >
                <div className='text-center'>
                  <action.icon className='w-12 h-12 text-tertiary mx-auto mb-4 group-hover:text-secondary transition-colors duration-[var(--duration-normal)]' />
                  <h3 className='text-lg font-semibold text-primary mb-2'>
                    {action.title}
                  </h3>
                  <p className='text-secondary text-sm mb-4'>
                    {action.description}
                  </p>
                  {action.count !== undefined && (
                    <div className='mb-4'>
                      <StatMedium className='text-accent-blue'>
                        {action.count}
                      </StatMedium>
                    </div>
                  )}
                  <div className='flex items-center justify-center text-[var(--color-accent-blue)] text-sm font-medium'>
                    Open
                    <ArrowRightIcon className='w-4 h-4 ml-2' />
                  </div>
                </div>
              </Paper>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-[var(--gap-grid-lg)]'>
        {/* Recent Activity */}
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Recent Activity
          </SectionTitle>
          <Paper variant='glass' size='lg'>
            <div className='space-y-4'>
              {/* Placeholder activity items */}
              <div className='flex items-start space-x-4 p-4 bg-white/5 rounded-lg'>
                <div className='w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <UserPlusIcon className='w-5 h-5 text-white/60' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    New Application Received
                  </h4>
                  <p className='text-sm text-secondary'>
                    John_Doe submitted an application for Pilot role
                  </p>
                  <p className='text-xs text-tertiary mt-1'>
                    2 hours ago
                  </p>
                </div>
              </div>

              <div className='flex items-start space-x-4 p-4 bg-white/5 rounded-lg'>
                <div className='w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <ClockIcon className='w-5 h-5 text-white/60' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    Onboarding Overdue
                  </h4>
                  <p className='text-sm text-secondary'>
                    3 members have overdue onboarding tasks
                  </p>
                  <p className='text-xs text-tertiary mt-1'>
                    1 day ago
                  </p>
                </div>
              </div>

              <div className='flex items-start space-x-4 p-4 bg-white/5 rounded-lg'>
                <div className='w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <TrophyIcon className='w-5 h-5 text-white/60' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    Performance Review Completed
                  </h4>
                  <p className='text-sm text-secondary'>
                    Jane_Smith completed quarterly review
                  </p>
                  <p className='text-xs text-tertiary mt-1'>
                    3 days ago
                  </p>
                </div>
              </div>
            </div>
          </Paper>
        </div>

        {/* Alerts & Notifications */}
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Alerts & Notifications
          </SectionTitle>
          <Paper variant='glass' size='lg'>
            <div className='space-y-4'>
              {/* High priority alerts */}
              <div className='flex items-start space-x-4 p-4 bg-warning/10 border border-warning/20 rounded-lg'>
                <div className='w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <ExclamationTriangleIcon className='w-5 h-5 text-warning' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    Overdue Onboarding
                  </h4>
                  <p className='text-sm text-secondary'>
                    {hrAnalytics?.metrics.onboarding.overdue_count || 0} members have overdue onboarding tasks
                  </p>
                  <StatSmall className='text-warning mt-1'>
                    Action Required
                  </StatSmall>
                </div>
              </div>

              {/* Medium priority alerts */}
              <div className='flex items-start space-x-4 p-4 bg-info/10 border border-info/20 rounded-lg'>
                <div className='w-10 h-10 bg-info/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <ClipboardDocumentListIcon className='w-5 h-5 text-info' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    Pending Applications
                  </h4>
                  <p className='text-sm text-secondary'>
                    {hrAnalytics?.metrics.applications.total_received || 0} applications awaiting review
                  </p>
                  <StatSmall className='text-info mt-1'>
                    Review Needed
                  </StatSmall>
                </div>
              </div>

              {/* Success notifications */}
              <div className='flex items-start space-x-4 p-4 bg-success/10 border border-success/20 rounded-lg'>
                <div className='w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <TrophyIcon className='w-5 h-5 text-success' />
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-sm font-semibold text-primary'>
                    Performance Goals Met
                  </h4>
                  <p className='text-sm text-secondary'>
                    {((hrAnalytics?.metrics.performance.goals_completion_rate || 0) * 100).toFixed(0)}% of performance goals completed this quarter
                  </p>
                  <StatSmall className='text-success mt-1'>
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
                <div key={index} className='text-center p-4 bg-white/5 rounded-lg'>
                  <h4 className='text-sm font-semibold text-primary mb-2'>
                    {gap.skill_name}
                  </h4>
                  <div className='mb-2'>
                    <StatMedium className='text-warning'>
                      {gap.current_count}/{gap.required_count}
                    </StatMedium>
                  </div>
                  <div className='text-xs text-tertiary'>
                    {gap.gap_percentage.toFixed(0)}% gap
                  </div>
                  <div className='w-full bg-white/10 rounded-full h-2 mt-2'>
                    <div
                      className='bg-warning h-2 rounded-full'
                      style={{
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