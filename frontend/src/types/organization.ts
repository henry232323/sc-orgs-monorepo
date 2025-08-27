export interface Organization {
  rsi_org_id: string;
  spectrum_id?: string; // Alias for rsi_org_id for consistency
  name: string;
  description?: string;
  banner_url?: string;
  icon_url?: string;
  headline?: string;
  rsi_page_url?: string;
  website?: string;
  discord?: string;
  location?: string;
  max_members?: number;
  is_verified: boolean;
  is_registered: boolean;
  verification_sentinel?: string;
  owner_handle?: string; // Discord username of the owner
  languages: string[];
  playstyle_tags: string[];
  focus_tags: string[];
  total_upvotes: number;
  total_members: number;
  is_active: boolean;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
  // User-specific fields (present when fetched from user organization endpoints)
  role_name?: string;
  is_owner?: boolean;
  joined_at?: string;
  is_hidden?: boolean;
}

export interface OrganizationVerification {
  rsi_org_id: string; // Use public ID instead of internal ID
  verification_code: string;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMember {
  rsi_org_id: string; // Use public org ID
  user_id: string; // Keep user ID as it's needed for functionality
  role: OrganizationRole;
  permissions?: Record<string, any>;
  is_active: boolean;
  joined_at: Date;
  last_activity_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export interface OrganizationTag {
  rsi_org_id: string; // Use public org ID
  tag_type: TagType;
  value: string;
  created_at: Date;
}

export enum TagType {
  LANGUAGES = 'languages',
  PLAYSTYLE = 'playstyle',
  FOCUS = 'focus',
  SIZE = 'size',
  ACTIVITY = 'activity',
}

export interface OrganizationWithDetails extends Organization {
  verification: OrganizationVerification;
  members: OrganizationMember[];
  tags: string[]; // Keep as string[] to match base interface
  organization_tags?: OrganizationTag[]; // Add detailed tags as separate property
  member_count: number;
}

export interface CreateOrganizationData {
  rsi_org_id: string;
  name?: string; // Will be auto-populated from RSI
  description?: string; // Will be auto-populated from RSI
  banner_url?: string; // Will be auto-populated from RSI
  icon_url?: string; // Will be auto-populated from RSI
  headline?: string; // Will be auto-populated from RSI
  website?: string;
  discord?: string;
  location?: string;
  languages?: string[];
  playstyle_tags?: string[];
  focus_tags?: string[];
}

export interface UpdateOrganizationData
  extends Partial<CreateOrganizationData> {
  icon_url?: string;
  is_verified?: boolean;
  is_registered?: boolean;
  is_active?: boolean;
  last_activity_at?: Date;
}
