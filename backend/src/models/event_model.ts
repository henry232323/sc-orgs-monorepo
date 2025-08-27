import db from '../config/database';
import { Event, CreateEventData, UpdateEventData } from '../types/event';
import { v4 as uuidv4 } from 'uuid';

export class EventModel {
  async create(eventData: CreateEventData): Promise<Event> {
    // Let PostgreSQL generate the UUID
    const [event] = await db('events')
      .insert({
        ...eventData,
        languages: eventData.languages || ['en'],
        playstyle_tags: eventData.playstyle_tags || [],
        activity_tags: eventData.activity_tags || [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.parseEvent(event);
  }

  async findById(id: string): Promise<Event | null> {
    const event = await db('events')
      .leftJoin('users', 'events.created_by', 'users.id')
      .select(
        'events.*',
        'users.rsi_handle as creator_handle',
        'users.avatar_url as creator_avatar'
      )
      .where('events.id', id)
      .first();
      
    if (!event) return null;

    return this.parseEvent(event);
  }

  // Parse event data from database format
  private parseEvent(event: any): Event {
    const { organization_id, ...eventWithoutInternalId } = event;
    return {
      ...eventWithoutInternalId,
      organization_id: organization_id, // Include organization_id in the returned object
      start_time: this.normalizeTimestamp(event.start_time),
      end_time: this.normalizeTimestamp(event.end_time),
      created_at: this.normalizeTimestamp(event.created_at),
      updated_at: this.normalizeTimestamp(event.updated_at),
      languages: Array.isArray(event.languages) ? event.languages : ['en'],
      playstyle_tags: Array.isArray(event.playstyle_tags) ? event.playstyle_tags : [],
      activity_tags: Array.isArray(event.activity_tags) ? event.activity_tags : [],
    };
  }

  // Normalize timestamp to ISO string format
  private normalizeTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    
    // If it's already an ISO string, return as is
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      return timestamp;
    }
    
    // If it's a number (Unix timestamp), convert to ISO string
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    
    // If it's a Date object, convert to ISO string
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // Fallback: try to create a Date and convert
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      console.warn('Failed to normalize timestamp:', timestamp, error);
      return '';
    }
  }

  // Helper method to parse languages field (can be string or array)
  private parseLanguageField(field: any): string[] {
    if (Array.isArray(field)) {
      return field.filter(
        item => typeof item === 'string' && item !== '[object Object]'
      );
    }
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            item => typeof item === 'string' && item !== '[object Object]'
          );
        }
        return typeof parsed === 'string' && parsed !== '[object Object]'
          ? [parsed]
          : ['en'];
      } catch {
        return field !== '[object Object]' ? [field] : ['en'];
      }
    }
    return ['en'];
  }

  // Helper method to parse JSON fields safely
  private parseJsonField(field: any): any[] {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  }

  async update(id: string, updateData: UpdateEventData): Promise<Event | null> {
    const updateFields: any = {
      ...updateData,
      updated_at: new Date(),
    };

    // Arrays are stored directly in PostgreSQL - no serialization needed
    if (updateData.languages) {
      updateFields.languages = updateData.languages;
    }
    if (updateData.playstyle_tags) {
      updateFields.playstyle_tags = updateData.playstyle_tags;
    }
    if (updateData.activity_tags) {
      updateFields.activity_tags = updateData.activity_tags;
    }

    const [event] = await db('events')
      .where({ id })
      .update(updateFields)
      .returning('*');

    return event ? this.parseEvent(event) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('events').where({ id }).del();
    return deleted > 0;
  }

  async list(
    filters: {
      organization_id?: string;
      is_upcoming?: boolean;
      is_active?: boolean;
      languages?: string;
      playstyle_tags?: string[];
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      include_private?: boolean;
      user_id?: string; // For checking private event access
    } = {}
  ): Promise<{ data: Event[]; total: number }> {
    let query = db('events')
      .leftJoin('organizations', 'events.organization_id', 'organizations.id')
      .select(
        'events.*',
        'organizations.rsi_org_id as organization_spectrum_id'
      );

    // Filter by visibility - only show public events unless explicitly including private
    if (!filters.include_private) {
      query = query.where({ is_public: true });
    } else if (filters.user_id) {
      // If including private events, only show those the user has access to
      query = query.where(function() {
        this.where({ is_public: true })
          .orWhere(function() {
            // Private events where user is the creator
            this.where({ is_public: false, created_by: filters.user_id });
          })
          .orWhere(function() {
            // Private events where user is a member of the organization
            this.where({ is_public: false })
              .whereExists(function() {
                this.select('*')
                  .from('organization_members')
                  .whereRaw('organization_members.organization_id = events.organization_id')
                  .where('organization_members.user_id', filters.user_id);
              });
          });
      });
    }

    if (filters.organization_id) {
      query = query.where({ organization_id: filters.organization_id });
    }

    if (filters.is_upcoming !== undefined) {
      if (filters.is_upcoming) {
        query = query.whereRaw('start_time > NOW()');
      } else {
        query = query.whereRaw('start_time <= NOW()');
      }
    }

    if (filters.is_active !== undefined) {
      query = query.where({ is_active: filters.is_active });
    }

    if (filters.languages) {
      // Search in languages JSON array
      query = query.whereRaw(`
        languages::text LIKE '%${filters.languages}%'
      `);
    }

    if (filters.playstyle_tags && filters.playstyle_tags.length > 0) {
      // Search in playstyle_tags JSON array
      filters.playstyle_tags.forEach(tag => {
        query = query.whereRaw(`
          ? = ANY(events.playstyle_tags)
        `, [tag]);
      });
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const sortBy = filters.sort_by || 'start_time';
    const sortOrder = filters.sort_order || 'asc';

    // Create a count query with the same filters but without limit/offset
    let countQuery = db('events')
      .leftJoin('organizations', 'events.organization_id', 'organizations.id');

    // Apply the same visibility filtering to count query
    if (!filters.include_private) {
      countQuery = countQuery.where({ is_public: true });
    } else if (filters.user_id) {
      countQuery = countQuery.where(function() {
        this.where({ is_public: true })
          .orWhere(function() {
            this.where({ is_public: false, created_by: filters.user_id });
          })
          .orWhere(function() {
            this.where({ is_public: false })
              .whereExists(function() {
                this.select('*')
                  .from('organization_members')
                  .whereRaw('organization_members.organization_id = events.organization_id')
                  .where('organization_members.user_id', filters.user_id);
              });
          });
      });
    }

    if (filters.organization_id) {
      countQuery = countQuery.where({
        organization_id: filters.organization_id,
      });
    }

    if (filters.is_upcoming !== undefined) {
      if (filters.is_upcoming) {
        countQuery = countQuery.whereRaw('start_time > NOW()');
      } else {
        countQuery = countQuery.whereRaw('start_time <= NOW()');
      }
    }

    if (filters.is_active !== undefined) {
      countQuery = countQuery.where({ is_active: filters.is_active });
    }

    if (filters.languages) {
      // Search in languages JSON array
      countQuery = countQuery.whereRaw(`
        languages::text LIKE '%${filters.languages}%'
      `);
    }

    if (filters.playstyle_tags && filters.playstyle_tags.length > 0) {
      filters.playstyle_tags.forEach(tag => {
        countQuery = countQuery.whereRaw(`
          ? = ANY(events.playstyle_tags)
        `, [tag]);
      });
    }

    // Execute both queries
    const [events, countResult] = await Promise.all([
      query.orderBy(sortBy, sortOrder),
      countQuery.count('* as total').first(),
    ]);

    // Parse JSON fields for all events
    const parsedEvents = events.map(event => this.parseEvent(event));

    return {
      data: parsedEvents,
      total: parseInt((countResult as any)?.total as string) || 0,
    };
  }

  async search(
    searchTerm: string,
    filters: {
      organization_id?: string;
      is_upcoming?: boolean;
      languages?: string;
      playstyle_tags?: string[];
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
      include_private?: boolean;
      user_id?: string; // For checking private event access
    } = {}
  ): Promise<{ data: Event[]; total: number }> {
    let query = db('events')
      .leftJoin('organizations', 'events.organization_id', 'organizations.id')
      .leftJoin('users', 'events.created_by', 'users.id')
      .select(
        'events.*',
        'organizations.rsi_org_id as organization_spectrum_id',
        'users.rsi_handle as creator_handle',
        'users.avatar_url as creator_avatar'
      )
      .where(function () {
        this.where('events.title', 'like', `%${searchTerm}%`)
          .orWhere('events.description', 'like', `%${searchTerm}%`)
          .orWhere('organizations.name', 'like', `%${searchTerm}%`)
          .orWhere('organizations.rsi_org_id', 'like', `%${searchTerm}%`)
          .orWhere('users.rsi_handle', 'like', `%${searchTerm}%`);
      });

    // Filter by visibility - only show public events unless explicitly including private
    if (!filters.include_private) {
      query = query.where({ is_public: true });
    } else if (filters.user_id) {
      // If including private events, only show those the user has access to
      query = query.where(function() {
        this.where({ is_public: true })
          .orWhere(function() {
            // Private events where user is the creator
            this.where({ is_public: false, created_by: filters.user_id });
          })
          .orWhere(function() {
            // Private events where user is a member of the organization
            this.where({ is_public: false })
              .whereExists(function() {
                this.select('*')
                  .from('organization_members')
                  .whereRaw('organization_members.organization_id = events.organization_id')
                  .where('organization_members.user_id', filters.user_id);
              });
          });
      });
    }

    if (filters.organization_id) {
      query = query.where({ organization_id: filters.organization_id });
    }

    if (filters.is_upcoming !== undefined) {
      if (filters.is_upcoming) {
        query = query.whereRaw('start_time > NOW()');
      } else {
        query = query.whereRaw('start_time <= NOW()');
      }
    }

    if (filters.languages) {
      // Search in languages JSON array
      query = query.whereRaw(`
        languages::text LIKE '%${filters.languages}%'
      `);
    }

    if (filters.playstyle_tags && filters.playstyle_tags.length > 0) {
      // Search in playstyle_tags JSON array
      filters.playstyle_tags.forEach(tag => {
        query = query.whereRaw(`
          ? = ANY(events.playstyle_tags)
        `, [tag]);
      });
    }

    if (filters.start_date) {
      query = query.where('start_time', '>=', filters.start_date);
    }

    if (filters.end_date) {
      query = query.where('end_time', '<=', filters.end_date);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    // Create a count query with the same filters but without limit/offset
    let countQuery = db('events')
      .leftJoin('organizations', 'events.organization_id', 'organizations.id')
      .leftJoin('users', 'events.created_by', 'users.id')
      .where(function () {
        this.where('events.title', 'like', `%${searchTerm}%`)
          .orWhere('events.description', 'like', `%${searchTerm}%`)
          .orWhere('organizations.name', 'like', `%${searchTerm}%`)
          .orWhere('organizations.rsi_org_id', 'like', `%${searchTerm}%`)
          .orWhere('users.rsi_handle', 'like', `%${searchTerm}%`);
      });

    // Apply the same visibility filtering to count query
    if (!filters.include_private) {
      countQuery = countQuery.where({ is_public: true });
    } else if (filters.user_id) {
      countQuery = countQuery.where(function() {
        this.where({ is_public: true })
          .orWhere(function() {
            this.where({ is_public: false, created_by: filters.user_id });
          })
          .orWhere(function() {
            this.where({ is_public: false })
              .whereExists(function() {
                this.select('*')
                  .from('organization_members')
                  .whereRaw('organization_members.organization_id = events.organization_id')
                  .where('organization_members.user_id', filters.user_id);
              });
          });
      });
    }

    if (filters.organization_id) {
      countQuery = countQuery.where({
        organization_id: filters.organization_id,
      });
    }

    if (filters.is_upcoming !== undefined) {
      if (filters.is_upcoming) {
        countQuery = countQuery.whereRaw('start_time > NOW()');
      } else {
        countQuery = countQuery.whereRaw('start_time <= NOW()');
      }
    }

    if (filters.languages) {
      // Search in languages JSON array
      countQuery = countQuery.whereRaw(`
        languages::text LIKE '%${filters.languages}%'
      `);
    }

    if (filters.playstyle_tags && filters.playstyle_tags.length > 0) {
      filters.playstyle_tags.forEach(tag => {
        countQuery = countQuery.whereRaw(`
          ? = ANY(events.playstyle_tags)
        `, [tag]);
      });
    }

    if (filters.start_date) {
      countQuery = countQuery.where('start_time', '>=', filters.start_date);
    }

    if (filters.end_date) {
      countQuery = countQuery.where('end_time', '<=', filters.end_date);
    }

    // Execute both queries
    const [events, countResult] = await Promise.all([
      query.orderBy('start_time', 'asc'),
      countQuery.count('* as total').first(),
    ]);

    // Parse JSON fields for all events
    const parsedEvents = events.map(event => this.parseEvent(event));

    return {
      data: parsedEvents,
      total: parseInt((countResult as any)?.total as string) || 0,
    };
  }

  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    const events = await db('events')
      .where('start_time', '>', new Date())
      .where({ is_active: true })
      .orderBy('start_time', 'asc')
      .limit(limit);

    // Parse JSON fields for all events
    return events.map(event => this.parseEvent(event));
  }

  async getEventsByOrganization(organizationId: string, userId?: string): Promise<Event[]> {
    let query = db('events')
      .where({ organization_id: organizationId, is_active: true });

    // Only show public events unless user is a member of the organization
    if (!userId) {
      query = query.where({ is_public: true });
    } else {
      // Check if user is a member of the organization
      const isMember = await db('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .first();
      
      if (!isMember) {
        // User is not a member, only show public events
        query = query.where({ is_public: true });
      }
      // If user is a member, show all events (public and private)
    }

    const events = await query.orderBy('start_time', 'desc');

    // Parse JSON fields for all events
    return events.map(event => this.parseEvent(event));
  }

  async getEventRegistrations(eventId: string): Promise<any[]> {
    return db('event_registrations')
      .where({ event_id: eventId })
      .join('users', 'event_registrations.user_id', 'users.id')
      .select(
        'event_registrations.*',
        'users.rsi_handle as username',
        'users.avatar_url'
      )
      .orderBy('event_registrations.registered_at', 'asc');
  }

  async getEventsStartingBetween(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return db('events')
      .where('is_active', true)
      .whereBetween('start_time', [startDate, endDate])
      .select('*')
      .orderBy('start_time', 'asc');
  }

  async registerUser(eventId: string, userId: string): Promise<boolean> {
    try {
      // Let PostgreSQL generate the UUID
      await db('event_registrations').insert({
        event_id: eventId,
        user_id: userId,
        registered_at: new Date(),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async unregisterUser(eventId: string, userId: string): Promise<boolean> {
    const deleted = await db('event_registrations')
      .where({ event_id: eventId, user_id: userId })
      .del();
    return deleted > 0;
  }

  async getUserRegistration(
    eventId: string,
    userId: string
  ): Promise<any | null> {
    const registration = await db('event_registrations')
      .where({ event_id: eventId, user_id: userId })
      .first();
    return registration || null;
  }

  async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
    const registration = await db('event_registrations')
      .where({ event_id: eventId, user_id: userId })
      .first();
    return !!registration;
  }

  async getEventStats(eventId: string): Promise<{
    total_registrations: number;
    confirmed_registrations: number;
    pending_registrations: number;
  }> {
    const stats = await db('event_registrations')
      .where({ event_id: eventId })
      .count('* as total')
      .first();

    const confirmed = await db('event_registrations')
      .where({ event_id: eventId, status: 'confirmed' })
      .count('* as count')
      .first();

    const pending = await db('event_registrations')
      .where({ event_id: eventId, status: 'pending' })
      .count('* as count')
      .first();

    return {
      total_registrations: parseInt(stats?.total as string) || 0,
      confirmed_registrations: parseInt(confirmed?.count as string) || 0,
      pending_registrations: parseInt(pending?.count as string) || 0,
    };
  }

  // Get private events for a user based on their organization memberships
  async getPrivateEventsForUser(
    userId: string,
    filters: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Event[]> {
    let query = db('events')
      .join('organizations', 'events.organization_id', 'organizations.id')
      .join('organization_members', function () {
        this.on(
          'organizations.id',
          '=',
          'organization_members.organization_id'
        ).andOn('organization_members.user_id', '=', db.raw('?', [userId]));
      })
      .where('events.is_public', false)
      .where('events.is_active', true)
      .select(
        'events.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id'
      );

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query.orderBy('events.start_time', 'asc');
  }
}
