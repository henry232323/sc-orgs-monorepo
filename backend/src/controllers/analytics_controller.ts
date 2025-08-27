import { Request, Response } from 'express';
import { ViewTrackingService } from '../services/view_tracking_service';
import { PermissionHelper } from '../middleware/permissions';
import { ORGANIZATION_PERMISSIONS } from '../types/role';
import logger from '../config/logger';
import db from '../config/database';

import { getUserFromRequest } from '../utils/user-casting';
export class AnalyticsController {
  private viewTrackingService: ViewTrackingService;

  constructor() {
    this.viewTrackingService = new ViewTrackingService();
  }

  /**
   * Get organization view analytics
   * Requires VIEW_ANALYTICS permission
   * GET /api/organizations/:spectrumId/analytics/views
   */
  async getOrganizationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Permission check is handled by middleware, so we can proceed directly
      // Parse date range from query parameters
      const { start_date, end_date, include_viewers = 'false' } = req.query;
      const dateRange = this.parseDateRange(start_date as string, end_date as string);

      // Get analytics data using the internal organization ID
      const analytics = await this.viewTrackingService.getEntityAnalytics(
        'organization',
        organization.id,
        dateRange
      );

      // Remove recent viewers if not requested (privacy)
      if (include_viewers !== 'true') {
        delete analytics.recent_viewers;
      }

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get organization analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization analytics',
      });
    }
  }

  /**
   * Get event view analytics
   * Requires event management permission
   * GET /api/events/:id/analytics/views
   */
  async getEventAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user can manage this event (creator or org admin)
      const canManage = await PermissionHelper.canUserManageEvent(eventId, userId);

      if (!canManage.canManage) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view event analytics',
        });
        return;
      }

      // Parse date range from query parameters
      const { start_date, end_date, include_viewers = 'false' } = req.query;
      const dateRange = this.parseDateRange(start_date as string, end_date as string);

      // Get analytics data
      const analytics = await this.viewTrackingService.getEntityAnalytics(
        'event',
        eventId,
        dateRange
      );

      // Remove recent viewers if not requested (privacy)
      if (include_viewers !== 'true') {
        delete analytics.recent_viewers;
      }

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get event analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event analytics',
      });
    }
  }

  /**
   * Get bulk analytics for organization's events
   * Requires VIEW_ANALYTICS permission
   * GET /api/organizations/:spectrumId/analytics/events
   */
  async getOrganizationEventAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Permission check is handled by middleware

      // Get organization's events
      const events = await db('events')
        .select('id')
        .where('organization_id', organization.id)
        .where('is_active', true);

      const eventIds = events.map((event: any) => event.id);

      if (eventIds.length === 0) {
        res.json({
          success: true,
          data: {},
        });
        return;
      }

      // Get bulk analytics for all events
      const bulkAnalytics = await this.viewTrackingService.getBulkAnalytics(
        'event',
        eventIds
      );

      res.json({
        success: true,
        data: bulkAnalytics,
      });
    } catch (error) {
      logger.error('Failed to get organization event analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization event analytics',
      });
    }
  }

  /**
   * Parse date range from query parameters
   */
  private parseDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return { start, end };
  }
}
