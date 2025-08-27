export interface ScPlayer {
  id: string;
  spectrum_id: string;
  current_handle: string;
  current_display_name?: string;
  first_observed_at: Date;
  last_observed_at: Date;
  last_spectrum_sync_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateScPlayerData {
  spectrum_id: string;
  current_handle: string;
  current_display_name?: string;
  first_observed_at?: Date;
  last_observed_at?: Date;
  last_spectrum_sync_at?: Date;
  is_active?: boolean;
}

export interface UpdateScPlayerData {
  current_handle?: string;
  current_display_name?: string;
  last_observed_at?: Date;
  last_spectrum_sync_at?: Date;
  is_active?: boolean;
}

export interface PlayerHandleHistory {
  id: string;
  player_id: string;
  handle: string;
  display_name?: string;
  first_observed_at: Date;
  last_observed_at: Date;
  created_at: Date;
}

export interface PlayerOrgHistory {
  id: string;
  player_id: string;
  org_name: string;
  org_spectrum_id?: string;
  role?: string;
  first_observed_at: Date;
  last_observed_at: Date;
  is_current: boolean;
  created_at: Date;
}

export interface CreatePlayerHandleHistoryData {
  player_id: string;
  handle: string;
  display_name?: string;
  first_observed_at?: Date;
  last_observed_at?: Date;
}

export interface CreatePlayerOrgHistoryData {
  player_id: string;
  org_name: string;
  org_spectrum_id?: string;
  role?: string;
  first_observed_at?: Date;
  last_observed_at?: Date;
  is_current?: boolean;
}