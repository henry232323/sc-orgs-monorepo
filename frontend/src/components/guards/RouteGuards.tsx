import React, { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useGetOrganizationQuery,
  useGetOrganizationMembersQuery,
} from '../../services/apiSlice';
import { OrganizationRole } from '../../types/organization';
import { Button } from '../ui';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Base interface for all route guards
interface BaseRouteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Loading component for route guards
const RouteLoadingSpinner: React.FC = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <div className='animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white'></div>
  </div>
);

// Error page component for unauthorized access
const UnauthorizedPage: React.FC<{
  title: string;
  message: string;
  actionButton?: ReactNode;
}> = ({ title, message, actionButton }) => (
  <div className='min-h-screen flex items-center justify-center'>
    <div className='max-w-md w-full space-y-8 p-8'>
      <div className='bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-xl p-8'>
        <div className='text-center space-y-6'>
          <ExclamationTriangleIcon className='w-16 h-16 text-red-400 mx-auto' />
          <h2 className='text-2xl font-bold text-white'>{title}</h2>
          <p className='text-white/80'>{message}</p>
          {actionButton && <div className='pt-4'>{actionButton}</div>}
        </div>
      </div>
    </div>
  </div>
);

// 1. RequireAuth - Pages that require an account should redirect to login
export const RequireAuth: React.FC<BaseRouteGuardProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return fallback || <RouteLoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login page, but save the current location
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// 2. RequireOrganizationMember - Pages that require being a member of the target org
export const RequireOrganizationMember: React.FC<BaseRouteGuardProps> = ({
  children,
  fallback,
}) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { spectrumId } = useParams<{ spectrumId: string }>();

  // Get organization data
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
  } = useGetOrganizationQuery(spectrumId || '', {
    skip: !spectrumId || !isAuthenticated,
  });

  // Get organization members
  const { data: membersData, isLoading: membersLoading } =
    useGetOrganizationMembersQuery(organization?.rsi_org_id || '', {
      skip: !organization?.rsi_org_id || !user,
    });

  // Show loading state
  if (authLoading || orgLoading || membersLoading) {
    return fallback || <RouteLoadingSpinner />;
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  // Check if organization exists
  if (orgError || !organization) {
    return (
      <UnauthorizedPage
        title='Organization Not Found'
        message="The organization you're looking for doesn't exist or you don't have access to it."
        actionButton={
          <Button
            variant='primary'
            onClick={() => (window.location.href = '/organizations')}
          >
            Browse Organizations
          </Button>
        }
      />
    );
  }

  // Check if user is a member of the organization
  const isMember = membersData?.some(
    (member: any) => member.user_id === user.id
  );

  // Check if user is the owner by comparing handles
  const isOwner = organization.owner_handle === user.rsi_handle;

  if (!isMember && !isOwner) {
    return (
      <UnauthorizedPage
        title='Access Denied'
        message='You must be a member of this organization to access this page.'
        actionButton={
          <Button
            variant='primary'
            onClick={() =>
              (window.location.href = `/organizations/${spectrumId}`)
            }
          >
            View Organization
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

// 3. RequireOrganizationRole - Pages that require having a certain org role/permission
interface RequireOrganizationRoleProps extends BaseRouteGuardProps {
  requiredRole?: OrganizationRole;
  requiredRoles?: OrganizationRole[];
  allowOwner?: boolean; // Whether organization owner automatically has access
}

export const RequireOrganizationRole: React.FC<
  RequireOrganizationRoleProps
> = ({
  children,
  fallback,
  requiredRole,
  requiredRoles = [],
  allowOwner = true,
}) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { spectrumId } = useParams<{ spectrumId: string }>();

  // Combine single role with roles array
  const allRequiredRoles = requiredRole
    ? [requiredRole, ...requiredRoles]
    : requiredRoles;

  // Get organization data
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
  } = useGetOrganizationQuery(spectrumId || '', {
    skip: !spectrumId || !isAuthenticated,
  });

  // Get organization members
  const { data: membersData, isLoading: membersLoading } =
    useGetOrganizationMembersQuery(organization?.rsi_org_id || '', {
      skip: !organization?.rsi_org_id || !user,
    });

  // Show loading state
  if (authLoading || orgLoading || membersLoading) {
    return fallback || <RouteLoadingSpinner />;
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  // Check if organization exists
  if (orgError || !organization) {
    return (
      <UnauthorizedPage
        title='Organization Not Found'
        message="The organization you're looking for doesn't exist or you don't have access to it."
        actionButton={
          <Button
            variant='primary'
            onClick={() => (window.location.href = '/organizations')}
          >
            Browse Organizations
          </Button>
        }
      />
    );
  }

  // Check if user is the owner (and owner access is allowed)
  const isOwner = organization.owner_handle === user.rsi_handle;
  if (allowOwner && isOwner) {
    return <>{children}</>;
  }

  // Find user's membership and role
  const userMembership = membersData?.find(
    (member: any) => member.user_id === user.id
  );

  if (!userMembership) {
    return (
      <UnauthorizedPage
        title='Access Denied'
        message='You must be a member of this organization to access this page.'
        actionButton={
          <Button
            variant='primary'
            onClick={() =>
              (window.location.href = `/organizations/${spectrumId}`)
            }
          >
            View Organization
          </Button>
        }
      />
    );
  }

  // Check if user has required role
  const userRole = userMembership.role?.name as OrganizationRole;
  const hasRequiredRole =
    allRequiredRoles.length === 0 || allRequiredRoles.includes(userRole);

  if (!hasRequiredRole) {
    const roleNames = allRequiredRoles.join(', ');
    return (
      <UnauthorizedPage
        title='Insufficient Permissions'
        message={`You need ${roleNames} role(s) to access this page. Your current role: ${userRole || 'member'}`}
        actionButton={
          <Button
            variant='primary'
            onClick={() =>
              (window.location.href = `/organizations/${spectrumId}`)
            }
          >
            Back to Organization
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

// 4. RequireRsiVerification - Pages that require RSI verification
export const RequireRsiVerification: React.FC<BaseRouteGuardProps> = ({
  children,
  fallback,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return fallback || <RouteLoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  if (!user.is_rsi_verified) {
    return (
      <UnauthorizedPage
        title='RSI Verification Required'
        message='You need to verify your RSI account to access this feature.'
        actionButton={
          <Button
            variant='primary'
            onClick={() => (window.location.href = '/profile')}
          >
            Verify RSI Account
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

// 5. Composite guard for common combinations
interface RequireAuthenticatedMemberProps extends BaseRouteGuardProps {
  requireRsiVerification?: boolean;
  requiredRole?: OrganizationRole;
  requiredRoles?: OrganizationRole[];
  allowOwner?: boolean;
}

export const RequireAuthenticatedMember: React.FC<
  RequireAuthenticatedMemberProps
> = ({
  children,
  fallback,
  requireRsiVerification = false,
  requiredRole,
  requiredRoles = [],
  allowOwner = true,
}) => {
  const content =
    requiredRole || requiredRoles.length > 0 ? (
      <RequireOrganizationRole
        {...(requiredRole && { requiredRole })}
        requiredRoles={requiredRoles}
        allowOwner={allowOwner}
        fallback={fallback}
      >
        {children}
      </RequireOrganizationRole>
    ) : (
      <RequireOrganizationMember fallback={fallback}>
        {children}
      </RequireOrganizationMember>
    );

  if (requireRsiVerification) {
    return (
      <RequireAuth fallback={fallback}>
        <RequireRsiVerification fallback={fallback}>
          {content}
        </RequireRsiVerification>
      </RequireAuth>
    );
  }

  return <RequireAuth fallback={fallback}>{content}</RequireAuth>;
};

// Export all guards
export default {
  RequireAuth,
  RequireOrganizationMember,
  RequireOrganizationRole,
  RequireRsiVerification,
  RequireAuthenticatedMember,
};
