import React, { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts?: number;
  /**
   * Initial delay in milliseconds
   */
  initialDelay?: number;
  /**
   * Multiplier for exponential backoff
   */
  backoffMultiplier?: number;
  /**
   * Maximum delay between retries in milliseconds
   */
  maxDelay?: number;
  /**
   * Whether to add jitter to prevent thundering herd
   */
  jitter?: boolean;
  /**
   * Function to determine if an error should trigger a retry
   */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /**
   * Callback called on each retry attempt
   */
  onRetry?: (attempt: number, error: any) => void;
  /**
   * Callback called when all retries are exhausted
   */
  onMaxAttemptsReached?: (error: any) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: any;
  canRetry: boolean;
}

/**
 * Hook for implementing retry logic with exponential backoff
 * Useful for handling failed API calls and other async operations
 */
export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = (error, attempt) => {
      // Default retry logic: retry on network errors and 5xx server errors
      if (attempt >= maxAttempts) return false;
      
      const status = error?.status || error?.code;
      
      // Don't retry on client errors (4xx) except for specific cases
      if (status >= 400 && status < 500) {
        // Retry on rate limiting and request timeout
        return status === 429 || status === 408;
      }
      
      // Retry on server errors (5xx) and network errors
      return status >= 500 || !status || error?.name === 'NetworkError';
    },
    onRetry,
    onMaxAttemptsReached,
  } = options;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
    canRetry: true,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const calculateDelay = useCallback((attempt: number): number => {
    let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    delay = Math.min(delay, maxDelay);
    
    if (jitter) {
      // Add random jitter (±25% of the delay)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 0);
  }, [initialDelay, backoffMultiplier, maxDelay, jitter]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 1,
          attempt,
          canRetry: attempt < maxAttempts,
        }));

        const result = await operation();
        
        // Success - reset state
        setState({
          isRetrying: false,
          attempt: 0,
          lastError: null,
          canRetry: true,
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        setState(prev => ({
          ...prev,
          lastError: error,
          canRetry: attempt < maxAttempts && shouldRetry(error, attempt),
        }));

        // Check if we should retry
        if (!shouldRetry(error, attempt)) {
          break;
        }

        // If this is not the last attempt, wait before retrying
        if (attempt < maxAttempts) {
          const delay = calculateDelay(attempt);
          
          onRetry?.(attempt, error);
          
          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, delay);
          });
        }
      }
    }

    // All retries exhausted
    setState(prev => ({
      ...prev,
      isRetrying: false,
      canRetry: false,
    }));

    onMaxAttemptsReached?.(lastError);
    throw lastError;
  }, [maxAttempts, shouldRetry, calculateDelay, onRetry, onMaxAttemptsReached]);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return executeWithRetry(operation);
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setState({
      isRetrying: false,
      attempt: 0,
      lastError: null,
      canRetry: true,
    });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    retry,
    reset,
    state,
    isRetrying: state.isRetrying,
    attempt: state.attempt,
    lastError: state.lastError,
    canRetry: state.canRetry,
  };
};

/**
 * Higher-order component that wraps RTK Query hooks with retry logic
 */
export const withRetry = <TArgs>(
  queryHook: (args: TArgs) => any,
  retryOptions?: RetryOptions
) => {
  return (args: TArgs) => {
    const queryResult = queryHook(args);
    const { retry, state } = useRetry(retryOptions);

    const retryQuery = useCallback(() => {
      return retry(() => queryResult.refetch().unwrap());
    }, [retry, queryResult.refetch]);

    return {
      ...queryResult,
      retry: retryQuery,
      retryState: state,
    };
  };
};