import db from '../config/database';

export interface HRSkill {
  id: string;
  organization_id: string;
  name: string;
  category: 'pilot' | 'engineer' | 'medic' | 'security' | 'logistics' | 'leadership';
  description?: string;
  verification_required: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRSkillData {
  organization_id: string;
  name: string;
  category: HRSkill['category'];
  description?: string;
  verification_required?: boolean;
}

export interface UpdateHRSkillData {
  name?: string;
  category?: HRSkill['category'];
  description?: string;
  verification_required?: boolean;
}

export interface HRUserSkill {
  id: string;
  organization_id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRUserSkillData {
  organization_id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: HRUserSkill['proficiency_level'];
  notes?: string;
}

export interface UpdateHRUserSkillData {
  proficiency_level?: HRUserSkill['proficiency_level'];
  verified?: boolean;
  verified_by?: string;
  verified_at?: Date;
  notes?: string;
}

export interface HRCertification {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  description?: string;
  issued_date: Date;
  expiration_date?: Date;
  issued_by: string;
  certificate_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRCertificationData {
  user_id: string;
  organization_id: string;
  name: string;
  description?: string;
  issued_date: Date;
  expiration_date?: Date;
  issued_by: string;
  certificate_url?: string;
}

export interface UpdateHRCertificationData {
  name?: string;
  description?: string;
  issued_date?: Date;
  expiration_date?: Date;
  certificate_url?: string;
}

export class HRSkillModel {
  // Skill methods
  async createSkill(skillData: CreateHRSkillData): Promise<HRSkill> {
    const insertData = {
      ...skillData,
      verification_required: skillData.verification_required || false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [skill] = await db('hr_skills')
      .insert(insertData)
      .returning('*');

    return skill;
  }

  async findSkillById(id: string): Promise<HRSkill | null> {
    const skill = await db('hr_skills').where({ id }).first();
    return skill || null;
  }

  async findSkillByName(organizationId: string, name: string): Promise<HRSkill | null> {
    const skill = await db('hr_skills').where({ organization_id: organizationId, name }).first();
    return skill || null;
  }

  async updateSkill(id: string, updateData: UpdateHRSkillData): Promise<HRSkill | null> {
    const [skill] = await db('hr_skills')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return skill || null;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const deleted = await db('hr_skills').where({ id }).del();
    return deleted > 0;
  }

  async listSkills(
    organizationId: string,
    filters: {
      category?: HRSkill['category'];
      verification_required?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRSkill[]; total: number }> {
    let query = db('hr_skills').where({ organization_id: organizationId });

    if (filters.category) {
      query = query.where({ category: filters.category });
    }

    if (filters.verification_required !== undefined) {
      query = query.where({ verification_required: filters.verification_required });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const skills = await query.orderBy('category', 'asc').orderBy('name', 'asc');

    return { data: skills, total };
  }

  async searchSkills(organizationId: string, searchTerm: string): Promise<HRSkill[]> {
    return db('hr_skills')
      .where({ organization_id: organizationId })
      .where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
          .orWhere('description', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('name', 'asc')
      .limit(20);
  }

  // User Skill methods
  async createUserSkill(userSkillData: CreateHRUserSkillData): Promise<HRUserSkill> {
    const insertData = {
      ...userSkillData,
      verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [userSkill] = await db('hr_user_skills')
      .insert(insertData)
      .returning('*');

    return userSkill;
  }

  async findUserSkillById(id: string): Promise<HRUserSkill | null> {
    const userSkill = await db('hr_user_skills').where({ id }).first();
    return userSkill || null;
  }

  async findUserSkillByUserAndSkill(organizationId: string, userId: string, skillId: string): Promise<HRUserSkill | null> {
    const userSkill = await db('hr_user_skills')
      .where({ organization_id: organizationId, user_id: userId, skill_id: skillId })
      .first();
    return userSkill || null;
  }

  async updateUserSkill(id: string, updateData: UpdateHRUserSkillData): Promise<HRUserSkill | null> {
    const [userSkill] = await db('hr_user_skills')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return userSkill || null;
  }

  async deleteUserSkill(id: string): Promise<boolean> {
    const deleted = await db('hr_user_skills').where({ id }).del();
    return deleted > 0;
  }

  async getUserSkills(
    organizationId: string,
    userId: string,
    filters: {
      category?: HRSkill['category'];
      verified?: boolean;
      proficiency_level?: HRUserSkill['proficiency_level'];
    } = {}
  ): Promise<any[]> {
    let query = db('hr_user_skills')
      .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
      .leftJoin('users as verifiers', 'hr_user_skills.verified_by', 'verifiers.id')
      .where({ 'hr_user_skills.organization_id': organizationId, 'hr_user_skills.user_id': userId })
      .select(
        'hr_user_skills.*',
        'hr_skills.name as skill_name',
        'hr_skills.category as skill_category',
        'hr_skills.description as skill_description',
        'hr_skills.verification_required',
        'verifiers.rsi_handle as verified_by_rsi_handle'
      );

    if (filters.category) {
      query = query.where({ 'hr_skills.category': filters.category });
    }

    if (filters.verified !== undefined) {
      query = query.where({ 'hr_user_skills.verified': filters.verified });
    }

    if (filters.proficiency_level) {
      query = query.where({ 'hr_user_skills.proficiency_level': filters.proficiency_level });
    }

    return query.orderBy('hr_skills.category', 'asc').orderBy('hr_skills.name', 'asc');
  }

  async verifyUserSkill(
    userSkillId: string,
    verifiedBy: string,
    notes?: string
  ): Promise<HRUserSkill | null> {
    return this.updateUserSkill(userSkillId, {
      verified: true,
      verified_by: verifiedBy,
      verified_at: new Date(),
      notes,
    });
  }

  async getSkillsByOrganization(
    organizationId: string,
    filters: {
      category?: HRSkill['category'];
      verified?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_user_skills')
      .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
      .join('users', 'hr_user_skills.user_id', 'users.id')
      .join('organization_members', 'users.id', 'organization_members.user_id')
      .leftJoin('users as verifiers', 'hr_user_skills.verified_by', 'verifiers.id')
      .where({ 'organization_members.organization_id': organizationId })
      .where({ 'organization_members.is_active': true })
      .select(
        'hr_user_skills.*',
        'hr_skills.name as skill_name',
        'hr_skills.category as skill_category',
        'hr_skills.description as skill_description',
        'hr_skills.verification_required',
        'users.rsi_handle as user_rsi_handle',
        'users.discord_username as user_discord_username',
        'verifiers.rsi_handle as verified_by_rsi_handle'
      );

    if (filters.category) {
      query = query.where({ 'hr_skills.category': filters.category });
    }

    if (filters.verified !== undefined) {
      query = query.where({ 'hr_user_skills.verified': filters.verified });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_user_skills.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const skills = await query.orderBy('hr_skills.category', 'asc').orderBy('hr_skills.name', 'asc');

    return { data: skills, total };
  }

  // Certification methods
  async createCertification(certificationData: CreateHRCertificationData): Promise<HRCertification> {
    const insertData = {
      ...certificationData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [certification] = await db('hr_certifications')
      .insert(insertData)
      .returning('*');

    return certification;
  }

  async findCertificationById(id: string): Promise<HRCertification | null> {
    const certification = await db('hr_certifications').where({ id }).first();
    return certification || null;
  }

  async updateCertification(
    id: string,
    updateData: UpdateHRCertificationData
  ): Promise<HRCertification | null> {
    const [certification] = await db('hr_certifications')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return certification || null;
  }

  async deleteCertification(id: string): Promise<boolean> {
    const deleted = await db('hr_certifications').where({ id }).del();
    return deleted > 0;
  }

  async getUserCertifications(userId: string): Promise<any[]> {
    return db('hr_certifications')
      .join('organizations', 'hr_certifications.organization_id', 'organizations.id')
      .join('users as issuers', 'hr_certifications.issued_by', 'issuers.id')
      .where({ 'hr_certifications.user_id': userId })
      .select(
        'hr_certifications.*',
        'organizations.name as organization_name',
        'organizations.rsi_org_id as organization_spectrum_id',
        'issuers.rsi_handle as issued_by_rsi_handle'
      )
      .orderBy('hr_certifications.issued_date', 'desc');
  }

  async getOrganizationCertifications(
    organizationId: string,
    filters: {
      user_id?: string;
      expiring_soon?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_certifications')
      .join('users', 'hr_certifications.user_id', 'users.id')
      .join('users as issuers', 'hr_certifications.issued_by', 'issuers.id')
      .where({ 'hr_certifications.organization_id': organizationId })
      .select(
        'hr_certifications.*',
        'users.rsi_handle as user_rsi_handle',
        'users.discord_username as user_discord_username',
        'issuers.rsi_handle as issued_by_rsi_handle'
      );

    if (filters.user_id) {
      query = query.where({ 'hr_certifications.user_id': filters.user_id });
    }

    if (filters.expiring_soon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.where('hr_certifications.expiration_date', '<=', thirtyDaysFromNow);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_certifications.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const certifications = await query.orderBy('hr_certifications.issued_date', 'desc');

    return { data: certifications, total };
  }

  async getExpiringCertifications(organizationId: string, daysAhead: number = 30): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return db('hr_certifications')
      .join('users', 'hr_certifications.user_id', 'users.id')
      .where({ 'hr_certifications.organization_id': organizationId })
      .where('hr_certifications.expiration_date', '<=', futureDate)
      .where('hr_certifications.expiration_date', '>', new Date())
      .select(
        'hr_certifications.*',
        'users.rsi_handle as user_rsi_handle',
        'users.discord_username as user_discord_username'
      )
      .orderBy('hr_certifications.expiration_date', 'asc');
  }

  // Analytics methods
  async getSkillAnalytics(organizationId: string): Promise<{
    total_skills_tracked: number;
    verification_rate: number;
    skill_gaps: any[];
    skills_by_category: Record<string, number>;
    proficiency_distribution: Record<string, number>;
  }> {
    const [skillStats, categoryStats, proficiencyStats] = await Promise.all([
      // Overall skill statistics
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select(
          db.raw('COUNT(*) as total_skills'),
          db.raw('COUNT(CASE WHEN hr_user_skills.verified = true THEN 1 END) as verified_skills')
        )
        .first(),

      // Skills by category
      db('hr_user_skills')
        .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select('hr_skills.category', db.raw('COUNT(*) as count'))
        .groupBy('hr_skills.category'),

      // Proficiency distribution
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select('hr_user_skills.proficiency_level', db.raw('COUNT(*) as count'))
        .groupBy('hr_user_skills.proficiency_level'),
    ]);

    const totalSkills = parseInt(skillStats?.total_skills as string) || 0;
    const verifiedSkills = parseInt(skillStats?.verified_skills as string) || 0;
    const verificationRate = totalSkills > 0 ? (verifiedSkills / totalSkills) * 100 : 0;

    const skillsByCategory = categoryStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.category] = parseInt(stat.count);
      return acc;
    }, {});

    const proficiencyDistribution = proficiencyStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.proficiency_level] = parseInt(stat.count);
      return acc;
    }, {});

    // TODO: Implement skill gap analysis based on organization requirements
    const skillGaps: any[] = [];

    return {
      total_skills_tracked: totalSkills,
      verification_rate: verificationRate,
      skill_gaps: skillGaps,
      skills_by_category: skillsByCategory,
      proficiency_distribution: proficiencyDistribution,
    };
  }

  // Skill Statistics methods
  async getSkillStatistics(organizationId: string, skillId: string): Promise<{
    skill_id: string;
    total_members: number;
    verified_members: number;
    verification_rate: number;
    proficiency_breakdown: {
      beginner: number;
      intermediate: number;
      advanced: number;
      expert: number;
    };
    recent_verifications: number;
  }> {
    const [memberStats, proficiencyStats, recentVerifications] = await Promise.all([
      // Total and verified member counts
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .where({ 'hr_user_skills.skill_id': skillId })
        .select(
          db.raw('COUNT(*) as total_members'),
          db.raw('COUNT(CASE WHEN hr_user_skills.verified = true THEN 1 END) as verified_members')
        )
        .first(),

      // Proficiency level breakdown
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .where({ 'hr_user_skills.skill_id': skillId })
        .select('hr_user_skills.proficiency_level', db.raw('COUNT(*) as count'))
        .groupBy('hr_user_skills.proficiency_level'),

      // Recent verifications (last 30 days)
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .where({ 'hr_user_skills.skill_id': skillId })
        .where({ 'hr_user_skills.verified': true })
        .where('hr_user_skills.verified_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .count('* as count')
        .first(),
    ]);

    const totalMembers = parseInt(memberStats?.total_members as string) || 0;
    const verifiedMembers = parseInt(memberStats?.verified_members as string) || 0;
    const verificationRate = totalMembers > 0 ? verifiedMembers / totalMembers : 0;

    const proficiencyBreakdown = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0,
    };

    proficiencyStats.forEach((stat: any) => {
      proficiencyBreakdown[stat.proficiency_level as keyof typeof proficiencyBreakdown] = parseInt(stat.count);
    });

    const recentVerificationsCount = parseInt(recentVerifications?.count as string) || 0;

    return {
      skill_id: skillId,
      total_members: totalMembers,
      verified_members: verifiedMembers,
      verification_rate: verificationRate,
      proficiency_breakdown: proficiencyBreakdown,
      recent_verifications: recentVerificationsCount,
    };
  }

  async getAllSkillsStatistics(organizationId: string): Promise<Record<string, {
    skill_id: string;
    skill_name: string;
    skill_category: string;
    total_members: number;
    verified_members: number;
    verification_rate: number;
    proficiency_breakdown: {
      beginner: number;
      intermediate: number;
      advanced: number;
      expert: number;
    };
    recent_verifications: number;
  }>> {
    // Get all skills with their statistics in a single optimized query
    const skillsWithStats = await db('hr_skills')
      .leftJoin('hr_user_skills', 'hr_skills.id', 'hr_user_skills.skill_id')
      .leftJoin('users', 'hr_user_skills.user_id', 'users.id')
      .leftJoin('organization_members', function() {
        this.on('users.id', '=', 'organization_members.user_id')
          .andOn('organization_members.organization_id', '=', db.raw('?', [organizationId]))
          .andOn('organization_members.is_active', '=', db.raw('true'));
      })
      .select(
        'hr_skills.id as skill_id',
        'hr_skills.name as skill_name',
        'hr_skills.category as skill_category',
        'hr_user_skills.proficiency_level',
        'hr_user_skills.verified',
        db.raw(`CASE WHEN hr_user_skills.verified = true AND hr_user_skills.verified_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END as recent_verification`)
      )
      .where('organization_members.user_id', 'is not', null)
      .orWhere('organization_members.user_id', 'is', null);

    // Process the results to build statistics
    const statisticsMap: Record<string, any> = {};

    // Initialize all skills with zero stats
    const allSkills = await db('hr_skills').select('id', 'name', 'category');
    allSkills.forEach(skill => {
      statisticsMap[skill.id] = {
        skill_id: skill.id,
        skill_name: skill.name,
        skill_category: skill.category,
        total_members: 0,
        verified_members: 0,
        verification_rate: 0,
        proficiency_breakdown: {
          beginner: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0,
        },
        recent_verifications: 0,
      };
    });

    // Aggregate the statistics
    skillsWithStats.forEach((row: any) => {
      if (!row.skill_id || !row.proficiency_level) return;

      const stats = statisticsMap[row.skill_id];
      if (!stats) return;

      stats.total_members++;
      
      if (row.verified) {
        stats.verified_members++;
      }

      if (row.proficiency_level && stats.proficiency_breakdown[row.proficiency_level] !== undefined) {
        stats.proficiency_breakdown[row.proficiency_level]++;
      }

      if (row.recent_verification) {
        stats.recent_verifications++;
      }
    });

    // Calculate verification rates
    Object.values(statisticsMap).forEach((stats: any) => {
      stats.verification_rate = stats.total_members > 0 ? stats.verified_members / stats.total_members : 0;
    });

    return statisticsMap;
  }

  async getSkillStatisticsByCategory(organizationId: string, category: string): Promise<Array<{
    skill_id: string;
    skill_name: string;
    total_members: number;
    verified_members: number;
    verification_rate: number;
    proficiency_breakdown: {
      beginner: number;
      intermediate: number;
      advanced: number;
      expert: number;
    };
    recent_verifications: number;
  }>> {
    const allStats = await this.getAllSkillsStatistics(organizationId);
    
    return Object.values(allStats)
      .filter((stats: any) => stats.skill_category === category)
      .map((stats: any) => ({
        skill_id: stats.skill_id,
        skill_name: stats.skill_name,
        total_members: stats.total_members,
        verified_members: stats.verified_members,
        verification_rate: stats.verification_rate,
        proficiency_breakdown: stats.proficiency_breakdown,
        recent_verifications: stats.recent_verifications,
      }));
  }

  async getTopSkillsByMemberCount(organizationId: string, limit: number = 10): Promise<Array<{
    skill_id: string;
    skill_name: string;
    skill_category: string;
    total_members: number;
    verified_members: number;
    verification_rate: number;
  }>> {
    const allStats = await this.getAllSkillsStatistics(organizationId);
    
    return Object.values(allStats)
      .sort((a: any, b: any) => b.total_members - a.total_members)
      .slice(0, limit)
      .map((stats: any) => ({
        skill_id: stats.skill_id,
        skill_name: stats.skill_name,
        skill_category: stats.skill_category,
        total_members: stats.total_members,
        verified_members: stats.verified_members,
        verification_rate: stats.verification_rate,
      }));
  }

  async getSkillVerificationTrends(organizationId: string, skillId?: string, days: number = 30): Promise<Array<{
    date: string;
    verifications_count: number;
    skill_id?: string;
    skill_name?: string;
  }>> {
    let query = db('hr_user_skills')
      .join('users', 'hr_user_skills.user_id', 'users.id')
      .join('organization_members', 'users.id', 'organization_members.user_id')
      .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
      .where({ 'organization_members.organization_id': organizationId })
      .where({ 'organization_members.is_active': true })
      .where({ 'hr_user_skills.verified': true })
      .where('hr_user_skills.verified_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
      .select(
        db.raw('DATE(hr_user_skills.verified_at) as date'),
        db.raw('COUNT(*) as verifications_count')
      )
      .groupBy(db.raw('DATE(hr_user_skills.verified_at)'))
      .orderBy('date', 'asc');

    if (skillId) {
      query = query
        .where({ 'hr_user_skills.skill_id': skillId })
        .select(
          db.raw('DATE(hr_user_skills.verified_at) as date'),
          db.raw('COUNT(*) as verifications_count'),
          'hr_user_skills.skill_id',
          'hr_skills.name as skill_name'
        )
        .groupBy(db.raw('DATE(hr_user_skills.verified_at)'), 'hr_user_skills.skill_id', 'hr_skills.name');
    }

    const results = await query;

    return results.map((row: any) => ({
      date: row.date,
      verifications_count: parseInt(row.verifications_count),
      ...(skillId && {
        skill_id: row.skill_id,
        skill_name: row.skill_name,
      }),
    }));
  }

  async getOrganizationSkillsOverview(organizationId: string): Promise<{
    total_unique_skills: number;
    total_skill_instances: number;
    overall_verification_rate: number;
    skills_by_category: Record<string, {
      unique_skills: number;
      total_instances: number;
      verification_rate: number;
    }>;
    top_skills: Array<{
      skill_name: string;
      member_count: number;
      verification_rate: number;
    }>;
    verification_trends: Array<{
      date: string;
      verifications_count: number;
    }>;
  }> {
    const [overallStats, categoryStats, topSkills, verificationTrends] = await Promise.all([
      // Overall statistics
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select(
          db.raw('COUNT(DISTINCT hr_user_skills.skill_id) as unique_skills'),
          db.raw('COUNT(*) as total_instances'),
          db.raw('COUNT(CASE WHEN hr_user_skills.verified = true THEN 1 END) as verified_instances')
        )
        .first(),

      // Category breakdown
      db('hr_user_skills')
        .join('users', 'hr_user_skills.user_id', 'users.id')
        .join('organization_members', 'users.id', 'organization_members.user_id')
        .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select(
          'hr_skills.category',
          db.raw('COUNT(DISTINCT hr_user_skills.skill_id) as unique_skills'),
          db.raw('COUNT(*) as total_instances'),
          db.raw('COUNT(CASE WHEN hr_user_skills.verified = true THEN 1 END) as verified_instances')
        )
        .groupBy('hr_skills.category'),

      // Top skills by member count
      this.getTopSkillsByMemberCount(organizationId, 5),

      // Verification trends for last 30 days
      this.getSkillVerificationTrends(organizationId, undefined, 30),
    ]);

    const totalInstances = parseInt(overallStats?.total_instances as string) || 0;
    const verifiedInstances = parseInt(overallStats?.verified_instances as string) || 0;
    const overallVerificationRate = totalInstances > 0 ? verifiedInstances / totalInstances : 0;

    const skillsByCategory: Record<string, any> = {};
    categoryStats.forEach((stat: any) => {
      const totalCategoryInstances = parseInt(stat.total_instances);
      const verifiedCategoryInstances = parseInt(stat.verified_instances);
      
      skillsByCategory[stat.category] = {
        unique_skills: parseInt(stat.unique_skills),
        total_instances: totalCategoryInstances,
        verification_rate: totalCategoryInstances > 0 ? verifiedCategoryInstances / totalCategoryInstances : 0,
      };
    });

    return {
      total_unique_skills: parseInt(overallStats?.unique_skills as string) || 0,
      total_skill_instances: totalInstances,
      overall_verification_rate: overallVerificationRate,
      skills_by_category: skillsByCategory,
      top_skills: topSkills.map(skill => ({
        skill_name: skill.skill_name,
        member_count: skill.total_members,
        verification_rate: skill.verification_rate,
      })),
      verification_trends: verificationTrends,
    };
  }
}