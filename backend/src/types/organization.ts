export interface Organization {
  id: string;
  rsi_org_id: string;
  name: string;
  description?: string;
  banner_url?: string;
  icon_url?: string;
  headline?: string;
  is_registered: boolean;
  verification_sentinel?: string;
  owner_id: string;
  owner_handle?: string; // Discord username of the owner
  languages: string[];
  playstyle_tags?: string[];
  focus_tags?: string[];
  total_upvotes: number;
  total_members: number;
  is_active: boolean;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
  discord?: string;
  location?: string;
  website?: string;
  discord_server_id?: string;
  discord_integration_enabled: boolean;
}

export interface CreateOrganizationData {
  rsi_org_id: string;
  name?: string; // Will be auto-populated from RSI
  description?: string; // Will be auto-populated from RSI
  banner_url?: string; // Will be auto-populated from RSI
  icon_url?: string; // Will be auto-populated from RSI
  headline?: string; // Will be auto-populated from RSI
  owner_id: string;
  languages?: string[];
  playstyle_tags?: string[];
  focus_tags?: string[];
  discord?: string;
  location?: string;
  website?: string;
  total_members?: number; // Will be auto-populated from RSI
  verification_sentinel?: string; // Will store the verification code
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  banner_url?: string;
  icon_url?: string;
  headline?: string;
  is_registered?: boolean;
  languages?: string[];
  playstyle_tags?: string[];
  focus_tags?: string[];
  is_active?: boolean;
  last_activity_at?: Date;
  discord?: string;
  location?: string;
  website?: string;
  discord_server_id?: string | null;
  discord_integration_enabled?: boolean;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  role_id?: string;
  is_active: boolean;
  joined_at: Date;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationUpvote {
  id: string;
  organization_id: string;
  user_id: string;
  created_at: Date;
}
