import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { useGetOrganizationQuery } from '../services/apiSlice';
import { useAuth } from '../contexts/AuthContext';
import { Button, Paper, PageTitle } from '../components/ui';
import {
  UsersIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

// Components we'll create
import RoleManagement from '../components/organizations/RoleManagement';
import MemberManagement from '../components/organizations/MemberManagement';

import EventManagement from '../components/organizations/EventManagement';
import OrganizationAnalytics from '../components/organizations/OrganizationAnalytics';
import RecentActivity from '../components/organizations/RecentActivity';
import OrganizationEdit from '../components/organizations/OrganizationEdit';
import { DiscordServersList } from '../components/discord';
// HR Components
import HRDashboard from '../components/hr/hr_dashboard';
import ApplicationTracker from '../components/hr/application_tracker';
import PerformanceCenter from '../components/hr/performance_center';
import SkillsMatrix from '../components/hr/skills_matrix';
import DocumentLibrary from '../components/hr/document_library';

const OrganizationManagementPage: React.FC = () => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    data: organization,
    isLoading,
    error,
    refetch,
  } = useGetOrganizationQuery(spectrumId!, {
    skip: !spectrumId,
  });

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-2 border-glass border-t-[var(--color-accent-blue)]'></div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <ExclamationTriangleIcon className='mx-auto h-12 w-12 text-red-500' />
          <h3 className='mt-2 text-sm font-medium text-white'>
            Organization not found
          </h3>
          <p className='mt-1 text-sm text-white/60'>
            The organization you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <div className='mt-6'>
            <Button
              onClick={() => navigate('/organizations')}
              variant='primary'
            >
              Back to Organizations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has permission to manage this organization
  // This will be implemented with the permission system
  const canManage = true; // TODO: Implement permission check

  if (!canManage) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <ExclamationTriangleIcon className='mx-auto h-12 w-12 text-red-500' />
          <h3 className='mt-2 text-sm font-medium text-white'>Access Denied</h3>
          <p className='mt-1 text-sm text-white/60'>
            You don't have permission to manage this organization.
          </p>
          <div className='mt-6'>
            <Button
              onClick={() => navigate(`/organizations/${spectrumId}`)}
              variant='primary'
            >
              View Organization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      name: 'Edit',
      icon: PencilIcon,
      component: (
        <OrganizationEdit organization={organization} onUpdate={refetch} />
      ),
    },
    {
      name: 'Members',
      icon: UsersIcon,
      component: <MemberManagement spectrumId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Roles',
      icon: ShieldCheckIcon,
      component: <RoleManagement spectrumId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Events',
      icon: CalendarIcon,
      component: <EventManagement spectrumId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Activity',
      icon: ClockIcon,
      component: <RecentActivity organization={organization} />,
    },
    {
      name: 'Analytics',
      icon: ChartBarIcon,
      component: <OrganizationAnalytics organizationId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Discord',
      icon: ChatBubbleLeftRightIcon,
      component: <DiscordServersList organizationId={organization?.rsi_org_id!} />,
    },
    // HR Management Tabs
    {
      name: 'HR Dashboard',
      icon: ChartBarIcon,
      component: <HRDashboard organizationId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Applications',
      icon: BriefcaseIcon,
      component: <ApplicationTracker organizationId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Performance',
      icon: ChartBarIcon,
      component: <PerformanceCenter organizationId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Skills',
      icon: AcademicCapIcon,
      component: <SkillsMatrix organizationId={organization?.rsi_org_id!} />,
    },
    {
      name: 'Documents',
      icon: DocumentTextIcon,
      component: <DocumentLibrary />,
    },
  ];

  return (
    <div className='min-h-screen'>
      {/* Header */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <Paper variant='glass' size='lg'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              {organization.icon_url && (
                <img
                  className='h-12 w-12 rounded-lg object-cover'
                  src={organization.icon_url}
                  alt={organization.name}
                />
              )}
              <div>
                <PageTitle>{organization.name} Management</PageTitle>
                <p className='text-sm text-tertiary'>
                  Manage your organization settings, members, and roles
                </p>
              </div>
            </div>
            <div className='flex gap-[var(--spacing-tight)]'>
              <Button
                onClick={() => navigate(`/organizations/${spectrumId}`)}
                variant='glass'
              >
                View Public Page
              </Button>
            </div>
          </div>
        </Paper>
      </div>

      {/* Tab Navigation */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className='flex gap-[var(--spacing-element)] border-b border-glass pb-4'>
            {tabs.map(tab => (
              <Tab
                key={tab.name}
                className={({ selected }: { selected: boolean }) =>
                  `group inline-flex items-center py-2 px-4 border-b-2 font-medium text-sm rounded-t-[var(--radius-glass-sm)] transition-all duration-[var(--duration-normal)] ${
                    selected
                      ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)] bg-glass'
                      : 'border-transparent text-tertiary hover:text-primary hover:border-glass-hover hover:bg-glass'
                  }`
                }
              >
                {({ selected }: { selected: boolean }) => (
                  <>
                    <tab.icon
                      className={`-ml-0.5 mr-2 h-5 w-5 transition-colors duration-[var(--duration-normal)] ${
                        selected
                          ? 'text-[var(--color-accent-blue)]'
                          : 'text-muted group-hover:text-secondary'
                      }`}
                    />
                    {tab.name}
                  </>
                )}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className='mt-[var(--spacing-card-lg)]'>
            {tabs.map(tab => (
              <Tab.Panel key={tab.name}>{tab.component}</Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default OrganizationManagementPage;
