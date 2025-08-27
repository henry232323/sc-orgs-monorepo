export * from './user';
export * from './organization';
export * from './event';
export * from './comment';
export * from './invite';
export * from './stats';
export * from './event_review';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchFilters {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  language?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
