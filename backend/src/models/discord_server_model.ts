import db from '../config/database';
import {
  DiscordServer,
  CreateDiscordServerData,
  UpdateDiscordServerData,
} from '../types/discord';
import { v4 as uuidv4 } from 'uuid';

export class DiscordServerModel {
  async create(serverData: CreateDiscordServerData): Promise<DiscordServer> {
    const [server] = await db('discord_servers')
      .insert({
        id: uuidv4(),
        ...serverData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return server;
  }

  async findById(id: string): Promise<DiscordServer | null> {
    const server = await db('discord_servers').where({ id }).first();
    return server || null;
  }

  async findByOrganizationId(organizationId: string): Promise<DiscordServer | null> {
    const server = await db('discord_servers')
      .where({ organization_id: organizationId })
      .first();
    return server || null;
  }

  async findByRsiOrgId(rsiOrgId: string): Promise<(DiscordServer & { rsi_org_id: string }) | null> {
    const server = await db('discord_servers')
      .join('organizations', 'discord_servers.organization_id', 'organizations.id')
      .where('organizations.rsi_org_id', rsiOrgId)
      .select(
        'discord_servers.*',
        'organizations.rsi_org_id'
      )
      .first();
    return server || null;
  }

  async findByGuildId(guildId: string): Promise<DiscordServer | null> {
    const server = await db('discord_servers')
      .where({ discord_guild_id: guildId })
      .first();
    return server || null;
  }

  async update(id: string, updateData: UpdateDiscordServerData): Promise<DiscordServer | null> {
    const [server] = await db('discord_servers')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return server || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('discord_servers').where({ id }).del();
    return deleted > 0;
  }

  async deleteByOrganizationId(organizationId: string): Promise<boolean> {
    const deleted = await db('discord_servers')
      .where({ organization_id: organizationId })
      .del();
    return deleted > 0;
  }

  async listActive(): Promise<DiscordServer[]> {
    return db('discord_servers')
      .where({ is_active: true })
      .orderBy('created_at', 'desc');
  }

  async getServerStats(): Promise<{
    total_servers: number;
    active_servers: number;
    servers_with_auto_events: number;
  }> {
    const [total, active, autoEvents] = await Promise.all([
      db('discord_servers').count('* as count').first(),
      db('discord_servers').where({ is_active: true }).count('* as count').first(),
      db('discord_servers').where({ auto_create_events: true }).count('* as count').first(),
    ]);

    return {
      total_servers: parseInt(total?.count as string) || 0,
      active_servers: parseInt(active?.count as string) || 0,
      servers_with_auto_events: parseInt(autoEvents?.count as string) || 0,
    };
  }

  async getServersForUser(userId: string): Promise<Array<DiscordServer & { organization_name: string; rsi_org_id: string }>> {
    return db('discord_servers')
      .join('organizations', 'discord_servers.organization_id', 'organizations.id')
      .join('organization_members', 'organizations.id', 'organization_members.organization_id')
      .where('organization_members.user_id', userId)
      .where('discord_servers.is_active', true)
      .select(
        'discord_servers.id',
        'discord_servers.discord_guild_id',
        'discord_servers.guild_name',
        'discord_servers.guild_icon_url',
        'discord_servers.is_active',
        'discord_servers.auto_create_events',
        'discord_servers.created_at',
        'discord_servers.updated_at',
        'organizations.name as organization_name',
        'organizations.rsi_org_id'
      )
      .orderBy('discord_servers.created_at', 'desc');
  }
}