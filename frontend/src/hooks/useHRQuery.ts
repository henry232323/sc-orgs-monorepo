import { useCallback } from 'react';
import { 
  useGetHRAnalyticsQuery,
  useGetHRActivitiesQuery,
  useGetSkillsStatisticsQuery,
  useGetDocumentAcknowledmentStatusQuery,
} from '../services/apiSlice';
import { useRetry } from './useRetry';

/**
 * Enhanced HR Analytics query with retry functionality
 */
export const useHRAnalyticsWithRetry = (params: {
  organizationId: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryResult = useGetHRAnalyticsQuery(params);
  const { retry, state } = useRetry({
    maxAttempts: 3,
    initialDelay: 1000,
    shouldRetry: (error, attempt) => {
      // Retry on network errors and server errors
      const status = error?.status;
      return attempt < 3 && (!status || status >= 500 || status === 429);
    },
    onRetry: (attempt, error) => {
      console.log(`HR Analytics retry attempt ${attempt}:`, error);
    },
  });

  const retryQuery = useCallback(() => {
    return retry(() => queryResult.refetch().unwrap());
  }, [retry, queryResult.refetch]);

  return {
    ...queryResult,
    retry: retryQuery,
    retryState: state,
    isRetrying: state.isRetrying,
    canRetry: state.canRetry,
  };
};

/**
 * Enhanced HR Activities query with retry functionality
 */
export const useHRActivitiesWithRetry = (params: {
  organizationId: string;
  page?: number;
  limit?: number;
  activityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}) => {
  const queryResult = useGetHRActivitiesQuery(params);
  const { retry, state } = useRetry({
    maxAttempts: 3,
    initialDelay: 1000,
    shouldRetry: (error, attempt) => {
      const status = error?.status;
      return attempt < 3 && (!status || status >= 500 || status === 429);
    },
    onRetry: (attempt, error) => {
      console.log(`HR Activities retry attempt ${attempt}:`, error);
    },
  });

  const retryQuery = useCallback(() => {
    return retry(() => queryResult.refetch().unwrap());
  }, [retry, queryResult.refetch]);

  return {
    ...queryResult,
    retry: retryQuery,
    retryState: state,
    isRetrying: state.isRetrying,
    canRetry: state.canRetry,
  };
};

/**
 * Enhanced Skills Statistics query with retry functionality
 */
export const useSkillsStatisticsWithRetry = (params: {
  organizationId: string;
}) => {
  const queryResult = useGetSkillsStatisticsQuery(params);
  const { retry, state } = useRetry({
    maxAttempts: 3,
    initialDelay: 1500, // Slightly longer delay for statistics
    shouldRetry: (error, attempt) => {
      const status = error?.status;
      return attempt < 3 && (!status || status >= 500 || status === 429);
    },
    onRetry: (attempt, error) => {
      console.log(`Skills Statistics retry attempt ${attempt}:`, error);
    },
  });

  const retryQuery = useCallback(() => {
    return retry(() => queryResult.refetch().unwrap());
  }, [retry, queryResult.refetch]);

  return {
    ...queryResult,
    retry: retryQuery,
    retryState: state,
    isRetrying: state.isRetrying,
    canRetry: state.canRetry,
  };
};

/**
 * Enhanced Document Acknowledgment query with retry functionality
 */
export const useDocumentAcknowledmentWithRetry = (params: {
  organizationId: string;
  documentId: string;
}) => {
  const queryResult = useGetDocumentAcknowledmentStatusQuery(params);
  const { retry, state } = useRetry({
    maxAttempts: 2, // Fewer retries for acknowledgment status
    initialDelay: 800,
    shouldRetry: (error, attempt) => {
      const status = error?.status;
      // Don't retry on 404 (document not found) or 403 (no permission)
      if (status === 404 || status === 403) return false;
      return attempt < 2 && (!status || status >= 500 || status === 429);
    },
    onRetry: (attempt, error) => {
      console.log(`Document Acknowledgment retry attempt ${attempt}:`, error);
    },
  });

  const retryQuery = useCallback(() => {
    return retry(() => queryResult.refetch().unwrap());
  }, [retry, queryResult.refetch]);

  return {
    ...queryResult,
    retry: retryQuery,
    retryState: state,
    isRetrying: state.isRetrying,
    canRetry: state.canRetry,
  };
};

/**
 * Generic HR query wrapper with retry functionality
 * Can be used with any RTK Query hook
 */
export const useHRQueryWithRetry = <TArgs>(
  queryHook: (args: TArgs) => any,
  args: TArgs,
  retryOptions?: {
    maxAttempts?: number;
    initialDelay?: number;
    shouldRetry?: (error: any, attempt: number) => boolean;
  }
) => {
  const queryResult = queryHook(args);
  const { retry, state } = useRetry({
    maxAttempts: retryOptions?.maxAttempts || 3,
    initialDelay: retryOptions?.initialDelay || 1000,
    shouldRetry: retryOptions?.shouldRetry || ((error, attempt) => {
      const status = error?.status;
      return attempt < 3 && (!status || status >= 500 || status === 429);
    }),
    onRetry: (attempt, error) => {
      console.log(`HR Query retry attempt ${attempt}:`, error);
    },
  });

  const retryQuery = useCallback(() => {
    return retry(() => queryResult.refetch().unwrap());
  }, [retry, queryResult.refetch]);

  return {
    ...queryResult,
    retry: retryQuery,
    retryState: state,
    isRetrying: state.isRetrying,
    canRetry: state.canRetry,
  };
};