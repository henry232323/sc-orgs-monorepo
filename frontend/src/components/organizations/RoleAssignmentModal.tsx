import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetOrganizationRolesQuery } from '../../services/apiSlice';
import { Button, Dialog, Chip } from '../ui';

interface Member {
  id: string;
  user_id: string;
  role_id: string;
  role?: {
    id: string;
    name: string;
    rank: number;
  };
  user: {
    id: string;
    rsi_handle: string;
    discord_avatar?: string;
    is_rsi_verified: boolean;
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
  rank: number;
  is_system_role: boolean;
  is_editable: boolean;
  is_active: boolean;
}

interface RoleAssignmentModalProps {
  isOpen: boolean;
  member: Member | null;
  spectrumId: string;
  onAssign: (memberId: string, roleId: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  member,
  spectrumId,
  onAssign,
  onCancel,
  isLoading,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState(member?.role_id || '');

  const { data: roles, isLoading: isLoadingRoles } =
    useGetOrganizationRolesQuery(spectrumId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (member && selectedRoleId && selectedRoleId !== member.role_id) {
      onAssign(member.user_id, selectedRoleId);
    } else {
      onCancel();
    }
  };

  const getRoleColor = (rank: number) => {
    if (rank >= 80) return 'border-error/20 bg-error/10';
    if (rank >= 50) return 'border-warning/20 bg-warning/10';
    return 'border-success/20 bg-success/10';
  };

  const getRoleTextColor = (rank: number) => {
    if (rank >= 80) return 'text-error';
    if (rank >= 50) return 'text-warning';
    return 'text-success';
  };

  if (!member) {
    return null;
  }

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title='Assign Role' size='md'>
      {/* Member Info */}
      <div
        className='bg-glass-elevated rounded-lg'
        style={{
          marginBottom: 'var(--spacing-component)',
          padding: 'var(--spacing-element)',
        }}
      >
        <div
          className='flex items-center'
          style={{ gap: 'var(--spacing-element)' }}
        >
          {member.user.discord_avatar ? (
            <img
              className='h-10 w-10 rounded-full'
              src={`https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.discord_avatar}.png`}
              alt={member.user.rsi_handle}
            />
          ) : (
            <div className='h-10 w-10 rounded-full bg-gradient-to-r from-white/20 to-white/10 flex items-center justify-center'>
              <span className='text-sm font-medium text-white'>
                {member.user.rsi_handle.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <Link 
              to={`/profile/${member.user.rsi_handle}`}
              className='text-sm font-medium text-primary hover:text-brand-secondary transition-colors'
            >
              {member.user.rsi_handle}
            </Link>
            <p className='text-xs text-tertiary'>
              Current role: {member.role?.name || 'No role'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--spacing-section)' }}>
          <label
            className='block text-sm font-medium text-secondary'
            style={{ marginBottom: 'var(--spacing-element)' }}
          >
            Select Role
          </label>
          {isLoadingRoles ? (
            <div
              className='flex items-center justify-center'
              style={{ padding: 'var(--spacing-element)' }}
            >
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-brand-secondary'></div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-tight)',
              }}
            >
              {roles?.map((role: Role) => (
                <label
                  key={role.id}
                  className={`relative flex items-start border rounded-lg cursor-pointer transition-all ${
                    selectedRoleId === role.id
                      ? 'border-brand-secondary bg-brand-secondary/10'
                      : getRoleColor(role.rank)
                  }`}
                  style={{ padding: 'var(--spacing-element)' }}
                >
                  <input
                    type='radio'
                    name='role'
                    value={role.id}
                    checked={selectedRoleId === role.id}
                    onChange={e => setSelectedRoleId(e.target.value)}
                    className='h-4 w-4 text-brand-secondary focus:ring-brand-secondary border-glass-border'
                  />
                  <div style={{ marginLeft: 'var(--spacing-element)' }}>
                    <div
                      className='flex items-center'
                      style={{ gap: 'var(--spacing-tight)' }}
                    >
                      <p
                        className={`text-sm font-medium ${getRoleTextColor(role.rank)}`}
                      >
                        {role.name}
                      </p>
                      {role.is_system_role && (
                        <Chip
                          variant='status'
                          size='sm'
                          className='bg-brand-secondary/20 text-brand-secondary'
                        >
                          System
                        </Chip>
                      )}
                      {!role.is_active && (
                        <Chip
                          variant='status'
                          size='sm'
                          className='bg-white/20 text-white/60'
                        >
                          Inactive
                        </Chip>
                      )}
                    </div>
                    {role.description && (
                      <p
                        className='text-xs text-tertiary'
                        style={{ marginTop: 'var(--spacing-tight)' }}
                      >
                        {role.description}
                      </p>
                    )}
                    <p
                      className='text-xs text-muted'
                      style={{ marginTop: 'var(--spacing-tight)' }}
                    >
                      Rank: {role.rank}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className='flex justify-end'
          style={{ gap: 'var(--spacing-element)' }}
        >
          <Button type='button' onClick={onCancel} variant='outline'>
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={
              isLoading || !selectedRoleId || selectedRoleId === member.role_id
            }
            variant='primary'
          >
            {isLoading ? 'Assigning...' : 'Assign Role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default RoleAssignmentModal;
