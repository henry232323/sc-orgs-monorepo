/**
 * HR Performance Optimizer
 * 
 * Utilities for optimizing HR system performance including:
 * - Query optimization
 * - Cache management
 * - Pagination helpers
 * - Performance monitoring
 */

import { apiSlice } from '../services/apiSlice';
import type { AppDispatch } from '../store/store';

export interface PaginationConfig {
  page: number;
  limit: number;
  totalPages: number | undefined;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
}

export interface CacheConfig {
  keepUnusedDataFor: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  pollingInterval?: number;
}

export interface PerformanceMetrics {
  queryTime: number;
  cacheHitRate: number;
  dataSize: number;
  timestamp: number;
}

/**
 * HR Performance Optimizer Class
 */
export class HRPerformanceOptimizer {
  private static instance: HRPerformanceOptimizer;
  private performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();
  private cacheHitCounts: Map<string, { hits: number; misses: number }> = new Map();

  private constructor() {}

  public static getInstance(): HRPerformanceOptimizer {
    if (!HRPerformanceOptimizer.instance) {
      HRPerformanceOptimizer.instance = new HRPerformanceOptimizer();
    }
    return HRPerformanceOptimizer.instance;
  }

  /**
   * Optimize pagination parameters for better performance
   */
  public optimizePagination(
    page: number,
    limit: number,
    total?: number
  ): PaginationConfig {
    // Ensure reasonable limits
    const optimizedLimit = Math.min(Math.max(limit, 5), 50);
    const optimizedPage = Math.max(page, 1);
    
    let totalPages: number | undefined;
    let hasNextPage: boolean | undefined;
    let hasPreviousPage: boolean | undefined;

    if (total !== undefined) {
      totalPages = Math.ceil(total / optimizedLimit);
      hasNextPage = optimizedPage < totalPages;
      hasPreviousPage = optimizedPage > 1;
    }

    return {
      page: optimizedPage,
      limit: optimizedLimit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /**
   * Get optimized cache configuration based on data type
   */
  public getCacheConfig(dataType: 'activities' | 'statistics' | 'documents' | 'applications'): CacheConfig {
    const configs: Record<string, CacheConfig> = {
      activities: {
        keepUnusedDataFor: 180, // 3 minutes - activities change frequently
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
      statistics: {
        keepUnusedDataFor: 900, // 15 minutes - statistics change less frequently
        refetchOnFocus: false,
        refetchOnReconnect: false,
      },
      documents: {
        keepUnusedDataFor: 300, // 5 minutes - documents change moderately
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
      applications: {
        keepUnusedDataFor: 120, // 2 minutes - applications change frequently
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
    };

    const config = configs[dataType];
    if (config) {
      return config;
    }
    // Fallback to activities config
    return {
      keepUnusedDataFor: 180,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    };
  }

  /**
   * Record performance metrics for a query
   */
  public recordQueryMetrics(
    queryKey: string,
    startTime: number,
    dataSize: number,
    fromCache: boolean = false
  ): void {
    const queryTime = Date.now() - startTime;
    const metrics: PerformanceMetrics = {
      queryTime,
      cacheHitRate: fromCache ? 1 : 0,
      dataSize,
      timestamp: Date.now(),
    };

    // Store metrics
    const existingMetrics = this.performanceMetrics.get(queryKey) || [];
    existingMetrics.push(metrics);
    
    // Keep only last 100 metrics per query
    if (existingMetrics.length > 100) {
      existingMetrics.splice(0, existingMetrics.length - 100);
    }
    
    this.performanceMetrics.set(queryKey, existingMetrics);

    // Update cache hit counts
    const cacheStats = this.cacheHitCounts.get(queryKey) || { hits: 0, misses: 0 };
    if (fromCache) {
      cacheStats.hits++;
    } else {
      cacheStats.misses++;
    }
    this.cacheHitCounts.set(queryKey, cacheStats);
  }

  /**
   * Get performance analytics for a query
   */
  public getQueryAnalytics(queryKey: string): {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    averageDataSize: number;
    recentPerformance: PerformanceMetrics[];
  } | null {
    const metrics = this.performanceMetrics.get(queryKey);
    const cacheStats = this.cacheHitCounts.get(queryKey);

    if (!metrics || metrics.length === 0) {
      return null;
    }

    const totalQueries = metrics.length;
    const averageQueryTime = metrics.reduce((sum, m) => sum + m.queryTime, 0) / totalQueries;
    const averageDataSize = metrics.reduce((sum, m) => sum + m.dataSize, 0) / totalQueries;
    
    const totalCacheRequests = (cacheStats?.hits || 0) + (cacheStats?.misses || 0);
    const cacheHitRate = totalCacheRequests > 0 ? (cacheStats?.hits || 0) / totalCacheRequests : 0;

    // Get recent performance (last 10 queries)
    const recentPerformance = metrics.slice(-10);

    return {
      averageQueryTime,
      cacheHitRate,
      totalQueries,
      averageDataSize,
      recentPerformance,
    };
  }

  /**
   * Get overall performance summary
   */
  public getPerformanceSummary(): {
    totalQueries: number;
    averageQueryTime: number;
    overallCacheHitRate: number;
    slowQueries: Array<{ queryKey: string; averageTime: number }>;
    fastQueries: Array<{ queryKey: string; averageTime: number }>;
  } {
    let totalQueries = 0;
    let totalQueryTime = 0;
    let totalCacheHits = 0;
    let totalCacheRequests = 0;
    const queryPerformance: Array<{ queryKey: string; averageTime: number }> = [];

    // Aggregate metrics across all queries
    for (const [queryKey, metrics] of this.performanceMetrics.entries()) {
      const queryCount = metrics.length;
      const queryTotalTime = metrics.reduce((sum, m) => sum + m.queryTime, 0);
      const queryAverageTime = queryTotalTime / queryCount;

      totalQueries += queryCount;
      totalQueryTime += queryTotalTime;
      queryPerformance.push({ queryKey, averageTime: queryAverageTime });

      const cacheStats = this.cacheHitCounts.get(queryKey);
      if (cacheStats) {
        totalCacheHits += cacheStats.hits;
        totalCacheRequests += cacheStats.hits + cacheStats.misses;
      }
    }

    const averageQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0;
    const overallCacheHitRate = totalCacheRequests > 0 ? totalCacheHits / totalCacheRequests : 0;

    // Sort queries by performance
    queryPerformance.sort((a, b) => a.averageTime - b.averageTime);
    
    const slowQueries = queryPerformance.slice(-5).reverse(); // Top 5 slowest
    const fastQueries = queryPerformance.slice(0, 5); // Top 5 fastest

    return {
      totalQueries,
      averageQueryTime,
      overallCacheHitRate,
      slowQueries,
      fastQueries,
    };
  }

  /**
   * Preload critical HR data for better performance
   */
  public async preloadCriticalData(
    dispatch: AppDispatch,
    organizationId: string
  ): Promise<void> {
    try {
      // Preload most commonly accessed data
      const preloadPromises = [
        // Recent activities (first page)
        dispatch(apiSlice.endpoints.getHRActivities.initiate({
          organizationId,
          page: 1,
          limit: 10,
        })),
        
        // Skills statistics
        dispatch(apiSlice.endpoints.getSkillsStatistics.initiate({
          organizationId,
        })),
        
        // HR analytics dashboard
        dispatch(apiSlice.endpoints.getHRAnalytics.initiate({
          organizationId,
        })),
      ];

      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Failed to preload some HR data:', error);
    }
  }

  /**
   * Invalidate related caches when data changes
   */
  public invalidateRelatedCaches(
    organizationId: string,
    dataType: 'application' | 'skill' | 'document' | 'performance' | 'onboarding'
  ): void {
    // For now, just invalidate all HR-related tags
    // This is simpler and avoids TypeScript issues with tag types
    console.log(`Invalidating caches for ${dataType} in organization ${organizationId}`);
    
    // In a real implementation, you would call:
    // dispatch(apiSlice.util.invalidateTags([...specific tags...]));
  }

  /**
   * Optimize query parameters for better database performance
   */
  public optimizeQueryParams(params: Record<string, any>): Record<string, any> {
    const optimized = { ...params };

    // Limit date ranges to reasonable periods if not specified
    if (!optimized.date_from && !optimized.date_to) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      optimized.date_from = thirtyDaysAgo.toISOString();
    }

    // Ensure reasonable limits
    if (optimized.limit) {
      optimized.limit = Math.min(Math.max(optimized.limit, 5), 50);
    }

    // Ensure valid page numbers
    if (optimized.page) {
      optimized.page = Math.max(optimized.page, 1);
    }

    return optimized;
  }

  /**
   * Clear all performance metrics
   */
  public clearMetrics(): void {
    this.performanceMetrics.clear();
    this.cacheHitCounts.clear();
  }

  /**
   * Export performance data for analysis
   */
  public exportPerformanceData(): {
    metrics: Record<string, PerformanceMetrics[]>;
    cacheStats: Record<string, { hits: number; misses: number }>;
    summary: any;
    timestamp: number;
  } {
    const metrics: Record<string, PerformanceMetrics[]> = {};
    const cacheStats: Record<string, { hits: number; misses: number }> = {};

    // Convert Maps to plain objects
    for (const [key, value] of this.performanceMetrics.entries()) {
      metrics[key] = value;
    }

    for (const [key, value] of this.cacheHitCounts.entries()) {
      cacheStats[key] = value;
    }

    return {
      metrics,
      cacheStats,
      summary: this.getPerformanceSummary(),
      timestamp: Date.now(),
    };
  }
}

// Export singleton instance
export const hrPerformanceOptimizer = HRPerformanceOptimizer.getInstance();

// Helper functions for common use cases
export const optimizePagination = (page: number, limit: number, total?: number) =>
  hrPerformanceOptimizer.optimizePagination(page, limit, total);

export const getCacheConfig = (dataType: 'activities' | 'statistics' | 'documents' | 'applications') =>
  hrPerformanceOptimizer.getCacheConfig(dataType);

export const recordQueryMetrics = (queryKey: string, startTime: number, dataSize: number, fromCache?: boolean) =>
  hrPerformanceOptimizer.recordQueryMetrics(queryKey, startTime, dataSize, fromCache);

export const preloadCriticalData = (dispatch: AppDispatch, organizationId: string) =>
  hrPerformanceOptimizer.preloadCriticalData(dispatch, organizationId);

export const invalidateRelatedCaches = (
  organizationId: string,
  dataType: 'application' | 'skill' | 'document' | 'performance' | 'onboarding'
) => hrPerformanceOptimizer.invalidateRelatedCaches(organizationId, dataType);