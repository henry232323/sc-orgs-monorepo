import db from '../config/database';
import { User, CreateUserData, UpdateUserData } from '../types/user';
import { UserStats } from '../types/stats';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { generateTemporaryRsiHandle } from '../utils/username';
import {
  serializeUserOrganizations,
  UserOrganization,
} from '../utils/organizationSerializer';

export class UserModel {
  async create(userData: CreateUserData): Promise<User> {
    // Let PostgreSQL generate the UUID, but handle the case where an ID is provided
    const insertData = {
      ...userData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Only include id if explicitly provided (for data imports/migrations)
    if (userData.id) {
      insertData.id = userData.id;
    }

    const [user] = await db('users').insert(insertData).returning('*');

    // Generate RSI handle based on the database-generated ID if needed
    if (!user.rsi_handle) {
      const updatedUser = await this.update(user.id, {
        rsi_handle: generateTemporaryRsiHandle(user.id),
      });
      return updatedUser!;
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const user = await db('users').where({ id }).first();
    return user || null;
  }

  async findByDiscordId(discordId: string): Promise<User | null> {
    const user = await db('users').where({ discord_id: discordId }).first();
    return user || null;
  }

  async findByRsiHandle(rsiHandle: string): Promise<User | null> {
    const user = await db('users').where({ rsi_handle: rsiHandle }).first();
    return user || null;
  }

  async findBySpectrumId(spectrumId: string): Promise<User | null> {
    const user = await db('users').where({ spectrum_id: spectrumId }).first();
    return user || null;
  }

  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    const [user] = await db('users')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return user || null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db('users').where({ id }).update({
      last_login_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Generate verification code on-the-fly (no database storage needed)
  generateVerificationCodeFromId(id: string): string {
    const hash = crypto.createHash('md5').update(id).digest('hex');
    return `SCORGS:${hash.substring(0, 8).toUpperCase()}`;
  }

  async generateVerificationCode(id: string): Promise<string> {
    // Since verification codes are deterministic, we can generate them on-the-fly
    // This method is kept for backward compatibility but now just returns the computed code
    return this.generateVerificationCodeFromId(id);
  }

  async verifyRsiAccount(
    id: string,
    rsiHandle: string,
    spectrumId: string,
    spectrumAvatarUrl?: string
  ): Promise<User | null> {
    const updateData: any = {
      rsi_handle: rsiHandle,
      spectrum_id: spectrumId,
      is_rsi_verified: true,
      updated_at: new Date(),
    };

    // Add Spectrum avatar data if provided
    if (spectrumAvatarUrl) {
      updateData.avatar_url = spectrumAvatarUrl;
      updateData.avatar_source = 'spectrum';
    }

    const [user] = await db('users')
      .where({ id })
      .update(updateData)
      .returning('*');

    return user || null;
  }

  async updateUserAvatar(
    id: string,
    avatarUrl: string,
    source: 'discord' | 'spectrum' | 'community_hub' | 'default'
  ): Promise<User | null> {
    const [user] = await db('users')
      .where({ id })
      .update({
        avatar_url: avatarUrl,
        avatar_source: source,
        updated_at: new Date(),
      })
      .returning('*');

    return user || null;
  }

  async getUserAvatarUrl(id: string): Promise<string | null> {
    const user = await db('users').select('avatar_url').where({ id }).first();

    return user?.avatar_url || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('users').where({ id }).del();
    return deleted > 0;
  }

  async list(
    filters: {
      is_active?: boolean;
      is_rsi_verified?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<User[]> {
    let query = db('users');

    if (filters.is_active !== undefined) {
      query = query.where({ is_active: filters.is_active });
    }

    if (filters.is_rsi_verified !== undefined) {
      query = query.where({ is_rsi_verified: filters.is_rsi_verified });
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query.orderBy('created_at', 'desc');
  }

  // Get user dashboard statistics
  async getUserStats(userId: string): Promise<UserStats> {
    const [orgStats, eventStats, upvoteStats, ratingStats] = await Promise.all([
      // Count organizations where user is a member
      db('organization_members')
        .count('* as total')
        .where({ user_id: userId })
        .first(),

      // Count events user has registered for
      db('event_registrations')
        .count('* as total')
        .where({ user_id: userId })
        .first(),

      // Count upvotes user has given
      db('organization_upvotes')
        .count('* as total')
        .where({ user_id: userId })
        .first(),

      // Get average rating of organizations user is in
      db('organization_members')
        .join(
          'organizations',
          'organization_members.organization_id',
          'organizations.id'
        )
        .avg('organizations.average_rating as avg_rating')
        .where({ 'organization_members.user_id': userId })
        .first(),
    ]);

    return {
      totalOrganizations: parseInt(orgStats?.total as string) || 0,
      totalEvents: parseInt(eventStats?.total as string) || 0,
      totalUpvotes: parseInt(upvoteStats?.total as string) || 0,
      averageRating: parseFloat(ratingStats?.avg_rating as string) || 0,
      lastActivityAt: new Date(), // Could be enhanced to get actual last activity
    };
  }

  // Get user's public organizations (non-hidden ones only)
  async getUserPublicOrganizations(userId: string): Promise<UserOrganization[]> {
    const organizations = await db('organization_members')
      .join(
        'organizations',
        'organization_members.organization_id',
        'organizations.id'
      )
      .join(
        'organization_roles',
        'organization_members.role_id',
        'organization_roles.id'
      )
      .where('organization_members.user_id', userId)
      .where('organization_members.is_active', true)
      .where('organization_members.is_hidden', false) // Only show non-hidden organizations
      .select(
        'organizations.*', // Get all organization fields for consistency
        'organizations.icon_url as logo_url', // Alias for frontend compatibility
        'organizations.total_members as member_count', // Alias for frontend compatibility
        'organization_members.is_active',
        'organization_members.is_hidden',
        'organization_members.joined_at',
        'organization_roles.name as role_name'
      )
      .orderBy('organization_members.joined_at', 'desc');

    return serializeUserOrganizations(organizations);
  }

  // Get user's public events (both created and registered)
  async getUserPublicEvents(userId: string): Promise<any[]> {
    // Get events user has registered for
    const registeredEvents = await db('event_registrations')
      .join('events', 'event_registrations.event_id', 'events.id')
      .join('organizations', 'events.organization_id', 'organizations.id')
      .where('event_registrations.user_id', userId)
      .select(
        'events.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id',
        'event_registrations.registered_at',
        'event_registrations.status as registration_status'
      )
      .orderBy('events.start_time', 'desc');

    // Get events user has created
    const createdEvents = await db('events')
      .join('organizations', 'events.organization_id', 'organizations.id')
      .where('events.created_by', userId)
      .select(
        'events.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id'
      )
      .orderBy('events.start_time', 'desc');

    // Combine and deduplicate events (user might have both created and registered for same event)
    const eventMap = new Map();
    
    // Add created events first
    createdEvents.forEach(event => {
      eventMap.set(event.id, { ...event, event_type: 'created' });
    });
    
    // Add registered events, but don't overwrite created events
    registeredEvents.forEach(event => {
      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, { ...event, event_type: 'registered' });
      } else {
        // If user both created and registered, mark as both
        const existingEvent = eventMap.get(event.id);
        eventMap.set(event.id, { ...existingEvent, event_type: 'both', registration_status: event.registration_status });
      }
    });
    
    // Convert back to array and sort by start time
    const allEvents = Array.from(eventMap.values());
    allEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return allEvents;
  }

  // Get user's organizations (includes hidden ones with flag)
  async getUserOrganizations(userId: string): Promise<UserOrganization[]> {
    const organizations = await db('organization_members')
      .join(
        'organizations',
        'organization_members.organization_id',
        'organizations.id'
      )
      .join(
        'organization_roles',
        'organization_members.role_id',
        'organization_roles.id'
      )
      .where('organization_members.user_id', userId)
      .where('organization_members.is_active', true)
      .select(
        'organizations.*', // Get all organization fields for consistency
        'organizations.icon_url as logo_url', // Alias for frontend compatibility
        'organizations.total_members as member_count', // Alias for frontend compatibility
        'organization_members.is_active',
        'organization_members.is_hidden',
        'organization_members.joined_at',
        'organization_roles.name as role_name'
      )
      .orderBy('organization_members.joined_at', 'desc');

    return serializeUserOrganizations(organizations);
  }

  // Get user's events (both created and registered)
  async getUserEvents(userId: string): Promise<any[]> {
    // Get events user has registered for
    const registeredEvents = await db('event_registrations')
      .join('events', 'event_registrations.event_id', 'events.id')
      .join('organizations', 'events.organization_id', 'organizations.id')
      .select(
        'events.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id',
        'event_registrations.registered_at',
        db.raw("'registered' as user_relation")
      )
      .where({ 'event_registrations.user_id': userId });

    // Get events user has created (if they're organization owners/admins)
    const createdEvents = await db('events')
      .join('organizations', 'events.organization_id', 'organizations.id')
      .join('organization_members', function () {
        this.on('organizations.id', '=', 'organization_members.organization_id')
          .andOn('organization_members.user_id', '=', db.raw('?', [userId]))
          .andOnIn('organization_members.role', ['owner', 'admin']);
      })
      .select(
        'events.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id',
        'events.created_at as registered_at',
        db.raw("'created' as user_relation")
      );

    // Helper function to parse JSON fields (same as EventModel)
    const parseJsonField = (field: any): any[] => {
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return [];
        }
      }
      return [];
    };

    // Parse JSON fields for all events
    const parsedRegisteredEvents = registeredEvents.map(event => ({
      ...event,
      playstyle_tags: parseJsonField(event.playstyle_tags),
      activity_tags: parseJsonField(event.activity_tags),
    }));

    const parsedCreatedEvents = createdEvents.map(event => ({
      ...event,
      playstyle_tags: parseJsonField(event.playstyle_tags),
      activity_tags: parseJsonField(event.activity_tags),
    }));

    // Combine and sort by date
    const allEvents = [...parsedRegisteredEvents, ...parsedCreatedEvents];
    return allEvents.sort(
      (a, b) =>
        new Date(b.registered_at).getTime() -
        new Date(a.registered_at).getTime()
    );
  }

  // Leave an organization (set is_active to false)
  async leaveOrganization(
    userId: string,
    organizationSpectrumId: string
  ): Promise<{ success: boolean; message: string }> {
    // First, find the organization by spectrum ID
    const organization = await db('organizations')
      .where('rsi_org_id', organizationSpectrumId)
      .first();

    if (!organization) {
      return { success: false, message: 'Organization not found' };
    }

    // Check if user is a member
    const membership = await db('organization_members')
      .join(
        'organization_roles',
        'organization_members.role_id',
        'organization_roles.id'
      )
      .where('organization_members.organization_id', organization.id)
      .where('organization_members.user_id', userId)
      .where('organization_members.is_active', true)
      .select('organization_members.*', 'organization_roles.name as role_name')
      .first();

    if (!membership) {
      return {
        success: false,
        message: 'You are not a member of this organization',
      };
    }

    // Check if user is the owner - owners cannot leave
    if (membership.role_name === 'Owner') {
      return {
        success: false,
        message:
          'Organization owners cannot leave their organization. Transfer ownership first.',
      };
    }

    // Set is_active to false (leave the organization)
    await db('organization_members')
      .where('organization_id', organization.id)
      .where('user_id', userId)
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    // Update organization member count
    const memberCount = await db('organization_members')
      .where('organization_id', organization.id)
      .where('is_active', true)
      .count('* as count')
      .first();

    await db('organizations')
      .where('id', organization.id)
      .update({
        total_members: memberCount?.count || 0,
        updated_at: new Date(),
      });

    return { success: true, message: 'Successfully left the organization' };
  }

  // Hide an organization from user's page
  async hideOrganization(
    userId: string,
    organizationSpectrumId: string
  ): Promise<{ success: boolean; message: string }> {
    // First, find the organization by spectrum ID
    const organization = await db('organizations')
      .where('rsi_org_id', organizationSpectrumId)
      .first();

    if (!organization) {
      return { success: false, message: 'Organization not found' };
    }

    // Check if user is a member
    const membership = await db('organization_members')
      .where('organization_id', organization.id)
      .where('user_id', userId)
      .where('is_active', true)
      .first();

    if (!membership) {
      return {
        success: false,
        message: 'You are not a member of this organization',
      };
    }

    // Toggle hidden status
    const newHiddenStatus = !membership.is_hidden;

    await db('organization_members')
      .where('organization_id', organization.id)
      .where('user_id', userId)
      .update({
        is_hidden: newHiddenStatus,
        updated_at: new Date(),
      });

    return {
      success: true,
      message: newHiddenStatus
        ? 'Organization hidden from your profile'
        : 'Organization unhidden from your profile',
    };
  }

  // Get user rating summary
  async getUserRatingSummary(userId: string): Promise<{
    user_id: string;
    average_rating: number;
    total_reviews: number;
    rating_breakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    events_created: number;
    events_attended: number;
    organizations_member: number;
  }> {
    // Get rating stats for events created by this user
    const eventRatingStats = await db('event_reviews')
      .join('events', 'event_reviews.event_id', 'events.id')
      .where('events.created_by', userId)
      .select(
        db.raw('AVG(event_reviews.rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews'),
        db.raw('SUM(CASE WHEN event_reviews.rating = 5 THEN 1 ELSE 0 END) as rating_5'),
        db.raw('SUM(CASE WHEN event_reviews.rating = 4 THEN 1 ELSE 0 END) as rating_4'),
        db.raw('SUM(CASE WHEN event_reviews.rating = 3 THEN 1 ELSE 0 END) as rating_3'),
        db.raw('SUM(CASE WHEN event_reviews.rating = 2 THEN 1 ELSE 0 END) as rating_2'),
        db.raw('SUM(CASE WHEN event_reviews.rating = 1 THEN 1 ELSE 0 END) as rating_1')
      )
      .first();

    // Get count of events created by user
    const eventsCreated = await db('events')
      .count('* as total')
      .where('created_by', userId)
      .first();

    // Get count of events attended by user
    const eventsAttended = await db('event_registrations')
      .count('* as total')
      .where('user_id', userId)
      .first();

    // Get count of organizations user is member of
    const organizationsMember = await db('organization_members')
      .count('* as total')
      .where('user_id', userId)
      .first();

    return {
      user_id: userId,
      average_rating: parseFloat(eventRatingStats.average_rating) || 0,
      total_reviews: parseInt(eventRatingStats.total_reviews) || 0,
      rating_breakdown: {
        5: parseInt(eventRatingStats.rating_5) || 0,
        4: parseInt(eventRatingStats.rating_4) || 0,
        3: parseInt(eventRatingStats.rating_3) || 0,
        2: parseInt(eventRatingStats.rating_2) || 0,
        1: parseInt(eventRatingStats.rating_1) || 0,
      },
      events_created: parseInt(eventsCreated?.total as string) || 0,
      events_attended: parseInt(eventsAttended?.total as string) || 0,
      organizations_member: parseInt(organizationsMember?.total as string) || 0,
    };
  }
}
