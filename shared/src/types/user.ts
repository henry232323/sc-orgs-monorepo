export interface User {
  id: string;
  discord_id: string;
  rsi_handle: string; // Primary display identifier
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserVerification {
  id: string;
  user_id: string;
  rsi_handle?: string;
  spectrum_id?: string;
  verification_code: string;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile extends User {
  verification: UserVerification;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export interface UserPermissions {
  can_create_orgs: boolean;
  can_manage_orgs: boolean;
  can_moderate: boolean;
  can_admin: boolean;
}
