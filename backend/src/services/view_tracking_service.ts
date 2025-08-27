import db from '../config/database';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ViewRecord {
  entity_type: 'organization' | 'event';
  entity_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

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

export class ViewTrackingService {
  /**
   * Record a view (idempotent - max 1 per user per day)
   */
  async recordView(viewData: ViewRecord): Promise<boolean> {
    try {
      const viewDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      logger.debug('Recording view:', {
        entity_type: viewData.entity_type,
        entity_id: viewData.entity_id,
        user_id: viewData.user_id,
        view_date: viewDate,
      });

      // Insert view record (will be ignored if already exists due to unique constraint)
      // PostgreSQL compatible approach: try insert, catch conflict
      let wasNewView = false;
      try {
        const result = await db('entity_views')
          .insert({
            entity_type: viewData.entity_type,
            entity_id: viewData.entity_id,
            user_id: viewData.user_id,
            ip_address: viewData.ip_address,
            user_agent: viewData.user_agent,
            view_date: viewDate,
            created_at: new Date(),
          })
          .returning('id');
        
        wasNewView = result.length > 0;
      } catch (error: any) {
        // If it's a unique constraint violation, that's expected (view already exists)
        if (error.code === '23505') {
          wasNewView = false;
        } else {
          throw error; // Re-throw other errors
        }
      }

      if (wasNewView) {
        // Update aggregated analytics
        await this.updateDailyAnalytics(
          viewData.entity_type,
          viewData.entity_id,
          viewDate
        );
        
        logger.debug('New view recorded and analytics updated');
      } else {
        logger.debug('View already recorded for today');
      }

      return wasNewView;
    } catch (error) {
      logger.error('Error recording view:', error);
      return false;
    }
  }

  /**
   * Update daily analytics for an entity
   */
  private async updateDailyAnalytics(
    entityType: string,
    entityId: string,
    viewDate: string
  ): Promise<void> {
    try {
      // Count unique views for this entity on this date
      const uniqueViewsResult = await db('entity_views')
        .where({
          entity_type: entityType,
          entity_id: entityId,
          view_date: viewDate,
        })
        .count('* as count')
        .first();

      const uniqueViews = parseInt(uniqueViewsResult?.count as string) || 0;

      // Upsert analytics record
      await db('entity_view_analytics')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          view_date: viewDate,
          unique_views: uniqueViews,
          total_views: uniqueViews, // Same as unique for now
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(['entity_type', 'entity_id', 'view_date'])
        .merge({
          unique_views: uniqueViews,
          total_views: uniqueViews,
          updated_at: new Date(),
        })
        .returning('id');

      logger.debug(
        `Updated analytics: ${entityType} ${entityId} on ${viewDate} - ${uniqueViews} unique views`
      );
    } catch (error) {
      logger.error('Error updating daily analytics:', error);
    }
  }

  /**
   * Get view analytics for an entity
   */
  async getEntityAnalytics(
    entityType: 'organization' | 'event',
    entityId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ViewAnalytics> {
    try {
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Get aggregated analytics for date range
      const analytics = await db('entity_view_analytics')
        .select('view_date', 'unique_views', 'total_views')
        .where({
          entity_type: entityType,
          entity_id: entityId,
        })
        .whereBetween('view_date', [
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
        ])
        .orderBy('view_date', 'desc');

      // Calculate totals
      const totalViews = analytics.reduce((sum, day) => sum + day.total_views, 0);
      const uniqueViews = analytics.reduce((sum, day) => sum + day.unique_views, 0);

      // Get recent viewers (last 7 days)
      const recentViewers = await db('entity_views')
        .join('users', 'entity_views.user_id', 'users.id')
        .select(
          'users.id as user_id',
          'users.rsi_handle',
          'users.avatar_url',
          'entity_views.created_at as viewed_at'
        )
        .where({
          'entity_views.entity_type': entityType,
          'entity_views.entity_id': entityId,
        })
        .where('entity_views.user_id', 'is not', null)
        .where('entity_views.view_date', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .orderBy('entity_views.created_at', 'desc')
        .limit(10);

      return {
        entity_type: entityType,
        entity_id: entityId,
        total_views: totalViews,
        unique_views: uniqueViews,
        views_by_date: analytics.map(day => ({
          date: day.view_date,
          unique_views: day.unique_views,
        })),
        recent_viewers: recentViewers.map(viewer => ({
          user_id: viewer.user_id,
          rsi_handle: viewer.rsi_handle,
          avatar_url: viewer.avatar_url,
          viewed_at: viewer.viewed_at instanceof Date 
            ? viewer.viewed_at.toISOString() 
            : viewer.viewed_at,
        })),
      };
    } catch (error) {
      logger.error('Error fetching entity analytics:', error);
      throw error;
    }
  }

  /**
   * Get view analytics for multiple entities (for bulk operations)
   */
  async getBulkAnalytics(
    entityType: 'organization' | 'event',
    entityIds: string[]
  ): Promise<Record<string, ViewAnalytics>> {
    try {
      const results: Record<string, ViewAnalytics> = {};

      // Fetch analytics for all entities in parallel
      const analyticsPromises = entityIds.map(async entityId => {
        const analytics = await this.getEntityAnalytics(entityType, entityId);
        return { entityId, analytics };
      });

      const analyticsResults = await Promise.all(analyticsPromises);

      // Build results object
      analyticsResults.forEach(({ entityId, analytics }) => {
        results[entityId] = analytics;
      });

      return results;
    } catch (error) {
      logger.error('Error fetching bulk analytics:', error);
      throw error;
    }
  }

  /**
   * Get top viewed entities for a date range
   */
  async getTopViewedEntities(
    entityType: 'organization' | 'event',
    dateRange?: { start: Date; end: Date },
    limit: number = 10
  ): Promise<Array<{ entity_id: string; total_views: number; unique_views: number }>> {
    try {
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const topViewed = await db('entity_view_analytics')
        .select('entity_id')
        .sum('unique_views as total_unique_views')
        .sum('total_views as total_total_views')
        .where('entity_type', entityType)
        .whereBetween('view_date', [
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
        ])
        .groupBy('entity_id')
        .orderBy('total_unique_views', 'desc')
        .limit(limit);

      return topViewed.map(item => ({
        entity_id: item.entity_id,
        total_views: parseInt(item.total_total_views as string) || 0,
        unique_views: parseInt(item.total_unique_views as string) || 0,
      }));
    } catch (error) {
      logger.error('Error fetching top viewed entities:', error);
      throw error;
    }
  }

  /**
   * Clean up old view data (for data retention)
   */
  async cleanupOldViews(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Delete old view records
      const deletedViews = await db('entity_views')
        .where('view_date', '<', cutoffDateStr)
        .del();

      // Delete old analytics records
      const deletedAnalytics = await db('entity_view_analytics')
        .where('view_date', '<', cutoffDateStr)
        .del();

      logger.info(
        `Cleaned up old view data: ${deletedViews} views, ${deletedAnalytics} analytics records`
      );

      return deletedViews + deletedAnalytics;
    } catch (error) {
      logger.error('Error cleaning up old views:', error);
      throw error;
    }
  }
}
