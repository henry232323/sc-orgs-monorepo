import { Request, Response } from 'express';
import { HRSkillModel } from '../models/hr_skill_model';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

const skillModel = new HRSkillModel();

export class HRSkillController {
  /**
   * GET /api/organizations/:rsi_org_id/skills
   * List all available skills with optional filtering
   */
  async listSkills(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        verification_required,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      let result;
      
      if (search) {
        const organization = req.org!;
        const skills = await skillModel.searchSkills(organization.id, search as string);
        result = { data: skills, total: skills.length };
      } else {
        const filters = {
          category: category as any,
          verification_required: verification_required === 'true' ? true : 
                                verification_required === 'false' ? false : undefined,
          limit: parsedLimit,
          offset,
        };

        const organization = req.org!;
        result = await skillModel.listSkills(organization.id, filters);
      }

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to list skills', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list skills',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/skills
   * Create a new skill (admin only)
   */
  async createSkill(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { name, category, description, verification_required } = req.body;

      if (!name || !category) {
        res.status(400).json({
          success: false,
          error: 'Name and category are required',
        });
        return;
      }

      const organization = req.org!;
      
      // Check if skill already exists in this organization
      const existingSkill = await skillModel.findSkillByName(organization.id, name);
      if (existingSkill) {
        res.status(409).json({
          success: false,
          error: 'Skill with this name already exists in this organization',
        });
        return;
      }

      const skill = await skillModel.createSkill({
        organization_id: organization.id,
        name,
        category,
        description,
        verification_required: verification_required || false,
      });

      logger.info('Skill created successfully', {
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        data: skill,
      });
    } catch (error) {
      logger.error('Failed to create skill', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create skill',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/organization
   * Get skills for organization members with filtering
   */
  async getOrganizationSkills(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const {
        category,
        verified,
        page = 1,
        limit = 50,
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const filters = {
        category: category as any,
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
        limit: parsedLimit,
        offset,
      };

      const result = await skillModel.getSkillsByOrganization(organization.id, filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to get organization skills', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get organization skills',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/skills/user
   * Add a skill to the current user
   */
  async addUserSkill(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { skill_id, proficiency_level, notes } = req.body;

      if (!skill_id || !proficiency_level) {
        res.status(400).json({
          success: false,
          error: 'Skill ID and proficiency level are required',
        });
        return;
      }

      // Check if skill exists
      const skill = await skillModel.findSkillById(skill_id);
      if (!skill) {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      // Check if user already has this skill
      const organization = req.org!;
      const existingUserSkill = await skillModel.findUserSkillByUserAndSkill(organization.id, user.id, skill_id);
      if (existingUserSkill) {
        res.status(409).json({
          success: false,
          error: 'User already has this skill',
        });
        return;
      }

      const userSkill = await skillModel.createUserSkill({
        organization_id: organization.id,
        user_id: user.id,
        skill_id,
        proficiency_level,
        notes,
      });

      logger.info('User skill added successfully', {
        userSkillId: userSkill.id,
        userId: user.id,
        skillId: skill_id,
        proficiencyLevel: proficiency_level,
      });

      res.status(201).json({
        success: true,
        data: userSkill,
      });
    } catch (error) {
      logger.error('Failed to add user skill', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to add user skill',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/user/:userId?
   * Get skills for a specific user (or current user if no userId provided)
   */
  async getUserSkills(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = getUserFromRequest(req);
      const { userId } = req.params;
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const {
        category,
        verified,
        proficiency_level,
      } = req.query;

      const filters = {
        category: category as any,
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
        proficiency_level: proficiency_level as any,
      };

      const organization = req.org!;
      const skills = await skillModel.getUserSkills(organization.id, targetUserId, filters);

      res.json({
        success: true,
        data: skills,
      });
    } catch (error) {
      logger.error('Failed to get user skills', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get user skills',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/skills/:skillId/verify
   * Verify a user's skill (requires appropriate permissions)
   */
  async verifyUserSkill(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      const { skillId } = req.params;
      const { notes } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Find the user skill
      const userSkill = await skillModel.findUserSkillById(skillId);
      if (!userSkill) {
        res.status(404).json({
          success: false,
          error: 'User skill not found',
        });
        return;
      }

      // Verify the skill
      const verifiedSkill = await skillModel.verifyUserSkill(skillId, user.id, notes);

      if (!verifiedSkill) {
        res.status(500).json({
          success: false,
          error: 'Failed to verify skill',
        });
        return;
      }

      logger.info('User skill verified successfully', {
        userSkillId: skillId,
        verifiedBy: user.id,
        userId: userSkill.user_id,
      });

      res.json({
        success: true,
        data: verifiedSkill,
      });
    } catch (error) {
      logger.error('Failed to verify user skill', {
        error: error instanceof Error ? error.message : 'Unknown error',
        skillId: req.params.skillId,
        verifiedBy: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to verify skill',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/skills/user/:userSkillId
   * Update a user's skill
   */
  async updateUserSkill(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      const { userSkillId } = req.params;
      const { proficiency_level, notes } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Find the user skill
      const userSkill = await skillModel.findUserSkillById(userSkillId);
      if (!userSkill) {
        res.status(404).json({
          success: false,
          error: 'User skill not found',
        });
        return;
      }

      // Check if user owns this skill or has permission to modify it
      if (userSkill.user_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to modify this skill',
        });
        return;
      }

      const updateData: any = {};
      if (proficiency_level) updateData.proficiency_level = proficiency_level;
      if (notes !== undefined) updateData.notes = notes;

      const updatedSkill = await skillModel.updateUserSkill(userSkillId, updateData);

      if (!updatedSkill) {
        res.status(500).json({
          success: false,
          error: 'Failed to update skill',
        });
        return;
      }

      logger.info('User skill updated successfully', {
        userSkillId,
        userId: user.id,
        updates: updateData,
      });

      res.json({
        success: true,
        data: updatedSkill,
      });
    } catch (error) {
      logger.error('Failed to update user skill', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userSkillId: req.params.userSkillId,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update skill',
      });
    }
  }

  /**
   * DELETE /api/organizations/:rsi_org_id/skills/user/:userSkillId
   * Remove a user's skill
   */
  async removeUserSkill(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      const { userSkillId } = req.params;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Find the user skill
      const userSkill = await skillModel.findUserSkillById(userSkillId);
      if (!userSkill) {
        res.status(404).json({
          success: false,
          error: 'User skill not found',
        });
        return;
      }

      // Check if user owns this skill
      if (userSkill.user_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to remove this skill',
        });
        return;
      }

      const deleted = await skillModel.deleteUserSkill(userSkillId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to remove skill',
        });
        return;
      }

      logger.info('User skill removed successfully', {
        userSkillId,
        userId: user.id,
      });

      res.json({
        success: true,
        message: 'Skill removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove user skill', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userSkillId: req.params.userSkillId,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to remove skill',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/analytics
   * Get skill analytics for the organization
   */
  async getSkillAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;

      const analytics = await skillModel.getSkillAnalytics(organization.id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get skill analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get skill analytics',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/skills/certifications
   * Create a new certification
   */
  async createCertification(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const {
        user_id,
        name,
        description,
        issued_date,
        expiration_date,
        certificate_url,
      } = req.body;

      if (!user_id || !name || !issued_date) {
        res.status(400).json({
          success: false,
          error: 'User ID, name, and issued date are required',
        });
        return;
      }

      const certification = await skillModel.createCertification({
        user_id,
        organization_id: organization.id,
        name,
        description,
        issued_date: new Date(issued_date),
        expiration_date: expiration_date ? new Date(expiration_date) : undefined,
        issued_by: user.id,
        certificate_url,
      });

      logger.info('Certification created successfully', {
        certificationId: certification.id,
        userId: user_id,
        organizationId: organization.id,
        issuedBy: user.id,
      });

      res.status(201).json({
        success: true,
        data: certification,
      });
    } catch (error) {
      logger.error('Failed to create certification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        issuedBy: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create certification',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/certifications
   * Get certifications for the organization
   */
  async getOrganizationCertifications(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const {
        user_id,
        expiring_soon,
        page = 1,
        limit = 50,
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const filters = {
        user_id: user_id as string,
        expiring_soon: expiring_soon === 'true',
        limit: parsedLimit,
        offset,
      };

      const result = await skillModel.getOrganizationCertifications(organization.id, filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to get organization certifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get organization certifications',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/certifications/user/:userId?
   * Get certifications for a specific user
   */
  async getUserCertifications(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = getUserFromRequest(req);
      const { userId } = req.params;
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const certifications = await skillModel.getUserCertifications(targetUserId);

      res.json({
        success: true,
        data: certifications,
      });
    } catch (error) {
      logger.error('Failed to get user certifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get user certifications',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/skills/certifications/expiring
   * Get certifications expiring soon
   */
  async getExpiringCertifications(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { days_ahead = 30 } = req.query;

      const daysAhead = parseInt(days_ahead as string) || 30;
      const certifications = await skillModel.getExpiringCertifications(organization.id, daysAhead);

      res.json({
        success: true,
        data: certifications,
      });
    } catch (error) {
      logger.error('Failed to get expiring certifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get expiring certifications',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/skills/certifications/:certificationId
   * Update a certification
   */
  async updateCertification(req: Request, res: Response): Promise<void> {
    try {
      const { certificationId } = req.params;
      const {
        name,
        description,
        issued_date,
        expiration_date,
        certificate_url,
      } = req.body;

      const certification = await skillModel.findCertificationById(certificationId);
      if (!certification) {
        res.status(404).json({
          success: false,
          error: 'Certification not found',
        });
        return;
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (issued_date) updateData.issued_date = new Date(issued_date);
      if (expiration_date !== undefined) {
        updateData.expiration_date = expiration_date ? new Date(expiration_date) : null;
      }
      if (certificate_url !== undefined) updateData.certificate_url = certificate_url;

      const updatedCertification = await skillModel.updateCertification(certificationId, updateData);

      if (!updatedCertification) {
        res.status(500).json({
          success: false,
          error: 'Failed to update certification',
        });
        return;
      }

      logger.info('Certification updated successfully', {
        certificationId,
        updates: updateData,
      });

      res.json({
        success: true,
        data: updatedCertification,
      });
    } catch (error) {
      logger.error('Failed to update certification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        certificationId: req.params.certificationId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update certification',
      });
    }
  }

  /**
   * DELETE /api/organizations/:rsi_org_id/skills/certifications/:certificationId
   * Delete a certification
   */
  async deleteCertification(req: Request, res: Response): Promise<void> {
    try {
      const { certificationId } = req.params;

      const certification = await skillModel.findCertificationById(certificationId);
      if (!certification) {
        res.status(404).json({
          success: false,
          error: 'Certification not found',
        });
        return;
      }

      const deleted = await skillModel.deleteCertification(certificationId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete certification',
        });
        return;
      }

      logger.info('Certification deleted successfully', {
        certificationId,
      });

      res.json({
        success: true,
        message: 'Certification deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete certification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        certificationId: req.params.certificationId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete certification',
      });
    }
  }
}