export interface PlayerReport {
  id: string;
  player_id: string;
  reporter_id: string;
  report_type: 'suspected_org' | 'suspected_alt' | 'behavior';
  title: string;
  description?: string;
  evidence_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlayerReportData {
  player_id: string;
  reporter_id: string;
  report_type: 'suspected_org' | 'suspected_alt' | 'behavior';
  title: string;
  description?: string;
  evidence_urls?: string[];
  status?: 'pending' | 'approved' | 'rejected' | 'disputed';
}

export interface UpdatePlayerReportData {
  title?: string;
  description?: string;
  evidence_urls?: string[];
  status?: 'pending' | 'approved' | 'rejected' | 'disputed';
}

export interface PlayerReportAttestation {
  id: string;
  report_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  comment?: string;
  created_at: Date;
}

export interface CreatePlayerReportAttestationData {
  report_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  comment?: string;
}

export interface PlayerComment {
  id: string;
  player_id: string;
  commenter_id: string;
  content: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlayerCommentData {
  player_id: string;
  commenter_id: string;
  content: string;
  is_public?: boolean;
}

export interface UpdatePlayerCommentData {
  content?: string;
  is_public?: boolean;
}

export interface PlayerCommentAttestation {
  id: string;
  comment_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  created_at: Date;
}

export interface CreatePlayerCommentAttestationData {
  comment_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
}

export interface PlayerTag {
  id: string;
  player_id: string;
  tagger_id: string;
  tag_name: string;
  tag_type: 'positive' | 'negative' | 'neutral';
  description?: string;
  created_at: Date;
}

export interface CreatePlayerTagData {
  player_id: string;
  tagger_id: string;
  tag_name: string;
  tag_type: 'positive' | 'negative' | 'neutral';
}

import { ScPlayer, PlayerHandleHistory, PlayerOrgHistory } from './sc_player';

export interface PlayerTagAttestation {
  id: string;
  tag_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
  created_at: Date;
}

export interface CreatePlayerTagAttestationData {
  tag_id: string;
  attester_id: string;
  attestation_type: 'support' | 'dispute' | 'neutral';
}

// Extended interfaces with related data
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
  score: number; // Calculated score based on attestations
}

export interface PlayerDetails {
  player: ScPlayer;
  handleHistory: PlayerHandleHistory[];
  orgHistory: PlayerOrgHistory[];
  tags: PlayerTagWithAttestations[];
  reports: PlayerReportWithAttestations[];
  organizationReports: PlayerReportWithAttestations[];
  altAccountReports: PlayerReportWithAttestations[];
  affiliatedPeopleReports: PlayerReportWithAttestations[];
  comments: PlayerCommentWithAttestations[];
  reputationScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export interface PlayerSearchQuery {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  orgs?: string[];
  sort?: 'recent' | 'reputation' | 'alphabetical';
}

export interface PlayerLookupRequest {
  handle: string;
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
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrganizationReportData {
  player_id: string;
  reporter_id: string;
  org_spectrum_id: string;
  description?: string;
  evidence_urls?: string[];
}

export interface OrganizationReportCorroboration {
  id: string;
  report_id: string;
  corroborator_id: string;
  corroboration_type: 'agree' | 'disagree' | 'neutral';
  comment?: string;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
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
}