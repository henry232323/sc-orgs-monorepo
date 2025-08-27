// Discord API Types for SC-Orgs Integration
// Re-export commonly used types from discord-api-types

export type {
  APIGuild,
  APIChannel,
  APIGuildMember,
  APIUser,
  APIGuildScheduledEvent,
  APIEmbed,
  APIWebhook,
  APIMessage,
  APIAttachment,
  APIReaction,
  APIEmoji,
  APIApplication,
  APITeam,
  APITeamMember,
  APIMessageReference,
  APIMessageInteraction,
  APIMessageComponent,
  APISticker,
  APIStickerItem,
  APISelectMenuOption,
  APIApplicationCommand,
  APIApplicationCommandOption,
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataOption,
  APIInteraction,
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIModalInteractionResponseCallbackData,
  APIModalComponent,
  APITextInputComponent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
  MessageType,
  ComponentType,
  ButtonStyle,
  TextInputStyle,
  StickerType,
  StickerFormatType,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  InteractionType,
  InteractionResponseType,
  UserFlags,
  ApplicationFlags,
  MessageFlags,
  MessageActivityType,
  WebhookType,
  GuildFeature,
  GuildNSFWLevel,
  GuildVerificationLevel,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildPremiumTier,
  GuildSystemChannelFlags,
  GuildMemberFlags,
  IntegrationExpireBehavior,
  InviteTargetType,
  VideoQualityMode,
  ChannelFlags,
  ThreadMemberFlags,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationRuleKeywordPresetType,
} from 'discord-api-types/v10';

// SC-Orgs Specific Types

export interface DiscordServer {
  id: string;
  organization_id: string; // Internal UUID - for database operations only
  discord_guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  bot_permissions: number;
  is_active: boolean;
  auto_create_events: boolean;
  event_channel_id?: string;
  announcement_channel_id?: string;
  created_at: Date;
  updated_at: Date;
}

// Frontend-facing interface that only exposes RSI org ID
export interface DiscordServerResponse {
  id: string;
  rsi_org_id: string; // RSI organization ID for frontend
  discord_guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  is_active: boolean;
  auto_create_events: boolean;
  created_at: Date;
  guild_info?: {
    name: string;
    member_count: number;
  };
  bot_permissions_valid?: boolean;
  last_verified?: Date;
  discord_error?: string;
}

export interface CreateDiscordServerData {
  organization_id: string; // Internal UUID
  discord_guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  bot_permissions: number;
  auto_create_events?: boolean;
  event_channel_id?: string;
  announcement_channel_id?: string;
}

export interface UpdateDiscordServerData {
  guild_name?: string;
  guild_icon_url?: string;
  bot_permissions?: number;
  is_active?: boolean;
  auto_create_events?: boolean;
  event_channel_id?: string;
  announcement_channel_id?: string;
}

export interface DiscordEvent {
  id: string;
  event_id: string;
  discord_guild_id: string;
  discord_event_id?: string;
  discord_channel_id?: string;
  sync_status: 'pending' | 'synced' | 'failed' | 'cancelled';
  last_sync_at?: Date;
  sync_error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDiscordEventData {
  event_id: string;
  discord_guild_id: string;
  discord_event_id?: string;
  discord_channel_id?: string;
  sync_status?: 'pending' | 'synced' | 'failed' | 'cancelled';
  sync_error?: string;
  last_sync_at?: Date;
}

export interface UpdateDiscordEventData {
  discord_event_id?: string;
  discord_channel_id?: string;
  sync_status?: 'pending' | 'synced' | 'failed' | 'cancelled';
  last_sync_at?: Date;
  sync_error?: string;
}

// Discord API Response Types

export interface DiscordApiError {
  code: number;
  message: string;
  errors?: Record<string, any>;
}

export interface DiscordApiResponse<T> {
  data?: T;
  error?: DiscordApiError;
  status: number;
}