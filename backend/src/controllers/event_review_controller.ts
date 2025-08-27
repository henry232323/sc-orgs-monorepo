import { Request, Response } from 'express';
import { EventReviewModel } from '../models/event_review_model';
import { OrganizationModel } from '../models/organization_model';
import { EventModel } from '../models/event_model';
import {
  CreateEventReviewData,
  UpdateEventReviewData,
  EventReviewWithUser,
  OrganizationRatingSummary,
} from '../types/event_review';
import { User } from '../types/user';

import { getUserFromRequest } from '../utils/user-casting';
const eventReviewModel = new EventReviewModel();
const organizationModel = new OrganizationModel();
const eventModel = new EventModel();

export class EventReviewController {
  // Get reviews for a specific event
  async getEventReviews(req: Request, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const offset = (parsedPage - 1) * parsedLimit;

      console.log('Getting event reviews for event:', eventId);
      const result = await eventReviewModel.getEventReviews(eventId, {
        limit: parsedLimit,
        offset,
      });

      res.json({
        success: true,
        data: {
          data: result.data,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: result.total,
            totalPages: Math.ceil(result.total / parsedLimit),
          },
        },
      });
    } catch (error) {
      console.error('Error getting event reviews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event reviews',
      });
    }
  }

  // Create a new review
  async createReview(req: Request, res: Response): Promise<void> {
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

      const { rating, review_text, is_anonymous } = req.body;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
        return;
      }

      // Check review eligibility
      const eligibility = await eventReviewModel.checkReviewEligibility(
        eventId,
        userId
      );
      if (!eligibility.can_review) {
        res.status(400).json({
          success: false,
          error: eligibility.reason || 'Cannot review this event',
        });
        return;
      }

      // Create review
      const reviewData: CreateEventReviewData = {
        event_id: eventId,
        user_id: userId,
        rating,
        review_text,
        is_anonymous: is_anonymous || false,
      };

      const review = await eventReviewModel.create(reviewData);

      // Update organization rating if event has an organization
      const event = await eventModel.findById(eventId);
      if (event?.organization_id) {
        await organizationModel.updateEventRating(event.organization_id);
      }

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create review',
      });
    }
  }

  // Update a review
  async updateReview(req: Request, res: Response): Promise<void> {
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

      // Check if review exists and belongs to user
      const existingReview = await eventReviewModel.getUserEventReview(
        eventId,
        userId
      );
      if (!existingReview) {
        res.status(404).json({
          success: false,
          error: 'Review not found',
        });
        return;
      }

      // Check if review can be updated (within 24 hours)
      const reviewAge =
        Date.now() - new Date(existingReview.created_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (reviewAge > twentyFourHours) {
        res.status(400).json({
          success: false,
          error: 'Reviews can only be updated within 24 hours of creation',
        });
        return;
      }

      const { rating, review_text, is_anonymous } = req.body;

      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
        return;
      }

      const updateData: UpdateEventReviewData = {};
      if (rating !== undefined) updateData.rating = rating;
      if (review_text !== undefined) updateData.review_text = review_text;
      if (is_anonymous !== undefined) updateData.is_anonymous = is_anonymous;

      const updatedReview = await eventReviewModel.update(
        existingReview.id,
        updateData
      );

      // Update organization rating if event has an organization
      const event = await eventModel.findById(eventId);
      if (event?.organization_id) {
        await organizationModel.updateEventRating(event.organization_id);
      }

      res.json({
        success: true,
        data: updatedReview,
        message: 'Review updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update review',
      });
    }
  }

  // Delete a review
  async deleteReview(req: Request, res: Response): Promise<void> {
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

      // Check if review exists and belongs to user
      const existingReview = await eventReviewModel.getUserEventReview(
        eventId,
        userId
      );
      if (!existingReview) {
        res.status(404).json({
          success: false,
          error: 'Review not found',
        });
        return;
      }

      // Check if review can be deleted (within 24 hours)
      const reviewAge =
        Date.now() - new Date(existingReview.created_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (reviewAge > twentyFourHours) {
        res.status(400).json({
          success: false,
          error: 'Reviews can only be deleted within 24 hours of creation',
        });
        return;
      }

      await eventReviewModel.delete(existingReview.id);

      // Update organization rating if event has an organization
      const event = await eventModel.findById(eventId);
      if (event?.organization_id) {
        await organizationModel.updateEventRating(event.organization_id);
      }

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete review',
      });
    }
  }

  // Get user's review for an event
  async getUserEventReview(req: Request, res: Response): Promise<void> {
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

      const review = await eventReviewModel.getUserEventReview(eventId, userId);

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user review',
      });
    }
  }

  // Check review eligibility
  async checkReviewEligibility(req: Request, res: Response): Promise<void> {
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

      const eligibility = await eventReviewModel.checkReviewEligibility(
        eventId,
        userId
      );

      res.json({
        success: true,
        data: eligibility,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check review eligibility',
      });
    }
  }

  // Get organization rating summary
  async getOrganizationRatingSummary(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;

      const summary =
        await organizationModel.getEventRatingSummary(organization.id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization rating summary',
      });
    }
  }

  // Get organization reviews
  async getOrganizationReviews(req: Request, res: Response): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;
      const { page = 1, limit = 20 } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const offset = (parsedPage - 1) * parsedLimit;

      const result = await eventReviewModel.getOrganizationReviews(
        organization.id,
        {
          limit: parsedLimit,
          offset,
        }
      );

      res.json({
        success: true,
        data: {
          data: result.data,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: result.total,
            totalPages: Math.ceil(result.total / parsedLimit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization reviews',
      });
    }
  }

  // Get event rating summary
  async getEventRatingSummary(req: Request, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;

      const summary = await eventReviewModel.getEventRatingSummary(eventId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting event rating summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event rating summary',
      });
    }
  }
}

export default EventReviewController;
