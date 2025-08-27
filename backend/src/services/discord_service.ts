import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  APIGuild,
  APIChannel,
  APIGuildMember,
  APIGuildScheduledEvent,
  APIEmbed,
  APIWebhook,
  APIMessage,
  APIApplicationCommand,
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
} from 'discord-api-types/v10';
import {
  PermissionFlagsBits,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from 'discord-api-types/v10';
import { Event } from '../types/event';
import logger from '../config/logger';
import { DiscordClient, createDiscordClient } from './discord_client';
import { rateLimitService, RateLimitInfo } from './rate_limit_service';

export class DiscordService {
  private axiosClient: AxiosInstance;
  private botToken: string;
  private baseUrl = 'https://discord.com/api/v10';
  private discordClient: DiscordClient;

  // Expose the Discord client for signature validation
  get client(): DiscordClient {
    return this.discordClient;
  }

  constructor() {
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
    
    if (!this.botToken) {
      throw new Error('DISCORD_BOT_TOKEN environment variable is required');
    }

    this.axiosClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bot ${this.botToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SC-Orgs-Bot/1.0',
      },
      timeout: 10000, // 10 seconds
    });

    // Initialize Discord client (real or no-op based on environment)
    this.discordClient = createDiscordClient();

    // Add response interceptor for error handling
    this.axiosClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const discordError = {
            code: error.response.data.code || error.response.status,
            message: error.response.data.message || error.message,
            errors: error.response.data.errors,
          };
          logger.error('Discord API Error:', discordError);
          throw new Error(`Discord API Error: ${discordError.message}`);
        }
        logger.error('Discord Service Error:', error.message);
        throw error;
      }
    );
  }

  // Server Management Methods

  async getGuildInfo(guildId: string): Promise<APIGuild> {
    try {
      return await this.discordClient.getGuildInfo(guildId);
    } catch (error) {
      logger.error(`Failed to get guild info for ${guildId}:`, error);
      throw error;
    }
  }

  async getGuildChannels(guildId: string): Promise<APIChannel[]> {
    try {
      const response: AxiosResponse<APIChannel[]> = await this.axiosClient.get(`/guilds/${guildId}/channels`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get channels for guild ${guildId}:`, error);
      throw error;
    }
  }

  async getGuildMembers(guildId: string, limit: number = 1000): Promise<APIGuildMember[]> {
    try {
      const response: AxiosResponse<APIGuildMember[]> = await this.axiosClient.get(
        `/guilds/${guildId}/members`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get members for guild ${guildId}:`, error);
      throw error;
    }
  }

  async getGuildMember(guildId: string, userId: string): Promise<APIGuildMember> {
    try {
      const response: AxiosResponse<APIGuildMember> = await this.axiosClient.get(
        `/guilds/${guildId}/members/${userId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get member ${userId} from guild ${guildId}:`, error);
      throw error;
    }
  }

  async verifyBotPermissions(guildId: string): Promise<boolean> {
    try {
      // Get guild info to check bot permissions
      const guild = await this.getGuildInfo(guildId);
      
      // Check if bot has required permissions by checking guild permissions
      // This is a simplified check - in practice, you'd need to check channel-specific permissions
      const requiredPermissions = 
        BigInt(8589934592) | // ManageEvents
        BigInt(2048) |       // SendMessages
        BigInt(16384) |      // EmbedLinks
        BigInt(65536) |      // ReadMessageHistory
        BigInt(1024);        // ViewChannel
      
      // For now, we'll assume permissions are granted if we can access the guild
      // In a real implementation, you'd check the bot's role permissions
      const hasRequiredPermissions = true; // Simplified for now
      
      logger.info(`Bot permissions check for guild ${guildId}: ${hasRequiredPermissions}`);
      return hasRequiredPermissions;
    } catch (error) {
      logger.error(`Failed to verify bot permissions for guild ${guildId}:`, error);
      return false;
    }
  }

  async verifyUserPermissions(guildId: string, userId: string): Promise<{
    hasPermission: boolean;
    permissionLevel: 'owner' | 'admin' | 'manage_server' | 'none';
    reason?: string;
  }> {
    try {
      // Get guild info
      const guild = await this.getGuildInfo(guildId);
      
      // Check if user is the guild owner
      if (guild.owner_id === userId) {
        return {
          hasPermission: true,
          permissionLevel: 'owner',
        };
      }

      // Get user's member info to check permissions
      const member = await this.getGuildMember(guildId, userId);
      
      // Check if user has Administrator permission
      const userPermissions = BigInt((member as any).permissions || '0');
      const administratorPermission = BigInt(8); // Administrator permission
      const manageGuildPermission = BigInt(32); // Manage Server permission
      
      if (userPermissions & administratorPermission) {
        return {
          hasPermission: true,
          permissionLevel: 'admin',
        };
      }
      
      if (userPermissions & manageGuildPermission) {
        return {
          hasPermission: true,
          permissionLevel: 'manage_server',
        };
      }

      return {
        hasPermission: false,
        permissionLevel: 'none',
        reason: 'User does not have Manage Server or Administrator permissions',
      };

    } catch (error) {
      logger.error(`Failed to verify user permissions for user ${userId} in guild ${guildId}:`, error);
      return {
        hasPermission: false,
        permissionLevel: 'none',
        reason: 'Failed to verify user permissions',
      };
    }
  }

  async getUserDiscordServers(userId: string): Promise<Array<{
    id: string;
    name: string;
    icon?: string;
    permissions: string[];
    canManage: boolean;
  }>> {
    try {
      // Get user's guilds from Discord API
      const response = await this.axiosClient.get('/users/@me/guilds');
      const guilds = response.data;

      // Filter guilds where user has management permissions
      const manageableGuilds = [];
      
      for (const guild of guilds) {
        try {
          const permissionCheck = await this.verifyUserPermissions(guild.id, userId);
          
          if (permissionCheck.hasPermission) {
            manageableGuilds.push({
              id: guild.id,
              name: guild.name,
              icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined,
              permissions: [permissionCheck.permissionLevel],
              canManage: true,
            });
          }
        } catch (error) {
          logger.warn(`Failed to check permissions for guild ${guild.id}:`, error);
        }
      }

      return manageableGuilds;

    } catch (error) {
      logger.error(`Failed to get user Discord servers for user ${userId}:`, error);
      throw error;
    }
  }

  private async getBotUserId(): Promise<string> {
    try {
      const response = await this.axiosClient.get('/users/@me');
      return response.data.id;
    } catch (error) {
      logger.error('Failed to get bot user ID:', error);
      throw error;
    }
  }

  // Rate Limiting Methods

  /**
   * Check if error is a rate limit error and extract retry info
   */
  private isRateLimitError(error: any): RateLimitInfo | null {
    return rateLimitService.extractRateLimitInfo(error);
  }

  /**
   * Create event with rate limiting handling
   */
  async createEventWithRetry(eventData: Event, guildId: string): Promise<string> {
    const taskId = `create-event-${eventData.id}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await this.createEvent(eventData, guildId);
          resolve(result);
        } catch (error: any) {
          const rateLimitInfo = this.isRateLimitError(error);
          if (rateLimitInfo) {
            // Schedule retry
            await rateLimitService.scheduleRetry(taskId, task, rateLimitInfo);
            // Don't reject - the retry will handle it
          } else {
            reject(error);
          }
        }
      };
      
      task();
    });
  }

  /**
   * Update event with rate limiting handling
   */
  async updateEventWithRetry(discordEventId: string, eventData: Event, guildId: string): Promise<void> {
    const taskId = `update-event-${discordEventId}-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          await this.updateEvent(discordEventId, eventData, guildId);
          resolve();
        } catch (error: any) {
          const rateLimitInfo = this.isRateLimitError(error);
          if (rateLimitInfo) {
            // Schedule retry
            await rateLimitService.scheduleRetry(taskId, task, rateLimitInfo);
            // Don't reject - the retry will handle it
          } else {
            reject(error);
          }
        }
      };
      
      task();
    });
  }

  // Event Management Methods

  async createEvent(eventData: Event, guildId: string): Promise<string> {
    try {
      return await this.discordClient.createEvent(eventData, guildId);
    } catch (error) {
      logger.error(`Failed to create Discord event for guild ${guildId}:`, error);
      throw error;
    }
  }

  async updateEvent(discordEventId: string, eventData: Event, guildId: string): Promise<void> {
    try {
      await this.discordClient.updateEvent(discordEventId, eventData, guildId);
    } catch (error) {
      logger.error(`Failed to update Discord event ${discordEventId}:`, error);
      throw error;
    }
  }

  async deleteEvent(discordEventId: string, guildId: string): Promise<void> {
    try {
      await this.discordClient.deleteEvent(discordEventId, guildId);
    } catch (error) {
      logger.error(`Failed to delete Discord event ${discordEventId}:`, error);
      throw error;
    }
  }

  async getEvent(discordEventId: string, guildId: string): Promise<APIGuildScheduledEvent> {
    try {
      return await this.discordClient.getEvent(discordEventId, guildId);
    } catch (error) {
      logger.error(`Failed to get Discord event ${discordEventId}:`, error);
      throw error;
    }
  }

  async listServerEvents(guildId: string): Promise<APIGuildScheduledEvent[]> {
    try {
      const response: AxiosResponse<APIGuildScheduledEvent[]> = await this.axiosClient.get(
        `/guilds/${guildId}/scheduled-events`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to list events for guild ${guildId}:`, error);
      throw error;
    }
  }

  // Channel Management Methods

  async sendMessage(channelId: string, content: string, embed?: APIEmbed): Promise<APIMessage> {
    try {
      return await this.discordClient.sendMessage(channelId, content, embed);
    } catch (error) {
      logger.error(`Failed to send message to channel ${channelId}:`, error);
      throw error;
    }
  }

  async createWebhook(channelId: string, name: string = 'SC-Orgs Bot'): Promise<APIWebhook> {
    try {
      const webhookData = {
        name,
        avatar: null, // Use default avatar
      };

      const response: AxiosResponse<APIWebhook> = await this.axiosClient.post(
        `/channels/${channelId}/webhooks`,
        webhookData
      );

      logger.info(`Created webhook ${response.data.id} for channel ${channelId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to create webhook for channel ${channelId}:`, error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string): Promise<APIChannel> {
    try {
      const response: AxiosResponse<APIChannel> = await this.axiosClient.get(`/channels/${channelId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get channel info for ${channelId}:`, error);
      throw error;
    }
  }

  // Utility Methods

  async createEventAnnouncementEmbed(eventData: Event, organizationName: string): Promise<APIEmbed> {
    const startTime = new Date(eventData.start_time).toLocaleString();
    const endTime = new Date(eventData.end_time).toLocaleString();

    return {
      title: `🎮 ${eventData.title}`,
      description: eventData.description || 'Join us for this exciting event!',
      color: 0x00ff00, // Green color
      fields: [
        {
          name: '📅 Start Time',
          value: startTime,
          inline: true,
        },
        {
          name: '⏰ End Time',
          value: endTime,
          inline: true,
        },
        {
          name: '🏢 Organization',
          value: organizationName,
          inline: true,
        },
        ...(eventData.location ? [{
          name: '📍 Location',
          value: eventData.location,
          inline: true,
        }] : []),
        ...(eventData.max_participants ? [{
          name: '👥 Max Participants',
          value: eventData.max_participants.toString(),
          inline: true,
        }] : []),
      ],
      footer: {
        text: 'Created by SC-Orgs',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async generateBotInviteUrl(clientId: string, guildId?: string): Promise<string> {
    const requiredPermissions = 
      BigInt(8589934592) | // ManageEvents
      BigInt(2048) |       // SendMessages
      BigInt(16384) |      // EmbedLinks
      BigInt(65536) |      // ReadMessageHistory
      BigInt(1024);        // ViewChannel
    
    const permissions = requiredPermissions.toString();
    const scopes = 'bot';
    
    let inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
    
    if (guildId) {
      inviteUrl += `&guild_id=${guildId}`;
    }
    
    return inviteUrl;
  }

  // Slash Command Management

  async registerSlashCommand(command: Omit<APIApplicationCommand, 'id' | 'application_id' | 'version'>): Promise<void> {
    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (!clientId) {
        throw new Error('DISCORD_CLIENT_ID environment variable is required');
      }

      await this.axiosClient.post(`/applications/${clientId}/commands`, command);
      logger.info(`Registered slash command: ${command.name}`);
    } catch (error) {
      logger.error(`Failed to register slash command ${command.name}:`, error);
      throw error;
    }
  }

  async deleteSlashCommand(commandId: string): Promise<void> {
    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (!clientId) {
        throw new Error('DISCORD_CLIENT_ID environment variable is required');
      }

      await this.axiosClient.delete(`/applications/${clientId}/commands/${commandId}`);
      logger.info(`Deleted slash command: ${commandId}`);
    } catch (error) {
      logger.error(`Failed to delete slash command ${commandId}:`, error);
      throw error;
    }
  }

  async getSlashCommands(): Promise<APIApplicationCommand[]> {
    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (!clientId) {
        throw new Error('DISCORD_CLIENT_ID environment variable is required');
      }

      const response = await this.axiosClient.get(`/applications/${clientId}/commands`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get slash commands:', error);
      throw error;
    }
  }

  async sendInteractionResponse(interactionId: string, interactionToken: string, response: APIInteractionResponse): Promise<void> {
    try {
      await this.discordClient.sendInteractionResponse(interactionId, interactionToken, response);
      logger.info(`Sent interaction response for interaction ${interactionId}`);
    } catch (error) {
      logger.error(`Failed to send interaction response for interaction ${interactionId}:`, error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.axiosClient.get('/users/@me');
      return true;
    } catch (error) {
      logger.error('Discord service health check failed:', error);
      return false;
    }
  }

  // Rate Limiting Helper
  private async handleRateLimit(response: AxiosResponse): Promise<void> {
    const retryAfter = response.headers['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter) * 1000;
      logger.warn(`Rate limited, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}