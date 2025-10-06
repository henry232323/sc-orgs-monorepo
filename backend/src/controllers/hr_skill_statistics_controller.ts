import { Request, Response } from 'express';
import { HRSkillStatisticsService, SkillStatisticsFilters } from '../services/hr_skill_statistics_service';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

export class HRSkillStatisticsController {
  private statisticsService: HRSkillStatisticsService;

  constructor() {
    this.statisticsService = new HRSkillStatisticsService();
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics
   * Get statistics for all skills in the organization
   */
  async getAllSkillsStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const {
        category,
        skill_ids,
        include_zero_members = 'false',
        min_member_count,
      } = req.query;

      const filters: SkillStatisticsFilters = {
        category: category as string,
        skill_ids: skill_ids ? (skill_ids as string).split(',') : undefined,
        include_zero_members: include_zero_members === 'true',
        min_member_count: min_member_count ? parseInt(min_member_count as string) : undefined,
      };

      const statistics = await this.statisticsService.getAllSkillsStatistics(organization.id, filters);

      res.json({
        success: true,
        data: statistics,
        organization_id: organization.id,
        filters_applied: filters,
        total_skills: Object.keys(statistics).length,
      });
    } catch (error) {
      logger.error('Failed to get all skills statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get skills statistics',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/:skillId/statistics
   * Get statistics for a specific skill
   */
  async getSkillStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { skillId } = req.params;

      if (!skillId) {
        res.status(400).json({
          success: false,
          error: 'Skill ID is required',
        });
        return;
      }

      const statistics = await this.statisticsService.getSkillStatistics(organization.id, skillId);

      res.json({
        success: true,
        data: statistics,
        organization_id: organization.id,
      });
    } catch (error) {
      logger.error('Failed to get skill statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        skillId: req.params.skillId,
      });

      if (error instanceof Error && error.message === 'Skill not found') {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get skill statistics',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/category/:category
   * Get statistics for skills in a specific category
   */
  async getSkillStatisticsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { category } = req.params;

      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category is required',
        });
        return;
      }

      const validCategories = ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership'];
      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
        return;
      }

      const statistics = await this.statisticsService.getSkillStatisticsByCategory(organization.id, category);

      res.json({
        success: true,
        data: statistics,
        organization_id: organization.id,
        category,
      });
    } catch (error) {
      logger.error('Failed to get category statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        category: req.params.category,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get category statistics',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/overview
   * Get comprehensive organization skills overview
   */
  async getOrganizationSkillsOverview(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;

      const overview = await this.statisticsService.getOrganizationSkillsOverview(organization.id);

      res.json({
        success: true,
        data: overview,
        organization_id: organization.id,
      });
    } catch (error) {
      logger.error('Failed to get organization skills overview', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get organization skills overview',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/summary
   * Get skill statistics summary for dashboard
   */
  async getSkillStatisticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;

      const summary = await this.statisticsService.getSkillStatisticsSummary(organization.id);

      res.json({
        success: true,
        data: summary,
        organization_id: organization.id,
      });
    } catch (error) {
      logger.error('Failed to get skill statistics summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get skill statistics summary',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/trends
   * Get skill verification trends over time
   */
  async getSkillVerificationTrends(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { skill_id, days = '30' } = req.query;

      const daysNumber = parseInt(days as string);
      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        res.status(400).json({
          success: false,
          error: 'Days must be a number between 1 and 365',
        });
        return;
      }

      const trends = await this.statisticsService.getSkillVerificationTrends(
        organization.id,
        skill_id as string,
        daysNumber
      );

      res.json({
        success: true,
        data: trends,
        organization_id: organization.id,
        skill_id: skill_id || null,
        days: daysNumber,
      });
    } catch (error) {
      logger.error('Failed to get verification trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        skillId: req.query.skill_id,
        days: req.query.days,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get verification trends',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/gaps
   * Perform skill gap analysis
   */
  async getSkillGapAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { target_requirements } = req.body;

      let targetSkillRequirements: Record<string, number> | undefined;
      if (target_requirements) {
        try {
          targetSkillRequirements = typeof target_requirements === 'string' 
            ? JSON.parse(target_requirements)
            : target_requirements;
        } catch (parseError) {
          res.status(400).json({
            success: false,
            error: 'Invalid target_requirements format. Must be valid JSON object.',
          });
          return;
        }
      }

      const gaps = await this.statisticsService.performSkillGapAnalysis(
        organization.id,
        targetSkillRequirements
      );

      res.json({
        success: true,
        data: gaps,
        organization_id: organization.id,
        total_gaps: gaps.length,
        high_priority_gaps: gaps.filter(g => g.priority === 'high').length,
        medium_priority_gaps: gaps.filter(g => g.priority === 'medium').length,
        low_priority_gaps: gaps.filter(g => g.priority === 'low').length,
      });
    } catch (error) {
      logger.error('Failed to get skill gap analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to perform skill gap analysis',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/skills/statistics/refresh
   * Refresh statistics cache
   */
  async refreshStatisticsCache(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      const organization = req.org!;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Only allow organization admins to refresh cache
      // This would typically check user permissions, but for now we'll allow any authenticated user
      
      await this.statisticsService.refreshStatisticsCache(organization.id);

      logger.info('Statistics cache refreshed', {
        organizationId: organization.id,
        refreshedBy: user.id,
      });

      res.json({
        success: true,
        message: 'Statistics cache refreshed successfully',
        organization_id: organization.id,
        refreshed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to refresh statistics cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to refresh statistics cache',
      });
    }
  }

  /**
   * DELETE /api/organizations/:rsi_org_id/skills/statistics/cache
   * Clear statistics cache
   */
  async clearStatisticsCache(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      const organization = req.org!;
      const { skill_id } = req.query;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      await this.statisticsService.invalidateSkillCache(organization.id, skill_id as string);

      logger.info('Statistics cache cleared', {
        organizationId: organization.id,
        skillId: skill_id || 'all',
        clearedBy: user.id,
      });

      res.json({
        success: true,
        message: 'Statistics cache cleared successfully',
        organization_id: organization.id,
        skill_id: skill_id || null,
        cleared_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to clear statistics cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        skillId: req.query.skill_id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to clear statistics cache',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/statistics/export
   * Export skill statistics data
   */
  async exportSkillStatistics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { format = 'json', include_details = 'true' } = req.query;

      if (!['json', 'csv'].includes(format as string)) {
        res.status(400).json({
          success: false,
          error: 'Format must be either "json" or "csv"',
        });
        return;
      }

      const [overview, allStats] = await Promise.all([
        this.statisticsService.getOrganizationSkillsOverview(organization.id),
        include_details === 'true' 
          ? this.statisticsService.getAllSkillsStatistics(organization.id)
          : Promise.resolve({}),
      ]);

      const exportData = {
        organization_id: organization.id,
        organization_name: organization.name,
        exported_at: new Date().toISOString(),
        overview,
        ...(include_details === 'true' && { detailed_statistics: allStats }),
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="skill-statistics-${organization.rsi_org_id}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvRows: string[] = [];
        csvRows.push('Skill Name,Category,Total Members,Verified Members,Verification Rate,Beginner,Intermediate,Advanced,Expert,Recent Verifications');
        
        Object.values(allStats).forEach((skill: any) => {
          csvRows.push([
            skill.skill_name,
            skill.skill_category,
            skill.total_members,
            skill.verified_members,
            (skill.verification_rate * 100).toFixed(2) + '%',
            skill.proficiency_breakdown.beginner,
            skill.proficiency_breakdown.intermediate,
            skill.proficiency_breakdown.advanced,
            skill.proficiency_breakdown.expert,
            skill.recent_verifications,
          ].join(','));
        });

        const csvContent = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="skill-statistics-${organization.rsi_org_id}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      }

      logger.info('Skill statistics exported', {
        organizationId: organization.id,
        format,
        includeDetails: include_details === 'true',
      });
    } catch (error) {
      logger.error('Failed to export skill statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        format: req.query.format,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to export skill statistics',
      });
    }
  }
}