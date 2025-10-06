import { Request, Response } from 'express';
import { HRActivityService } from '../services/hr_activity_service';
import { HRActivityType } from '../models/hr_activity_model';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

export class HRActivityController {
  private hrActivityService: HRActivityService;

  constructor() {
    this.hrActivityService = new HRActivityService();
  }

  /**
   * Get HR activities for an organization
   * GET /api/organizations/:id/hr-activities
   */
  async getOrganizationActivities(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const user = getUserFromRequest(req);

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Parse query parameters
      const {
        page = 1,
        limit = 20,
        activity_types,
        date_from,
        date_to,
        user_id
      } = req.query;

      // Validate and parse parameters
      const parsedPage = Math.max(1, parseInt(page as string) || 1);
      const parsedLimit = Math.min(Math.max(1, parseInt(limit as string) || 20), 100);

      let parsedActivityTypes: HRActivityType[] | undefined;
      if (activity_types) {
        const types = (activity_types as string).split(',');
        const validTypes: HRActivityType[] = [
          'application_submitted',
          'application_status_changed',
          'onboarding_completed',
          'performance_review_submitted',
          'skill_verified',
          'document_acknowledged'
        ];
        parsedActivityTypes = types.filter(type => 
          validTypes.includes(type as HRActivityType)
        ) as HRActivityType[];
      }

      let parsedDateFrom: Date | undefined;
      if (date_from) {
        parsedDateFrom = new Date(date_from as string);
        if (isNaN(parsedDateFrom.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date_from format. Use ISO 8601 format.',
          });
          return;
        }
      }

      let parsedDateTo: Date | undefined;
      if (date_to) {
        parsedDateTo = new Date(date_to as string);
        if (isNaN(parsedDateTo.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date_to format. Use ISO 8601 format.',
          });
          return;
        }
      }

      logger.debug('HRActivityController: Fetching organization activities', {
        organizationId,
        userId: user.id,
        page: parsedPage,
        limit: parsedLimit,
        filters: {
          activity_types: parsedActivityTypes,
          date_from: parsedDateFrom,
          date_to: parsedDateTo,
          user_id
        }
      });

      const result = await this.hrActivityService.getOrganizationActivities(
        organizationId,
        {
          page: parsedPage,
          limit: parsedLimit,
          activity_types: parsedActivityTypes,
          date_from: parsedDateFrom,
          date_to: parsedDateTo,
          user_id: user_id as string
        }
      );

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        has_more: result.page * result.limit < result.total
      });

    } catch (error) {
      logger.error('HRActivityController: Error fetching organization activities', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HR activities',
      });
    }
  }

  /**
   * Get HR activities for the current user
   * GET /api/auth/hr-activities
   */
  async getUserActivities(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { limit = 10 } = req.query;
      const parsedLimit = Math.min(Math.max(1, parseInt(limit as string) || 10), 50);

      logger.debug('HRActivityController: Fetching user activities', {
        userId: user.id,
        limit: parsedLimit
      });

      const activities = await this.hrActivityService.getUserActivities(
        user.id,
        parsedLimit
      );

      res.json({
        success: true,
        data: activities,
        total: activities.length,
      });

    } catch (error) {
      logger.error('HRActivityController: Error fetching user activities', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user HR activities',
      });
    }
  }

  /**
   * Get HR activity by ID
   * GET /api/hr-activities/:id
   */
  async getActivityById(req: Request, res: Response): Promise<void> {
    try {
      const activityId = req.params.id;
      const user = getUserFromRequest(req);

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.debug('HRActivityController: Fetching activity by ID', {
        activityId,
        userId: user.id
      });

      const activity = await this.hrActivityService.getActivityById(activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'HR activity not found',
        });
        return;
      }

      res.json({
        success: true,
        data: activity,
      });

    } catch (error) {
      logger.error('HRActivityController: Error fetching activity by ID', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HR activity',
      });
    }
  }

  /**
   * Get HR activity statistics for an organization
   * GET /api/organizations/:id/hr-activities/stats
   */
  async getOrganizationActivityStats(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const user = getUserFromRequest(req);

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { date_from, date_to } = req.query;

      let parsedDateFrom: Date | undefined;
      if (date_from) {
        parsedDateFrom = new Date(date_from as string);
        if (isNaN(parsedDateFrom.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date_from format. Use ISO 8601 format.',
          });
          return;
        }
      }

      let parsedDateTo: Date | undefined;
      if (date_to) {
        parsedDateTo = new Date(date_to as string);
        if (isNaN(parsedDateTo.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date_to format. Use ISO 8601 format.',
          });
          return;
        }
      }

      logger.debug('HRActivityController: Fetching activity stats', {
        organizationId,
        userId: user.id,
        dateFrom: parsedDateFrom,
        dateTo: parsedDateTo
      });

      const stats = await this.hrActivityService.getOrganizationActivityStats(
        organizationId,
        parsedDateFrom,
        parsedDateTo
      );

      res.json({
        success: true,
        data: stats,
      });

    } catch (error) {
      logger.error('HRActivityController: Error fetching activity stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HR activity statistics',
      });
    }
  }

  /**
   * Delete HR activity by ID (admin only)
   * DELETE /api/hr-activities/:id
   */
  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const activityId = req.params.id;
      const user = getUserFromRequest(req);

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Note: In a real implementation, you would check if the user has admin permissions
      // For now, we'll allow any authenticated user to delete activities
      // TODO: Add proper permission checking

      logger.debug('HRActivityController: Deleting activity', {
        activityId,
        userId: user.id
      });

      const success = await this.hrActivityService.deleteActivity(activityId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'HR activity not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'HR activity deleted successfully',
      });

    } catch (error) {
      logger.error('HRActivityController: Error deleting activity', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete HR activity',
      });
    }
  }
}