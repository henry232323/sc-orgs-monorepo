import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGetOrganizationRolesQuery } from '../services/apiSlice';

interface PermissionHookResult {
  hasPermission: (permission: string) => boolean;
  userRole: any | null;
  isLoading: boolean;
  error: any;
}

export const usePermissions = (
  organizationId?: string
): PermissionHookResult => {
  const { user } = useAuth();

  const {
    data: roles,
    isLoading,
    error,
  } = useGetOrganizationRolesQuery(organizationId!, {
    skip: !organizationId || !user,
  });

  const userRole = useMemo(() => {
    if (!roles || !user) return null;

    // Find the user's role in this organization
    // This is a simplified version - in a real implementation, you'd need to
    // get the user's actual role from the members endpoint
    return roles.find((_role: any) => {
      // This would need to be implemented based on your actual data structure
      // For now, we'll return null and let the backend handle permission checks
      return false;
    });
  }, [roles, user]);

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!userRole || !userRole.permissions) return false;

      return userRole.permissions.some(
        (p: any) => p.permission === permission && p.granted
      );
    };
  }, [userRole]);

  return {
    hasPermission,
    userRole,
    isLoading,
    error,
  };
};

// Hook for checking specific permissions
export const useHasPermission = (
  organizationId: string,
  permission: string
): boolean => {
  const { hasPermission } = usePermissions(organizationId);
  return hasPermission(permission);
};

// Hook for checking if user can manage another user
export const useCanManageUser = (
  organizationId: string,
  _targetUserId: string
): boolean => {
  const { userRole } = usePermissions(organizationId);

  if (!userRole) return false;

  // This would need to be implemented based on your actual role ranking system
  // For now, we'll return false and let the backend handle the check
  return false;
};
