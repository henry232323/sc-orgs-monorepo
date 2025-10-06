import { HRSkillModel } from '../models/hr_skill_model';
import db from '../config/database';
import logger from '../config/logger';

export interface SkillStatistics {
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
  last_updated: string;
}

export interface OrganizationSkillsStatistics {
  [skillId: string]: SkillStatistics;
}

export interface SkillStatisticsFilters {
  category?: string;
  skill_ids?: string[];
  include_zero_members?: boolean;
  min_member_count?: number;
}

export interface SkillVerificationTrend {
  date: string;
  verifications_count: number;
  skill_id?: string;
  skill_name?: string;
}

export interface SkillCategoryStatistics {
  category: string;
  unique_skills: number;
  total_instances: number;
  verification_rate: number;
  average_proficiency: number;
  top_skills: Array<{
    skill_name: string;
    member_count: number;
    verification_rate: number;
  }>;
}

export interface SkillGapAnalysis {
  skill_id: string;
  skill_name: string;
  skill_category: string;
  current_members: number;
  target_members: number;
  gap_count: number;
  gap_percentage: number;
  priority: 'high' | 'medium' | 'low';
  recommended_actions: string[];
}

export class HRSkillStatisticsService {
  private skillModel: HRSkillModel;
  private cacheTimeout: number = 300000; // 5 minutes in milliseconds
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    this.skillModel = new HRSkillModel();
  }

  /**
   * Get cached data or fetch fresh data if cache is expired
   */
  private async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    customTimeout?: number
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const timeout = customTimeout || this.cacheTimeout;
    
    if (cached && (Date.now() - cached.timestamp) < timeout) {
      return cached.data as T;
    }

    try {
      const freshData = await fetchFunction();
      this.cache.set(cacheKey, {
        data: freshData,
        timestamp: Date.now(),
      });
      return freshData;
    } catch (error) {
      logger.error('Failed to fetch fresh data for cache', {
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return cached data if available, even if expired
      if (cached) {
        logger.warn('Returning expired cached data due to fetch error', { cacheKey });
        return cached.data as T;
      }
      
      throw error;
    }
  }

  /**
   * Clear cache for specific organization or all cache
   */
  public clearCache(organizationId?: string): void {
    if (organizationId) {
      // Clear only organization-specific cache entries
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(organizationId)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      
      logger.info('Cleared skill statistics cache for organization', { organizationId });
    } else {
      // Clear all cache
      this.cache.clear();
      logger.info('Cleared all skill statistics cache');
    }
  }

  /**
   * Get statistics for a specific skill
   */
  async getSkillStatistics(organizationId: string, skillId: string): Promise<SkillStatistics> {
    const cacheKey = `skill_stats_${organizationId}_${skillId}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const stats = await this.skillModel.getSkillStatistics(organizationId, skillId);
        const skill = await this.skillModel.findSkillById(skillId);
        
        if (!skill) {
          throw new Error('Skill not found');
        }

        const result: SkillStatistics = {
          skill_id: stats.skill_id,
          skill_name: skill.name,
          skill_category: skill.category,
          total_members: stats.total_members,
          verified_members: stats.verified_members,
          verification_rate: stats.verification_rate,
          proficiency_breakdown: stats.proficiency_breakdown,
          recent_verifications: stats.recent_verifications,
          last_updated: new Date().toISOString(),
        };

        logger.info('Retrieved skill statistics', {
          organizationId,
          skillId,
          skillName: skill.name,
          totalMembers: stats.total_members,
          verificationRate: stats.verification_rate,
        });

        return result;
      } catch (error) {
        logger.error('Failed to get skill statistics', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
          skillId,
        });
        throw error;
      }
    });
  }

  /**
   * Get statistics for all skills in an organization
   */
  async getAllSkillsStatistics(
    organizationId: string,
    filters?: SkillStatisticsFilters
  ): Promise<OrganizationSkillsStatistics> {
    const cacheKey = `all_skills_stats_${organizationId}_${JSON.stringify(filters || {})}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const allStats = await this.skillModel.getAllSkillsStatistics(organizationId);
        const result: OrganizationSkillsStatistics = {};

        Object.entries(allStats).forEach(([skillId, stats]) => {
          // Apply filters
          if (filters?.category && stats.skill_category !== filters.category) {
            return;
          }

          if (filters?.skill_ids && !filters.skill_ids.includes(skillId)) {
            return;
          }

          if (!filters?.include_zero_members && stats.total_members === 0) {
            return;
          }

          if (filters?.min_member_count && stats.total_members < filters.min_member_count) {
            return;
          }

          result[skillId] = {
            ...stats,
            last_updated: new Date().toISOString(),
          };
        });

        logger.info('Retrieved all skills statistics', {
          organizationId,
          totalSkills: Object.keys(result).length,
          filters,
        });

        return result;
      } catch (error) {
        logger.error('Failed to get all skills statistics', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
          filters,
        });
        throw error;
      }
    });
  }

  /**
   * Get statistics for skills in a specific category
   */
  async getSkillStatisticsByCategory(
    organizationId: string,
    category: string
  ): Promise<SkillCategoryStatistics> {
    const cacheKey = `category_stats_${organizationId}_${category}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const categorySkills = await this.skillModel.getSkillStatisticsByCategory(organizationId, category);
        
        const totalInstances = categorySkills.reduce((sum, skill) => sum + skill.total_members, 0);
        const verifiedInstances = categorySkills.reduce((sum, skill) => sum + skill.verified_members, 0);
        const verificationRate = totalInstances > 0 ? verifiedInstances / totalInstances : 0;

        // Calculate average proficiency (weighted by member count)
        let totalProficiencyScore = 0;
        let totalMembersForProficiency = 0;
        
        categorySkills.forEach(skill => {
          const proficiencyScores = {
            beginner: 1,
            intermediate: 2,
            advanced: 3,
            expert: 4,
          };
          
          Object.entries(skill.proficiency_breakdown).forEach(([level, count]) => {
            const score = proficiencyScores[level as keyof typeof proficiencyScores];
            totalProficiencyScore += score * count;
            totalMembersForProficiency += count;
          });
        });

        const averageProficiency = totalMembersForProficiency > 0 
          ? totalProficiencyScore / totalMembersForProficiency 
          : 0;

        const topSkills = categorySkills
          .sort((a, b) => b.total_members - a.total_members)
          .slice(0, 5)
          .map(skill => ({
            skill_name: skill.skill_name,
            member_count: skill.total_members,
            verification_rate: skill.verification_rate,
          }));

        const result: SkillCategoryStatistics = {
          category,
          unique_skills: categorySkills.length,
          total_instances: totalInstances,
          verification_rate: verificationRate,
          average_proficiency: averageProficiency,
          top_skills: topSkills,
        };

        logger.info('Retrieved category statistics', {
          organizationId,
          category,
          uniqueSkills: result.unique_skills,
          totalInstances: result.total_instances,
          verificationRate: result.verification_rate,
        });

        return result;
      } catch (error) {
        logger.error('Failed to get category statistics', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
          category,
        });
        throw error;
      }
    });
  }

  /**
   * Get skill verification trends over time
   */
  async getSkillVerificationTrends(
    organizationId: string,
    skillId?: string,
    days: number = 30
  ): Promise<SkillVerificationTrend[]> {
    const cacheKey = `verification_trends_${organizationId}_${skillId || 'all'}_${days}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const trends = await this.skillModel.getSkillVerificationTrends(organizationId, skillId, days);

        logger.info('Retrieved verification trends', {
          organizationId,
          skillId,
          days,
          trendsCount: trends.length,
        });

        return trends;
      } catch (error) {
        logger.error('Failed to get verification trends', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
          skillId,
          days,
        });
        throw error;
      }
    });
  }

  /**
   * Get comprehensive organization skills overview
   */
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
    verification_trends: SkillVerificationTrend[];
    last_updated: string;
  }> {
    const cacheKey = `org_overview_${organizationId}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const overview = await this.skillModel.getOrganizationSkillsOverview(organizationId);

        const result = {
          ...overview,
          last_updated: new Date().toISOString(),
        };

        logger.info('Retrieved organization skills overview', {
          organizationId,
          totalUniqueSkills: result.total_unique_skills,
          totalInstances: result.total_skill_instances,
          overallVerificationRate: result.overall_verification_rate,
        });

        return result;
      } catch (error) {
        logger.error('Failed to get organization skills overview', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
        });
        throw error;
      }
    });
  }

  /**
   * Perform skill gap analysis
   */
  async performSkillGapAnalysis(
    organizationId: string,
    targetSkillRequirements?: Record<string, number>
  ): Promise<SkillGapAnalysis[]> {
    const cacheKey = `gap_analysis_${organizationId}_${JSON.stringify(targetSkillRequirements || {})}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const allStats = await this.getAllSkillsStatistics(organizationId);
        const gaps: SkillGapAnalysis[] = [];

        // If no target requirements provided, use organization average as baseline
        let targets = targetSkillRequirements;
        if (!targets) {
          const overview = await this.getOrganizationSkillsOverview(organizationId);
          const avgMembersPerSkill = Math.ceil(overview.total_skill_instances / overview.total_unique_skills);
          
          targets = {};
          Object.values(allStats).forEach(skill => {
            targets![skill.skill_id] = Math.max(avgMembersPerSkill, 3); // Minimum of 3 or average
          });
        }

        Object.entries(targets).forEach(([skillId, targetCount]) => {
          const skillStats = allStats[skillId];
          if (!skillStats) return;

          const currentMembers = skillStats.total_members;
          const gapCount = Math.max(0, targetCount - currentMembers);
          const gapPercentage = targetCount > 0 ? (gapCount / targetCount) * 100 : 0;

          if (gapCount > 0) {
            let priority: 'high' | 'medium' | 'low' = 'low';
            if (gapPercentage >= 70) priority = 'high';
            else if (gapPercentage >= 40) priority = 'medium';

            const recommendedActions: string[] = [];
            if (currentMembers === 0) {
              recommendedActions.push('Recruit members with this skill');
              recommendedActions.push('Provide training opportunities');
            } else if (skillStats.verification_rate < 0.5) {
              recommendedActions.push('Focus on skill verification');
              recommendedActions.push('Provide mentorship programs');
            } else {
              recommendedActions.push('Recruit additional skilled members');
              recommendedActions.push('Cross-train existing members');
            }

            gaps.push({
              skill_id: skillId,
              skill_name: skillStats.skill_name,
              skill_category: skillStats.skill_category,
              current_members: currentMembers,
              target_members: targetCount,
              gap_count: gapCount,
              gap_percentage: gapPercentage,
              priority,
              recommended_actions: recommendedActions,
            });
          }
        });

        // Sort by priority and gap percentage
        gaps.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.gap_percentage - a.gap_percentage;
        });

        logger.info('Performed skill gap analysis', {
          organizationId,
          totalGaps: gaps.length,
          highPriorityGaps: gaps.filter(g => g.priority === 'high').length,
          mediumPriorityGaps: gaps.filter(g => g.priority === 'medium').length,
        });

        return gaps;
      } catch (error) {
        logger.error('Failed to perform skill gap analysis', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
        });
        throw error;
      }
    });
  }

  /**
   * Get skill statistics summary for dashboard
   */
  async getSkillStatisticsSummary(organizationId: string): Promise<{
    total_skills: number;
    total_members_with_skills: number;
    overall_verification_rate: number;
    most_common_skill: {
      name: string;
      member_count: number;
    } | null;
    least_verified_category: {
      category: string;
      verification_rate: number;
    } | null;
    recent_verifications_count: number;
    skill_gaps_count: number;
  }> {
    const cacheKey = `summary_${organizationId}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        const [overview, gaps] = await Promise.all([
          this.getOrganizationSkillsOverview(organizationId),
          this.performSkillGapAnalysis(organizationId),
        ]);

        // Find most common skill
        const mostCommonSkill = overview.top_skills.length > 0 
          ? {
              name: overview.top_skills[0].skill_name,
              member_count: overview.top_skills[0].member_count,
            }
          : null;

        // Find least verified category
        const categoryEntries = Object.entries(overview.skills_by_category);
        const leastVerifiedCategory = categoryEntries.length > 0
          ? categoryEntries.reduce((min, [category, stats]) => 
              stats.verification_rate < min.verification_rate 
                ? { category, verification_rate: stats.verification_rate }
                : min
            , { category: categoryEntries[0][0], verification_rate: categoryEntries[0][1].verification_rate })
          : null;

        // Count recent verifications
        const recentVerifications = overview.verification_trends
          .reduce((sum, trend) => sum + trend.verifications_count, 0);

        const summary = {
          total_skills: overview.total_unique_skills,
          total_members_with_skills: overview.total_skill_instances,
          overall_verification_rate: overview.overall_verification_rate,
          most_common_skill: mostCommonSkill,
          least_verified_category: leastVerifiedCategory,
          recent_verifications_count: recentVerifications,
          skill_gaps_count: gaps.length,
        };

        logger.info('Generated skill statistics summary', {
          organizationId,
          totalSkills: summary.total_skills,
          totalMembersWithSkills: summary.total_members_with_skills,
          overallVerificationRate: summary.overall_verification_rate,
        });

        return summary;
      } catch (error) {
        logger.error('Failed to get skill statistics summary', {
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId,
        });
        throw error;
      }
    });
  }

  /**
   * Invalidate cache when skill data changes
   */
  async invalidateSkillCache(organizationId: string, skillId?: string): Promise<void> {
    try {
      if (skillId) {
        // Invalidate specific skill cache
        const keysToDelete = Array.from(this.cache.keys()).filter(key => 
          key.includes(organizationId) && key.includes(skillId)
        );
        keysToDelete.forEach(key => this.cache.delete(key));
        
        logger.info('Invalidated skill-specific cache', { organizationId, skillId });
      } else {
        // Invalidate all organization cache
        this.clearCache(organizationId);
      }
    } catch (error) {
      logger.error('Failed to invalidate skill cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        skillId,
      });
    }
  }

  /**
   * Refresh statistics cache proactively
   */
  async refreshStatisticsCache(organizationId: string): Promise<void> {
    try {
      logger.info('Starting proactive cache refresh', { organizationId });

      // Clear existing cache for this organization
      this.clearCache(organizationId);

      // Pre-populate cache with fresh data
      await Promise.all([
        this.getAllSkillsStatistics(organizationId),
        this.getOrganizationSkillsOverview(organizationId),
        this.getSkillStatisticsSummary(organizationId),
      ]);

      logger.info('Completed proactive cache refresh', { organizationId });
    } catch (error) {
      logger.error('Failed to refresh statistics cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }
}