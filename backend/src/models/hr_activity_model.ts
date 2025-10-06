import db from '../config/database';
import logger from '../config/logger';

export type HRActivityType = 
  | 'application_submitted'
  | 'application_status_changed'
  | 'onboarding_completed'
  | 'performance_review_submitted'
  | 'skill_verified'
  | 'document_acknowledged';

export interface HRActivity {
  id: string;
  organization_id: string;
  activity_type: HRActivityType;
  user_id: string;
  user_handle: string;
  user_avatar_url?: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateHRActivityData {
  organization_id: string;
  activity_type: HRActivityType;
  user_id: string;
  user_handle: string;
  user_avatar_url?: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface HRActivityFilters {
  activity_types?: HRActivityType[];
  date_from?: Date;
  date_to?: Date;
  user_id?: string;
}

export interface PaginatedHRActivities {
  data: HRActivity[];
  total: number;
  page: number;
  limit: number;
}

export class HRActivityModel {
  /**
   * Create a new HR activity record
   */
  async create(activityData: CreateHRActivityData): Promise<HRActivity> {
    try {
      logger.debug('Creating HR activity:', { 
        organization_id: activityData.organization_id,
        activity_type: activityData.activity_type,
        user_id: activityData.user_id
      });

      const [activity] = await db('hr_activities')
        .insert({
          ...activityData,
          metadata: activityData.metadata || {},
        })
        .returning('*');

      logger.debug('HR activity created:', { id: activity.id });
      return activity;
    } catch (error) {
      logger.error('Error creating HR activity:', error);
      throw error;
    }
  }

  /**
   * Get paginated HR activities for an organization
   */
  async getOrganizationActivities(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    filters: HRActivityFilters = {}
  ): Promise<PaginatedHRActivities> {
    try {
      logger.debug('Fetching HR activities for organization:', {
        organizationId,
        page,
        limit,
        filters
      });

      const offset = (page - 1) * limit;
      
      // Build base query
      let query = db('hr_activities')
        .where('organization_id', organizationId);

      // Apply filters
      if (filters.activity_types?.length) {
        query = query.whereIn('activity_type', filters.activity_types);
      }

      if (filters.date_from) {
        query = query.where('created_at', '>=', filters.date_from);
      }

      if (filters.date_to) {
        query = query.where('created_at', '<=', filters.date_to);
      }

      if (filters.user_id) {
        query = query.where('user_id', filters.user_id);
      }

      // Get total count
      const [{ count }] = await query.clone().count('* as count');
      const total = parseInt(count as string);

      // Get paginated data
      const activities = await query
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      logger.debug('HR activities fetched:', {
        organizationId,
        total,
        returned: activities.length
      });

      return {
        data: activities,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error fetching organization HR activities:', error);
      throw error;
    }
  }

  /**
   * Get recent HR activities for a user across all organizations
   */
  async getUserActivities(
    userId: string,
    limit: number = 10
  ): Promise<HRActivity[]> {
    try {
      logger.debug('Fetching HR activities for user:', { userId, limit });

      const activities = await db('hr_activities')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      logger.debug('User HR activities fetched:', {
        userId,
        count: activities.length
      });

      return activities;
    } catch (error) {
      logger.error('Error fetching user HR activities:', error);
      throw error;
    }
  }

  /**
   * Get HR activity by ID
   */
  async getById(id: string): Promise<HRActivity | null> {
    try {
      logger.debug('Fetching HR activity by ID:', { id });

      const activity = await db('hr_activities')
        .where('id', id)
        .first();

      if (!activity) {
        logger.debug('HR activity not found:', { id });
        return null;
      }

      return activity;
    } catch (error) {
      logger.error('Error fetching HR activity by ID:', error);
      throw error;
    }
  }

  /**
   * Delete HR activity by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      logger.debug('Deleting HR activity:', { id });

      const deletedCount = await db('hr_activities')
        .where('id', id)
        .del();

      const success = deletedCount > 0;
      logger.debug('HR activity deletion result:', { id, success });

      return success;
    } catch (error) {
      logger.error('Error deleting HR activity:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for an organization
   */
  async getOrganizationActivityStats(
    organizationId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    total_activities: number;
    activities_by_type: Record<HRActivityType, number>;
    recent_activity_trend: { date: string; count: number }[];
  }> {
    try {
      logger.debug('Fetching HR activity stats for organization:', {
        organizationId,
        dateFrom,
        dateTo
      });

      let baseQuery = db('hr_activities')
        .where('organization_id', organizationId);

      if (dateFrom) {
        baseQuery = baseQuery.where('created_at', '>=', dateFrom);
      }

      if (dateTo) {
        baseQuery = baseQuery.where('created_at', '<=', dateTo);
      }

      // Get total count
      const [{ count: totalActivities }] = await baseQuery
        .clone()
        .count('* as count');

      // Get activities by type
      const activitiesByType = await baseQuery
        .clone()
        .select('activity_type')
        .count('* as count')
        .groupBy('activity_type');

      // Get recent activity trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTrend = await db('hr_activities')
        .where('organization_id', organizationId)
        .where('created_at', '>=', thirtyDaysAgo)
        .select(db.raw('DATE(created_at) as date'))
        .count('* as count')
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'desc');

      // Format results
      const activitiesByTypeMap: Record<HRActivityType, number> = {
        application_submitted: 0,
        application_status_changed: 0,
        onboarding_completed: 0,
        performance_review_submitted: 0,
        skill_verified: 0,
        document_acknowledged: 0,
      };

      activitiesByType.forEach(item => {
        activitiesByTypeMap[item.activity_type as HRActivityType] = parseInt(item.count as string);
      });

      const recentActivityTrend = recentTrend.map((item: any) => ({
        date: item.date,
        count: parseInt(item.count as string),
      }));

      return {
        total_activities: parseInt(totalActivities as string),
        activities_by_type: activitiesByTypeMap,
        recent_activity_trend: recentActivityTrend,
      };
    } catch (error) {
      logger.error('Error fetching HR activity stats:', error);
      throw error;
    }
  }

  /**
   * Bulk create HR activities (for batch operations)
   */
  async createBulk(activities: CreateHRActivityData[]): Promise<HRActivity[]> {
    try {
      logger.debug('Creating bulk HR activities:', { count: activities.length });

      const activitiesWithDefaults = activities.map(activity => ({
        ...activity,
        metadata: activity.metadata || {},
      }));

      const createdActivities = await db('hr_activities')
        .insert(activitiesWithDefaults)
        .returning('*');

      logger.debug('Bulk HR activities created:', { count: createdActivities.length });
      return createdActivities;
    } catch (error) {
      logger.error('Error creating bulk HR activities:', error);
      throw error;
    }
  }
}