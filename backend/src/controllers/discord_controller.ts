import { Request, Response } from 'express';
import { DiscordService } from '../services/discord_service';
import { EventSyncService } from '../services/event_sync_service';
import { DiscordCommandService } from '../services/discord_command_service';
import { DiscordServerModel } from '../models/discord_server_model';
import { DiscordEventModel } from '../models/discord_event_model';
import { OrganizationModel } from '../models/organization_model';
import { EventModel } from '../models/event_model';
import {
  CreateDiscordServerData,
  UpdateDiscordServerData,
  DiscordServer,
  DiscordEvent,
  APIApplicationCommandInteraction,
} from '../types/discord';
import { InteractionType } from 'discord-api-types/v10';
import { DiscordSignatureRequest } from '../services/discord_client';
import logger from '../config/logger';

export class DiscordController {
  private discordService: DiscordService;
  private eventSyncService: EventSyncService;
  private discordCommandService: DiscordCommandService;
  private discordServerModel: DiscordServerModel;
  private discordEventModel: DiscordEventModel;
  private organizationModel: OrganizationModel;
  private eventModel: EventModel;

  constructor() {
    this.discordService = new DiscordService();
    this.eventSyncService = new EventSyncService();
    this.discordCommandService = new DiscordCommandService();
    this.discordServerModel = new DiscordServerModel();
    this.discordEventModel = new DiscordEventModel();
    this.organizationModel = new OrganizationModel();
    this.eventModel = new EventModel();
  }

  // Discord Server Management (Read-only)

  async getDiscordServer(req: Request, res: Response): Promise<void> {
    try {
      const organization = (req as any).org;
      if (!organization) {
        res.status(400).json({
          success: false,
          message: 'Organization not resolved',
        });
        return;
      }

      const discordServer = await this.discordServerModel.findByRsiOrgId(organization.rsi_org_id);
      if (!discordServer) {
        res.status(404).json({
          success: false,
          message: 'Discord server not found for this organization',
        });
        return;
      }

      // Get fresh guild information from Discord
      try {
        const guildInfo = await this.discordService.getGuildInfo(discordServer.discord_guild_id);
        const hasPermissions = await this.discordService.verifyBotPermissions(discordServer.discord_guild_id);

        res.json({
          success: true,
          data: {
            id: discordServer.id,
            rsi_org_id: discordServer.rsi_org_id,
            discord_guild_id: discordServer.discord_guild_id,
            guild_name: discordServer.guild_name,
            guild_icon_url: discordServer.guild_icon_url,
            is_active: discordServer.is_active,
            auto_create_events: discordServer.auto_create_events,
            created_at: discordServer.created_at,
            guild_info: guildInfo,
            bot_permissions_valid: hasPermissions,
            last_verified: new Date(),
          },
        });
      } catch (discordError) {
        // Return server info even if Discord API fails
        res.json({
          success: true,
          data: {
            id: discordServer.id,
            rsi_org_id: discordServer.rsi_org_id,
            discord_guild_id: discordServer.discord_guild_id,
            guild_name: discordServer.guild_name,
            guild_icon_url: discordServer.guild_icon_url,
            is_active: discordServer.is_active,
            auto_create_events: discordServer.auto_create_events,
            created_at: discordServer.created_at,
            bot_permissions_valid: false,
            last_verified: null,
            discord_error: 'Unable to verify Discord connection',
          },
        });
      }
    } catch (error) {
      logger.error('Failed to get Discord server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Discord server information',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }


  async getUserDiscordServers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Get Discord servers connected to organizations where the user is a member
      const connectedServers = await this.discordServerModel.getServersForUser(userId);

      res.json({
        success: true,
        data: {
          servers: connectedServers,
          total: connectedServers.length,
          message: connectedServers.length > 0 
            ? `Found ${connectedServers.length} Discord servers connected to your organizations`
            : 'No Discord servers connected to your organizations',
        },
      });
    } catch (error) {
      logger.error('Failed to get user Discord servers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Discord servers',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async disconnectDiscordServer(req: Request, res: Response): Promise<void> {
    try {
      const organization = (req as any).org;
      if (!organization) {
        res.status(400).json({
          success: false,
          message: 'Organization not resolved',
        });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Find the Discord server for this organization
      const discordServer = await this.discordServerModel.findByRsiOrgId(organization.rsi_org_id);
      if (!discordServer) {
        res.status(404).json({
          success: false,
          message: 'Discord server not found for this organization',
        });
        return;
      }

      // Check if user has permission to manage this Discord server
      const userPermissionCheck = await this.discordService.verifyUserPermissions(discordServer.discord_guild_id, userId);
      if (!userPermissionCheck.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'You don\'t have permission to manage this Discord server',
        });
        return;
      }

      // Delete the Discord server record
      await this.discordServerModel.delete(discordServer.id);

      logger.info(`Discord server ${discordServer.discord_guild_id} disconnected from organization ${organization.rsi_org_id} by user ${userId}`);

      res.json({
        success: true,
        message: 'Discord server disconnected successfully',
      });
    } catch (error) {
      logger.error('Failed to disconnect Discord server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect Discord server',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }


  // Discord Event Management

  async createDiscordEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      // Get event information
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      // Get organization's Discord server
      const organization = await this.organizationModel.findById(event.organization_id);
      if (!organization || !organization.discord_server_id) {
        res.status(400).json({
          success: false,
          message: 'Organization does not have Discord integration enabled',
        });
        return;
      }

      const discordServer = await this.discordServerModel.findById(organization.discord_server_id);
      if (!discordServer || !discordServer.is_active) {
        res.status(400).json({
          success: false,
          message: 'Discord server is not active',
        });
        return;
      }

      // Check if Discord event already exists
      const existingDiscordEvent = await this.discordEventModel.findByEventId(eventId);
      if (existingDiscordEvent) {
        res.status(409).json({
          success: false,
          message: 'Discord event already exists for this event',
        });
        return;
      }

      // Create Discord event
      const discordEventId = await this.discordService.createEvent(event, discordServer.discord_guild_id);

      // Create Discord event record
      const discordEvent = await this.discordEventModel.create({
        event_id: eventId,
        discord_guild_id: discordServer.discord_guild_id,
        discord_event_id: discordEventId,
        sync_status: 'synced',
        last_sync_at: new Date(),
      });

      logger.info(`Discord event ${discordEventId} created for event ${eventId}`);

      res.status(201).json({
        success: true,
        message: 'Discord event created successfully',
        data: discordEvent,
      });
    } catch (error) {
      logger.error('Failed to create Discord event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Discord event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async syncDiscordEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      // Get event and Discord event information
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      const discordEvent = await this.discordEventModel.findByEventId(eventId);
      if (!discordEvent || !discordEvent.discord_event_id) {
        res.status(404).json({
          success: false,
          message: 'Discord event not found',
        });
        return;
      }

      // Update Discord event
      await this.discordService.updateEvent(
        discordEvent.discord_event_id,
        event,
        discordEvent.discord_guild_id
      );

      // Update Discord event record
      const updatedDiscordEvent = await this.discordEventModel.updateByEventId(eventId, {
        sync_status: 'synced',
        last_sync_at: new Date(),
        sync_error: undefined,
      });

      logger.info(`Discord event ${discordEvent.discord_event_id} synced for event ${eventId}`);

      res.json({
        success: true,
        message: 'Discord event synced successfully',
        data: updatedDiscordEvent,
      });
    } catch (error) {
      logger.error('Failed to sync Discord event:', error);
      
      // Update Discord event record with error
      await this.discordEventModel.updateByEventId(req.params.eventId, {
        sync_status: 'failed',
        sync_error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Failed to sync Discord event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async cancelDiscordEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      const discordEvent = await this.discordEventModel.findByEventId(eventId);
      if (!discordEvent || !discordEvent.discord_event_id) {
        res.status(404).json({
          success: false,
          message: 'Discord event not found',
        });
        return;
      }

      // Cancel Discord event
      await this.discordService.deleteEvent(
        discordEvent.discord_event_id,
        discordEvent.discord_guild_id
      );

      // Update Discord event record
      await this.discordEventModel.updateByEventId(eventId, {
        sync_status: 'cancelled',
        last_sync_at: new Date(),
      });

      logger.info(`Discord event ${discordEvent.discord_event_id} cancelled for event ${eventId}`);

      res.json({
        success: true,
        message: 'Discord event cancelled successfully',
      });
    } catch (error) {
      logger.error('Failed to cancel Discord event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel Discord event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getDiscordEventStatus(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      const discordEvent = await this.discordEventModel.findByEventId(eventId);
      if (!discordEvent) {
        res.status(404).json({
          success: false,
          message: 'Discord event not found',
        });
        return;
      }

      res.json({
        success: true,
        data: discordEvent,
      });
    } catch (error) {
      logger.error('Failed to get Discord event status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Discord event status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Bulk Synchronization Methods

  async syncAllPendingEvents(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting bulk sync of all pending Discord events');
      
      await this.eventSyncService.syncAllPendingEvents();
      
      res.json({
        success: true,
        message: 'Bulk sync of pending Discord events completed',
      });
    } catch (error) {
      logger.error('Failed to sync all pending Discord events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync pending Discord events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async retryFailedEvents(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting retry of failed Discord events');
      
      await this.eventSyncService.retryFailedEvents();
      
      res.json({
        success: true,
        message: 'Retry of failed Discord events completed',
      });
    } catch (error) {
      logger.error('Failed to retry failed Discord events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry failed Discord events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async syncOrganizationEvents(req: Request, res: Response): Promise<void> {
    try {
      const organization = (req as any).org;
      if (!organization) {
        res.status(400).json({
          success: false,
          message: 'Organization not resolved',
        });
        return;
      }
      
      logger.info(`Starting Discord event sync for organization ${organization.rsi_org_id}`);
      logger.debug(`Organization resolved:`, { 
        id: organization.id, 
        rsi_org_id: organization.rsi_org_id, 
        name: organization.name 
      });
      
      await this.eventSyncService.syncEventsForOrganization(organization.id);
      
      res.json({
        success: true,
        message: `Discord event sync completed for organization ${organization.rsi_org_id}`,
      });
    } catch (error) {
      logger.error(`Failed to sync events for organization:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync organization events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getSyncStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.eventSyncService.getSyncStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get Discord sync stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Discord sync statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async cleanupCancelledEvents(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting cleanup of cancelled Discord events');
      
      await this.eventSyncService.cleanupCancelledEvents();
      
      res.json({
        success: true,
        message: 'Cleanup of cancelled Discord events completed',
      });
    } catch (error) {
      logger.error('Failed to cleanup cancelled Discord events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup cancelled Discord events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Discord Webhook Handler
  async handleDiscordWebhook(req: DiscordSignatureRequest, res: Response): Promise<void> {
    try {
      // Parse the raw body (already validated by signature middleware)
      const bodyString = req.body instanceof Buffer ? req.body.toString('utf8') : req.body;
      
      logger.debug('Discord webhook received', {
        bodyType: typeof req.body,
        isBuffer: req.body instanceof Buffer,
        bodyLength: bodyString.length,
        bodyPreview: bodyString.substring(0, 100) + '...'
      });
      
      const webhookPayload = JSON.parse(bodyString);
      const { type } = webhookPayload;
      
      logger.debug('Discord webhook payload parsed', {
        type,
        applicationId: webhookPayload.application_id,
        guildId: webhookPayload.guild_id,
        channelId: webhookPayload.channel_id,
        userId: webhookPayload.member?.user?.id || webhookPayload.user?.id
      });

      // Handle PING (type: 0) - Discord webhook verification
      if (type === 0) {
        logger.debug('Discord PING received, responding with 204');
        res.status(204).end(); // Return 204 No Content for PING
        return;
      }

      // Handle webhook events (type: 1) - Discord webhook events
      if (type === 1) {
        // Check if this is a webhook event (has 'event' property) or an interaction (has 'token' property)
        if (webhookPayload.event) {
          logger.debug('Discord webhook event received', {
            eventType: webhookPayload.event?.type,
            timestamp: webhookPayload.event?.timestamp
          });
          await this.handleWebhookEvent(webhookPayload);
          logger.debug('Discord webhook event processed, responding with 204');
          res.status(204).end(); // Return 204 No Content to acknowledge receipt
          return;
        } else if (webhookPayload.token) {
          // This is a PING interaction (type 1) - respond with PONG
          logger.debug('Discord PING interaction received, responding with PONG');
          res.json({ type: 1 }); // PONG response
          return;
        } else {
          logger.warn('Unknown type 1 payload structure:', webhookPayload);
          res.status(204).end(); // Acknowledge receipt
          return;
        }
      }

      // Handle slash command interactions (type: 2) - Discord interactions
      if (type === 2) {
        logger.debug('Discord interaction received', {
          commandName: webhookPayload.data?.name,
          commandType: webhookPayload.data?.type,
          guildId: webhookPayload.guild_id,
          userId: webhookPayload.member?.user?.id || webhookPayload.user?.id
        });
        await this.discordCommandService.handleSlashCommand(webhookPayload);
        logger.debug('Discord interaction processed, responding with ACK');
        res.json({ type: 1 }); // ACK the interaction
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Unknown webhook type',
      });

    } catch (error) {
      logger.error('Discord webhook handler failed:', error);
      res.status(500).json({
        success: false,
        message: 'Discord webhook handler failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Handle Discord webhook events (type: 1)
  private async handleWebhookEvent(webhookPayload: any): Promise<void> {
    try {
      const { event } = webhookPayload;
      
      if (!event) {
        logger.warn('Webhook event missing event data:', webhookPayload);
        return;
      }

      const { type: eventType, data } = event;

      switch (eventType) {
        case 'APPLICATION_AUTHORIZED':
          await this.handleApplicationAuthorized(data);
          break;
        
        case 'APPLICATION_DEAUTHORIZED':
          await this.handleApplicationDeauthorized(data);
          break;
        
        case 'ENTITLEMENT_CREATE':
          await this.handleEntitlementCreate(data);
          break;
        
        case 'LOBBY_MESSAGE_CREATE':
          await this.handleLobbyMessageCreate(data);
          break;
        
        case 'LOBBY_MESSAGE_UPDATE':
          await this.handleLobbyMessageUpdate(data);
          break;
        
        case 'LOBBY_MESSAGE_DELETE':
          await this.handleLobbyMessageDelete(data);
          break;
        
        case 'GAME_DIRECT_MESSAGE_CREATE':
          await this.handleGameDirectMessageCreate(data);
          break;
        
        case 'GAME_DIRECT_MESSAGE_UPDATE':
          await this.handleGameDirectMessageUpdate(data);
          break;
        
        case 'GAME_DIRECT_MESSAGE_DELETE':
          await this.handleGameDirectMessageDelete(data);
          break;
        
        default:
          logger.info(`Unhandled webhook event type: ${eventType}`, { event });
      }
    } catch (error) {
      logger.error('Failed to handle webhook event:', error);
      throw error;
    }
  }

  // Application Authorized Event Handler
  private async handleApplicationAuthorized(data: any): Promise<void> {
    logger.info('Application authorized:', {
      integrationType: data.integration_type,
      userId: data.user?.id,
      guildId: data.guild?.id,
      scopes: data.scopes
    });
    
    // TODO: Implement application authorization logic
    // This could include:
    // - Setting up initial server configuration
    // - Creating default Discord server records
    // - Sending welcome messages
  }

  // Application Deauthorized Event Handler
  private async handleApplicationDeauthorized(data: any): Promise<void> {
    logger.info('Application deauthorized:', {
      userId: data.user?.id
    });
    
    // TODO: Implement application deauthorization logic
    // This could include:
    // - Cleaning up Discord server records
    // - Removing bot from server
    // - Sending farewell messages
  }

  // Entitlement Create Event Handler
  private async handleEntitlementCreate(data: any): Promise<void> {
    logger.info('Entitlement created:', {
      entitlementId: data.id,
      userId: data.user_id,
      skuId: data.sku_id,
      type: data.type
    });
    
    // TODO: Implement entitlement logic
    // This could include:
    // - Upgrading user/organization features
    // - Enabling premium functionality
  }

  // Lobby Message Event Handlers
  private async handleLobbyMessageCreate(data: any): Promise<void> {
    logger.info('Lobby message created:', {
      messageId: data.id,
      lobbyId: data.lobby_id,
      channelId: data.channel_id,
      authorId: data.author?.id,
      content: data.content?.substring(0, 100) // Log first 100 chars
    });
    
    // TODO: Implement lobby message handling
    // This could include:
    // - Processing game-related messages
    // - Syncing with organization events
  }

  private async handleLobbyMessageUpdate(data: any): Promise<void> {
    logger.info('Lobby message updated:', {
      messageId: data.id,
      lobbyId: data.lobby_id,
      content: data.content?.substring(0, 100)
    });
  }

  private async handleLobbyMessageDelete(data: any): Promise<void> {
    logger.info('Lobby message deleted:', {
      messageId: data.id,
      lobbyId: data.lobby_id
    });
  }

  // Game Direct Message Event Handlers
  private async handleGameDirectMessageCreate(data: any): Promise<void> {
    logger.info('Game direct message created:', {
      messageId: data.id,
      channelId: data.channel_id,
      authorId: data.author?.id,
      content: data.content?.substring(0, 100)
    });
  }

  private async handleGameDirectMessageUpdate(data: any): Promise<void> {
    logger.info('Game direct message updated:', {
      messageId: data.id,
      channelId: data.channel_id,
      content: data.content?.substring(0, 100)
    });
  }

  private async handleGameDirectMessageDelete(data: any): Promise<void> {
    logger.info('Game direct message deleted:', {
      messageId: data.id,
      channelId: data.channel_id
    });
  }

  // Health Check
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const isHealthy = await this.discordService.healthCheck();
      
      res.json({
        success: true,
        data: {
          discord_service: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Discord service health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Discord service health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Slash Command Management
  async registerSlashCommands(req: Request, res: Response): Promise<void> {
    try {
      await this.discordCommandService.registerSlashCommands();
      
      res.json({
        success: true,
        message: 'Discord slash commands registered successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to register Discord slash commands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register Discord slash commands',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}