export interface HomePageStats {
  activeOrganizations: number;
  upcomingEvents: number;
  totalMembers: number;
  totalUpvotes: number;
  averageRating: number;
}

export interface OrganizationStats {
  totalUpvotes: number;
  totalMembers: number;
  totalEvents: number;
  averageRating: number;
  isActive: boolean;
  lastActivityAt?: Date;
}

export interface UserStats {
  totalOrganizations: number;
  totalEvents: number;
  totalUpvotes: number;
  averageRating: number;
  lastActivityAt?: Date;
}
