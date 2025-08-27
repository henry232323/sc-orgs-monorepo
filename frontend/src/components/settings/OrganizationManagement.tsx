import React, { useState } from 'react';
import {
  useGetUserOrganizationsForManagementQuery,
  useLeaveOrganizationMutation,
  useToggleOrganizationVisibilityMutation,
} from '../../services/apiSlice';
import { Button, SettingsCard, Chip, ConfirmDialog } from '../ui';
import {
  BuildingOfficeIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const OrganizationManagement: React.FC = () => {
  const {
    data: organizations,
    isLoading,
    error,
    refetch,
  } = useGetUserOrganizationsForManagementQuery();
  const [leaveOrganization, { isLoading: isLeaving }] =
    useLeaveOrganizationMutation();
  const [toggleVisibility, { isLoading: isToggling }] =
    useToggleOrganizationVisibilityMutation();

  const [confirmLeave, setConfirmLeave] = useState<{
    show: boolean;
    orgName: string;
    orgId: string;
  }>({ show: false, orgName: '', orgId: '' });

  const handleLeaveOrganization = async () => {
    try {
      await leaveOrganization(confirmLeave.orgId).unwrap();
      setConfirmLeave({ show: false, orgName: '', orgId: '' });
      // Optionally show success message
    } catch (error) {
      console.error('Failed to leave organization:', error);
      // Optionally show error message
    }
  };

  const handleToggleVisibility = async (orgId: string) => {
    try {
      await toggleVisibility(orgId).unwrap();
      // Optionally show success message
    } catch (error) {
      console.error('Failed to toggle organization visibility:', error);
      // Optionally show error message
    }
  };

  const showLeaveConfirmation = (orgName: string, orgId: string) => {
    setConfirmLeave({ show: true, orgName, orgId });
  };

  if (isLoading) {
    return (
      <SettingsCard title='Organization Management' icon={BuildingOfficeIcon}>
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-accent-blue'></div>
          <span className='ml-3 text-secondary'>Loading organizations...</span>
        </div>
      </SettingsCard>
    );
  }

  if (error) {
    return (
      <SettingsCard title='Organization Management' icon={BuildingOfficeIcon}>
        <div className='text-center py-8'>
          <p className='text-error mb-4'>Failed to load organizations</p>
          <Button variant='secondary' onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard title='Organization Management' icon={BuildingOfficeIcon}>
        {!organizations || organizations.length === 0 ? (
          <div className='text-center py-8'>
            <BuildingOfficeIcon className='w-12 h-12 text-tertiary mx-auto mb-4' />
            <p className='text-secondary mb-2'>No organizations found</p>
            <p className='text-tertiary text-sm'>
              Join an organization to see it here
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {organizations.map(org => (
              <div
                key={org.id}
                className='glass-panel p-4 rounded-lg border border-glass'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-start space-x-4 flex-1'>
                    {/* Organization Logo */}
                    <div className='w-12 h-12 bg-glass rounded-lg flex items-center justify-center flex-shrink-0'>
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className='w-10 h-10 rounded-lg object-cover'
                        />
                      ) : (
                        <BuildingOfficeIcon className='w-6 h-6 text-primary' />
                      )}
                    </div>

                    {/* Organization Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <h3 className='text-lg font-semibold text-primary truncate'>
                          {org.name}
                        </h3>
                        <div className='flex space-x-1'>
                          {org.is_owner && (
                            <Chip
                              variant='status'
                              size='sm'
                              className='bg-brand-secondary text-brand-secondary'
                            >
                              <ShieldCheckIcon className='w-3 h-3 mr-1' />
                              Owner
                            </Chip>
                          )}
                          {!org.is_owner && (
                            <Chip variant='status' size='sm'>
                              {org.role_name}
                            </Chip>
                          )}
                          {org.is_hidden && (
                            <Chip
                              variant='status'
                              size='sm'
                              className='bg-yellow-500/20 text-yellow-400'
                            >
                              <EyeSlashIcon className='w-3 h-3 mr-1' />
                              Hidden
                            </Chip>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center space-x-4 text-sm text-secondary'>
                        <div className='flex items-center space-x-1'>
                          <UserGroupIcon className='w-4 h-4' />
                          <span>{org.member_count} members</span>
                        </div>
                        <div>
                          Joined {new Date(org.joined_at).toLocaleDateString()}
                        </div>
                        <div className='text-xs text-tertiary'>
                          {org.rsi_org_id}
                        </div>
                      </div>

                      {org.description && (
                        <p className='text-sm text-tertiary mt-2 line-clamp-2'>
                          {org.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex items-center space-x-2 flex-shrink-0 ml-4'>
                    <Button
                      variant='glass'
                      size='sm'
                      onClick={() => handleToggleVisibility(org.rsi_org_id)}
                      disabled={isToggling}
                      className='flex items-center space-x-1'
                    >
                      {org.is_hidden ? (
                        <>
                          <EyeIcon className='w-4 h-4' />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeSlashIcon className='w-4 h-4' />
                          <span>Hide</span>
                        </>
                      )}
                    </Button>

                    {!org.is_owner && (
                      <Button
                        variant='danger'
                        size='sm'
                        onClick={() =>
                          showLeaveConfirmation(org.name, org.rsi_org_id)
                        }
                        disabled={isLeaving}
                        className='flex items-center space-x-1'
                      >
                        <ArrowRightOnRectangleIcon className='w-4 h-4' />
                        <span>Leave</span>
                      </Button>
                    )}

                    {org.is_owner && (
                      <div className='text-xs text-tertiary text-center'>
                        <p>Cannot leave</p>
                        <p>as owner</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* Leave Organization Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmLeave.show}
        onClose={() => setConfirmLeave({ show: false, orgName: '', orgId: '' })}
        onConfirm={handleLeaveOrganization}
        title='Leave Organization'
        message={
          <div>
            <p className='mb-4'>
              Are you sure you want to leave{' '}
              <strong>{confirmLeave.orgName}</strong>?
            </p>
            <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300'>
              <p className='font-medium mb-1'>⚠️ Important:</p>
              <ul className='space-y-1 text-xs'>
                <li>
                  • You will lose access to organization events and resources
                </li>
                <li>• You may need an invitation to rejoin</li>
                <li>• This action cannot be easily undone</li>
              </ul>
            </div>
          </div>
        }
        confirmText='Leave Organization'
        confirmVariant='danger'
        isLoading={isLeaving}
      />
    </>
  );
};

export default OrganizationManagement;
