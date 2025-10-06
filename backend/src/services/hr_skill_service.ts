import { HRSkillModel, HRSkill, HRUserSkill, HRCertification } from '../models/hr_skill_model';
import { NotificationService } from './notification_service';
import { ActivityService } from './activity_service';
import { NotificationEntityType } from '../types/notification';
import db from '../config/database';
import logger from '../config/logger';

export interface SkillGap {
  skill_name: string;
  skill_category: string;
  required_count: number;
  current_count: number;
  gap_percentage: number;
  priority: 'high' | 'medium' | 'low';
}

export interface SkillVerificationWorkflow {
  user_skill_id: string;
  skill_name: string;
  user_rsi_handle: string;
  proficiency_level: string;
  verification_required: boolean;
  current_verifiers: string[];
  pending_verification: boolean;
}

export interface CertificationExpirationAlert {
  certification_id: string;
  user_id: string;
  user_rsi_handle: string;
  certification_name: string;
  expiration_date: Date;
  days_until_expiration: number;
  organization_id: string;
}

export interface SkillSearchFilters {
  category?: string;
  proficiency_level?: string;
  verified?: boolean;
  search_term?: string;
  organization_id?: string;
  user_id?: string;
}

export interface SkillAnalyticsReport {
  organization_id: string;
  generated_at: Date;
  total_skills_tracked: number;
  verification_rate: number;
  skill_gaps: SkillGap[];
  skills_by_category: Record<string, number>;
  proficiency_distribution: Record<string, number>;
  top_skills: Array<{
    skill_name: string;
    user_count: number;
    verification_rate: number;
  }>;
  certification_metrics: {
    total_certifications: number;
    expiring_soon: number;
    expired: number;
    renewal_rate: number;
  };
}

export class HRSkillService {
  private skillModel: HRSkillModel;
  private notificationService: NotificationService;
  private activityService: ActivityService;

  constructor() {
    this.skillModel = new HRSkillModel();
    this.notificationService = new NotificationService();
    this.activityService = new ActivityService();
  }

  /**
   * Create skill verification workflow with approval processes
   */
  async createSkillVerificationWorkflow(
    userSkillId: string,
    verifierId: string,
    notes?: string
  ): Promise<HRUserSkill | null> {
    try {
      const userSkill = await this.skillModel.findUserSkillById(userSkillId);
      if (!userSkill) {
        throw new Error('User skill not found');
      }

      // Get skill details to check if verification is required
      const skill = await this.skillModel.findSkillById(userSkill.skill_id);
      if (!skill) {
        throw new Error('Skill not found');
      }

      // If verification is not required, auto-verify
      if (!skill.verification_required) {
        const verifiedSkill = await this.skillModel.verifyUserSkill(userSkillId, verifierId, notes);
        
        if (verifiedSkill) {
          // Send notification to user about skill verification
          await this.notificationService.createNotification({
            user_id: userSkill.user_id,
            entity_type: NotificationEntityType.HR_SKILL_VERIFIED,
            entity_id: userSkillId,
            title: 'Skill Verified',
            message: `Your ${skill.name} skill has been verified`,
            custom_data: {
              skill_name: skill.name,
              proficiency_level: userSkill.proficiency_level,
              verified_by: verifierId,
            },
          });

          logger.info('Skill verified successfully', {
            userSkillId,
            skillName: skill.name,
            userId: userSkill.user_id,
            verifierId,
          });
        }

        return verifiedSkill;
      }

      // For skills requiring verification, create workflow
      const verifiedSkill = await this.skillModel.verifyUserSkill(userSkillId, verifierId, notes);
      
      if (verifiedSkill) {
        // Notify user about verification
        await this.notificationService.createNotification({
          user_id: userSkill.user_id,
          entity_type: NotificationEntityType.HR_SKILL_VERIFIED,
          entity_id: userSkillId,
          title: 'Skill Verified',
          message: `Your ${skill.name} skill has been verified by a supervisor`,
          custom_data: {
            skill_name: skill.name,
            proficiency_level: userSkill.proficiency_level,
            verified_by: verifierId,
            notes,
          },
        });

        logger.info('Skill verification workflow completed', {
          userSkillId,
          skillName: skill.name,
          userId: userSkill.user_id,
          verifierId,
        });
      }

      return verifiedSkill;
    } catch (error) {
      logger.error('Failed to create skill verification workflow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userSkillId,
        verifierId,
      });
      throw error;
    }
  }

  /**
   * Get pending skill verifications for an organization
   */
  async getPendingSkillVerifications(organizationId: string): Promise<SkillVerificationWorkflow[]> {
    try {
      const result = await this.skillModel.getSkillsByOrganization(organizationId, {
        verified: false,
      });

      const workflows: SkillVerificationWorkflow[] = result.data
        .filter((skill: any) => skill.verification_required)
        .map((skill: any) => ({
          user_skill_id: skill.id,
          skill_name: skill.skill_name,
          user_rsi_handle: skill.user_rsi_handle,
          proficiency_level: skill.proficiency_level,
          verification_required: skill.verification_required,
          current_verifiers: [],
          pending_verification: true,
        }));

      return workflows;
    } catch (error) {
      logger.error('Failed to get pending skill verifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Implement certification expiration notification system
   */
  async processCertificationExpirationNotifications(organizationId: string): Promise<void> {
    try {
      // Get certifications expiring in 30 days
      const expiringCertifications = await this.skillModel.getExpiringCertifications(organizationId, 30);

      for (const cert of expiringCertifications) {
        const daysUntilExpiration = Math.ceil(
          (new Date(cert.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send notification based on days until expiration
        let notificationTitle = '';
        let notificationMessage = '';

        if (daysUntilExpiration <= 7) {
          notificationTitle = 'Certification Expiring Soon';
          notificationMessage = `Your ${cert.name} certification expires in ${daysUntilExpiration} days`;
        } else if (daysUntilExpiration <= 30) {
          notificationTitle = 'Certification Renewal Reminder';
          notificationMessage = `Your ${cert.name} certification expires in ${daysUntilExpiration} days. Consider renewing soon.`;
        }

        if (notificationTitle) {
          await this.notificationService.createNotification({
            user_id: cert.user_id,
            entity_type: NotificationEntityType.HR_CERTIFICATION_EXPIRING,
            entity_id: cert.id,
            title: notificationTitle,
            message: notificationMessage,
            custom_data: {
              certification_name: cert.name,
              expiration_date: cert.expiration_date,
              days_until_expiration: daysUntilExpiration,
            },
          });
        }
      }

      logger.info('Processed certification expiration notifications', {
        organizationId,
        certificationsProcessed: expiringCertifications.length,
      });
    } catch (error) {
      logger.error('Failed to process certification expiration notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Build organization-wide skill gap analysis and reporting
   */
  async generateSkillGapAnalysis(
    organizationId: string,
    requiredSkills?: Array<{ skill_name: string; required_count: number; priority: 'high' | 'medium' | 'low' }>
  ): Promise<SkillGap[]> {
    try {
      const analytics = await this.skillModel.getSkillAnalytics(organizationId);
      const skillGaps: SkillGap[] = [];

      // If required skills are provided, analyze gaps
      if (requiredSkills && requiredSkills.length > 0) {
        for (const required of requiredSkills) {
          const currentCount = analytics.skills_by_category[required.skill_name] || 0;
          const gapPercentage = required.required_count > 0 
            ? Math.max(0, ((required.required_count - currentCount) / required.required_count) * 100)
            : 0;

          if (gapPercentage > 0) {
            skillGaps.push({
              skill_name: required.skill_name,
              skill_category: 'unknown', // Would need to look up from skill data
              required_count: required.required_count,
              current_count: currentCount,
              gap_percentage: gapPercentage,
              priority: required.priority,
            });
          }
        }
      } else {
        // Generate automatic gap analysis based on skill distribution
        const categories = Object.keys(analytics.skills_by_category);
        const avgSkillsPerCategory = Object.values(analytics.skills_by_category)
          .reduce((sum, count) => sum + count, 0) / categories.length;

        for (const [category, count] of Object.entries(analytics.skills_by_category)) {
          if (count < avgSkillsPerCategory * 0.5) { // Less than 50% of average
            skillGaps.push({
              skill_name: category,
              skill_category: category,
              required_count: Math.ceil(avgSkillsPerCategory),
              current_count: count,
              gap_percentage: ((avgSkillsPerCategory - count) / avgSkillsPerCategory) * 100,
              priority: count < avgSkillsPerCategory * 0.25 ? 'high' : 'medium',
            });
          }
        }
      }

      logger.info('Generated skill gap analysis', {
        organizationId,
        gapsIdentified: skillGaps.length,
      });

      return skillGaps.sort((a, b) => b.gap_percentage - a.gap_percentage);
    } catch (error) {
      logger.error('Failed to generate skill gap analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Add skill search and filtering functionality
   */
  async searchSkills(filters: SkillSearchFilters): Promise<any[]> {
    try {
      let results: any[] = [];

      if (filters.search_term) {
        // Search skills by name or description
        const skills = await this.skillModel.searchSkills(filters.search_term);
        results = skills;
      } else if (filters.organization_id) {
        // Get organization skills with filters
        const orgFilters = {
          category: filters.category as any,
          verified: filters.verified,
        };
        const result = await this.skillModel.getSkillsByOrganization(filters.organization_id, orgFilters);
        results = result.data;
      } else if (filters.user_id) {
        // Get user skills with filters
        const userFilters = {
          category: filters.category as any,
          verified: filters.verified,
          proficiency_level: filters.proficiency_level as any,
        };
        results = await this.skillModel.getUserSkills(filters.user_id, userFilters);
      } else {
        // General skill search
        const skillFilters = {
          category: filters.category as any,
        };
        const result = await this.skillModel.listSkills(skillFilters);
        results = result.data;
      }

      // Apply additional filtering
      if (filters.proficiency_level && results.length > 0) {
        results = results.filter((skill: any) => 
          skill.proficiency_level === filters.proficiency_level
        );
      }

      logger.info('Skill search completed', {
        filters,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to search skills', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive skill analytics report
   */
  async generateSkillAnalyticsReport(organizationId: string): Promise<SkillAnalyticsReport> {
    try {
      const [analytics, certifications, topSkills] = await Promise.all([
        this.skillModel.getSkillAnalytics(organizationId),
        this.skillModel.getOrganizationCertifications(organizationId),
        this.getTopSkillsByUsage(organizationId),
      ]);

      // Calculate certification metrics
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const certificationMetrics = {
        total_certifications: certifications.total,
        expiring_soon: certifications.data.filter((cert: any) => 
          cert.expiration_date && new Date(cert.expiration_date) <= thirtyDaysFromNow
        ).length,
        expired: certifications.data.filter((cert: any) => 
          cert.expiration_date && new Date(cert.expiration_date) < now
        ).length,
        renewal_rate: 0, // Would need historical data to calculate
      };

      const report: SkillAnalyticsReport = {
        organization_id: organizationId,
        generated_at: new Date(),
        total_skills_tracked: analytics.total_skills_tracked,
        verification_rate: analytics.verification_rate,
        skill_gaps: await this.generateSkillGapAnalysis(organizationId),
        skills_by_category: analytics.skills_by_category,
        proficiency_distribution: analytics.proficiency_distribution,
        top_skills: topSkills,
        certification_metrics: certificationMetrics,
      };

      logger.info('Generated skill analytics report', {
        organizationId,
        totalSkills: report.total_skills_tracked,
        verificationRate: report.verification_rate,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate skill analytics report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get top skills by usage within organization
   */
  private async getTopSkillsByUsage(organizationId: string): Promise<Array<{
    skill_name: string;
    user_count: number;
    verification_rate: number;
  }>> {
    try {
      const result = await this.skillModel.getSkillsByOrganization(organizationId);
      const skillStats = new Map<string, { total: number; verified: number }>();

      // Aggregate skill statistics
      for (const skill of result.data) {
        const skillName = skill.skill_name;
        if (!skillStats.has(skillName)) {
          skillStats.set(skillName, { total: 0, verified: 0 });
        }
        
        const stats = skillStats.get(skillName)!;
        stats.total++;
        if (skill.verified) {
          stats.verified++;
        }
      }

      // Convert to array and sort by usage
      const topSkills = Array.from(skillStats.entries())
        .map(([skillName, stats]) => ({
          skill_name: skillName,
          user_count: stats.total,
          verification_rate: stats.total > 0 ? (stats.verified / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.user_count - a.user_count)
        .slice(0, 10); // Top 10 skills

      return topSkills;
    } catch (error) {
      logger.error('Failed to get top skills by usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return [];
    }
  }

  /**
   * Validate skill assignment
   */
  async validateSkillAssignment(
    userId: string,
    skillId: string,
    proficiencyLevel: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if skill exists
      const skill = await this.skillModel.findSkillById(skillId);
      if (!skill) {
        errors.push('Skill not found');
      }

      // Check if user already has this skill
      const existingUserSkill = await this.skillModel.findUserSkillByUserAndSkill(userId, skillId);
      if (existingUserSkill) {
        errors.push('User already has this skill');
      }

      // Validate proficiency level
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validLevels.includes(proficiencyLevel)) {
        errors.push('Invalid proficiency level');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('Failed to validate skill assignment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        skillId,
        proficiencyLevel,
      });
      
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
      };
    }
  }

  /**
   * Process skill-related notifications
   */
  async processSkillNotifications(organizationId: string): Promise<void> {
    try {
      // Process certification expiration notifications
      await this.processCertificationExpirationNotifications(organizationId);

      // Get pending verifications and notify managers
      const pendingVerifications = await this.getPendingSkillVerifications(organizationId);
      
      if (pendingVerifications.length > 0) {
        // This would typically notify HR managers about pending verifications
        logger.info('Pending skill verifications found', {
          organizationId,
          pendingCount: pendingVerifications.length,
        });
      }

      logger.info('Processed skill notifications', {
        organizationId,
        pendingVerifications: pendingVerifications.length,
      });
    } catch (error) {
      logger.error('Failed to process skill notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get skill recommendations for a user based on their current skills and organization needs
   */
  async getSkillRecommendations(
    userId: string,
    organizationId: string
  ): Promise<Array<{ skill: HRSkill; reason: string; priority: number }>> {
    try {
      const [userSkills, skillGaps, orgSkills] = await Promise.all([
        this.skillModel.getUserSkills(userId),
        this.generateSkillGapAnalysis(organizationId),
        this.skillModel.getSkillAnalytics(organizationId),
      ]);

      const userSkillIds = new Set(userSkills.map((us: any) => us.skill_id));
      const recommendations: Array<{ skill: HRSkill; reason: string; priority: number }> = [];

      // Recommend skills based on gaps
      for (const gap of skillGaps.slice(0, 5)) { // Top 5 gaps
        const skill = await this.skillModel.findSkillByName(gap.skill_name);
        if (skill && !userSkillIds.has(skill.id)) {
          recommendations.push({
            skill,
            reason: `Organization has a ${gap.gap_percentage.toFixed(1)}% gap in ${gap.skill_name} skills`,
            priority: gap.priority === 'high' ? 3 : gap.priority === 'medium' ? 2 : 1,
          });
        }
      }

      // Sort by priority
      recommendations.sort((a, b) => b.priority - a.priority);

      logger.info('Generated skill recommendations', {
        userId,
        organizationId,
        recommendationCount: recommendations.length,
      });

      return recommendations.slice(0, 10); // Top 10 recommendations
    } catch (error) {
      logger.error('Failed to get skill recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        organizationId,
      });
      return [];
    }
  }

  /**
   * Create skill verification opportunities through event participation
   */
  async createSkillVerificationFromEventParticipation(
    eventId: string,
    userId: string,
    skillCategories: string[]
  ): Promise<{ verified_skills: string[]; pending_verifications: string[] }> {
    try {
      // Import here to avoid circular dependencies
      const { EventModel } = await import('../models/event_model');
      const eventModel = new EventModel();

      const event = await eventModel.findById(eventId);
      if (!event) {
        return { verified_skills: [], pending_verifications: [] };
      }

      // Check if user attended the event
      const registration = await eventModel.getUserRegistration(eventId, userId);
      if (!registration || registration.status !== 'confirmed') {
        return { verified_skills: [], pending_verifications: [] };
      }

      const verifiedSkills: string[] = [];
      const pendingVerifications: string[] = [];

      // Get user's skills in the relevant categories
      const userSkills = await this.getUserSkillsByCategories(userId, skillCategories);

      for (const userSkill of userSkills) {
        if (!userSkill.verified) {
          // Auto-verify skills based on event participation
          const verified = await this.skillModel.verifyUserSkill(
            userSkill.id,
            'system', // System verification based on event attendance
            `Verified through participation in event: ${event.title}`
          );

          if (verified) {
            const skill = await this.skillModel.findSkillById(userSkill.skill_id);
            verifiedSkills.push(skill?.name || 'Unknown Skill');
          } else {
            const skill = await this.skillModel.findSkillById(userSkill.skill_id);
            pendingVerifications.push(skill?.name || 'Unknown Skill');
          }
        }
      }

      logger.info('Skill verification from event participation processed', {
        eventId,
        userId,
        eventTitle: event.title,
        verifiedCount: verifiedSkills.length,
        pendingCount: pendingVerifications.length,
      });

      return { verified_skills: verifiedSkills, pending_verifications: pendingVerifications };
    } catch (error) {
      logger.error('Error creating skill verification from event participation:', error);
      return { verified_skills: [], pending_verifications: [] };
    }
  }

  /**
   * Get user skills by categories
   */
  async getUserSkillsByCategories(
    userId: string,
    categories: string[]
  ): Promise<Array<HRUserSkill & { skill_name?: string }>> {
    try {
      const userSkills = await db('hr_user_skills')
        .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
        .select(
          'hr_user_skills.*',
          'hr_skills.name as skill_name',
          'hr_skills.category'
        )
        .where('hr_user_skills.user_id', userId)
        .whereIn('hr_skills.category', categories);

      return userSkills;
    } catch (error) {
      logger.error('Error getting user skills by categories:', error);
      return [];
    }
  }

  /**
   * Add training event categories for HR development
   */
  async linkSkillsToTrainingEvents(
    eventId: string,
    skillCategories: string[],
    requiredSkills: string[] = []
  ): Promise<boolean> {
    try {
      // Store the relationship between training events and skills
      await db('hr_training_event_skills').insert({
        event_id: eventId,
        skill_categories: JSON.stringify(skillCategories),
        required_skills: JSON.stringify(requiredSkills),
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('Skills linked to training event', {
        eventId,
        skillCategories,
        requiredSkillsCount: requiredSkills.length,
      });

      return true;
    } catch (error) {
      logger.error('Error linking skills to training event:', error);
      return false;
    }
  }

  /**
   * Process skill verifications after event completion
   */
  async processEventCompletionSkillVerifications(
    eventId: string
  ): Promise<{ total_processed: number; verified_count: number; error_count: number }> {
    try {
      // Import here to avoid circular dependencies
      const { EventModel } = await import('../models/event_model');
      const eventModel = new EventModel();

      // Get event details and skill requirements
      const event = await eventModel.findById(eventId);
      if (!event) {
        return { total_processed: 0, verified_count: 0, error_count: 0 };
      }

      // Get training event skill requirements
      const trainingEventSkills = await db('hr_training_event_skills')
        .where('event_id', eventId)
        .first();

      if (!trainingEventSkills) {
        // Not a training event, no skill verifications to process
        return { total_processed: 0, verified_count: 0, error_count: 0 };
      }

      const skillCategories = JSON.parse(trainingEventSkills.skill_categories || '[]');
      const requiredSkills = JSON.parse(trainingEventSkills.required_skills || '[]');

      // Get all confirmed attendees
      const attendees = await eventModel.getEventRegistrations(eventId);
      const confirmedAttendees = attendees.filter(reg => reg.status === 'confirmed');

      let totalProcessed = 0;
      let verifiedCount = 0;
      let errorCount = 0;

      for (const attendee of confirmedAttendees) {
        try {
          const result = await this.createSkillVerificationFromEventParticipation(
            eventId,
            attendee.user_id,
            skillCategories
          );

          totalProcessed++;
          verifiedCount += result.verified_skills.length;
        } catch (error) {
          errorCount++;
          logger.error('Error processing skill verification for attendee', {
            eventId,
            userId: attendee.user_id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Event completion skill verifications processed', {
        eventId,
        eventTitle: event.title,
        totalProcessed,
        verifiedCount,
        errorCount,
      });

      return { total_processed: totalProcessed, verified_count: verifiedCount, error_count: errorCount };
    } catch (error) {
      logger.error('Error processing event completion skill verifications:', error);
      return { total_processed: 0, verified_count: 0, error_count: 0 };
    }
  }
}