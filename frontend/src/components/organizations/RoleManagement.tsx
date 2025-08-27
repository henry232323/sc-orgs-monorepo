import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  useGetOrganizationRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '../../services/apiSlice';
import { Button, Paper, Chip } from '../ui';
import RoleForm from './RoleForm';

interface RoleManagementProps {
  spectrumId: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  rank: number;
  is_system_role: boolean;
  is_editable: boolean;
  is_active: boolean;
  permissions?: Array<{
    id: string;
    permission: string;
    granted: boolean;
  }>;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ spectrumId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Role | null>(null);

  const {
    data: roles,
    isLoading,
    error,
    refetch,
  } = useGetOrganizationRolesQuery(spectrumId);

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const handleCreateRole = async (roleData: {
    name: string;
    description?: string;
    rank: number;
    permissions: string[];
  }) => {
    try {
      await createRole({
        spectrumId,
        ...roleData,
      }).unwrap();
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async (
    roleId: string,
    roleData: {
      name?: string;
      description?: string;
      rank?: number;
      permissions?: string[];
      is_active?: boolean;
    }
  ) => {
    try {
      await updateRole({
        spectrumId,
        roleId,
        ...roleData,
      }).unwrap();
      setEditingRole(null);
      refetch();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole({
        spectrumId,
        roleId,
      }).unwrap();
      setShowDeleteConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-[var(--color-accent-blue)]'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-12'>
        <p className='text-error'>Failed to load roles</p>
        <Button onClick={() => refetch()} variant='glass' className='mt-2'>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-medium text-primary'>Role Management</h2>
          <p className='text-sm text-tertiary'>
            Manage roles and permissions for your organization
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} variant='primary'>
          <PlusIcon className='w-5 h-5 mr-2' />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <Paper variant='glass' size='lg'>
        <h3
          className='text-lg font-semibold text-primary'
          style={{ marginBottom: 'var(--spacing-component)' }}
        >
          Roles ({roles?.length || 0})
        </h3>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-element)',
          }}
        >
          {roles?.map((role: Role) => (
            <div
              key={role.id}
              className='flex items-center justify-between bg-white/5 rounded-lg'
              style={{ padding: 'var(--spacing-element)' }}
            >
              <div className='flex items-center space-x-4'>
                <div className='w-3 h-3 rounded-full bg-gradient-to-r from-white/20 to-white/10 flex items-center justify-center'>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      role.rank >= 80
                        ? 'bg-red-400'
                        : role.rank >= 50
                          ? 'bg-yellow-400'
                          : 'bg-green-400'
                    }`}
                  />
                </div>
                <div>
                  <div className='flex items-center space-x-2'>
                    <span className='text-white font-semibold'>
                      {role.name}
                    </span>
                    {role.is_system_role && (
                      <Chip className='bg-blue-500/20 text-blue-400'>
                        System
                      </Chip>
                    )}
                    {!role.is_active && (
                      <Chip className='bg-gray-500/20 text-gray-400'>
                        Inactive
                      </Chip>
                    )}
                  </div>
                  {role.description && (
                    <p className='text-sm text-gray-400 mt-1'>
                      {role.description}
                    </p>
                  )}
                  <p className='text-xs text-gray-500 mt-1'>
                    Rank: {role.rank} • {role.permissions?.length || 0}{' '}
                    permissions
                  </p>
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                {role.is_editable && (
                  <>
                    <Button
                      onClick={() => setEditingRole(role)}
                      variant='outline'
                      size='sm'
                    >
                      <PencilIcon className='h-4 w-4' />
                    </Button>
                    {!role.is_system_role && (
                      <Button
                        onClick={() => setShowDeleteConfirm(role)}
                        variant='outline'
                        size='sm'
                        className='text-red-400 hover:text-red-600'
                      >
                        <TrashIcon className='h-4 w-4' />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Paper>

      {/* Create Role Form */}
      <RoleForm
        isOpen={showCreateForm}
        onSubmit={handleCreateRole}
        onCancel={() => setShowCreateForm(false)}
        isLoading={isCreating}
      />

      {/* Edit Role Form */}
      {editingRole && (
        <RoleForm
          isOpen={true}
          role={editingRole}
          onSubmit={data => handleUpdateRole(editingRole.id, data)}
          onCancel={() => setEditingRole(null)}
          isLoading={isUpdating}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
            <div className='mt-3 text-center'>
              <h3 className='text-lg font-medium text-gray-900'>Delete Role</h3>
              <div className='mt-2 px-7 py-3'>
                <p className='text-sm text-gray-500'>
                  Are you sure you want to delete the role "
                  {showDeleteConfirm.name}"? This action cannot be undone.
                </p>
              </div>
              <div className='flex justify-center space-x-4 mt-4'>
                <Button
                  onClick={() => setShowDeleteConfirm(null)}
                  variant='outline'
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteRole(showDeleteConfirm.id)}
                  disabled={isDeleting}
                  variant='primary'
                  className='bg-red-600 hover:bg-red-700'
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
