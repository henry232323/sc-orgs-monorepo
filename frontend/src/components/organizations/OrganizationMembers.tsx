import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useGetOrganizationQuery,
  useGetOrganizationMembersQuery,
} from '../../services/apiSlice';
import {
  Button,
  Paper,
  Chip,
  PageContainer,
  PageTitle,
  SectionTitle,
} from '../ui';

interface OrganizationMembersProps {}

const OrganizationMembers: React.FC<OrganizationMembersProps> = () => {
  const { spectrumId } = useParams();
  const navigate = useNavigate();

  // Fetch organization data
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
  } = useGetOrganizationQuery(spectrumId || '', {
    skip: !spectrumId,
  });

  // Fetch real members data
  const { data: membersData, isLoading: membersLoading } =
    useGetOrganizationMembersQuery(organization?.rsi_org_id || '', {
      skip: !organization?.rsi_org_id,
    });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-brand-primary/20 text-brand-primary';
      case 'Admin':
        return 'bg-error/20 text-error';
      case 'Moderator':
        return 'bg-warning/20 text-warning';
      case 'Member':
        return 'bg-brand-secondary/20 text-brand-secondary';
      default:
        return 'bg-white/20 text-white/60';
    }
  };

  if (orgLoading || membersLoading) {
    return (
      <PageContainer width='lg' padding='desktop'>
        <div className='animate-pulse'>
          <div
            className='h-8 bg-glass-elevated rounded w-1/4'
            style={{ marginBottom: 'var(--spacing-section)' }}
          ></div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-element)',
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div key={i} className='h-16 bg-glass-elevated rounded'></div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (orgError || !organization) {
    return (
      <PageContainer width='lg' padding='desktop'>
        <div className='text-center'>
          <div style={{ marginBottom: 'var(--spacing-element)' }}>
            <PageTitle className='text-error'>Organization not found</PageTitle>
          </div>
          <p
            className='text-tertiary'
            style={{ marginBottom: 'var(--spacing-section)' }}
          >
            The organization you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button variant='primary' onClick={() => navigate('/organizations')}>
            Back to Organizations
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width='lg' padding='desktop'>
      {/* Header */}
      <div
        className='flex items-center justify-between'
        style={{ marginBottom: 'var(--spacing-section)' }}
      >
        <div>
          <div style={{ marginBottom: 'var(--spacing-tight)' }}>
            <PageTitle>{organization.name} - Members</PageTitle>
          </div>
          <p className='text-tertiary'>
            View organization members and their roles
          </p>
        </div>
        <div className='flex' style={{ gap: 'var(--spacing-tight)' }}>
          <Button
            variant='glass'
            onClick={() =>
              navigate(`/organizations/${organization.rsi_org_id}`)
            }
          >
            Back to Organization
          </Button>
        </div>
      </div>

      {/* Members List */}
      <Paper variant='glass' size='lg'>
        <div style={{ marginBottom: 'var(--spacing-section)' }}>
          <SectionTitle>Members ({membersData?.length || 0})</SectionTitle>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-element)',
          }}
        >
          {membersData?.map(member => (
            <div
              key={member.id}
              className='flex items-center justify-between bg-white/5 rounded-lg'
              style={{ padding: 'var(--spacing-element)' }}
            >
              <div
                className='flex items-center'
                style={{ gap: 'var(--spacing-element)' }}
              >
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
                  <div
                    className='flex items-center'
                    style={{ gap: 'var(--spacing-tight)' }}
                  >
                    <Link 
                      to={`/profile/${member.user.rsi_handle}`}
                      className='text-white font-semibold hover:text-brand-secondary transition-colors'
                    >
                      {member.user.rsi_handle}
                    </Link>
                    {member.role?.name === 'Owner' && (
                      <span className='text-warning text-lg'>👑</span>
                    )}
                    {member.user.is_rsi_verified && (
                      <span className='text-brand-secondary text-sm'>✓</span>
                    )}
                  </div>
                  <p className='text-tertiary text-xs'>
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div
                className='flex items-center'
                style={{ gap: 'var(--spacing-element)' }}
              >
                <Chip
                  className={getRoleBadgeColor(member.role?.name || 'Member')}
                >
                  {member.role?.name || 'Member'}
                </Chip>
              </div>
            </div>
          ))}
        </div>
      </Paper>
    </PageContainer>
  );
};

export default OrganizationMembers;
