export interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventReviewWithUser extends EventReview {
  user: {
    username: string;
    avatar_url?: string;
  };
}

export interface CreateEventReviewData {
  rating: number;
  review_text?: string;
  is_anonymous?: boolean;
}

export interface EventReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface OrganizationRatingSummary {
  organization_id: string;
  average_event_rating: number;
  total_event_reviews: number;
  rating_breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recent_reviews: EventReviewWithUser[];
}

export interface ReviewEligibility {
  can_review: boolean;
  reason?: string;
  event_completed: boolean;
  user_attended: boolean;
  already_reviewed: boolean;
}
