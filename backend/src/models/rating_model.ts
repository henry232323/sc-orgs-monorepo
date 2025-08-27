import db from '../config/database';
import {
  OrganizationRating,
  CreateRatingRequest,
  UpdateRatingRequest,
  RatingStats,
} from '../types/rating';

export class RatingModel {
  // Create or update a rating
  async upsertRating(
    organizationId: string,
    userId: string,
    ratingData: CreateRatingRequest
  ): Promise<OrganizationRating> {
    const existingRating = await this.getUserRating(organizationId, userId);

    if (existingRating) {
      // Update existing rating
      const [updatedRating] = await db('organization_ratings')
        .where({ id: existingRating.id })
        .update({
          rating: ratingData.rating,
          review: ratingData.review,
          updated_at: new Date(),
        })
        .returning('*');

      await this.updateOrganizationRatingStats(organizationId);
      return updatedRating;
    } else {
      // Create new rating
      const [newRating] = await db('organization_ratings')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          rating: ratingData.rating,
          review: ratingData.review,
        })
        .returning('*');

      await this.updateOrganizationRatingStats(organizationId);
      return newRating;
    }
  }

  // Get a user's rating for a specific organization
  async getUserRating(
    organizationId: string,
    userId: string
  ): Promise<OrganizationRating | null> {
    const rating = await db('organization_ratings')
      .where({
        organization_id: organizationId,
        user_id: userId,
        is_active: true,
      })
      .first();

    return rating || null;
  }

  // Get all ratings for an organization
  async getOrganizationRatings(
    organizationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<OrganizationRating[]> {
    const { limit = 50, offset = 0 } = options;

    return db('organization_ratings')
      .where({
        organization_id: organizationId,
        is_active: true,
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  // Get rating statistics for an organization
  async getRatingStats(organizationId: string): Promise<RatingStats> {
    const ratings = await db('organization_ratings')
      .where({
        organization_id: organizationId,
        is_active: true,
      })
      .select('rating');

    if (ratings.length === 0) {
      return {
        average_rating: 0,
        total_ratings: 0,
        rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    }

    const totalRatings = ratings.length;
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((totalRating / totalRatings) * 100) / 100;

    // Calculate rating distribution
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    ratings.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    return {
      average_rating: averageRating,
      total_ratings: totalRatings,
      rating_distribution: distribution,
    };
  }

  // Get all ratings by a user
  async getUserRatings(userId: string): Promise<OrganizationRating[]> {
    return db('organization_ratings')
      .where({
        user_id: userId,
        is_active: true,
      })
      .orderBy('created_at', 'desc');
  }

  // Delete a rating (soft delete)
  async deleteRating(ratingId: string): Promise<void> {
    await db('organization_ratings')
      .where({ id: ratingId })
      .update({ is_active: false, updated_at: new Date() });
  }

  // Update organization rating statistics
  private async updateOrganizationRatingStats(
    organizationId: string
  ): Promise<void> {
    const stats = await this.getRatingStats(organizationId);

    await db('organizations').where({ id: organizationId }).update({
      average_rating: stats.average_rating,
      total_ratings: stats.total_ratings,
      updated_at: new Date(),
    });
  }
}
