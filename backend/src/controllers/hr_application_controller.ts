import { Request, Response } from 'express';
import { HRApplicationModel } from '../models/hr_application_model';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

const applicationModel = new HRApplicationModel();

export class HRApplicationController {
  /**
   * POST /api/organizations/:rsi_org_id/applications
   * Submit a new application to an organization
   */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { application_data } = req.body;

      if (!application_data) {
        res.status(400).json({
          success: false,
          error: 'Application data is required',
        });
        return;
      }

      // Create application
      const application = await applicationModel.create({
        organization_id: organization.id,
        user_id: user.id,
        application_data,
      });

      logger.info('Application submitted successfully', {
        applicationId: application.id,
        organizationId: organization.id,
        userId: user.id,
      });

      res.status(201).json({
        success: true,
        data: application,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to submit application', {
        error: errorMessage,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Validation failed') || 
          errorMessage.includes('already has an active application')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to submit application',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/applications
   * List applications for an organization with filtering and pagination
   */
  async listApplications(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const {
        status,
        reviewer_id,
        page = 1,
        limit = 20,
        include_user_info = 'false',
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100); // Max 100
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const filters = {
        status: status as any,
        reviewer_id: reviewer_id as string,
        limit: parsedLimit,
        offset,
      };

      let result;
      if (include_user_info === 'true') {
        result = await applicationModel.getApplicationsWithUserInfo(organization.id, filters);
      } else {
        result = await applicationModel.list(organization.id, filters);
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
      logger.error('Failed to list applications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list applications',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/applications/:applicationId
   * Get a specific application by ID
   */
  async getApplication(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { applicationId } = req.params;
      const user = getUserFromRequest(req);

      const application = await applicationModel.findById(applicationId);

      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify application belongs to this organization
      if (application.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Check permissions - user can view their own application or org members can view all
      const canView = user && (
        application.user_id === user.id || 
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canView) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this application',
        });
        return;
      }

      // Get status history if user has org access
      let statusHistory = null;
      if (user && await this.hasOrganizationAccess(organization.id, user.id)) {
        statusHistory = await applicationModel.getStatusHistory(applicationId);
      }

      res.json({
        success: true,
        data: {
          ...application,
          status_history: statusHistory,
        },
      });
    } catch (error) {
      logger.error('Failed to get application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: req.params.applicationId,
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get application',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/applications/:applicationId/status
   * Update application status
   */
  async updateApplicationStatus(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { applicationId } = req.params;
      const { status, notes, rejection_reason } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required',
        });
        return;
      }

      // Check if user has permission to update applications
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update application status',
        });
        return;
      }

      const application = await applicationModel.findById(applicationId);
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify application belongs to this organization
      if (application.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Update status
      const updatedApplication = await applicationModel.updateStatus(
        applicationId,
        status,
        user.id,
        notes,
        rejection_reason
      );

      if (!updatedApplication) {
        res.status(500).json({
          success: false,
          error: 'Failed to update application status',
        });
        return;
      }

      logger.info('Application status updated', {
        applicationId,
        oldStatus: application.status,
        newStatus: status,
        reviewerId: user.id,
        organizationId: organization.id,
      });

      res.json({
        success: true,
        data: updatedApplication,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update application status', {
        error: errorMessage,
        applicationId: req.params.applicationId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Invalid status transition') || 
          errorMessage.includes('required')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update application status',
      });
    }
  } 
 /**
   * POST /api/organizations/:rsi_org_id/applications/bulk-update
   * Bulk update application statuses
   */
  async bulkUpdateApplications(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { application_ids, status, notes } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!application_ids || !Array.isArray(application_ids) || application_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Application IDs array is required',
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required',
        });
        return;
      }

      // Check if user has permission to update applications
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update applications',
        });
        return;
      }

      // Validate all applications belong to this organization
      const applications = await Promise.all(
        application_ids.map(id => applicationModel.findById(id))
      );

      const invalidApplications = applications.filter(
        (app, index) => !app || app.organization_id !== organization.id
      );

      if (invalidApplications.length > 0) {
        res.status(400).json({
          success: false,
          error: 'One or more applications not found or do not belong to this organization',
        });
        return;
      }

      // Perform bulk update
      const updatedCount = await applicationModel.bulkUpdateStatus(
        application_ids,
        status,
        user.id,
        notes
      );

      logger.info('Bulk application status update completed', {
        organizationId: organization.id,
        reviewerId: user.id,
        applicationCount: application_ids.length,
        updatedCount,
        newStatus: status,
      });

      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
          requested_count: application_ids.length,
        },
      });
    } catch (error) {
      logger.error('Failed to bulk update applications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to bulk update applications',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/applications/stats
   * Get application statistics for an organization
   */
  async getApplicationStats(req: Request, res: Response): Promise<void> {
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

      // Check if user has permission to view stats
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view application statistics',
        });
        return;
      }

      const stats = await applicationModel.getApplicationStats(organization.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get application stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get application statistics',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/applications/:applicationId/history
   * Get status history for a specific application
   */
  async getApplicationHistory(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { applicationId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view history
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view application history',
        });
        return;
      }

      const application = await applicationModel.findById(applicationId);
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify application belongs to this organization
      if (application.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      const history = await applicationModel.getStatusHistory(applicationId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get application history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: req.params.applicationId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get application history',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/applications/:applicationId/invite-code
   * Generate invite code for approved application
   */
  async generateInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { applicationId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to generate invite codes
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to generate invite codes',
        });
        return;
      }

      const application = await applicationModel.findById(applicationId);
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify application belongs to this organization
      if (application.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Only generate invite codes for approved applications
      if (application.status !== 'approved') {
        res.status(400).json({
          success: false,
          error: 'Invite codes can only be generated for approved applications',
        });
        return;
      }

      const inviteCode = await applicationModel.generateInviteCode(applicationId);

      logger.info('Invite code generated for application', {
        applicationId,
        organizationId: organization.id,
        generatedBy: user.id,
        inviteCode,
      });

      res.json({
        success: true,
        data: {
          invite_code: inviteCode,
        },
      });
    } catch (error) {
      logger.error('Failed to generate invite code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: req.params.applicationId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate invite code',
      });
    }
  }

  /**
   * Helper method to check if user has access to organization applications
   * This would typically check if user is a member with appropriate permissions
   */
  private async hasOrganizationAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Check if user is a member (you might want to add role-based permissions here)
      const isMember = await organizationModel.isUserMember(organizationId, userId);
      return isMember;
    } catch (error) {
      logger.error('Error checking organization access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }
}