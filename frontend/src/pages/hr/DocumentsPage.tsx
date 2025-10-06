import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetOrganizationQuery } from '../../services/apiSlice';
import { Page, Button, Paper } from '../../components/ui';
import DocumentLibrary from '../../components/hr/document_library';
import { HRBreadcrumbs, HRNavigationTabs } from '../../components/hr/navigation';
import {
  UserGroupIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const DocumentsPage: React.FC = () => {
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
        title='Document Library'
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
      title='Document Library'
      subtitle={`Access HR documents and policies for ${organization.name}`}
      headerActions={
        <>
          <Link to={`/organizations/${spectrumId}/hr/dashboard`}>
            <Button variant='glass' size='sm'>
              <ArrowLeftIcon className='w-5 h-5 mr-2' />
              HR Dashboard
            </Button>
          </Link>
          <Link to={`/organizations/${spectrumId}`}>
            <Button variant='glass' size='sm'>
              <UserGroupIcon className='w-5 h-5 mr-2' />
              Organization
            </Button>
          </Link>
        </>
      }
      width='lg'
    >
      {/* HR Navigation Tabs */}
      <HRNavigationTabs className='mb-[var(--spacing-section)]' />

      {/* Breadcrumb Navigation */}
      <HRBreadcrumbs 
        currentPage='Documents' 
        className='mb-[var(--spacing-section)]' 
      />

      {/* Document Library Component */}
      <DocumentLibrary />
    </Page>
  );
};

export default DocumentsPage;