export interface User {
  id: string;
  discord_id: string;
  discord_avatar?: string; // Discord avatar hash
  avatar_url?: string; // Direct URL to avatar image from any source
  rsi_handle: string; // Non-null, primary display identifier
  spectrum_id?: string;
  avatar_source?: 'discord' | 'spectrum' | 'community_hub' | 'default';
  is_rsi_verified: boolean;
  verification_code?: string;
  verification_code_expires_at?: Date;
  is_active: boolean;
  last_login_at?: Date;
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

export interface CreateUserData {
  id?: string;
  discord_id: string;
  avatar_url?: string | undefined;
  rsi_handle?: string;
  avatar_source?: 'discord' | 'spectrum' | 'community_hub' | 'default';
}

export interface UpdateUserData {
  avatar_url?: string | undefined;
  rsi_handle?: string;
  spectrum_id?: string;
  avatar_source?: 'discord' | 'spectrum' | 'community_hub' | 'default';
  is_rsi_verified?: boolean;
  verification_code?: string;
  verification_code_expires_at?: Date;
  is_active?: boolean;
  last_login_at?: Date;
}

export interface UserVerificationData {
  rsi_handle: string;
  verification_code: string;
}

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
}
