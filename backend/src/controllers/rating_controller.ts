import { Request, Response } from 'express';
import { RatingModel } from '../models/rating_model';
import { requireLogin } from '../middleware/auth';
import logger from '../config/logger';

const ratingModel = new RatingModel();

export class RatingController {
  // Rate an organization
  async rateOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = (req.user as any)?.id;
      const { rating, review } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
        return;
      }

      const result = await ratingModel.upsertRating(organizationId, userId, {
        rating,
        review,
      });

      res.json({
        success: true,
        data: result,
        message: 'Rating submitted successfully',
      });
    } catch (error) {
      logger.error('Failed to rate organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit rating',
      });
    }
  }

  // Get organization ratings
  async getOrganizationRatings(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const ratings = await ratingModel.getOrganizationRatings(organizationId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      logger.error('Failed to get organization ratings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ratings',
      });
    }
  }

  // Get rating statistics for an organization
  async getRatingStats(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const stats = await ratingModel.getRatingStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get rating stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rating statistics',
      });
    }
  }

  // Get user's rating for an organization
  async getUserRating(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const rating = await ratingModel.getUserRating(organizationId, userId);

      res.json({
        success: true,
        data: rating,
      });
    } catch (error) {
      logger.error('Failed to get user rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user rating',
      });
    }
  }

  // Get all ratings by a user
  async getUserRatings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const ratings = await ratingModel.getUserRatings(userId);

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      logger.error('Failed to get user ratings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user ratings',
      });
    }
  }

  // Delete a rating
  async deleteRating(req: Request, res: Response): Promise<void> {
    try {
      const { ratingId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // TODO: Add authorization check to ensure user owns the rating
      await ratingModel.deleteRating(ratingId);

      res.json({
        success: true,
        message: 'Rating deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete rating',
      });
    }
  }
}
