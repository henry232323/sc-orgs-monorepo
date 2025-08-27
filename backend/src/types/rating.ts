export interface OrganizationRating {
  id: string;
  organization_id: string;
  user_id: string;
  rating: number; // 1-5
  review?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRatingRequest {
  rating: number;
  review?: string;
}

export interface UpdateRatingRequest {
  rating?: number;
  review?: string;
}

export interface RatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
}

export interface UserRating {
  id: string;
  rating: number;
  review?: string;
  created_at: Date;
  organization: {
    id: string;
    name: string;
    rsi_org_id: string;
  };
}
