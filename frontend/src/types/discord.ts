import { APIGuild } from 'discord-api-types/v10';

// Our Discord server data extends Discord's APIGuild with our custom fields
export interface DiscordServer extends Partial<APIGuild> {
  id: string;
  discord_guild_id: string;
  guild_name: string;
  guild_icon_url?: string;
  organization_name?: string; // Present in user servers response
  is_active: boolean;
  auto_create_events: boolean;
  created_at: string;
  guild_info?: {
    name: string;
    member_count: number;
  };
  bot_permissions_valid?: boolean;
}

export interface DiscordServerResponse {
  success: boolean;
  data: DiscordServer;
}

export interface DiscordServersResponse {
  success: boolean;
  data: {
    servers: DiscordServer[];
    total: number;
    message: string;
  };
}