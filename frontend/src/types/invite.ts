export interface InviteCode {
  id: string;
  organization_id: string;
  created_by: string;
  code: string;
  role_id: string;
  role_name?: string; // Joined from organization_roles
  role_description?: string; // Joined from organization_roles
  permissions?: Record<string, any>;
  max_uses?: number;
  used_count: number;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInviteCodeData {
  organization_id: string;
  created_by: string;
  code: string;
  role_id: string;
  permissions?: Record<string, any>;
  max_uses?: number;
  expires_at?: Date;
}

export interface UpdateInviteCodeData {
  role_id?: string;
  permissions?: Record<string, any>;
  max_uses?: number;
  is_active?: boolean;
  expires_at?: Date;
}

export interface JoinOrganizationData {
  invite_code: string;
  user_id: string;
}
