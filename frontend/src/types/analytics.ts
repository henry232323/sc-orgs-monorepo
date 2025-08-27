export interface ViewAnalytics {
  entity_type: string;
  entity_id: string;
  total_views: number;
  unique_views: number;
  views_by_date: Array<{
    date: string;
    unique_views: number;
  }>;
  recent_viewers?: Array<{
    user_id: string;
    rsi_handle: string;
    avatar_url?: string;
    viewed_at: string;
  }>;
}

export interface AnalyticsResponse {
  success: boolean;
  data: ViewAnalytics;
}

export interface BulkAnalyticsResponse {
  success: boolean;
  data: Record<string, ViewAnalytics>;
}
