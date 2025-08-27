export interface User {
  id: string;
  discord_id: string;
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

export interface CreateUserData {
  id?: string; // Optional, will be generated if not provided
  discord_id: string;
  avatar_url?: string | undefined;
  rsi_handle?: string; // Optional, will be generated if not provided
  avatar_source?: 'discord' | 'spectrum' | 'community_hub' | 'default';
}

export interface UpdateUserData {
  avatar_url?: string | undefined; // Direct URL to avatar image from any source
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
  email?: string;
}
