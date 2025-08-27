import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  EventReview,
  CreateEventReviewData,
  UpdateEventReviewData,
  EventReviewWithUser,
  EventReviewStats,
  ReviewEligibility,
} from '../types/event_review';
import { transformReviewsWithUsers } from '../utils/response_transformers';

export class EventReviewModel {
  // Create a new review
  async create(reviewData: CreateEventReviewData): Promise<EventReview> {
    const review: EventReview = {
      id: uuidv4(),
      event_id: reviewData.event_id,
      user_id: reviewData.user_id,
      rating: reviewData.rating,
      review_text: reviewData.review_text,
      is_anonymous: reviewData.is_anonymous || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('event_reviews').insert(review);
    return review;
  }

  // Get review by ID
  async findById(id: string): Promise<EventReview | null> {
    const review = await db('event_reviews').where({ id }).first();

    return review || null;
  }

  // Get reviews for a specific event
  async getEventReviews(
    eventId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: EventReviewWithUser[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const query = db('event_reviews')
      .select(
        'event_reviews.*',
        'users.rsi_handle as username',
        'users.avatar_url'
      )
      .join('users', 'event_reviews.user_id', 'users.id')
      .where('event_reviews.event_id', eventId)
      .orderBy('event_reviews.created_at', 'desc');

    const reviews = await query.limit(limit).offset(offset);

    const total = await db('event_reviews')
      .where('event_id', eventId)
      .count('* as count')
      .first()
      .then(result => parseInt(result?.count as string) || 0);

    return {
      data: transformReviewsWithUsers(reviews),
      total,
    };
  }

  // Get user's review for a specific event
  async getUserEventReview(
    eventId: string,
    userId: string
  ): Promise<EventReview | null> {
    const review = await db('event_reviews')
      .where({
        event_id: eventId,
        user_id: userId,
      })
      .first();

    return review || null;
  }

  // Update a review
  async update(
    id: string,
    updateData: UpdateEventReviewData
  ): Promise<EventReview | null> {
    const updatedData = {
      ...updateData,
      updated_at: new Date(),
    };

    await db('event_reviews').where({ id }).update(updatedData);

    return this.findById(id);
  }

  // Delete a review
  async delete(id: string): Promise<boolean> {
    const deleted = await db('event_reviews').where({ id }).del();

    return deleted > 0;
  }

  // Check if user can review an event
  async checkReviewEligibility(
    eventId: string,
    userId: string
  ): Promise<ReviewEligibility> {
    // Check if event exists and is completed
    const event = await db('events').where({ id: eventId }).first();

    if (!event) {
      return {
        can_review: false,
        reason: 'Event not found',
        event_completed: false,
        user_attended: false,
        already_reviewed: false,
      };
    }

    const eventStarted = new Date(event.start_time) < new Date();

    if (!eventStarted) {
      return {
        can_review: false,
        reason: 'Event has not started yet',
        event_completed: false,
        user_attended: false,
        already_reviewed: false,
      };
    }

    // Check if user attended the event (registered and event has started)
    const registration = await db('event_registrations')
      .where({
        event_id: eventId,
        user_id: userId,
        status: 'registered',
      })
      .first();

    const userAttended = !!registration;

    if (!userAttended) {
      return {
        can_review: false,
        reason: 'You did not attend this event',
        event_completed: true,
        user_attended: false,
        already_reviewed: false,
      };
    }

    // Check if user already reviewed
    const existingReview = await this.getUserEventReview(eventId, userId);
    const alreadyReviewed = !!existingReview;

    if (alreadyReviewed) {
      return {
        can_review: false,
        reason: 'You have already reviewed this event',
        event_completed: true,
        user_attended: true,
        already_reviewed: true,
      };
    }

    return {
      can_review: true,
      event_completed: true,
      user_attended: true,
      already_reviewed: false,
    };
  }

  // Get review statistics for an event
  async getEventReviewStats(eventId: string): Promise<EventReviewStats> {
    const stats = await db('event_reviews')
      .where('event_id', eventId)
      .select(
        db.raw('AVG(rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews'),
        db.raw('SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5'),
        db.raw('SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4'),
        db.raw('SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3'),
        db.raw('SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2'),
        db.raw('SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1')
      )
      .first();

    return {
      average_rating: parseFloat(stats.average_rating) || 0,
      total_reviews: parseInt(stats.total_reviews) || 0,
      rating_breakdown: {
        5: parseInt(stats.rating_5) || 0,
        4: parseInt(stats.rating_4) || 0,
        3: parseInt(stats.rating_3) || 0,
        2: parseInt(stats.rating_2) || 0,
        1: parseInt(stats.rating_1) || 0,
      },
    };
  }

  // Get reviews for events by organization
  async getOrganizationReviews(
    organizationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ data: EventReviewWithUser[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const query = db('event_reviews')
      .select(
        'event_reviews.*',
        'users.rsi_handle as username',
        'users.avatar_url',
        'events.title as event_title'
      )
      .join('users', 'event_reviews.user_id', 'users.id')
      .join('events', 'event_reviews.event_id', 'events.id')
      .where('events.organization_id', organizationId)
      .orderBy('event_reviews.created_at', 'desc');

    const reviews = await query.limit(limit).offset(offset);

    const total = await db('event_reviews')
      .join('events', 'event_reviews.event_id', 'events.id')
      .where('events.organization_id', organizationId)
      .count('* as count')
      .first()
      .then(result => parseInt(result?.count as string) || 0);

    return {
      data: transformReviewsWithUsers(reviews),
      total,
    };
  }

  // Get organization rating summary
  async getOrganizationRatingSummary(organizationId: string): Promise<{
    organization_id: string;
    average_event_rating: number;
    total_event_reviews: number;
    rating_breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
    recent_reviews: EventReviewWithUser[];
  }> {
    // Get overall stats
    const stats = await db('event_reviews')
      .join('events', 'event_reviews.event_id', 'events.id')
      .where('events.organization_id', organizationId)
      .select(
        db.raw('AVG(rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews'),
        db.raw('SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5'),
        db.raw('SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4'),
        db.raw('SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3'),
        db.raw('SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2'),
        db.raw('SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1')
      )
      .first();

    // Get recent reviews
    const recentReviews = await this.getOrganizationReviews(organizationId, {
      limit: 5,
    });

    return {
      organization_id: organizationId,
      average_event_rating: parseFloat(stats.average_rating) || 0,
      total_event_reviews: parseInt(stats.total_reviews) || 0,
      rating_breakdown: {
        5: parseInt(stats.rating_5) || 0,
        4: parseInt(stats.rating_4) || 0,
        3: parseInt(stats.rating_3) || 0,
        2: parseInt(stats.rating_2) || 0,
        1: parseInt(stats.rating_1) || 0,
      },
      recent_reviews: recentReviews.data,
    };
  }

  // Get event rating summary
  async getEventRatingSummary(eventId: string): Promise<{
    event_id: string;
    average_rating: number;
    total_reviews: number;
    rating_breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  }> {
    const ratingStats = await db('event_reviews')
      .where('event_id', eventId)
      .select(
        db.raw('AVG(rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews'),
        db.raw('SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5'),
        db.raw('SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4'),
        db.raw('SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3'),
        db.raw('SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2'),
        db.raw('SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1')
      )
      .first();

    return {
      event_id: eventId,
      average_rating: parseFloat(ratingStats.average_rating) || 0,
      total_reviews: parseInt(ratingStats.total_reviews) || 0,
      rating_breakdown: {
        5: parseInt(ratingStats.rating_5) || 0,
        4: parseInt(ratingStats.rating_4) || 0,
        3: parseInt(ratingStats.rating_3) || 0,
        2: parseInt(ratingStats.rating_2) || 0,
        1: parseInt(ratingStats.rating_1) || 0,
      },
    };
  }
}
