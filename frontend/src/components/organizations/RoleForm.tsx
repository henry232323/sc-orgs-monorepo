import React, { useState } from 'react';
import { Button, Dialog, Input, Textarea, Switch } from '../ui';
import PermissionSelector from './PermissionSelector';

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

interface RoleFormProps {
  isOpen: boolean;
  role?: Role;
  onSubmit: (data: {
    name: string;
    description?: string;
    rank: number;
    permissions: string[];
    is_active?: boolean;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  isOpen,
  role,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    rank: role?.rank || 10,
    is_active: role?.is_active ?? true,
  });
  // For non-editable roles, always show all permissions as selected
  const isNonEditableRole = !role?.is_editable;
  const allPermissions = [
    'manage_organization', 'update_organization', 'delete_organization',
    'manage_members', 'invite_members', 'remove_members', 'view_members',
    'manage_roles', 'create_roles', 'update_roles', 'delete_roles', 'assign_roles',
    'manage_events', 'create_events', 'update_events', 'delete_events',
    'manage_comments', 'moderate_comments', 'delete_comments',
    'manage_integrations', 'update_rsi_integration', 'update_discord_integration',
    'view_analytics', 'view_reports'
  ];
  
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    isNonEditableRole 
      ? allPermissions 
      : role?.permissions?.filter(p => p.granted).map(p => p.permission) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      permissions: selectedPermissions,
    });
  };

  const handlePermissionChange = (permission: string, granted: boolean) => {
    if (granted) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={role ? (isNonEditableRole ? 'Role (Read Only)' : 'Edit Role') : 'Create New Role'}
      size='lg'
    >
      
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-component)',
        }}
      >
        {/* Basic Information */}
        <div
          className='grid grid-cols-1 sm:grid-cols-2'
          style={{ gap: 'var(--spacing-component)' }}
        >
          <div>
            <Input
              type='text'
              label='Role Name'
              value={formData.name}
              onChange={value =>
                setFormData(prev => ({ ...prev, name: value }))
              }
              required
              disabled={role?.is_system_role || false || isNonEditableRole}
              placeholder='Enter role name'
            />
          </div>

          <div>
            <Input
              type='text'
              label='Rank'
              value={formData.rank.toString()}
              onChange={value =>
                setFormData(prev => ({
                  ...prev,
                  rank: parseInt(value) || 10,
                }))
              }
              required
              disabled={role?.is_system_role || false || isNonEditableRole}
              placeholder='10'
            />
            <p
              className='text-xs text-tertiary'
              style={{ marginTop: 'var(--spacing-tight)' }}
            >
              Higher rank = more permissions. Owner: 100, Admin: 80, Member: 10
            </p>
          </div>
        </div>

        <div>
          <Textarea
            label='Description'
            value={formData.description}
            onChange={value =>
              setFormData(prev => ({ ...prev, description: value }))
            }
            rows={3}
            placeholder='Describe what this role can do...'
          />
        </div>

        {/* Status */}
        {role && (
          <div>
            <Switch
              label='Active'
              enabled={formData.is_active}
              onChange={enabled =>
                setFormData(prev => ({
                  ...prev,
                  is_active: enabled,
                }))
              }
              disabled={role?.is_system_role || isNonEditableRole}
            />
          </div>
        )}

        {/* Permissions */}
        <div>
          <label
            className='block text-sm font-medium text-secondary'
            style={{ marginBottom: 'var(--spacing-element)' }}
          >
            Permissions
          </label>
          <PermissionSelector
            selectedPermissions={selectedPermissions}
            onPermissionChange={handlePermissionChange}
            disabled={role?.is_system_role || false || isNonEditableRole}
          />
        </div>

        {/* Actions */}
        <div
          className='flex justify-end border-t border-glass-border'
          style={{
            gap: 'var(--spacing-element)',
            paddingTop: 'var(--spacing-section)',
          }}
        >
          <Button type='button' onClick={onCancel} variant='outline'>
            Cancel
          </Button>
          <Button 
            type='submit' 
            disabled={isLoading || isNonEditableRole} 
            variant='primary'
          >
            {isLoading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default RoleForm;
