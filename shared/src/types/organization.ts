export interface Organization {
  id: string;
  rsi_org_id: string;
  name: string;
  description?: string;
  banner_url?: string;
  icon_url?: string;
  headline?: string;
  is_verified: boolean;
  is_registered: boolean;
  verification_sentinel?: string;
  owner_id: string;
  language?: string;
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
  is_public: boolean;
}

export interface OrganizationVerification {
  id: string;
  organization_id: string;
  verification_code: string;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: Date;
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
  id: string;
  organization_id: string;
  tag_type: TagType;
  value: string;
  created_at: Date;
}

export enum TagType {
  LANGUAGE = 'language',
  PLAYSTYLE = 'playstyle',
  FOCUS = 'focus',
  SIZE = 'size',
  ACTIVITY = 'activity',
}

export interface OrganizationWithDetails extends Organization {
  verification: OrganizationVerification;
  members: OrganizationMember[];
  tags: OrganizationTag[];
  member_count: number;
}
