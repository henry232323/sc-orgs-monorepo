// Generic list response type for consistent API responses
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Re-export main types
export * from './user';
export * from './organization';
export * from './event';
export * from './comment';
export * from './invite';
export * from './notification';
export * from './rating';
export * from './stats';
export * from './event_review';
