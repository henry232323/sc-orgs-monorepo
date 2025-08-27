import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { isTemporaryRsiHandle } from '../../utils/userUtils';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  XMarkIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  useGetOrganizationMembersQuery,
  useAssignRoleMutation,
  useRemoveMemberMutation,
  useGetInviteCodesQuery,
  useGenerateInviteCodeMutation,
  useDeleteInviteCodeMutation,
} from '../../services/apiSlice';
import { InviteCode } from '../../types/invite';
import { Button, Paper, Chip } from '../ui';
import RoleAssignmentModal from './RoleAssignmentModal';
import InviteGenerationModal from './InviteGenerationModal';

interface MemberManagementProps {
  spectrumId: string;
}

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
    avatar_url?: string;
    is_rsi_verified: boolean;
  };
  joined_at: string;
  last_activity_at?: string;
}


const MemberManagement: React.FC<MemberManagementProps> = ({
  spectrumId,
}) => {
  const [showRoleAssignment, setShowRoleAssignment] = useState<Member | null>(
    null
  );
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<Member | null>(
    null
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');

  const {
    data: members,
    isLoading,
    error,
    refetch,
  } = useGetOrganizationMembersQuery(spectrumId);

  const [assignRole, { isLoading: isAssigning }] = useAssignRoleMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();

  const {
    data: inviteCodesResponse,
    isLoading: invitesLoading,
    error: invitesError,
    refetch: refetchInvites,
  } = useGetInviteCodesQuery(spectrumId);

  const inviteCodes = inviteCodesResponse?.inviteCodes || [];

  const [generateInviteCode] = useGenerateInviteCodeMutation();
  const [deleteInviteCode] = useDeleteInviteCodeMutation();

  const handleAssignRole = async (memberId: string, roleId: string) => {
    try {
      await assignRole({
        spectrumId,
        targetUserId: memberId,
        roleId,
      }).unwrap();
      setShowRoleAssignment(null);
      refetch();
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember({
        spectrumId,
        userId: memberId,
      }).unwrap();
      setShowRemoveConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleGenerateInvite = async (
    role_id: string,
    maxUses?: number,
    expiresAt?: string
  ) => {
    try {
      await generateInviteCode({
        spectrumId,
        role_id,
        ...(maxUses !== undefined && { maxUses }),
        ...(expiresAt !== undefined && { expiresAt }),
      }).unwrap();
      setShowInviteModal(false);
      refetchInvites();
    } catch (error) {
      console.error('Failed to generate invite code:', error);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteInviteCode({
        spectrumId,
        inviteId,
      }).unwrap();
      refetchInvites();
    } catch (error) {
      console.error('Failed to delete invite code:', error);
    }
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    // You could add a toast notification here
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-500/20 text-purple-400';
      case 'admin':
        return 'bg-red-500/20 text-red-400';
      case 'moderator':
        return 'bg-orange-500/20 text-orange-400';
      case 'member':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <p className='text-error'>Failed to load members</p>
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
          <h2 className='text-lg font-medium text-primary'>
            Member Management
          </h2>
          <p className='text-sm text-tertiary'>
            Manage members and their roles in your organization
          </p>
        </div>
        <Button variant='primary' onClick={() => setShowInviteModal(true)}>
          <UserPlusIcon className='w-5 h-5 mr-2' />
          Invite Member
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className='flex gap-1 bg-glass rounded-[var(--radius-glass-sm)] p-1'>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-[var(--radius-glass-sm)] text-sm font-medium transition-all duration-[var(--duration-normal)] ${
            activeTab === 'members'
              ? 'bg-[var(--color-accent-blue)] text-primary shadow-[var(--shadow-glass-sm)]'
              : 'text-tertiary hover:text-primary hover:bg-glass-hover'
          }`}
        >
          <UsersIcon className='w-5 h-5 mr-2' />
          Members ({members?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-[var(--radius-glass-sm)] text-sm font-medium transition-all duration-[var(--duration-normal)] ${
            activeTab === 'invites'
              ? 'bg-[var(--color-accent-blue)] text-primary shadow-[var(--shadow-glass-sm)]'
              : 'text-tertiary hover:text-primary hover:bg-glass-hover'
          }`}
        >
          <LinkIcon className='w-5 h-5 mr-2' />
          Invite Codes ({inviteCodes?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <Paper variant='glass' size='lg'>
          <h3 className='text-lg font-semibold text-white mb-6'>
            Members ({members?.length || 0})
          </h3>

          <div className='space-y-4'>
            {members?.map((member: Member) => (
              <div
                key={member.id}
                className='flex items-center justify-between p-4 bg-white/5 rounded-lg'
              >
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center'>
                    {member.user.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt={member.user.rsi_handle}
                        className='w-12 h-12 rounded-full object-cover'
                      />
                    ) : (
                      <span className='text-white font-semibold text-lg'>
                        {member.user.rsi_handle.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className='flex items-center space-x-2'>
                      <Link 
                        to={`/profile/${member.user.rsi_handle}`}
                        className='text-white font-semibold hover:text-brand-secondary transition-colors'
                      >
                        {member.user.rsi_handle}
                        {isTemporaryRsiHandle(member.user.rsi_handle) && (
                          <span className='text-xs text-yellow-400 ml-2'>
                            (Unverified)
                          </span>
                        )}
                      </Link>
                      {member.role?.name === 'Owner' && (
                        <span className='text-yellow-400 text-lg'>👑</span>
                      )}
                      {member.user.is_rsi_verified && (
                        <span className='text-blue-400 text-sm'>✓</span>
                      )}
                    </div>
                    <p className='text-gray-500 text-xs'>
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>

                <div className='flex items-center space-x-3'>
                  {member.role && (
                    <Chip className={getRoleBadgeColor(member.role.name)}>
                      {member.role.name}
                    </Chip>
                  )}
                  <div className='flex items-center space-x-2'>
                    <Button
                      onClick={() => setShowRoleAssignment(member)}
                      variant='outline'
                      size='sm'
                    >
                      <PencilIcon className='h-4 w-4' />
                    </Button>
                    <Button
                      onClick={() => setShowRemoveConfirm(member)}
                      variant='outline'
                      size='sm'
                      className='text-red-400 hover:text-red-600'
                    >
                      <TrashIcon className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Paper>
      )}

      {/* Invite Codes Section */}
      {activeTab === 'invites' && (
        <Paper variant='glass' size='lg'>
          <h3 className='text-lg font-semibold text-white mb-6'>
            Invite Codes ({inviteCodes?.length || 0})
          </h3>

          {invitesLoading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            </div>
          ) : invitesError ? (
            <div className='text-center py-12'>
              <p className='text-red-400'>Failed to load invite codes</p>
              <Button
                onClick={() => refetchInvites()}
                variant='outline'
                className='mt-2'
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className='space-y-4'>
              {inviteCodes?.map((invite: InviteCode) => (
                <div
                  key={invite.id}
                  className='flex items-center justify-between p-4 bg-white/5 rounded-lg'
                >
                  <div className='flex items-center space-x-4'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <div className='flex items-center space-x-2 bg-white/10 px-3 py-1 rounded'>
                          <LinkIcon className='w-4 h-4 text-blue-400' />
                          <code className='text-sm font-mono text-white'>
                            {invite.code}
                          </code>
                        </div>
                        {invite.role_name && (
                          <Chip className={getRoleBadgeColor(invite.role_name)}>
                            {invite.role_name}
                          </Chip>
                        )}
                        {!invite.is_active && (
                          <Chip className='bg-red-500/20 text-red-400'>
                            Inactive
                          </Chip>
                        )}
                      </div>
                      <div className='flex items-center space-x-4 text-sm text-gray-400'>
                        <span>
                          Uses: {invite.used_count}
                          {invite.max_uses ? `/${invite.max_uses}` : ''}
                        </span>
                        {invite.expires_at && (
                          <span className='flex items-center'>
                            <ClockIcon className='w-4 h-4 mr-1' />
                            Expires{' '}
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          Created{' '}
                          {new Date(invite.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <Button
                      onClick={() => copyInviteLink(invite.code)}
                      variant='outline'
                      size='sm'
                      className='text-blue-400 hover:text-blue-600'
                    >
                      <LinkIcon className='h-4 w-4' />
                    </Button>
                    <Button
                      onClick={() => handleDeleteInvite(invite.id)}
                      variant='outline'
                      size='sm'
                      className='text-red-400 hover:text-red-600'
                    >
                      <XMarkIcon className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}

              {(!inviteCodes || inviteCodes.length === 0) && (
                <div className='text-center py-12'>
                  <LinkIcon className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-white mb-2'>
                    No invite links
                  </h3>
                  <p className='text-gray-400 mb-4'>
                    Create invite links to allow others to join your
                    organization
                  </p>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    variant='primary'
                  >
                    <UserPlusIcon className='w-5 h-5 mr-2' />
                    Create Invite Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </Paper>
      )}

      {/* Role Assignment Modal */}
      <RoleAssignmentModal
        isOpen={!!showRoleAssignment}
        member={showRoleAssignment}
        spectrumId={spectrumId}
        onAssign={handleAssignRole}
        onCancel={() => setShowRoleAssignment(null)}
        isLoading={isAssigning}
      />

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto w-96'>
            <Paper variant='glass' size='lg'>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-white mb-4'>
                  Remove Member
                </h3>
                <div className='mb-6'>
                  <p className='text-sm text-gray-400'>
                    Are you sure you want to remove{' '}
                    <strong className='text-white'>
                      {showRemoveConfirm.user.rsi_handle}
                    </strong>{' '}
                    from this organization?
                  </p>
                </div>
                <div className='flex justify-center space-x-4'>
                  <Button
                    onClick={() => setShowRemoveConfirm(null)}
                    variant='outline'
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      handleRemoveMember(showRemoveConfirm.user_id)
                    }
                    disabled={isRemoving}
                    variant='primary'
                    className='bg-red-600 hover:bg-red-700'
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
            </Paper>
          </div>
        </div>
      )}

      {/* Invite Generation Modal */}
      <InviteGenerationModal
        isOpen={showInviteModal}
        spectrumId={spectrumId}
        onGenerate={handleGenerateInvite}
        onCancel={() => setShowInviteModal(false)}
      />
    </div>
  );
};

export default MemberManagement;
