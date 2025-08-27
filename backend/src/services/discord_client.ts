import { APIGuild, APIInteractionResponse, GuildSystemChannelFlags, Locale, APIGuildScheduledEvent, APIEmbed, APIMessage } from 'discord-api-types/v10';
import { NextFunction, Request, Response } from 'express';
import nacl from 'tweetnacl';
import logger from '../config/logger';
import { Event } from '../types/event';

export interface DiscordClient {
  getGuildInfo(guildId: string): Promise<APIGuild>;
  sendInteractionResponse(interactionId: string, interactionToken: string, response: APIInteractionResponse): Promise<void>;
  validateSignature(req: Request, res: Response, next: NextFunction): void;
  createEvent(eventData: Event, guildId: string): Promise<string>;
  updateEvent(discordEventId: string, eventData: Event, guildId: string): Promise<void>;
  deleteEvent(discordEventId: string, guildId: string): Promise<void>;
  getEvent(discordEventId: string, guildId: string): Promise<APIGuildScheduledEvent>;
  sendMessage(channelId: string, content: string, embed?: APIEmbed): Promise<APIMessage>;
}

export interface DiscordSignatureRequest extends Request {
  body: Buffer | string | any;
}

export class RealDiscordClient implements DiscordClient {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = 'https://discord.com/api/v10';
  }

  async getGuildInfo(guildId: string): Promise<APIGuild> {
    const axios = require('axios');
    
    try {
      const response = await axios.get(`${this.baseUrl}/guilds/${guildId}`, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  async sendInteractionResponse(interactionId: string, interactionToken: string, response: APIInteractionResponse): Promise<void> {
    const axios = require('axios');
    
    try {
      await axios.post(`${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`, response, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  validateSignature(req: DiscordSignatureRequest, res: Response, next: NextFunction): void {
    try {
      const signature = req.headers['x-signature-ed25519'] as string;
      const timestamp = req.headers['x-signature-timestamp'] as string;
      const publicKey = process.env.DISCORD_PUBLIC_KEY;

      // Check if required headers are present
      if (!signature || !timestamp) {
        logger.warn('Discord webhook missing required signature headers');
        res.status(401).json({
          success: false,
          message: 'Missing Discord signature headers',
        });
        return;
      }

      // Check if public key is configured
      if (!publicKey) {
        logger.error('DISCORD_PUBLIC_KEY environment variable is not set');
        res.status(500).json({
          success: false,
          message: 'Discord signature validation not configured',
        });
        return;
      }

      // Get raw body for signature verification
      const body = req.body;
      if (!body) {
        logger.warn('Discord webhook has no body');
        res.status(400).json({
          success: false,
          message: 'No request body',
        });
        return;
      }

      // Debug logging for body type and content
      logger.debug('Discord webhook body info', {
        bodyType: typeof body,
        isBuffer: body instanceof Buffer,
        bodyLength: body instanceof Buffer ? body.length : (typeof body === 'string' ? body.length : JSON.stringify(body).length),
        bodyPreview: body instanceof Buffer ? body.toString('utf8').substring(0, 100) : 
                    typeof body === 'string' ? body.substring(0, 100) : 
                    JSON.stringify(body).substring(0, 100)
      });

      // Convert body to string for signature verification
      // For Discord signature validation, we need the raw body as a string
      const bodyString = body instanceof Buffer ? body.toString('utf8') : 
                        typeof body === 'string' ? body : 
                        JSON.stringify(body);
      
      // Debug logging for signature validation
      logger.debug('Discord signature validation details', {
        signature: signature.substring(0, 16) + '...',
        timestamp,
        bodyStringLength: bodyString.length,
        signaturePayloadLength: (timestamp + bodyString).length,
        signaturePayloadPreview: (timestamp + bodyString).substring(0, 50) + '...'
      });
      
      // Create signature payload
      const signaturePayload = timestamp + bodyString;

      // Convert hex strings to Uint8Array
      const signatureBytes = hexToUint8Array(signature);
      const publicKeyBytes = hexToUint8Array(publicKey);
      const messageBytes = new TextEncoder().encode(signaturePayload);

      // Debug logging for signature verification
      logger.debug('Discord signature verification details', {
        signatureBytesLength: signatureBytes.length,
        publicKeyBytesLength: publicKeyBytes.length,
        messageBytesLength: messageBytes.length,
        publicKeyPreview: publicKey.substring(0, 16) + '...',
        messageBytesPreview: Array.from(messageBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('') + '...'
      });

      // Verify signature
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

      if (!isValid) {
        logger.warn('Discord webhook signature validation failed', {
          signature: signature.substring(0, 8) + '...',
          timestamp,
          bodyLength: bodyString.length,
          publicKey: publicKey.substring(0, 8) + '...',
          signaturePayloadLength: signaturePayload.length,
          bodyStringPreview: bodyString.substring(0, 100) + '...'
        });
        res.status(401).json({
          success: false,
          message: 'Invalid Discord signature',
        });
        return;
      }

      logger.debug('Discord webhook signature validated successfully', {
        signature: signature.substring(0, 8) + '...',
        timestamp,
        bodyLength: bodyString.length
      });
      next();

    } catch (error) {
      logger.error('Discord signature validation error:', error);
      res.status(401).json({
        success: false,
        message: 'Discord signature validation failed',
      });
    }
  }

  async createEvent(eventData: Event, guildId: string): Promise<string> {
    const axios = require('axios');
    
    try {
      const discordEventData = {
        name: eventData.title,
        description: eventData.description || 'Event created by SC-Orgs',
        scheduled_start_time: eventData.start_time,
        scheduled_end_time: eventData.end_time,
        privacy_level: 2, // GuildScheduledEventPrivacyLevel.GuildOnly
        entity_type: 3, // GuildScheduledEventEntityType.External
        entity_metadata: {
          location: eventData.location || 'TBD',
        },
      };

      const response = await axios.post(`${this.baseUrl}/guilds/${guildId}/scheduled-events`, discordEventData, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Created Discord event ${response.data.id} for guild ${guildId}`);
      return response.data.id;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  async updateEvent(discordEventId: string, eventData: Event, guildId: string): Promise<void> {
    const axios = require('axios');
    
    try {
      const discordEventData = {
        name: eventData.title,
        description: eventData.description || 'Event updated by SC-Orgs',
        scheduled_start_time: eventData.start_time,
        scheduled_end_time: eventData.end_time,
        entity_metadata: {
          location: eventData.location || 'TBD',
        },
      };

      await axios.patch(`${this.baseUrl}/guilds/${guildId}/scheduled-events/${discordEventId}`, discordEventData, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Updated Discord event ${discordEventId} for guild ${guildId}`);
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  async deleteEvent(discordEventId: string, guildId: string): Promise<void> {
    const axios = require('axios');
    
    try {
      await axios.delete(`${this.baseUrl}/guilds/${guildId}/scheduled-events/${discordEventId}`, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Deleted Discord event ${discordEventId} from guild ${guildId}`);
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  async getEvent(discordEventId: string, guildId: string): Promise<APIGuildScheduledEvent> {
    const axios = require('axios');
    
    try {
      const response = await axios.get(`${this.baseUrl}/guilds/${guildId}/scheduled-events/${discordEventId}`, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

  async sendMessage(channelId: string, content: string, embed?: APIEmbed): Promise<APIMessage> {
    const axios = require('axios');
    
    try {
      const messageData: any = { content };
      if (embed) {
        messageData.embeds = [embed];
      }

      const response = await axios.post(`${this.baseUrl}/channels/${channelId}/messages`, messageData, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Sent message to channel ${channelId}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unknown Discord API error';
        const errorCode = error.response.data?.code;
        throw new Error(`Discord API Error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }
      throw error;
    }
  }

}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export class NoOpDiscordClient implements DiscordClient {
  async getGuildInfo(guildId: string): Promise<APIGuild> {
    // Return mock guild data for development
    return {
      id: guildId,
      name: 'Test Server',
      icon: null,
      description: null,
      splash: null,
      discovery_splash: null,
      features: [],
      emojis: [],
      stickers: [],
      banner: null,
      owner_id: '122739797646245899',
      application_id: null,
      region: 'us-central',
      afk_channel_id: null,
      afk_timeout: 300,
      system_channel_id: null,
      system_channel_flags: GuildSystemChannelFlags.SuppressJoinNotifications,
      widget_enabled: false,
      widget_channel_id: null,
      verification_level: 1,
      roles: [],
      default_message_notifications: 1,
      mfa_level: 0,
      explicit_content_filter: 0,
      max_presences: undefined,
      max_members: undefined,
      max_stage_video_channel_users: undefined,
      max_video_channel_users: undefined,
      vanity_url_code: null,
      premium_tier: 0,
      premium_subscription_count: 0,
      preferred_locale: Locale.EnglishUS,
      rules_channel_id: null,
      safety_alerts_channel_id: null,
      public_updates_channel_id: null,
      hub_type: null,
      premium_progress_bar_enabled: false,
      nsfw_level: 0,
      incidents_data: null
    };
  }

  async sendInteractionResponse(interactionId: string, interactionToken: string, response: APIInteractionResponse): Promise<void> {
    // No-op: just log the response for development
    console.log(`[NoOpDiscordClient] Would send interaction response:`, JSON.stringify(response, null, 2));
  }

  validateSignature(req: DiscordSignatureRequest, res: Response, next: NextFunction): void {
    // No-op: skip signature validation in development
    logger.debug('Discord signature validation skipped in development mode');
    next();
  }

  async createEvent(eventData: Event, guildId: string): Promise<string> {
    const mockEventId = `dev-event-${Date.now()}`;
    logger.info(`[NoOpDiscordClient] Would create Discord event ${mockEventId} for guild ${guildId}: ${eventData.title}`);
    return mockEventId;
  }

  async updateEvent(discordEventId: string, eventData: Event, guildId: string): Promise<void> {
    logger.info(`[NoOpDiscordClient] Would update Discord event ${discordEventId} for guild ${guildId}: ${eventData.title}`);
  }

  async deleteEvent(discordEventId: string, guildId: string): Promise<void> {
    logger.info(`[NoOpDiscordClient] Would delete Discord event ${discordEventId} from guild ${guildId}`);
  }

  async getEvent(discordEventId: string, guildId: string): Promise<APIGuildScheduledEvent> {
    // Return mock event data for development
    return {
      id: discordEventId,
      guild_id: guildId,
      name: 'Mock Event',
      description: 'Mock event for development',
      scheduled_start_time: new Date().toISOString(),
      scheduled_end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      privacy_level: 2,
      status: 1,
      entity_type: 3,
      entity_id: null,
      entity_metadata: {
        location: 'Mock Location'
      },
      creator: {
        id: '122739797646245899',
        username: 'MockUser',
        discriminator: '0001',
        avatar: null,
        public_flags: undefined,
        global_name: 'MockUser'
      },
      user_count: 0,
      image: null,
      channel_id: null,
      recurrence_rule: null
    };
  }

  async sendMessage(channelId: string, content: string, embed?: APIEmbed): Promise<APIMessage> {
    const mockMessage = {
      id: `dev-message-${Date.now()}`,
      channel_id: channelId,
      content,
      embeds: embed ? [embed] : [],
      timestamp: new Date().toISOString(),
      tts: false,
      mention_everyone: false,
      mention_roles: [],
      mention_channels: [],
      attachments: [],
      pinned: false,
      type: 0,
      flags: 0,
      author: {
        id: '122739797646245899',
        username: 'MockBot',
        discriminator: '0001',
        avatar: null,
        public_flags: undefined,
        global_name: 'MockBot'
      },
      member: null,
      mention_users: [],
      reactions: [],
      nonce: undefined,
      referenced_message: null,
      referenced_message_id: null,
      interaction: undefined,
      webhook_id: undefined,
      application_id: undefined,
      activity: undefined,
      application: undefined,
      message_reference: undefined,
      stickers: [],
      position: undefined,
      role_subscription_data: undefined,
      resolved: undefined,
      components: [],
      edited_timestamp: null,
      mentions: []
    };
    logger.info(`[NoOpDiscordClient] Would send message to channel ${channelId}: ${content}`);
    return mockMessage as APIMessage;
  }
}

export function createDiscordClient(): DiscordClient {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!botToken) {
    throw new Error('DISCORD_BOT_TOKEN environment variable is required');
  }

  if (isDevelopment) {
    console.log('[DiscordClient] Using NoOpDiscordClient for development');
    return new NoOpDiscordClient();
  } else {
    console.log('[DiscordClient] Using RealDiscordClient for production');
    return new RealDiscordClient(botToken);
  }
}
