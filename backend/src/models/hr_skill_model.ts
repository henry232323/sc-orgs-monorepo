import db from '../config/database';

export interface HRSkill {
  id: string;
  name: string;
  category: 'pilot' | 'engineer' | 'medic' | 'security' | 'logistics' | 'leadership';
  description?: string;
  verification_required: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRSkillData {
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

  async findSkillByName(name: string): Promise<HRSkill | null> {
    const skill = await db('hr_skills').where({ name }).first();
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
    filters: {
      category?: HRSkill['category'];
      verification_required?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRSkill[]; total: number }> {
    let query = db('hr_skills');

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

  async searchSkills(searchTerm: string): Promise<HRSkill[]> {
    return db('hr_skills')
      .where('name', 'ilike', `%${searchTerm}%`)
      .orWhere('description', 'ilike', `%${searchTerm}%`)
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

  async findUserSkillByUserAndSkill(userId: string, skillId: string): Promise<HRUserSkill | null> {
    const userSkill = await db('hr_user_skills')
      .where({ user_id: userId, skill_id: skillId })
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
      .where({ 'hr_user_skills.user_id': userId })
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
}