import db from '../config/database';
import {
  DiscordEvent,
  CreateDiscordEventData,
  UpdateDiscordEventData,
} from '../types/discord';
import { v4 as uuidv4 } from 'uuid';

export class DiscordEventModel {
  async create(eventData: CreateDiscordEventData): Promise<DiscordEvent> {
    const [event] = await db('discord_events')
      .insert({
        id: uuidv4(),
        ...eventData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return event;
  }

  async findById(id: string): Promise<DiscordEvent | null> {
    const event = await db('discord_events').where({ id }).first();
    return event || null;
  }

  async findByEventId(eventId: string): Promise<DiscordEvent | null> {
    const event = await db('discord_events')
      .where({ event_id: eventId })
      .first();
    return event || null;
  }

  async findByDiscordEventId(discordEventId: string): Promise<DiscordEvent | null> {
    const event = await db('discord_events')
      .where({ discord_event_id: discordEventId })
      .first();
    return event || null;
  }

  async findByGuildId(guildId: string): Promise<DiscordEvent[]> {
    return db('discord_events')
      .where({ discord_guild_id: guildId })
      .orderBy('created_at', 'desc');
  }

  async update(id: string, updateData: UpdateDiscordEventData): Promise<DiscordEvent | null> {
    const [event] = await db('discord_events')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return event || null;
  }

  async updateByEventId(eventId: string, updateData: UpdateDiscordEventData): Promise<DiscordEvent | null> {
    const [event] = await db('discord_events')
      .where({ event_id: eventId })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return event || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('discord_events').where({ id }).del();
    return deleted > 0;
  }

  async deleteByEventId(eventId: string): Promise<boolean> {
    const deleted = await db('discord_events')
      .where({ event_id: eventId })
      .del();
    return deleted > 0;
  }

  async listPendingSync(): Promise<DiscordEvent[]> {
    return db('discord_events')
      .where({ sync_status: 'pending' })
      .orderBy('created_at', 'asc');
  }

  async listFailedSync(): Promise<DiscordEvent[]> {
    return db('discord_events')
      .where({ sync_status: 'failed' })
      .orderBy('created_at', 'desc');
  }

  async listBySyncStatus(status: 'pending' | 'synced' | 'failed' | 'cancelled'): Promise<DiscordEvent[]> {
    return db('discord_events')
      .where({ sync_status: status })
      .orderBy('created_at', 'desc');
  }

  async getEventStats(): Promise<{
    total_events: number;
    synced_events: number;
    pending_events: number;
    failed_events: number;
    cancelled_events: number;
  }> {
    const [total, synced, pending, failed, cancelled] = await Promise.all([
      db('discord_events').count('* as count').first(),
      db('discord_events').where({ sync_status: 'synced' }).count('* as count').first(),
      db('discord_events').where({ sync_status: 'pending' }).count('* as count').first(),
      db('discord_events').where({ sync_status: 'failed' }).count('* as count').first(),
      db('discord_events').where({ sync_status: 'cancelled' }).count('* as count').first(),
    ]);

    return {
      total_events: parseInt(total?.count as string) || 0,
      synced_events: parseInt(synced?.count as string) || 0,
      pending_events: parseInt(pending?.count as string) || 0,
      failed_events: parseInt(failed?.count as string) || 0,
      cancelled_events: parseInt(cancelled?.count as string) || 0,
    };
  }

  async getEventsByGuild(guildId: string): Promise<DiscordEvent[]> {
    return db('discord_events')
      .where({ discord_guild_id: guildId })
      .orderBy('created_at', 'desc');
  }

  async getEventsByOrganization(organizationId: string): Promise<DiscordEvent[]> {
    return db('discord_events')
      .join('events', 'discord_events.event_id', 'events.id')
      .where('events.organization_id', organizationId)
      .select('discord_events.*')
      .orderBy('discord_events.created_at', 'desc');
  }
}