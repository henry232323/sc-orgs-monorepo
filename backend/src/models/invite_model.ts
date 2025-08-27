import db from '../config/database';
import {
  InviteCode,
  CreateInviteCodeData,
  UpdateInviteCodeData,
} from '../types/invite';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export class InviteModel {
  /**
   * Generate a secure random invite code
   */
  private generateInviteCode(): string {
    // Generate a 12-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new invite code
   */
  async create(inviteData: CreateInviteCodeData): Promise<InviteCode> {
    // Generate unique invite code
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = this.generateInviteCode();
      const existing = await db('invite_codes').where({ code }).first();
      if (!existing) {
        isUnique = true;
      }
    }

    // Let PostgreSQL generate the UUID
    const [invite] = await db('invite_codes')
      .insert({
        ...inviteData,
        code: code!,
        used_count: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return invite;
  }

  /**
   * Get invite code by ID
   */
  async findById(id: string): Promise<InviteCode | null> {
    const invite = await db('invite_codes').where({ id }).first();
    return invite || null;
  }

  /**
   * Get invite code by code string with role information
   */
  async findByCode(code: string): Promise<InviteCode | null> {
    const invite = await db('invite_codes')
      .leftJoin('organization_roles', 'invite_codes.role_id', 'organization_roles.id')
      .where({ 'invite_codes.code': code })
      .select(
        'invite_codes.*',
        'organization_roles.name as role_name',
        'organization_roles.description as role_description'
      )
      .first();
    return invite || null;
  }

  /**
   * Get all invite codes for an organization with role information
   */
  async getByOrganizationId(
    organizationId: string,
    options: { limit: number; offset: number } = { limit: 50, offset: 0 }
  ): Promise<InviteCode[]> {
    const invites = await db('invite_codes')
      .leftJoin('organization_roles', 'invite_codes.role_id', 'organization_roles.id')
      .where({ 'invite_codes.organization_id': organizationId })
      .select(
        'invite_codes.*',
        'organization_roles.name as role_name',
        'organization_roles.description as role_description'
      )
      .orderBy('invite_codes.created_at', 'desc')
      .limit(options.limit)
      .offset(options.offset);

    return invites;
  }

  /**
   * Update an invite code
   */
  async update(
    id: string,
    updateData: UpdateInviteCodeData
  ): Promise<InviteCode | null> {
    const [updated] = await db('invite_codes')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return updated || null;
  }

  /**
   * Delete an invite code
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await db('invite_codes').where({ id }).del();
    return deleted > 0;
  }

  /**
   * Use an invite code (increment used_count)
   */
  async useInviteCode(code: string): Promise<InviteCode | null> {
    const invite = await this.findByCode(code);

    if (!invite) {
      return null;
    }

    // Check if invite is still valid
    if (!invite.is_active) {
      throw new Error('Invite code is no longer active');
    }

    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
      throw new Error('Invite code has expired');
    }

    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      throw new Error('Invite code has reached maximum uses');
    }

    // Increment used count
    const [updated] = await db('invite_codes')
      .where({ id: invite.id })
      .update({
        used_count: invite.used_count + 1,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Check if a user can use an invite code
   */
  async canUseInviteCode(
    code: string,
    userId: string
  ): Promise<{ canUse: boolean; reason?: string }> {
    const invite = await this.findByCode(code);

    if (!invite) {
      return { canUse: false, reason: 'Invite code not found' };
    }

    if (!invite.is_active) {
      return { canUse: false, reason: 'Invite code is no longer active' };
    }

    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
      return { canUse: false, reason: 'Invite code has expired' };
    }

    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      return { canUse: false, reason: 'Invite code has reached maximum uses' };
    }

    // Check if user is already a member of the organization
    const existingMember = await db('organization_members')
      .where({
        organization_id: invite.organization_id,
        user_id: userId,
        is_active: true,
      })
      .first();

    if (existingMember) {
      return {
        canUse: false,
        reason: 'You are already a member of this organization',
      };
    }

    return { canUse: true };
  }

  /**
   * Get invite code statistics for an organization
   */
  async getInviteStats(organizationId: string): Promise<{
    total_invites: number;
    active_invites: number;
    expired_invites: number;
    total_uses: number;
  }> {
    const [total, active, expired, totalUses] = await Promise.all([
      db('invite_codes')
        .count('* as total')
        .where({ organization_id: organizationId })
        .first(),
      db('invite_codes')
        .count('* as total')
        .where({ organization_id: organizationId, is_active: true })
        .first(),
      db('invite_codes')
        .count('* as total')
        .where({ organization_id: organizationId })
        .where('expires_at', '<', new Date())
        .first(),
      db('invite_codes')
        .sum('used_count as total')
        .where({ organization_id: organizationId })
        .first(),
    ]);

    return {
      total_invites: parseInt(total?.total as string) || 0,
      active_invites: parseInt(active?.total as string) || 0,
      expired_invites: parseInt(expired?.total as string) || 0,
      total_uses: parseInt(totalUses?.total as string) || 0,
    };
  }
}
