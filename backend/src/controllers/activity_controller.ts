import { Request, Response } from 'express';
import { ActivityService } from '../services/activity_service';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

export class ActivityController {
  private activityService: ActivityService;

  constructor() {
    this.activityService = new ActivityService();
  }

  /**
   * Get user's recent activity
   * GET /api/auth/activity
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }
      const userId = user.id;

      const { limit = 10 } = req.query;
      const activityLimit = Math.min(parseInt(limit as string) || 10, 50); // Max 50 items

      logger.debug(`Fetching activity for user ${userId}, limit: ${activityLimit}`);

      const activities = await this.activityService.getUserRecentActivity(
        userId,
        activityLimit
      );

      res.json({
        success: true,
        data: activities,
        total: activities.length,
      });
    } catch (error) {
      logger.error('Failed to get user activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user activity',
      });
    }
  }
}
