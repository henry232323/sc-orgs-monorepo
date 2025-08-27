import db from '../config/database';
import {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
} from '../types/organization';
import { RoleModel } from './role_model';
import { v4 as uuidv4 } from 'uuid';
import {
  serializeOrganization,
  serializeOrganizations,
  BaseOrganization,
} from '../utils/organizationSerializer';

export class OrganizationModel {
  private roleModel = new RoleModel();

  async create(orgData: CreateOrganizationData): Promise<Organization> {
    // Tags are now stored as PostgreSQL arrays directly
    const insertData = {
      ...orgData,
      playstyle_tags: orgData.playstyle_tags || [],
      focus_tags: orgData.focus_tags || [],
    };

    // Let PostgreSQL generate the organization UUID
    const [organization] = await db('organizations')
      .insert({
        ...insertData,
        is_registered: false,
        total_upvotes: 0,
        total_members: 1, // Owner is first member
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Create default roles for the organization
    const roles = await this.roleModel.createDefaultRoles(organization.id);
    const ownerRole = roles.find(role => role.name === 'Owner');

    if (ownerRole) {
      // Add the creator as a member with owner role
      await db('organization_members').insert({
        id: uuidv4(),
        organization_id: organization.id,
        user_id: orgData.owner_id!,
        role_id: ownerRole.id,
        is_active: true,
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Generate verification sentinel with brackets
    const verificationSentinel = `[SCORGS:${uuidv4().substring(0, 8).toUpperCase()}]`;
    await db('organizations').where({ id: organization.id }).update({
      verification_sentinel: verificationSentinel,
      updated_at: new Date(),
    });

    // Return the updated organization with sentinel
    const [updatedOrg] = await db('organizations')
      .where({ id: organization.id })
      .select('*');

    return updatedOrg;
  }

  // Helper method to ensure array fields are properly formatted
  private ensureArrayFields(organization: any): Organization {
    // PostgreSQL returns arrays directly - just ensure they exist and are arrays
    organization.languagess = Array.isArray(organization.languagess) 
      ? organization.languagess 
      : ['English'];
    
    organization.playstyle_tags = Array.isArray(organization.playstyle_tags) 
      ? organization.playstyle_tags 
      : [];
    
    organization.focus_tags = Array.isArray(organization.focus_tags) 
      ? organization.focus_tags 
      : [];

    return organization;
  }

  // Helper method to remove internal fields from organization data
  private sanitizeForPublic(organization: any): any {
    const {
      id, // Remove internal database ID
      owner_id, // Remove internal owner ID
      verification_sentinel, // Remove verification data
      ...publicOrg
    } = organization;

    return publicOrg;
  }

  async findById(id: string): Promise<Organization | null> {
    const organization = await db('organizations').where({ id }).first();
    if (!organization) return null;

    return organization;
  }

  async findByRsiOrgId(rsiOrgId: string): Promise<Organization | null> {
    const organization = await db('organizations')
      .leftJoin('users', 'organizations.owner_id', 'users.id')
      .select('organizations.*', 'users.rsi_handle as owner_handle')
      .where({ 'organizations.rsi_org_id': rsiOrgId })
      .first();
    if (!organization) return null;

    return organization;
  }

  async update(
    id: string,
    updateData: UpdateOrganizationData
  ): Promise<Organization | null> {
    // Ensure arrays are properly formatted for PostgreSQL
    const updateDataWithArrays = {
      ...updateData,
      languages: updateData.languages || undefined,
      playstyle_tags: updateData.playstyle_tags || [],
      focus_tags: updateData.focus_tags || [],
      updated_at: new Date(),
    };

    const [organization] = await db('organizations')
      .where({ id })
      .update(updateDataWithArrays)
      .returning('*');

    return organization;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('organizations').where({ id }).del();
    return deleted > 0;
  }

  async generateVerificationSentinel(id: string): Promise<string> {
    const verificationSentinel = `[SCORGS:${uuidv4().substring(0, 8).toUpperCase()}]`;

    await db('organizations').where({ id }).update({
      verification_sentinel: verificationSentinel,
      updated_at: new Date(),
    });

    return verificationSentinel;
  }

  async verifyOrganization(
    id: string,
    rsiData?: {
      name?: string;
      headline?: string;
      description?: string;
      icon_url?: string;
      banner_url?: string;
      member_count?: number;
      languages?: string[];
    }
  ): Promise<Organization | null> {
    const updateData: any = {
      updated_at: new Date(),
    };

    // Populate organization details from RSI data if provided
    if (rsiData) {
      if (rsiData.name) updateData.name = rsiData.name;
      if (rsiData.headline) updateData.headline = rsiData.headline;
      if (rsiData.description) updateData.description = rsiData.description;
      if (rsiData.icon_url) updateData.icon_url = rsiData.icon_url;
      if (rsiData.banner_url) updateData.banner_url = rsiData.banner_url;
      if (rsiData.member_count) updateData.total_members = rsiData.member_count;
      if (rsiData.languages) {
        // Language is now stored as PostgreSQL array directly
        updateData.languages = Array.isArray(rsiData.languages)
          ? rsiData.languages
          : [rsiData.languages];
      }
    }

    const [organization] = await db('organizations')
      .where({ id })
      .update(updateData)
      .returning('*');

    return organization || null;
  }

  async completeRegistration(
    id: string,
    registrationData: {
      description?: string;
      banner_url?: string;
      languages?: string[];
      playstyle_tags?: string[];
      focus_tags?: string[];
    }
  ): Promise<Organization | null> {
    // Ensure tags and languages are stored as JSON strings
    const updateData = {
      ...registrationData,
      languages: registrationData.languages
        ? JSON.stringify(registrationData.languages)
        : undefined,
      playstyle_tags: registrationData.playstyle_tags
        ? JSON.stringify(registrationData.playstyle_tags)
        : undefined,
      focus_tags: registrationData.focus_tags
        ? JSON.stringify(registrationData.focus_tags)
        : undefined,
      is_registered: true,
      updated_at: new Date(),
    };

    const [organization] = await db('organizations')
      .where({ id })
      .update(updateData)
      .returning('*');

    return organization;
  }

  async updateUpvoteCount(id: string): Promise<void> {
    const upvoteCount = await db('organization_upvotes')
      .where({ organization_id: id })
      .count('* as count')
      .first();

    await db('organizations')
      .where({ id })
      .update({
        total_upvotes: parseInt(upvoteCount?.count as string) || 0,
        updated_at: new Date(),
      });
  }

  // Check if user can upvote (once per organization per week limit)
  async canUserUpvote(
    organizationId: string,
    userId: string
  ): Promise<{ canUpvote: boolean; reason?: string }> {
    // Check if user has upvoted this specific organization in the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUpvoteForThisOrg = await db('organization_upvotes')
      .where({
        organization_id: organizationId,
        user_id: userId,
      })
      .where('created_at', '>', oneWeekAgo)
      .first();

    if (recentUpvoteForThisOrg) {
      const createdAt = new Date(recentUpvoteForThisOrg.created_at);
      const nextUpvoteDate = new Date(
        createdAt.getTime() + 7 * 24 * 60 * 60 * 1000
      );
      return {
        canUpvote: false,
        reason: `Can upvote this organization again on ${nextUpvoteDate.toISOString().split('T')[0]}`,
      };
    }

    return { canUpvote: true };
  }

  // Add upvote to organization
  async addUpvote(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const canUpvote = await this.canUserUpvote(organizationId, userId);

    if (!canUpvote.canUpvote) {
      return { success: false, message: canUpvote.reason || 'Cannot upvote' };
    }

    // Check if organization exists
    const organization = await this.findById(organizationId);
    if (!organization) {
      return { success: false, message: 'Organization not found' };
    }

    // Check if there's an old upvote from this user for this org (outside the 7-day window)
    const existingUpvote = await db('organization_upvotes')
      .where({ organization_id: organizationId, user_id: userId })
      .first();

    if (existingUpvote) {
      // Remove the old upvote and add a new one (refresh the timestamp)
      await db('organization_upvotes')
        .where({ organization_id: organizationId, user_id: userId })
        .del();
    }

    // Add the (new) upvote
    await db('organization_upvotes').insert({
      id: uuidv4(),
      organization_id: organizationId,
      user_id: userId,
      created_at: new Date(),
    });

    // Update the total upvote count (should stay the same if we just refreshed)
    await this.updateUpvoteCount(organizationId);

    return { success: true, message: 'Organization upvoted successfully' };
  }

  // Remove upvote from organization (only if within last 7 days)
  async removeUpvote(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    // Only allow removing votes cast within the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUpvote = await db('organization_upvotes')
      .where({ organization_id: organizationId, user_id: userId })
      .where('created_at', '>', oneWeekAgo)
      .first();

    if (!recentUpvote) {
      return {
        success: false,
        message:
          'No recent upvote found to remove (can only remove votes cast within the last 7 days)',
      };
    }

    // Remove the recent upvote
    await db('organization_upvotes')
      .where({ organization_id: organizationId, user_id: userId })
      .where('created_at', '>', oneWeekAgo)
      .del();

    // Update the total upvote count
    await this.updateUpvoteCount(organizationId);

    return { success: true, message: 'Recent upvote removed successfully' };
  }

  // Get user's upvote status for an organization
  async getUserUpvoteStatus(
    organizationId: string,
    userId: string
  ): Promise<{
    hasUpvoted: boolean;
    canUpvote: boolean;
    nextUpvoteDate?: string;
  }> {
    const canUpvoteResult = await this.canUserUpvote(organizationId, userId);

    // Check if user has a recent upvote (within last 7 days) - this determines if they show as "upvoted"
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUpvote = await db('organization_upvotes')
      .where({ organization_id: organizationId, user_id: userId })
      .where('created_at', '>', oneWeekAgo)
      .first();

    if (
      !canUpvoteResult.canUpvote &&
      canUpvoteResult.reason?.includes('Can upvote this organization again on')
    ) {
      const nextUpvoteDate = canUpvoteResult.reason.split(
        'Can upvote this organization again on '
      )[1];
      return { hasUpvoted: true, canUpvote: false, nextUpvoteDate };
    }

    return {
      hasUpvoted: !!recentUpvote, // Only show as upvoted if there's a recent vote
      canUpvote: canUpvoteResult.canUpvote,
    };
  }

  async updateMemberCount(id: string): Promise<void> {
    const memberCount = await db('organization_members')
      .where({ organization_id: id, is_active: true })
      .count('* as count')
      .first();

    await db('organizations')
      .where({ id })
      .update({
        total_members: parseInt(memberCount?.count as string) || 0,
        updated_at: new Date(),
      });
  }

  async list(
    filters: {
      is_registered?: boolean;
      is_active?: boolean;
      languages?: string[];
      tags?: string[];
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: BaseOrganization[]; total: number }> {
    let query = db('organizations')
      .leftJoin('users', 'organizations.owner_id', 'users.id')
      .select('organizations.*', 'users.rsi_handle as owner_handle');

    // Apply filters

    if (filters.is_registered !== undefined) {
      query = query.where({
        'organizations.is_registered': filters.is_registered ? 1 : 0,
      });
    }

    if (filters.is_active !== undefined) {
      query = query.where({
        'organizations.is_active': filters.is_active ? 1 : 0,
      });
    }

    if (filters.languages) {
      query = query.where({ 'organizations.languages': filters.languages });
    }

    if (filters.tags && filters.tags.length > 0) {
      // Search in playstyle_tags and focus_tags JSON arrays
      filters.tags.forEach(tag => {
        query = query.whereRaw(`
          ? = ANY(organizations.playstyle_tags) OR 
          ? = ANY(organizations.focus_tags)
        `, [tag, tag]);
      });
    }

    // Get total count before applying limit/offset
    // PostgreSQL-compatible count query - count distinct organization IDs
    const countQuery = query.clone().clearSelect().countDistinct('organizations.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';

    // Handle recent_popularity sorting separately
    if (sortBy === 'recent_popularity') {
      // Calculate recent popularity based on upvotes in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const organizations = await query
        .leftJoin('organization_upvotes as recent_upvotes', function () {
          this.on(
            'organizations.id',
            '=',
            'recent_upvotes.organization_id'
          ).andOn(
            'recent_upvotes.created_at',
            '>=',
            db.raw('?', [sevenDaysAgo])
          );
        })
        .groupBy('organizations.id', 'users.rsi_handle')
        .select(
          'organizations.*',
          'users.rsi_handle as owner_handle',
          db.raw('COUNT(recent_upvotes.id) as recent_upvote_count')
        )
        .orderBy('recent_upvote_count', sortOrder);

      return {
        data: serializeOrganizations(organizations),
        total,
      };
    } else {
      // Handle regular sorting
      const organizations = await query.orderBy(
        `organizations.${sortBy}`,
        sortOrder
      );

      return {
        data: serializeOrganizations(organizations),
        total,
      };
    }
  }

  async search(
    searchTerm: string,
    filters: {
      is_registered?: boolean;
      languages?: string[];
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: BaseOrganization[]; total: number }> {
    let query = db('organizations')
      .leftJoin('users', 'organizations.owner_id', 'users.id')
      .select('organizations.*', 'users.rsi_handle as owner_handle')
      .where(function () {
        this.where('organizations.name', 'like', `%${searchTerm}%`).orWhere(
          'organizations.description',
          'like',
          `%${searchTerm}%`
        );
      });

    // Apply filters

    if (filters.is_registered !== undefined) {
      query = query.where({
        'organizations.is_registered': filters.is_registered ? 1 : 0,
      });
    }

    if (filters.languages) {
      query = query.where({ 'organizations.languages': filters.languages });
    }

    if (filters.tags && filters.tags.length > 0) {
      // Search in playstyle_tags and focus_tags JSON arrays
      filters.tags.forEach(tag => {
        query = query.whereRaw(`
          ? = ANY(organizations.playstyle_tags) OR 
          ? = ANY(organizations.focus_tags)
        `, [tag, tag]);
      });
    }

    // Get total count before applying limit/offset
    // PostgreSQL-compatible count query - count distinct organization IDs
    const countQuery = query.clone().clearSelect().countDistinct('organizations.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const organizations = await query.orderBy(
      'organizations.total_upvotes',
      'desc'
    );

    // Parse tags and sanitize for public API
    return {
      data: organizations.map(org =>
        this.sanitizeForPublic(org)
      ),
      total,
    };
  }

  async getOrganizationStats(organizationId: string): Promise<{
    total_members: number;
    total_events: number;
    total_upvotes: number;
    average_rating: number;
  }> {
    const stats = await db('organizations')
      .where({ id: organizationId })
      .select('total_members', 'total_upvotes')
      .first();

    const events = await db('events')
      .where({ organization_id: organizationId })
      .count('* as total')
      .first();

    return {
      total_members: stats?.total_members || 0,
      total_events: parseInt(events?.total as string) || 0,
      total_upvotes: stats?.total_upvotes || 0,
      average_rating: 4.5, // TODO: Implement actual rating system
    };
  }

  // Check if a user is a member of an organization
  async isUserMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await db('organization_members')
      .where({
        organization_id: organizationId,
        user_id: userId,
        is_active: true,
      })
      .first();

    return !!member;
  }

  // Get user's role in an organization
  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<string | null> {
    return await this.roleModel.getUserRole(organizationId, userId);
  }

  // Get organization members
  async getMembers(
    organizationId: string,
    options: { limit: number; offset: number; viewerUserId?: string } = {
      limit: 50,
      offset: 0,
    }
  ): Promise<any[]> {
    return this.roleModel.getOrganizationMembers(organizationId, options);
  }

  // Get featured organizations for home page
  async getFeatured(options: {
    limit: number;
    minMembers: number;
    isActive: boolean;
  }): Promise<Organization[]> {
    return db('organizations')
      .where({
        is_active: options.isActive,
      })
      .where('total_members', '>=', options.minMembers)
      .orderBy('total_members', 'desc')
      .orderBy('total_upvotes', 'desc')
      .limit(options.limit);
  }

  // Get home page statistics
  async getHomePageStats(): Promise<{
    activeOrganizations: number;
    upcomingEvents: number;
    totalMembers: number;
    totalUpvotes: number;
  }> {
    const [orgStats, eventStats, memberStats, upvoteStats] = await Promise.all([
      // Count active organizations
      db('organizations')
        .where({ is_active: true })
        .count('* as total')
        .first(),

      // Count upcoming public events only
      db('events')
        .where('start_time', '>', new Date())
        .where({ is_active: true, is_public: true })
        .count('* as total')
        .first(),

      // Sum total members across all organizations
      db('organizations').sum('total_members as total').first(),

      // Sum total upvotes across all organizations
      db('organizations').sum('total_upvotes as total').first(),
    ]);

    return {
      activeOrganizations: parseInt(orgStats?.total as string) || 0,
      upcomingEvents: parseInt(eventStats?.total as string) || 0,
      totalMembers: parseInt(memberStats?.total as string) || 0,
      totalUpvotes: parseInt(upvoteStats?.total as string) || 0,
    };
  }

  // Update organization rating based on event reviews
  async updateEventRating(organizationId: string): Promise<void> {
    // Calculate average rating from all event reviews
    const ratingStats = await db('event_reviews')
      .join('events', 'event_reviews.event_id', 'events.id')
      .where('events.organization_id', organizationId)
      .select(
        db.raw('AVG(rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews')
      )
      .first();

    const averageRating = parseFloat(ratingStats.average_rating) || 0;
    const totalReviews = parseInt(ratingStats.total_reviews) || 0;

    // Update organization with new rating data
    await db('organizations').where({ id: organizationId }).update({
      average_event_rating: averageRating,
      total_event_reviews: totalReviews,
      updated_at: new Date(),
    });
  }

  // Get organization rating summary
  async getEventRatingSummary(organizationId: string): Promise<{
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
  }> {
    const ratingStats = await db('event_reviews')
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

    return {
      organization_id: organizationId,
      average_event_rating: parseFloat(ratingStats.average_rating) || 0,
      total_event_reviews: parseInt(ratingStats.total_reviews) || 0,
      rating_breakdown: {
        5: parseInt(ratingStats.rating_5) || 0,
        4: parseInt(ratingStats.rating_4) || 0,
        3: parseInt(ratingStats.rating_3) || 0,
        2: parseInt(ratingStats.rating_2) || 0,
        1: parseInt(ratingStats.rating_1) || 0,
      },
    };
  }

  // Get events for an organization
  async getEventsByOrganization(organizationId: string, userId?: string): Promise<any[]> {
    // Import EventModel to use its method
    const { EventModel } = await import('./event_model');
    const eventModel = new EventModel();

    return eventModel.getEventsByOrganization(organizationId, userId);
  }
}
