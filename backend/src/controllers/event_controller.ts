import { Request, Response } from 'express';
import { EventModel } from '../models/event_model';
import { OrganizationModel } from '../models/organization_model';
import { RoleModel } from '../models/role_model';
import { Event, CreateEventData, UpdateEventData } from '../types/event';
import { User } from '../types/user';
import logger from '../config/logger';
import { EventReminderService } from '../services/event_reminder_service';
import { NotificationService } from '../services/notification_service';
import { EventSyncService } from '../services/event_sync_service';
import { NotificationEntityType } from '../types/notification';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
// Removed response transformers - frontend handles rsi_org_id properly

import { getUserFromRequest, requireUserFromRequest } from '../utils/user-casting';
import {
  validatePlaystyleTags,
  validateActivityTags,
  getTagValidationErrorMessage,
} from '../utils/tagValidation';
const eventModel = new EventModel();
const organizationModel = new OrganizationModel();
const roleModel = new RoleModel();

export class EventController {
  // Helper methods for event parsing (copied from EventModel)
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

  private parseLanguageField(field: any): string[] {
    if (Array.isArray(field)) {
      return field.filter(
        (lang: any) => typeof lang === 'string' && lang.trim() !== ''
      );
    }
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [field];
      } catch {
        return [field];
      }
    }
    return [];
  }

  private parseJsonField(field: any): any[] {
    if (Array.isArray(field)) {
      return field;
    }
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
  // List events with filters
  async listEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        organization_id,
        is_upcoming,
        is_active,
        languages,
        playstyle_tags,
        page = 1,
        limit = 20,
        offset,
        sort_by = 'start_time',
        sort_order = 'asc',
        private_only = false,
      } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const calculatedOffset = offset
        ? parseInt(offset as string)
        : (parsedPage - 1) * parsedLimit;

      // Handle private_only parameter
      const isPrivateOnly = private_only === 'true';
      
      if (isPrivateOnly) {
        // Check authentication for private events
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: 'Authentication required to view private events',
          });
          return;
        }

        // Get private events for the authenticated user
        const user = requireUserFromRequest(req);
        const events = await eventModel.getPrivateEventsForUser(user.id, {
          limit: parsedLimit,
          offset: calculatedOffset,
        });

        // Get total count for pagination
        const totalResult = await eventModel.getPrivateEventsForUser(user.id, {
          limit: 10000, // Large limit to get all events for counting
          offset: 0,
        });

        res.json({
          success: true,
          data: {
            data: events,
            total: totalResult.length,
            pagination: {
              limit: parsedLimit,
              offset: calculatedOffset,
              total: totalResult.length,
            },
          },
        });
        return;
      }

      const filters = {
        organization_id: organization_id as string,
        is_upcoming:
          is_upcoming === 'true'
            ? true
            : is_upcoming === 'false'
              ? false
              : undefined,
        is_active:
          is_active === 'true'
            ? true
            : is_active === 'false'
              ? false
              : undefined,
        languages: languages as string,
        playstyle_tags: playstyle_tags
          ? (playstyle_tags as string).split(',')
          : undefined,
        limit: parsedLimit,
        offset: calculatedOffset,
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
        // Include private events if user is authenticated
        include_private: !!req.user,
        user_id: getUserFromRequest(req)?.id,
      };

      const result = await eventModel.list(filters);

      res.json({
        success: true,
        data: {
          data: result.data,
          total: result.total,
          pagination: {
            limit: filters.limit,
            offset: filters.offset,
            total: result.total,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to list events',
      });
    }
  }

  // Search events
  async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        q,
        organization_id,
        is_upcoming,
        languages,
        playstyle_tags,
        start_date,
        end_date,
        page = 1,
        limit = 20,
        offset,
      } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const calculatedOffset = offset
        ? parseInt(offset as string)
        : (parsedPage - 1) * parsedLimit;

      const filters = {
        organization_id: organization_id as string,
        is_upcoming:
          is_upcoming === 'true'
            ? true
            : is_upcoming === 'false'
              ? false
              : undefined,
        languages: languages as string,
        playstyle_tags: playstyle_tags
          ? (playstyle_tags as string).split(',')
          : undefined,
        start_date: start_date as string,
        end_date: end_date as string,
        limit: parsedLimit,
        offset: calculatedOffset,
        // Include private events if user is authenticated
        include_private: !!getUserFromRequest(req),
        user_id: getUserFromRequest(req)?.id,
      };

      const result = await eventModel.search(q as string, filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: result.total,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to search events',
      });
    }
  }

  // Get event by ID
  async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      // Get raw event data to preserve organization_id for transformation
      const rawEvent = await db('events')
        .leftJoin('users', 'events.created_by', 'users.id')
        .select(
          'events.*',
          'users.rsi_handle as creator_handle',
          'users.avatar_url as creator_avatar'
        )
        .where('events.id', id)
        .first();

      if (!rawEvent) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      // Parse the event manually (removes organization_id but we preserved it in rawEvent)
      const { organization_id: _, ...eventWithoutInternalId } = rawEvent;
      const event = {
        ...eventWithoutInternalId,
        start_time: this.normalizeTimestamp(rawEvent.start_time),
        end_time: this.normalizeTimestamp(rawEvent.end_time),
        created_at: this.normalizeTimestamp(rawEvent.created_at),
        updated_at: this.normalizeTimestamp(rawEvent.updated_at),
        languagess: Array.isArray(rawEvent.languagess) ? rawEvent.languagess : ['English'],
        playstyle_tags: this.parseJsonField(rawEvent.playstyle_tags),
        activity_tags: this.parseJsonField(rawEvent.activity_tags),
      };

      // If event is private, check if user has permission to view it
      if (!event.is_public) {
        if (!userId) {
          res.status(401).json({
            success: false,
            error: 'Authentication required to view private events',
          });
          return;
        }

        // Check if user is the event creator
        if (event.created_by === userId) {
          // Event creator can always view their own events
        } else if (event.organization_id) {
          // For organization events, check if user is a member
          const isMember = await organizationModel.isUserMember(
            event.organization_id,
            userId
          );
          if (!isMember) {
            res.status(403).json({
              success: false,
              error:
                'Access denied: Only organization members can view private events',
            });
            return;
          }
        } else {
          // Private event without organization - only creator can view
          res.status(403).json({
            success: false,
            error:
              'Access denied: Only the event creator can view private events',
          });
          return;
        }
      }

      // Get organization data (only if organization_id exists)
      const organization = rawEvent.organization_id 
        ? await organizationModel.findById(rawEvent.organization_id)
        : null;

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get event',
      });
    }
  }

  // Get event registrations
  async getEventRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = getUserFromRequest(req)?.id;

      // Check if event exists and user has permission to view registrations
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      // If event is private, check if user has permission to view it
      if (!event.is_public) {
        if (!userId) {
          res.status(401).json({
            success: false,
            error:
              'Authentication required to view private event registrations',
          });
          return;
        }

        // Check if user is the event creator
        if (event.created_by === userId) {
          // Event creator can always view their own event registrations
        } else if (event.organization_id) {
          // For organization events, check if user is a member
          const isMember = await organizationModel.isUserMember(
            event.organization_id,
            userId
          );
          if (!isMember) {
            res.status(403).json({
              success: false,
              error:
                'Access denied: Only organization members can view private event registrations',
            });
            return;
          }
        } else {
          // Private event without organization - only creator can view
          res.status(403).json({
            success: false,
            error:
              'Access denied: Only the event creator can view private event registrations',
          });
          return;
        }
      }

      const registrations = await eventModel.getEventRegistrations(id);

      res.json({
        success: true,
        data: registrations,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: registrations.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get event registrations',
      });
    }
  }

  // Create event
  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const eventData: CreateEventData = {
        ...req.body,
        created_by: userId,
      };

      // Validate tags
      if (eventData.playstyle_tags && eventData.playstyle_tags.length > 0) {
        const playstyleValidation = validatePlaystyleTags(eventData.playstyle_tags);
        if (!playstyleValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(playstyleValidation.invalidTags, 'playstyle'),
          });
          return;
        }
      }

      if (eventData.activity_tags && eventData.activity_tags.length > 0) {
        const activityValidation = validateActivityTags(eventData.activity_tags);
        if (!activityValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(activityValidation.invalidTags, 'activity'),
          });
          return;
        }
      }

      // Verify user has permission to create events for this organization
      if (eventData.organization_id) {
        let organization;
        
        // Check if organization_id is an RSI org ID (alphanumeric) or internal UUID
        if (/^[A-Z0-9]{1,20}$/.test(eventData.organization_id)) {
          // It's an RSI org ID
          organization = await organizationModel.findByRsiOrgId(
            eventData.organization_id
          );
        } else {
          // It's an internal UUID
          organization = await organizationModel.findById(
            eventData.organization_id
          );
        }
        
        if (!organization) {
          res.status(404).json({
            success: false,
            error: 'Organization not found',
          });
          return;
        }

        if (organization.owner_id !== userId) {
          res.status(403).json({
            success: false,
            error: 'Only organization owner can create events',
          });
          return;
        }
        
        // Convert RSI org ID to internal ID for storage
        eventData.organization_id = organization.id;
      }

      // Store the organization_id before creating the event (since parseEvent removes it)
      const organizationIdForTransform = eventData.organization_id;
      const event = await eventModel.create(eventData);

      // Create notification tasks for the new event
      try {
        const eventReminderService = new EventReminderService();
        await eventReminderService.createEventScheduledTasks(
          event.id,
          new Date(event.start_time)
        );
        logger.info(`Created notification tasks for event ${event.id}`);

        // Check if any tasks are due in the next 30 minutes and schedule them immediately
        const now = new Date();
        const next30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
        const eventStartTime = new Date(event.start_time);

        if (eventStartTime <= next30Minutes) {
          logger.info(
            `Event ${event.id} starts within 30 minutes, scheduling immediate task processing`
          );

          // Get tasks for this specific event that are due soon
          const dueTasks = await eventReminderService.getTasksDueBetween(
            now,
            next30Minutes
          );
          const eventTasks = dueTasks.filter(
            task => task.event_id === event.id
          );

          if (eventTasks.length > 0) {
            logger.info(
              `Found ${eventTasks.length} immediate tasks for event ${event.id}`
            );

            // Use the global task scheduler instance to schedule these tasks immediately
            const globalTaskScheduler = (global as any).taskScheduler;
            if (globalTaskScheduler) {
              await globalTaskScheduler.scheduleTasksImmediately(eventTasks);
            } else {
              logger.warn(
                'Global task scheduler not available, tasks will be picked up by next cron cycle'
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          `Failed to create notification tasks for event ${event.id}:`,
          error
        );
        // Don't fail the event creation if task creation fails
      }

      // Create Discord event if organization has Discord integration enabled
      try {
        const eventSyncService = new EventSyncService();
        await eventSyncService.createDiscordEventForNewEvent(event.id);
        logger.info(`Discord event sync initiated for event ${event.id}`);
      } catch (error) {
        logger.error(`Failed to create Discord event for event ${event.id}:`, error);
        // Don't fail the event creation if Discord sync fails
      }

      // Transform event to remove internal organization_id and add RSI org ID
      const organization = organizationIdForTransform
        ? await organizationModel.findById(organizationIdForTransform)
        : null;
      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create event',
      });
    }
  }

  // Update event
  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user has permission to update this event
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      if (event.organization_id) {
        const organization = await organizationModel.findById(
          event.organization_id
        );
        if (organization && organization.owner_id !== userId) {
          res.status(403).json({
            success: false,
            error: 'Only organization owner can update events',
          });
          return;
        }
      } else if (event.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only event creator can update events',
        });
        return;
      }

      const updateData: UpdateEventData = req.body;

      // Validate tags
      if (updateData.playstyle_tags && updateData.playstyle_tags.length > 0) {
        const playstyleValidation = validatePlaystyleTags(updateData.playstyle_tags);
        if (!playstyleValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(playstyleValidation.invalidTags, 'playstyle'),
          });
          return;
        }
      }

      if (updateData.activity_tags && updateData.activity_tags.length > 0) {
        const activityValidation = validateActivityTags(updateData.activity_tags);
        if (!activityValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(activityValidation.invalidTags, 'activity'),
          });
          return;
        }
      }

      // Check if start_time is being updated
      const isTimeChanged =
        updateData.start_time &&
        new Date(updateData.start_time).getTime() !==
          new Date(event.start_time).getTime();

      const updatedEvent = await eventModel.update(id, updateData);

      if (!updatedEvent) {
        res.status(500).json({
          success: false,
          error: 'Failed to update event',
        });
        return;
      }

      // If event time changed, update scheduled tasks and notifications
      if (isTimeChanged) {
        logger.info(
          `Event ${id} time changed from ${event.start_time} to ${updateData.start_time}, updating scheduled tasks`
        );

        try {
          const eventReminderService = new EventReminderService();

          // Cancel existing scheduled tasks and remove pending notifications
          await eventReminderService.cancelEventScheduledTasks(id);

          // Create new scheduled tasks for the updated time
          await eventReminderService.createEventScheduledTasks(
            id,
            new Date(updateData.start_time!)
          );

          // If the event starts within 30 minutes, schedule tasks immediately
          const now = new Date();
          const eventStart = new Date(updateData.start_time!);
          const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

          if (eventStart <= thirtyMinutesFromNow) {
            const taskScheduler = (global as any).taskScheduler;
            if (taskScheduler) {
              const upcomingTasks =
                await eventReminderService.getTasksDueBetween(
                  now,
                  thirtyMinutesFromNow
                );
              const eventTasks = upcomingTasks.filter(
                task => task.event_id === id
              );
              if (eventTasks.length > 0) {
                await taskScheduler.scheduleTasksImmediately(eventTasks);
                logger.info(
                  `Immediately scheduled ${eventTasks.length} tasks for updated event ${id}`
                );
              }
            }
          }

          logger.info(
            `Successfully updated scheduled tasks for event ${id} time change`
          );
        } catch (taskError) {
          logger.error(
            `Error updating scheduled tasks for event ${id}:`,
            taskError
          );
          // Don't fail the event update if task scheduling fails
        }
      }

      // Update Discord event if organization has Discord integration enabled
      try {
        const eventSyncService = new EventSyncService();
        await eventSyncService.updateDiscordEventForUpdatedEvent(id);
        logger.info(`Discord event sync initiated for updated event ${id}`);
      } catch (error) {
        logger.error(`Failed to update Discord event for event ${id}:`, error);
        // Don't fail the event update if Discord sync fails
      }

      res.json({
        success: true,
        data: updatedEvent,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update event',
      });
    }
  }

  // Delete event
  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user has permission to delete this event
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      if (event.organization_id) {
        const organization = await organizationModel.findById(
          event.organization_id
        );
        if (organization && organization.owner_id !== userId) {
          res.status(403).json({
            success: false,
            error: 'Only organization owner can delete events',
          });
          return;
        }
      } else if (event.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only event creator can delete events',
        });
        return;
      }

      // Cancel Discord event if it exists
      try {
        const eventSyncService = new EventSyncService();
        await eventSyncService.cancelDiscordEventForCancelledEvent(id);
        logger.info(`Discord event cancellation initiated for deleted event ${id}`);
      } catch (error) {
        logger.error(`Failed to cancel Discord event for event ${id}:`, error);
        // Don't fail the event deletion if Discord sync fails
      }

      const deleted = await eventModel.delete(id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete event',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete event',
      });
    }
  }

  // Register for event
  async registerForEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if event exists
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      // Check if event is still active and registration is open
      if (!event.is_active) {
        res.status(400).json({
          success: false,
          error: 'Event is not active',
        });
        return;
      }

      // Check if registration deadline has passed
      if (
        event.registration_deadline &&
        new Date() > new Date(event.registration_deadline)
      ) {
        res.status(400).json({
          success: false,
          error: 'Registration deadline has passed',
        });
        return;
      }

      // Check if user is already registered
      const isAlreadyRegistered = await eventModel.isUserRegistered(id, userId);
      if (isAlreadyRegistered) {
        res.status(400).json({
          success: false,
          error: 'Already registered for this event',
        });
        return;
      }

      // If event is private, check if user is a member of the organization
      if (!event.is_public && event.organization_id) {
        const isMember = await organizationModel.isUserMember(
          event.organization_id,
          userId
        );
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: 'Only organization members can join private events',
          });
          return;
        }
      }

      // Register user for event
      const registration = await eventModel.registerUser(id, userId);

      res.json({
        success: true,
        data: registration,
        message: 'Registered for event successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to register for event',
      });
    }
  }

  // Unregister from event
  async unregisterFromEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user is registered for the event
      const isRegistered = await eventModel.isUserRegistered(id, userId);
      if (!isRegistered) {
        res.status(400).json({
          success: false,
          error: 'Not registered for this event',
        });
        return;
      }

      // Unregister user from event
      const unregistered = await eventModel.unregisterUser(id, userId);
      if (!unregistered) {
        res.status(500).json({
          success: false,
          error: 'Failed to unregister from event',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Unregistered from event successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unregister from event',
      });
    }
  }

  // Cancel event
  async cancelEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user has permission to cancel this event
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      if (event.organization_id) {
        const organization = await organizationModel.findById(
          event.organization_id
        );
        if (organization && organization.owner_id !== userId) {
          res.status(403).json({
            success: false,
            error: 'Only organization owner can cancel events',
          });
          return;
        }
      } else if (event.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only event creator can cancel events',
        });
        return;
      }

      // TODO: Implement event cancellation logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Event cancelled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel event',
      });
    }
  }

  // Complete event
  async completeEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user has permission to complete this event
      const event = await eventModel.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Event not found',
        });
        return;
      }

      if (event.organization_id) {
        const organization = await organizationModel.findById(
          event.organization_id
        );
        if (organization && organization.owner_id !== userId) {
          res.status(403).json({
            success: false,
            error: 'Only organization owner can complete events',
          });
          return;
        }
      } else if (event.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only event creator can complete events',
        });
        return;
      }

      // TODO: Implement event completion logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Event completed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to complete event',
      });
    }
  }

  async getEventStats(eventId: string): Promise<{
    total_registrations: number;
    confirmed_registrations: number;
    pending_registrations: number;
  }> {
    const stats = await eventModel.getEventStats(eventId);
    return stats;
  }

  // Get upcoming events for home page
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 3 } = req.query;

      const filters = {
        is_upcoming: true,
        is_active: true,
        limit: parseInt(limit as string),
        // Include private events if user is authenticated
        include_private: !!getUserFromRequest(req),
        user_id: getUserFromRequest(req)?.id,
      };

      const result = await eventModel.list(filters);

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Failed to get upcoming events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upcoming events',
      });
    }
  }

  // Get private events for a user based on their organization memberships
  async getPrivateEvents(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const user = requireUserFromRequest(req);
      const events = await eventModel.getPrivateEventsForUser(user.id, {
        limit: parseInt(limit as string),
        offset,
      });

      res.json({
        success: true,
        data: {
          data: events,
          total: events.length,
          pagination: {
            limit: parseInt(limit as string),
            offset,
            total: events.length,
          },
        },
      });
    } catch (error) {
      console.error('Failed to get private events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get private events',
      });
    }
  }

  // Get notification usage for an event
  async getEventNotificationUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      // Permission checking is handled by requireEventNotificationPermission middleware
      const usage = await this.getEventNotificationUsageData(id, userId!);

      res.json({
        success: true,
        data: {
          notifications_sent: usage.notifications_sent,
          remaining: 10 - usage.notifications_sent,
        },
      });
    } catch (error) {
      logger.error('Error getting event notification usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification usage',
      });
    }
  }

  // Send custom notification for event
  async sendCustomNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, message } = req.body;
      const userId = getUserFromRequest(req)?.id;

      // Permission checking is handled by requireEventNotificationPermission middleware
      // Event data is available in req.event from the middleware

      // Validate input
      if (!title || !message) {
        res.status(400).json({
          success: false,
          error: 'Title and message are required',
        });
        return;
      }

      if (title.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Title must be 100 characters or less',
        });
        return;
      }

      if (message.length > 500) {
        res.status(400).json({
          success: false,
          error: 'Message must be 500 characters or less',
        });
        return;
      }

      // Check notification usage limit (max 10 per event per user)
      const usage = await this.getEventNotificationUsageData(id, userId!);
      if (usage.notifications_sent >= 10) {
        res.status(429).json({
          success: false,
          error: 'Notification limit reached (max 10 per event)',
        });
        return;
      }

      // Get event registrations
      const registrations = await eventModel.getEventRegistrations(id);
      const notifierIds = registrations.map(reg => reg.user_id);

      if (notifierIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No participants to notify',
        });
        return;
      }

      // Create custom notification
      logger.debug('Creating custom notification', {
        eventId: id,
        userId,
        title,
        message,
        notifierIds,
        notifierCount: notifierIds.length,
      });

      const notificationService = new NotificationService();
      await notificationService.createCustomEventNotification(
        NotificationEntityType.EVENT_REMINDER,
        id,
        userId!,
        notifierIds,
        title,
        message
      );

      logger.debug('Custom notification created successfully', {
        eventId: id,
        title,
        message,
      });

      // Update usage counter
      await this.updateEventNotificationUsageData(
        id,
        userId!,
        usage.notifications_sent + 1
      );

      logger.info(
        `Custom notification sent for event ${id} by user ${userId} to ${notifierIds.length} participants`
      );

      res.json({
        success: true,
        message: `Notification sent to ${notifierIds.length} participants`,
        notifications_sent: usage.notifications_sent + 1,
        remaining: 10 - (usage.notifications_sent + 1),
      });
    } catch (error) {
      logger.error('Error sending custom notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
      });
    }
  }

  // Get event notification usage for a user
  private async getEventNotificationUsageData(
    eventId: string,
    userId: string
  ): Promise<any> {
    try {
      const usage = await db('event_notification_usage')
        .where({ event_id: eventId, user_id: userId })
        .first();

      return usage || { notifications_sent: 0 };
    } catch (error) {
      logger.error('Error getting event notification usage:', error);
      return { notifications_sent: 0 };
    }
  }

  // Update event notification usage counter
  private async updateEventNotificationUsageData(
    eventId: string,
    userId: string,
    count: number
  ): Promise<void> {
    try {
      await db('event_notification_usage')
        .insert({
          id: uuidv4(),
          event_id: eventId,
          user_id: userId,
          notifications_sent: count,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(['event_id', 'user_id'])
        .merge({
          notifications_sent: count,
          updated_at: new Date(),
        });
    } catch (error) {
      logger.error('Error updating event notification usage:', error);
      throw error;
    }
  }
}
