import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetOrganizationQuery } from '../../services/apiSlice';
import { Page, Button, Paper } from '../../components/ui';
import HRDashboard from '../../components/hr/hr_dashboard';
import { HRQuickActions, HRNavigationTabs } from '../../components/hr/navigation';
import {
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const HRDashboardPage: React.FC = () => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  
  const {
    data: organization,
    isLoading,
    error,
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
      <Page
        title='HR Dashboard'
        subtitle='Organization not found or you do not have access to this HR system.'
        width='lg'
      >
        <Paper variant='glass' size='lg' className='text-center'>
          <p className='text-tertiary mb-6'>
            The organization you're looking for doesn't exist or you don't have HR access.
          </p>
          <Link to='/organizations'>
            <Button variant='primary'>Back to Organizations</Button>
          </Link>
        </Paper>
      </Page>
    );
  }



  return (
    <Page
      title={`${organization.name} HR Dashboard`}
      subtitle="Manage your organization's human resources and member lifecycle"
      headerActions={
        <>
          <Link to={`/organizations/${spectrumId}`}>
            <Button variant='glass' size='sm'>
              <UserGroupIcon className='w-5 h-5 mr-2' />
              Organization
            </Button>
          </Link>
          <Link to={`/organizations/${spectrumId}/manage`}>
            <Button variant='glass' size='sm'>
              Management
            </Button>
          </Link>
        </>
      }
      width='lg'
    >
      {/* HR Navigation Tabs */}
      <HRNavigationTabs className='mb-[var(--spacing-section)]' />

      {/* HR Dashboard Component */}
      <HRDashboard organizationId={organization.rsi_org_id} />

      {/* HR Quick Actions Component */}
      <HRQuickActions />
    </Page>
  );
};

export default HRDashboardPage;