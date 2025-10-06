export interface OrganizationRole {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  rank: number; // Higher rank = more permissions
  is_system_role: boolean; // System roles (Owner, Admin, Member) cannot be deleted
  is_editable: boolean; // Only the original owner role is not editable
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  permissions?: OrganizationPermission[];
}

export interface OrganizationPermission {
  id: string;
  role_id: string;
  permission: string;
  granted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleData {
  organization_id: string;
  name: string;
  description?: string;
  rank: number;
  permissions: readonly string[]; // Array of permission names to grant
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  rank?: number;
  permissions?: readonly string[]; // Array of permission names to grant
  is_active?: boolean;
}

export interface OrganizationMemberWithRole {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  role?: OrganizationRole;
  is_active: boolean;
  joined_at: Date;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
  // User information
  user?: {
    id: string;
    rsi_handle: string;
    avatar_url?: string;
    is_rsi_verified: boolean;
  };
}

// Available permissions for organizations
export const ORGANIZATION_PERMISSIONS = {
  // Organization management
  MANAGE_ORGANIZATION: 'manage_organization',
  UPDATE_ORGANIZATION: 'update_organization',
  DELETE_ORGANIZATION: 'delete_organization',

  // Member management
  MANAGE_MEMBERS: 'manage_members',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  VIEW_MEMBERS: 'view_members',

  // Role management
  MANAGE_ROLES: 'manage_roles',
  CREATE_ROLES: 'create_roles',
  UPDATE_ROLES: 'update_roles',
  DELETE_ROLES: 'delete_roles',
  ASSIGN_ROLES: 'assign_roles',

  // Event management
  MANAGE_EVENTS: 'manage_events',
  CREATE_EVENTS: 'create_events',
  UPDATE_EVENTS: 'update_events',
  DELETE_EVENTS: 'delete_events',

  // Comment management
  MANAGE_COMMENTS: 'manage_comments',
  MODERATE_COMMENTS: 'moderate_comments',
  DELETE_COMMENTS: 'delete_comments',

  // Integration management
  MANAGE_INTEGRATIONS: 'manage_integrations',
  UPDATE_RSI_INTEGRATION: 'update_rsi_integration',
  UPDATE_DISCORD_INTEGRATION: 'update_discord_integration',

  // Analytics and reporting
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REPORTS: 'view_reports',

  // HR Management permissions
  HR_MANAGER: 'hr_manager',
  HR_RECRUITER: 'hr_recruiter',
  HR_SUPERVISOR: 'hr_supervisor',
  
  // HR Application permissions
  MANAGE_HR_APPLICATIONS: 'manage_hr_applications',
  VIEW_HR_APPLICATIONS: 'view_hr_applications',
  PROCESS_HR_APPLICATIONS: 'process_hr_applications',
  
  // HR Onboarding permissions
  MANAGE_HR_ONBOARDING: 'manage_hr_onboarding',
  VIEW_HR_ONBOARDING: 'view_hr_onboarding',
  CREATE_ONBOARDING_TEMPLATES: 'create_onboarding_templates',
  
  // HR Performance permissions
  MANAGE_HR_PERFORMANCE: 'manage_hr_performance',
  VIEW_HR_PERFORMANCE: 'view_hr_performance',
  CONDUCT_PERFORMANCE_REVIEWS: 'conduct_performance_reviews',
  
  // HR Skills permissions
  MANAGE_HR_SKILLS: 'manage_hr_skills',
  VIEW_HR_SKILLS: 'view_hr_skills',
  VERIFY_SKILLS: 'verify_skills',
  
  // HR Documents permissions
  MANAGE_HR_DOCUMENTS: 'manage_hr_documents',
  VIEW_HR_DOCUMENTS: 'view_hr_documents',
  UPLOAD_HR_DOCUMENTS: 'upload_hr_documents',
  
  // HR Analytics permissions
  VIEW_HR_ANALYTICS: 'view_hr_analytics',
  MANAGE_HR_ANALYTICS: 'manage_hr_analytics',
} as const;

export type OrganizationPermissionType =
  (typeof ORGANIZATION_PERMISSIONS)[keyof typeof ORGANIZATION_PERMISSIONS];

// Default role configurations
export const DEFAULT_ROLE_CONFIGS = {
  OWNER: {
    name: 'Owner',
    description: 'Full control over the organization',
    rank: 100,
    is_system_role: true,
    is_editable: false,
    permissions: Object.values(ORGANIZATION_PERMISSIONS),
  },
  ADMIN: {
    name: 'Admin',
    description: 'Administrative privileges with most permissions',
    rank: 80,
    is_system_role: true,
    is_editable: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.MANAGE_ORGANIZATION,
      ORGANIZATION_PERMISSIONS.UPDATE_ORGANIZATION,
      ORGANIZATION_PERMISSIONS.MANAGE_MEMBERS,
      ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
      ORGANIZATION_PERMISSIONS.REMOVE_MEMBERS,
      ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
      ORGANIZATION_PERMISSIONS.MANAGE_ROLES,
      ORGANIZATION_PERMISSIONS.CREATE_ROLES,
      ORGANIZATION_PERMISSIONS.UPDATE_ROLES,
      ORGANIZATION_PERMISSIONS.DELETE_ROLES,
      ORGANIZATION_PERMISSIONS.ASSIGN_ROLES,
      ORGANIZATION_PERMISSIONS.MANAGE_EVENTS,
      ORGANIZATION_PERMISSIONS.CREATE_EVENTS,
      ORGANIZATION_PERMISSIONS.UPDATE_EVENTS,
      ORGANIZATION_PERMISSIONS.DELETE_EVENTS,
      ORGANIZATION_PERMISSIONS.MANAGE_COMMENTS,
      ORGANIZATION_PERMISSIONS.MODERATE_COMMENTS,
      ORGANIZATION_PERMISSIONS.DELETE_COMMENTS,
      ORGANIZATION_PERMISSIONS.MANAGE_INTEGRATIONS,
      ORGANIZATION_PERMISSIONS.UPDATE_RSI_INTEGRATION,
      ORGANIZATION_PERMISSIONS.UPDATE_DISCORD_INTEGRATION,
      ORGANIZATION_PERMISSIONS.VIEW_ANALYTICS,
      ORGANIZATION_PERMISSIONS.VIEW_REPORTS,
    ],
  },
  MEMBER: {
    name: 'Member',
    description: 'Basic member with limited permissions',
    rank: 10,
    is_system_role: true,
    is_editable: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
      ORGANIZATION_PERMISSIONS.CREATE_EVENTS,
      ORGANIZATION_PERMISSIONS.UPDATE_EVENTS,
    ],
  },
  HR_MANAGER: {
    name: 'HR Manager',
    description: 'Full HR management privileges with access to all HR functions',
    rank: 70,
    is_system_role: false,
    is_editable: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.HR_MANAGER,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.PROCESS_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_ONBOARDING,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ONBOARDING,
      ORGANIZATION_PERMISSIONS.CREATE_ONBOARDING_TEMPLATES,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_PERFORMANCE,
      ORGANIZATION_PERMISSIONS.VIEW_HR_PERFORMANCE,
      ORGANIZATION_PERMISSIONS.CONDUCT_PERFORMANCE_REVIEWS,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_SKILLS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_SKILLS,
      ORGANIZATION_PERMISSIONS.VERIFY_SKILLS,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_DOCUMENTS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_DOCUMENTS,
      ORGANIZATION_PERMISSIONS.UPLOAD_HR_DOCUMENTS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_ANALYTICS,
      ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
      ORGANIZATION_PERMISSIONS.VIEW_ANALYTICS,
    ],
  },
  RECRUITER: {
    name: 'Recruiter',
    description: 'Recruitment and application management privileges',
    rank: 50,
    is_system_role: false,
    is_editable: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.HR_RECRUITER,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.PROCESS_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ONBOARDING,
      ORGANIZATION_PERMISSIONS.VIEW_HR_SKILLS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_DOCUMENTS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS,
      ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
      ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
    ],
  },
  SUPERVISOR: {
    name: 'Supervisor',
    description: 'Team supervision with performance and onboarding management',
    rank: 40,
    is_system_role: false,
    is_editable: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.HR_SUPERVISOR,
      ORGANIZATION_PERMISSIONS.VIEW_HR_APPLICATIONS,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_ONBOARDING,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ONBOARDING,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_PERFORMANCE,
      ORGANIZATION_PERMISSIONS.VIEW_HR_PERFORMANCE,
      ORGANIZATION_PERMISSIONS.CONDUCT_PERFORMANCE_REVIEWS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_SKILLS,
      ORGANIZATION_PERMISSIONS.VERIFY_SKILLS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_DOCUMENTS,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS,
      ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
    ],
  },
} as const;
