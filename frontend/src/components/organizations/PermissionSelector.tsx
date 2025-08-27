import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Checkbox } from '../ui';

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onPermissionChange: (permission: string, granted: boolean) => void;
  disabled?: boolean;
}

interface PermissionGroup {
  name: string;
  permissions: Array<{
    key: string;
    name: string;
    description: string;
  }>;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Organization Management',
    permissions: [
      {
        key: 'manage_organization',
        name: 'Manage Organization',
        description: 'Full control over organization settings',
      },
      {
        key: 'update_organization',
        name: 'Update Organization',
        description: 'Edit organization details and settings',
      },
      {
        key: 'delete_organization',
        name: 'Delete Organization',
        description: 'Delete the entire organization',
      },
    ],
  },
  {
    name: 'Member Management',
    permissions: [
      {
        key: 'manage_members',
        name: 'Manage Members',
        description: 'Full control over member management',
      },
      {
        key: 'invite_members',
        name: 'Invite Members',
        description: 'Send invitations to new members',
      },
      {
        key: 'remove_members',
        name: 'Remove Members',
        description: 'Remove members from the organization',
      },
      {
        key: 'view_members',
        name: 'View Members',
        description: 'View the member list',
      },
    ],
  },
  {
    name: 'Role Management',
    permissions: [
      {
        key: 'manage_roles',
        name: 'Manage Roles',
        description: 'Full control over role management',
      },
      {
        key: 'create_roles',
        name: 'Create Roles',
        description: 'Create new custom roles',
      },
      {
        key: 'update_roles',
        name: 'Update Roles',
        description: 'Edit existing roles and permissions',
      },
      {
        key: 'delete_roles',
        name: 'Delete Roles',
        description: 'Delete custom roles',
      },
      {
        key: 'assign_roles',
        name: 'Assign Roles',
        description: 'Assign roles to members',
      },
    ],
  },
  {
    name: 'Event Management',
    permissions: [
      {
        key: 'manage_events',
        name: 'Manage Events',
        description: 'Full control over event management',
      },
      {
        key: 'create_events',
        name: 'Create Events',
        description: 'Create new events',
      },
      {
        key: 'update_events',
        name: 'Update Events',
        description: 'Edit existing events',
      },
      {
        key: 'delete_events',
        name: 'Delete Events',
        description: 'Delete events',
      },
    ],
  },
  {
    name: 'Comment Management',
    permissions: [
      {
        key: 'manage_comments',
        name: 'Manage Comments',
        description: 'Full control over comment management',
      },
      {
        key: 'moderate_comments',
        name: 'Moderate Comments',
        description: 'Moderate comments on organization page',
      },
      {
        key: 'delete_comments',
        name: 'Delete Comments',
        description: 'Delete comments',
      },
    ],
  },
  {
    name: 'Integration Management',
    permissions: [
      {
        key: 'manage_integrations',
        name: 'Manage Integrations',
        description: 'Full control over integrations',
      },
      {
        key: 'update_rsi_integration',
        name: 'Update RSI Integration',
        description: 'Manage RSI account integration',
      },
      {
        key: 'update_discord_integration',
        name: 'Update Discord Integration',
        description: 'Manage Discord server integration',
      },
    ],
  },
  {
    name: 'Analytics & Reporting',
    permissions: [
      {
        key: 'view_analytics',
        name: 'View Analytics',
        description: 'View organization analytics and statistics',
      },
      {
        key: 'view_reports',
        name: 'View Reports',
        description: 'View detailed reports',
      },
    ],
  },
];

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onPermissionChange,
  disabled = false,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    PERMISSION_GROUPS.map(group => group.name)
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  const handlePermissionToggle = (permission: string) => {
    if (disabled) return;
    const isGranted = selectedPermissions.includes(permission);
    onPermissionChange(permission, !isGranted);
  };

  const handleGroupToggle = (group: PermissionGroup) => {
    if (disabled) return;
    const groupPermissions = group.permissions.map(p => p.key);
    const allSelected = groupPermissions.every(p =>
      selectedPermissions.includes(p)
    );

    groupPermissions.forEach(permission => {
      onPermissionChange(permission, !allSelected);
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-element)',
      }}
    >
      
      {PERMISSION_GROUPS.map(group => {
        const isExpanded = expandedGroups.includes(group.name);
        const groupPermissions = group.permissions.map(p => p.key);
        const selectedInGroup = groupPermissions.filter(p =>
          selectedPermissions.includes(p)
        );
        const allSelected = selectedInGroup.length === groupPermissions.length;
        const someSelected = selectedInGroup.length > 0;

        return (
          <div
            key={group.name}
            className='border border-glass-border rounded-lg bg-glass-elevated'
          >
            {/* Group Header */}
            <div
              className='border-b border-glass-border'
              style={{ padding: 'var(--spacing-element)' }}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center'>
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className='text-tertiary hover:text-secondary transition-colors'
                    style={{ marginRight: 'var(--spacing-tight)' }}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className='h-5 w-5' />
                    ) : (
                      <ChevronRightIcon className='h-5 w-5' />
                    )}
                  </button>
                  <h4 className='text-sm font-medium text-primary'>
                    {group.name}
                  </h4>
                </div>
                <div
                  className='flex items-center'
                  style={{ gap: 'var(--spacing-tight)' }}
                >
                  <span className='text-xs text-tertiary'>
                    {selectedInGroup.length}/{groupPermissions.length}
                  </span>
                  <button
                    onClick={() => handleGroupToggle(group)}
                    disabled={disabled}
                    className={`text-xs rounded transition-colors ${
                      allSelected
                        ? 'bg-success/20 text-success'
                        : someSelected
                          ? 'bg-warning/20 text-warning'
                          : 'bg-white/10 text-white/60'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
                    style={{
                      padding: 'var(--spacing-tight) var(--spacing-element)',
                    }}
                  >
                    {allSelected ? 'All' : someSelected ? 'Some' : 'None'}
                  </button>
                </div>
              </div>
            </div>

            {/* Group Permissions */}
            {isExpanded && (
              <div
                style={{
                  padding: 'var(--spacing-element)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-element)',
                }}
              >
                {group.permissions.map(permission => {
                  const isSelected = selectedPermissions.includes(
                    permission.key
                  );

                  return (
                    <Checkbox
                      key={permission.key}
                      checked={isSelected}
                      onChange={() => handlePermissionToggle(permission.key)}
                      label={permission.name}
                      description={permission.description}
                      disabled={disabled}
                      size='md'
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionSelector;
