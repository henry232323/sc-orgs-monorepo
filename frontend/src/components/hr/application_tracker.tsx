import React, { useState } from 'react';
import {
  Button,
  Paper,
  Chip,
  Dialog,
  FilterGroup,
  Dropdown,
  Textarea,
  Input,
  Checkbox,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  LoadingState,
  EmptyState,
} from '../ui';
import {
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useBulkUpdateApplicationsMutation,
} from '../../services/apiSlice';
import type { Application, ApplicationFilters, UpdateApplicationStatusData } from '../../types/hr';
import {
  UserPlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface ApplicationTrackerProps {
  organizationId: string;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ organizationId }) => {
  // State for filters and pagination
  const [filters, setFilters] = useState<ApplicationFilters>({});
  const [page, setPage] = useState(1);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  
  // Form states
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [bulkStatus, setBulkStatus] = useState<Application['status']>('under_review');

  // Fetch applications data
  const { data: applicationsData, isLoading } = useGetApplicationsQuery({
    organizationId,
    page,
    limit: 20,
    filters,
  });

  // Mutations
  const [updateApplicationStatus] = useUpdateApplicationStatusMutation();
  const [bulkUpdateApplications] = useBulkUpdateApplicationsMutation();

  // Status options for dropdowns
  const statusOptions = [
    { value: 'pending', label: 'Pending', description: 'Awaiting initial review' },
    { value: 'under_review', label: 'Under Review', description: 'Currently being reviewed' },
    { value: 'interview_scheduled', label: 'Interview Scheduled', description: 'Interview has been scheduled' },
    { value: 'approved', label: 'Approved', description: 'Application approved' },
    { value: 'rejected', label: 'Rejected', description: 'Application rejected' },
  ];

  // Get status chip variant and color using design system colors
  const getStatusChipProps = (status: Application['status']) => {
    switch (status) {
      case 'approved':
        return { 
          variant: 'status' as const, 
          className: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]' 
        };
      case 'rejected':
        return { 
          variant: 'status' as const, 
          className: 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error-border)]' 
        };
      case 'interview_scheduled':
        return { 
          variant: 'status' as const, 
          className: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]' 
        };
      case 'under_review':
        return { 
          variant: 'status' as const, 
          className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]' 
        };
      default:
        return { 
          variant: 'default' as const, 
          className: 'bg-[var(--color-glass-bg)] text-[var(--color-text-tertiary)] border-[var(--color-glass-border)]' 
        };
    }
  };

  // Handle application selection
  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev =>
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const selectAllApplications = () => {
    if (applicationsData?.data) {
      setSelectedApplications(applicationsData.data.map(app => app.id));
    }
  };

  const clearSelection = () => {
    setSelectedApplications([]);
  };

  // Handle status updates
  const handleStatusUpdate = async (applicationId: string, status: Application['status']) => {
    const updateData: UpdateApplicationStatusData = {
      status,
      ...(reviewNotes && { review_notes: reviewNotes }),
      ...(status === 'rejected' && rejectionReason && { rejection_reason: rejectionReason }),
    };

    try {
      await updateApplicationStatus({
        organizationId,
        applicationId,
        data: updateData,
      }).unwrap();
      
      // Reset form
      setReviewNotes('');
      setRejectionReason('');
      setShowApplicationModal(false);
      setSelectedApplication(null);
    } catch (error) {
      console.error('Failed to update application status:', error);
    }
  };

  // Handle bulk updates
  const handleBulkUpdate = async () => {
    if (selectedApplications.length === 0) return;

    const updateData: UpdateApplicationStatusData = {
      status: bulkStatus,
      ...(reviewNotes && { review_notes: reviewNotes }),
      ...(bulkStatus === 'rejected' && rejectionReason && { rejection_reason: rejectionReason }),
    };

    try {
      await bulkUpdateApplications({
        organizationId,
        applicationIds: selectedApplications,
        data: updateData,
      }).unwrap();
      
      // Reset form and selection
      setReviewNotes('');
      setRejectionReason('');
      setBulkStatus('under_review');
      setSelectedApplications([]);
      setShowBulkActionModal(false);
    } catch (error) {
      console.error('Failed to bulk update applications:', error);
    }
  };

  // Open application detail modal
  const openApplicationModal = (application: Application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className='space-y-[var(--spacing-section)]'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <SectionTitle>Application Tracker</SectionTitle>
        <div className='flex items-center gap-[var(--gap-button)]'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className='w-4 h-4 mr-2' />
            Filters
          </Button>
          {selectedApplications.length > 0 && (
            <Button
              variant='primary'
              size='sm'
              onClick={() => setShowBulkActionModal(true)}
            >
              Bulk Actions ({selectedApplications.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Paper variant='glass-subtle' size='lg'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
            <FilterGroup title='Status'>
              <Dropdown
                value={filters.status || ''}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value as Application['status'] }))}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...statusOptions,
                ]}
                placeholder='Filter by status'
                className='w-full'
              />
            </FilterGroup>

            <FilterGroup title='Date Range'>
              <div className='space-y-[var(--spacing-tight)]'>
                <Input
                  type='date'
                  placeholder='From date'
                  value={filters.date_from || ''}
                  onChange={(value) => setFilters(prev => ({ ...prev, date_from: value }))}
                  className='w-full'
                />
                <Input
                  type='date'
                  placeholder='To date'
                  value={filters.date_to || ''}
                  onChange={(value) => setFilters(prev => ({ ...prev, date_to: value }))}
                  className='w-full'
                />
              </div>
            </FilterGroup>

            <FilterGroup title='Actions'>
              <div className='space-y-[var(--spacing-tight)]'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setFilters({})}
                  className='w-full'
                >
                  Clear Filters
                </Button>
              </div>
            </FilterGroup>
          </div>
        </Paper>
      )}

      {/* Applications List */}
      <Paper variant='glass' size='lg'>
        {/* Selection Controls */}
        {applicationsData?.data && applicationsData.data.length > 0 && (
          <div className='flex items-center justify-between mb-[var(--spacing-card-lg)] pb-[var(--spacing-element)] border-b border-[var(--color-glass-border)]'>
            <div className='flex items-center gap-[var(--gap-button)]'>
              <Button
                variant='ghost'
                size='sm'
                onClick={selectAllApplications}
              >
                Select All
              </Button>
              {selectedApplications.length > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearSelection}
                >
                  Clear ({selectedApplications.length})
                </Button>
              )}
            </div>
            <div className='text-sm text-[var(--color-text-tertiary)]'>
              {applicationsData.total} applications total
            </div>
          </div>
        )}

        {/* Applications Grid */}
        {isLoading ? (
          <LoadingState title="Loading applications..." />
        ) : applicationsData?.data && applicationsData.data.length > 0 ? (
          <div className='space-y-[var(--gap-grid-md)]'>
            {applicationsData.data.map((application) => (
              <Paper
                key={application.id}
                variant='glass-subtle'
                size='md'
                interactive
                className={`transition-all duration-[var(--duration-normal)] ${
                  selectedApplications.includes(application.id)
                    ? 'ring-2 ring-accent-blue/50 bg-accent-blue/5'
                    : ''
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-[var(--spacing-element)]'>
                    <Checkbox
                      checked={selectedApplications.includes(application.id)}
                      onChange={() => toggleApplicationSelection(application.id)}
                      size='sm'
                    />
                    <div className='flex-1'>
                      <div className='flex items-center gap-[var(--spacing-tight)] mb-[var(--spacing-tight)]'>
                        <ComponentTitle className='text-[var(--color-text-primary)]'>
                          Application #{application.id.slice(-8)}
                        </ComponentTitle>
                        <Chip
                          {...getStatusChipProps(application.status)}
                          size='sm'
                        >
                          {statusOptions.find(opt => opt.value === application.status)?.label || application.status}
                        </Chip>
                      </div>
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-element)] text-sm'>
                        <div>
                          <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-1'>
                            Submitted
                          </ComponentSubtitle>
                          <div className='flex items-center text-[var(--color-text-secondary)]'>
                            <CalendarIcon className='w-4 h-4 mr-1' />
                            {formatDate(application.created_at)}
                          </div>
                        </div>
                        {application.application_data.experience && (
                          <div>
                            <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-1'>
                              Experience
                            </ComponentSubtitle>
                            <div className='text-[var(--color-text-secondary)] truncate'>
                              {application.application_data.experience}
                            </div>
                          </div>
                        )}
                        {application.reviewer_id && (
                          <div>
                            <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-1'>
                              Reviewer
                            </ComponentSubtitle>
                            <div className='text-[var(--color-text-secondary)]'>
                              {application.reviewer_id}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-[var(--spacing-tight)]'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openApplicationModal(application)}
                    >
                      <EyeIcon className='w-4 h-4 mr-1' />
                      View
                    </Button>
                    
                    {/* Quick action buttons */}
                    {application.status === 'pending' && (
                      <>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleStatusUpdate(application.id, 'approved')}
                          className='text-[var(--color-success)] hover:bg-[var(--color-success-bg)]'
                        >
                          <CheckIcon className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleStatusUpdate(application.id, 'rejected')}
                          className='text-[var(--color-error)] hover:bg-[var(--color-error-bg)]'
                        >
                          <XMarkIcon className='w-4 h-4' />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserPlusIcon as React.ComponentType<{ className?: string }>}
            title="No Applications Found"
            description={
              Object.keys(filters).length > 0
                ? 'No applications match your current filters.'
                : 'No applications have been submitted yet.'
            }
          />
        )}

        {/* Pagination */}
        {applicationsData && applicationsData.total > applicationsData.limit && (
          <div className='flex items-center justify-between mt-[var(--spacing-card-lg)] pt-[var(--spacing-element)] border-t border-[var(--color-glass-border)]'>
            <div className='text-sm text-[var(--color-text-tertiary)]'>
              Showing {((page - 1) * applicationsData.limit) + 1} to{' '}
              {Math.min(page * applicationsData.limit, applicationsData.total)} of{' '}
              {applicationsData.total} applications
            </div>
            <div className='flex items-center gap-[var(--spacing-tight)]'>
              <Button
                variant='ghost'
                size='sm'
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant='ghost'
                size='sm'
                disabled={page * applicationsData.limit >= applicationsData.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Paper>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <Dialog
          isOpen={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedApplication(null);
            setReviewNotes('');
            setRejectionReason('');
          }}
          title={`Application #${selectedApplication.id.slice(-8)}`}
          size='lg'
        >
          <div className='space-y-[var(--spacing-card-lg)]'>
            {/* Application Details */}
            <div>
              <ComponentTitle className='mb-4'>Application Details</ComponentTitle>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-element)]'>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-1'>
                    Status
                  </ComponentSubtitle>
                  <Chip
                    {...getStatusChipProps(selectedApplication.status)}
                    size='sm'
                  >
                    {statusOptions.find(opt => opt.value === selectedApplication.status)?.label || selectedApplication.status}
                  </Chip>
                </div>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-1'>
                    Submitted
                  </ComponentSubtitle>
                  <div className='text-[var(--color-text-secondary)]'>
                    {formatDate(selectedApplication.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Application Data */}
            {selectedApplication.application_data.cover_letter && (
              <div>
                <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                  Cover Letter
                </ComponentSubtitle>
                <Paper variant='glass-subtle' size='sm'>
                  <p className='text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap'>
                    {selectedApplication.application_data.cover_letter}
                  </p>
                </Paper>
              </div>
            )}

            {selectedApplication.application_data.experience && (
              <div>
                <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                  Experience
                </ComponentSubtitle>
                <Paper variant='glass-subtle' size='sm'>
                  <p className='text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap'>
                    {selectedApplication.application_data.experience}
                  </p>
                </Paper>
              </div>
            )}

            {selectedApplication.application_data.availability && (
              <div>
                <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                  Availability
                </ComponentSubtitle>
                <Paper variant='glass-subtle' size='sm'>
                  <p className='text-[var(--color-text-secondary)] text-sm'>
                    {selectedApplication.application_data.availability}
                  </p>
                </Paper>
              </div>
            )}

            {/* Review Form */}
            <div>
              <ComponentTitle className='mb-4'>Review Application</ComponentTitle>
              <div className='space-y-[var(--spacing-element)]'>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                    Status
                  </ComponentSubtitle>
                  <Dropdown
                    value={selectedApplication.status}
                    onChange={(status) => handleStatusUpdate(selectedApplication.id, status as Application['status'])}
                    options={statusOptions}
                    className='w-full'
                  />
                </div>

                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                    Review Notes
                  </ComponentSubtitle>
                  <Textarea
                    value={reviewNotes}
                    onChange={setReviewNotes}
                    placeholder='Add your review notes...'
                    rows={3}
                    className='w-full'
                  />
                </div>

                {selectedApplication.status === 'rejected' && (
                  <div>
                    <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                      Rejection Reason
                    </ComponentSubtitle>
                    <Textarea
                      value={rejectionReason}
                      onChange={setRejectionReason}
                      placeholder='Provide reason for rejection...'
                      rows={2}
                      className='w-full'
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex items-center justify-end gap-[var(--gap-button)] pt-[var(--spacing-element)] border-t border-[var(--color-glass-border)]'>
              <Button
                variant='ghost'
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedApplication(null);
                  setReviewNotes('');
                  setRejectionReason('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Bulk Action Modal */}
      <Dialog
        isOpen={showBulkActionModal}
        onClose={() => {
          setShowBulkActionModal(false);
          setBulkStatus('under_review');
          setReviewNotes('');
          setRejectionReason('');
        }}
        title={`Bulk Update ${selectedApplications.length} Applications`}
        size='md'
      >
        <div className='space-y-[var(--spacing-card-lg)]'>
          <div>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
              New Status
            </ComponentSubtitle>
            <Dropdown
              value={bulkStatus}
              onChange={(status) => setBulkStatus(status as Application['status'])}
              options={statusOptions}
              className='w-full'
            />
          </div>

          <div>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
              Review Notes
            </ComponentSubtitle>
            <Textarea
              value={reviewNotes}
              onChange={setReviewNotes}
              placeholder='Add review notes for all selected applications...'
              rows={3}
              className='w-full'
            />
          </div>

          {bulkStatus === 'rejected' && (
            <div>
              <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-2'>
                Rejection Reason
              </ComponentSubtitle>
              <Textarea
                value={rejectionReason}
                onChange={setRejectionReason}
                placeholder='Provide reason for rejection...'
                rows={2}
                className='w-full'
              />
            </div>
          )}

          <div className='flex items-center justify-end gap-[var(--gap-button)] pt-[var(--spacing-element)] border-t border-[var(--color-glass-border)]'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowBulkActionModal(false);
                setBulkStatus('under_review');
                setReviewNotes('');
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleBulkUpdate}
            >
              Update Applications
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ApplicationTracker;