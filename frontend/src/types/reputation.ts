// Star Citizen Player types
export interface ScPlayer {
  id: string;
  spectrum_id: string;
  current_handle: string;
  current_display_name?: string;
  first_observed_at: string;
  last_observed_at: string;
  last_spectrum_sync_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerHandleHistory {
  id: string;
  player_id: string;
  handle: string;
  display_name?: string;
  first_observed_at: string;
  last_observed_at: string;
  created_at: string;
}

export interface PlayerOrgHistory {
  id: string;
  player_id: string;
  org_name: string;
  org_id?: string;
  role?: string;
  first_observed_at: string;
  last_observed_at: string;
  created_at: string;
}

// Reputation system types
export interface PlayerReport {
  id: string;
  player_id: string;
  reporter_id: string;
  report_type: 'affiliated_org' | 'alt_account' | 'behavior' | 'other';
  title: string;
  description: string;
  evidence_urls?: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerReportAttestation {
  id: string;
  report_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  comment?: string;
  player_id?: string; // Added for cache invalidation
  created_at: string;
}

export interface PlayerComment {
  id: string;
  player_id: string;
  commenter_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerCommentAttestation {
  id: string;
  comment_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  player_id?: string; // Added for cache invalidation
  created_at: string;
}

export interface PlayerTag {
  id: string;
  player_id: string;
  tagger_id: string;
  tag_name: string;
  tag_type: 'positive' | 'negative' | 'neutral';
  description?: string;
  created_at: string;
}

export interface PlayerTagAttestation {
  id: string;
  tag_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  player_id?: string; // Added for cache invalidation
  created_at: string;
}

// Extended types with attestations
export interface PlayerReportWithAttestations extends PlayerReport {
  attestations: PlayerReportAttestation[];
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}

export interface PlayerCommentWithAttestations extends PlayerComment {
  attestations: PlayerCommentAttestation[];
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}

export interface PlayerTagWithAttestations extends PlayerTag {
  attestations: PlayerTagAttestation[];
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}

export interface PlayerDetails {
  player: ScPlayer;
  handleHistory: PlayerHandleHistory[];
  orgHistory: PlayerOrgHistory[];
  tags: PlayerTagWithAttestations[];
  reports: PlayerReportWithAttestations[];
  organizationReports: OrganizationReportWithCorroborations[];
  altAccountReports: AltAccountReportWithCorroborations[];
  affiliatedPeopleReports: AffiliatedPeopleReportWithCorroborations[];
  comments: PlayerCommentWithAttestations[];
  reputationScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

// Request/Response types
export interface PlayerSearchQuery {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  orgs?: string[];
  sort?: 'recent' | 'reputation' | 'alphabetical';
}

export interface PlayerSearchResponse {
  players: ScPlayer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PlayerSearchByHandleResponse {
  users: (ScPlayer & { matchType: 'current' | 'historical' | 'spectrum' })[];
  total: number;
  searchTerm: string;
  currentCount: number;
  historicalCount: number;
  spectrumCount: number;
}

export interface PlayerLookupRequest {
  handle: string;
}

export interface CreatePlayerReportData {
  player_id: string;
  report_type: 'affiliated_org' | 'alt_account' | 'behavior' | 'other';
  title: string;
  description: string;
  evidence_urls?: string[];
  is_public: boolean;
}

export interface CreatePlayerCommentData {
  player_id: string;
  content: string;
  is_public: boolean;
}

export interface CreatePlayerTagData {
  player_id: string;
  tag_name: string;
  tag_type: 'positive' | 'negative' | 'neutral';
}

export interface AttestReportRequest {
  attestation_type: 'support' | 'dispute' | 'neutral';
  comment?: string;
}

export interface AttestCommentRequest {
  attestation_type: 'support' | 'dispute' | 'neutral';
}

export interface AttestTagRequest {
  attestation_type: 'support' | 'dispute' | 'neutral';
}

// Enhanced Reporting System Types

// Organization Reports
export interface OrganizationReport {
  id: string;
  player_id: string;
  reporter_id: string;
  org_spectrum_id: string;
  org_name?: string;
  description?: string;
  evidence_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  corroboration_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationReportData {
  player_id: string;
  reporter_id: string;
  org_spectrum_id: string;
  org_name?: string;
  description?: string;
  evidence_urls?: string[];
}

export interface OrganizationReportCorroboration {
  id: string;
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
  created_at: string;
  player_id?: string; // Added for cache invalidation
}

export interface CreateOrganizationReportCorroborationData {
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
}

export interface OrganizationReportWithCorroborations extends OrganizationReport {
  corroborations: OrganizationReportCorroboration[];
  corroboration_counts: {
    agree: number;
    disagree: number;
    neutral: number;
  };
  // Additional properties for frontend compatibility
  title: string;
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}

// Alt Account Reports
export interface AltAccountReport {
  id: string;
  main_player_id: string;
  reporter_id: string;
  alt_handle: string;
  alt_spectrum_id?: string;
  alt_display_name?: string;
  description?: string;
  evidence_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  corroboration_count: number;
  created_at: string;
  updated_at: string;
  player_id?: string; // Added for cache invalidation
}

export interface CreateAltAccountReportData {
  main_player_id: string;
  reporter_id: string;
  alt_handle: string;
  description?: string;
  evidence_urls?: string[];
}

export interface AltAccountReportCorroboration {
  id: string;
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
  created_at: string;
  player_id?: string; // Added for cache invalidation
}

export interface CreateAltAccountReportCorroborationData {
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
}

export interface AltAccountReportWithCorroborations extends AltAccountReport {
  corroborations: AltAccountReportCorroboration[];
  corroboration_counts: {
    agree: number;
    disagree: number;
    neutral: number;
  };
  // Additional properties for frontend compatibility
  title: string;
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}

// Affiliated People Reports
export interface AffiliatedPeopleReport {
  id: string;
  main_player_id: string;
  reporter_id: string;
  affiliated_handle: string;
  affiliated_spectrum_id?: string;
  affiliated_display_name?: string;
  relationship_type?: string;
  description?: string;
  evidence_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  corroboration_count: number;
  created_at: string;
  updated_at: string;
  player_id?: string; // Added for cache invalidation
}

export interface CreateAffiliatedPeopleReportData {
  main_player_id: string;
  reporter_id: string;
  affiliated_handle: string;
  relationship_type?: string;
  description?: string;
  evidence_urls?: string[];
}

export interface AffiliatedPeopleReportCorroboration {
  id: string;
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
  created_at: string;
  player_id?: string; // Added for cache invalidation
}

export interface CreateAffiliatedPeopleReportCorroborationData {
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
}

export interface AffiliatedPeopleReportWithCorroborations extends AffiliatedPeopleReport {
  corroborations: AffiliatedPeopleReportCorroboration[];
  corroboration_counts: {
    agree: number;
    disagree: number;
    neutral: number;
  };
  // Additional properties for frontend compatibility
  title: string;
  attestation_counts: {
    support: number;
    dispute: number;
    neutral: number;
  };
}