import { DiscordService } from './discord_service';
import { DiscordServerModel } from '../models/discord_server_model';
import { DiscordEventModel } from '../models/discord_event_model';
import { EventModel } from '../models/event_model';
import { OrganizationModel } from '../models/organization_model';
import { Event } from '../types/event';
import logger from '../config/logger';

export class EventSyncService {
  private discordService: DiscordService;
  private discordServerModel: DiscordServerModel;
  private discordEventModel: DiscordEventModel;
  private eventModel: EventModel;
  private organizationModel: OrganizationModel;
  private readonly discordApiDelayMs: number;

  constructor() {
    this.discordService = new DiscordService();
    this.discordServerModel = new DiscordServerModel();
    this.discordEventModel = new DiscordEventModel();
    this.eventModel = new EventModel();
    this.organizationModel = new OrganizationModel();
    
    // Configurable delay between Discord API calls (default 1 second)
    this.discordApiDelayMs = parseInt(process.env.DISCORD_API_DELAY_MS || '1000', 10);
  }

  /**
   * Automatically create Discord event when a site event is created
   */
  async createDiscordEventForNewEvent(eventId: string): Promise<void> {
    try {
      logger.info(`Starting Discord event creation for event ${eventId}`);

      // Get event information
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        logger.error(`Event ${eventId} not found`);
        return;
      }
      
      logger.debug(`Event object:`, { 
        id: event.id, 
        organization_id: event.organization_id, 
        title: event.title,
        hasOrganizationId: 'organization_id' in event
      });

      // Check if Discord event already exists and is synced
      const existingDiscordEvent = await this.discordEventModel.findByEventId(eventId);
      if (existingDiscordEvent && existingDiscordEvent.sync_status === 'synced' && existingDiscordEvent.discord_event_id) {
        logger.info(`Discord event already exists and is synced for event ${eventId}`);
        return;
      }

      // Get organization's Discord server
      logger.debug(`Looking for Discord server for organization_id: ${JSON.stringify(event)} (type: ${typeof event.organization_id})`);
      const discordServer = await this.discordServerModel.findByOrganizationId(event.organization_id);
      if (!discordServer || !discordServer.is_active || !discordServer.auto_create_events) {
        logger.info(`Organization ${event.organization_id} does not have Discord integration enabled or auto-create is disabled`);
        return;
      }

      // Create Discord event with rate limiting handling
      const discordEventId = await this.discordService.createEventWithRetry(event, discordServer.discord_guild_id);

      // Create or update Discord event record
      if (existingDiscordEvent) {
        // Update existing record
        await this.discordEventModel.updateByEventId(eventId, {
          discord_event_id: discordEventId,
          sync_status: 'synced',
          last_sync_at: new Date(),
          sync_error: undefined,
        });
      } else {
        // Create new record
        await this.discordEventModel.create({
          event_id: eventId,
          discord_guild_id: discordServer.discord_guild_id,
          discord_event_id: discordEventId,
          sync_status: 'synced',
          last_sync_at: new Date(),
        });
      }

      logger.info(`Successfully created Discord event ${discordEventId} for event ${eventId}`);

      // Send announcement if configured
      if (discordServer.announcement_channel_id) {
        const organization = await this.organizationModel.findById(event.organization_id);
        if (organization) {
          await this.sendEventAnnouncement(event, discordServer.announcement_channel_id, organization.name);
        }
      }

    } catch (error) {
      logger.error(`Failed to create Discord event for event ${eventId}:`, error);

      // Create Discord event record with error status
      try {
        await this.discordEventModel.create({
          event_id: eventId,
          discord_guild_id: '', // Will be empty on error
          sync_status: 'failed',
          sync_error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (dbError) {
        logger.error(`Failed to create Discord event record for event ${eventId}:`, dbError);
      }
    }
  }

  /**
   * Update Discord event when site event is updated
   */
  async updateDiscordEventForUpdatedEvent(eventId: string): Promise<void> {
    try {
      logger.info(`Starting Discord event update for event ${eventId}`);

      // Get event and Discord event information
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        logger.error(`Event ${eventId} not found`);
        return;
      }

      const discordEvent = await this.discordEventModel.findByEventId(eventId);
      if (!discordEvent || !discordEvent.discord_event_id) {
        logger.info(`No Discord event found for event ${eventId}, creating new one`);
        await this.createDiscordEventForNewEvent(eventId);
        return;
      }

      // Update Discord event with rate limiting handling
      await this.discordService.updateEventWithRetry(
        discordEvent.discord_event_id,
        event,
        discordEvent.discord_guild_id,
      );

      // Update Discord event record
      await this.discordEventModel.updateByEventId(eventId, {
        sync_status: 'synced',
        last_sync_at: new Date(),
        sync_error: undefined,
      });

      logger.info(`Successfully updated Discord event ${discordEvent.discord_event_id} for event ${eventId}`);

    } catch (error) {
      logger.error(`Failed to update Discord event for event ${eventId}:`, error);

      // Update Discord event record with error status
      try {
        await this.discordEventModel.updateByEventId(eventId, {
          sync_status: 'failed',
          sync_error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (dbError) {
        logger.error(`Failed to update Discord event record for event ${eventId}:`, dbError);
      }
    }
  }

  /**
   * Cancel Discord event when site event is cancelled/deleted
   */
  async cancelDiscordEventForCancelledEvent(eventId: string): Promise<void> {
    try {
      logger.info(`Starting Discord event cancellation for event ${eventId}`);

      const discordEvent = await this.discordEventModel.findByEventId(eventId);
      if (!discordEvent || !discordEvent.discord_event_id) {
        logger.info(`No Discord event found for event ${eventId}`);
        return;
      }

      // Cancel Discord event
      await this.discordService.deleteEvent(
        discordEvent.discord_event_id,
        discordEvent.discord_guild_id,
      );

      // Update Discord event record
      await this.discordEventModel.updateByEventId(eventId, {
        sync_status: 'cancelled',
        last_sync_at: new Date(),
      });

      logger.info(`Successfully cancelled Discord event ${discordEvent.discord_event_id} for event ${eventId}`);

    } catch (error) {
      logger.error(`Failed to cancel Discord event for event ${eventId}:`, error);

      // Update Discord event record with error status
      try {
        await this.discordEventModel.updateByEventId(eventId, {
          sync_status: 'failed',
          sync_error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (dbError) {
        logger.error(`Failed to update Discord event record for event ${eventId}:`, dbError);
      }
    }
  }

  /**
   * Sync all pending Discord events
   */
  async syncAllPendingEvents(): Promise<void> {
    try {
      logger.info('Starting bulk sync of pending Discord events');

      const pendingEvents = await this.discordEventModel.listPendingSync();
      logger.info(`Found ${pendingEvents.length} pending Discord events to sync`);

      for (const discordEvent of pendingEvents) {
        try {
          await this.updateDiscordEventForUpdatedEvent(discordEvent.event_id);
        } catch (error) {
          logger.error(`Failed to sync Discord event ${discordEvent.id}:`, error);
        }
      }

      logger.info('Completed bulk sync of pending Discord events');

    } catch (error) {
      logger.error('Failed to sync pending Discord events:', error);
    }
  }

  /**
   * Retry failed Discord event syncs
   */
  async retryFailedEvents(): Promise<void> {
    try {
      logger.info('Starting retry of failed Discord events');

      const failedEvents = await this.discordEventModel.listFailedSync();
      logger.info(`Found ${failedEvents.length} failed Discord events to retry`);

      for (const discordEvent of failedEvents) {
        try {
          // Check if the event still exists
          const event = await this.eventModel.findById(discordEvent.event_id);
          if (!event) {
            logger.info(`Event ${discordEvent.event_id} no longer exists, marking Discord event as cancelled`);
            await this.discordEventModel.updateByEventId(discordEvent.event_id, {
              sync_status: 'cancelled',
              last_sync_at: new Date(),
            });
            continue;
          }

          // Try to sync again
          await this.updateDiscordEventForUpdatedEvent(discordEvent.event_id);
        } catch (error) {
          logger.error(`Failed to retry Discord event ${discordEvent.id}:`, error);
        }
      }

      logger.info('Completed retry of failed Discord events');

    } catch (error) {
      logger.error('Failed to retry failed Discord events:', error);
    }
  }

  /**
   * Sync events for a specific organization
   */
  async syncEventsForOrganization(organizationId: string): Promise<void> {
    try {
      logger.info(`Starting Discord event sync for organization ${organizationId}`);
      logger.debug(`Organization ID type: ${typeof organizationId}, value: ${organizationId}`);

      // Check if organization has an active Discord server connection
      const discordServer = await this.discordServerModel.findByOrganizationId(organizationId);
      if (!discordServer || !discordServer.is_active) {
        logger.info(`Organization ${organizationId} does not have Discord integration enabled`);
        return;
      }

      // Get all events for the organization
      const events = await this.eventModel.getEventsByOrganization(organizationId);
      logger.info(`Found ${events.length} events for organization ${organizationId}`);

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        try {
          const discordEvent = await this.discordEventModel.findByEventId(event.id);
          
          if (!discordEvent || discordEvent.sync_status === 'failed') {
            // Create new Discord event (or recreate if failed)
            await this.createDiscordEventForNewEvent(event.id);
          } else if (discordEvent.sync_status === 'pending') {
            // Update existing Discord event
            await this.updateDiscordEventForUpdatedEvent(event.id);
          }

          // Add delay between events to avoid rate limiting (except for the last event)
          if (i < events.length - 1) {
            logger.debug(`Waiting ${this.discordApiDelayMs}ms before processing next event to avoid rate limits`);
            await new Promise(resolve => setTimeout(resolve, this.discordApiDelayMs));
          }
        } catch (error) {
          logger.error(`Failed to sync event ${event.id} for organization ${organizationId}:`, error);
        }
      }

      logger.info(`Completed Discord event sync for organization ${organizationId}`);

    } catch (error) {
      logger.error(`Failed to sync events for organization ${organizationId}:`, error);
    }
  }

  /**
   * Send event announcement to Discord channel
   */
  private async sendEventAnnouncement(event: Event, channelId: string, organizationName: string): Promise<void> {
    try {
      const embed = await this.discordService.createEventAnnouncementEmbed(event, organizationName);

      await this.discordService.sendMessage(
        channelId,
        `🎉 **New Event Created!**`,
        embed,
      );

      logger.info(`Sent event announcement for event ${event.id} to channel ${channelId}`);

    } catch (error) {
      logger.error(`Failed to send event announcement for event ${event.id}:`, error);
    }
  }

  /**
   * Get Discord event sync statistics
   */
  async getSyncStats(): Promise<{
    total_events: number;
    synced_events: number;
    pending_events: number;
    failed_events: number;
    cancelled_events: number;
  }> {
    return await this.discordEventModel.getEventStats();
  }

  /**
   * Clean up cancelled Discord events
   */
  async cleanupCancelledEvents(): Promise<void> {
    try {
      logger.info('Starting cleanup of cancelled Discord events');

      const cancelledEvents = await this.discordEventModel.listBySyncStatus('cancelled');
      logger.info(`Found ${cancelledEvents.length} cancelled Discord events to cleanup`);

      for (const discordEvent of cancelledEvents) {
        try {
          // Check if the event still exists
          const event = await this.eventModel.findById(discordEvent.event_id);
          if (!event) {
            // Event no longer exists, delete the Discord event record
            await this.discordEventModel.delete(discordEvent.id);
            logger.info(`Deleted Discord event record ${discordEvent.id} for non-existent event ${discordEvent.event_id}`);
          }
        } catch (error) {
          logger.error(`Failed to cleanup Discord event ${discordEvent.id}:`, error);
        }
      }

      logger.info('Completed cleanup of cancelled Discord events');

    } catch (error) {
      logger.error('Failed to cleanup cancelled Discord events:', error);
    }
  }
}


const a = {
  'id': '8098cd9a-6c37-47d4-91d3-972cd8aa63c5',
  'title': 'Combat Training Session',
  'description': 'Intensive squadron formation practice and combat tactics training. All skill levels welcome!',
  'start_time': '2025-01-22T20:00:00.000Z',
  'end_time': '2025-01-22T22:00:00.000Z',
  'duration_minutes': null,
  'location': 'Arena Commander',
  'max_participants': 20,
  'is_public': true,
  'is_active': true,
  'registration_deadline': null,
  'created_at': '2025-09-23T04:55:25.052Z',
  'updated_at': '2025-09-23T04:55:25.052Z',
  'created_by': '3028b641-41e0-45f0-9104-28aa75be69dc',
  'playstyle_tags': ['Combat', 'Training'],
  'activity_tags': ['PvP', 'Squadron'],
  'languages': ['English'],
  'creator_handle': 'Khuzdul',
  'creator_avatar': 'https://robertsspaceindustries.com/media/ji9zg5icdpr0ur/heap_infobox/P-The-Grand-Budapest-Hotel-Tony-Revolori.jpg?v=1622521526',
};
