import { Request, Response } from 'express';
import { HROnboardingModel, CreateHROnboardingTemplateData, UpdateHROnboardingTemplateData, CreateHROnboardingProgressData, UpdateHROnboardingProgressData } from '../models/hr_onboarding_model';
import logger from '../config/logger';

export class HROnboardingController {
  private onboardingModel: HROnboardingModel;

  constructor() {
    this.onboardingModel = new HROnboardingModel();
  }

  // Template management endpoints
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const { is_active, limit, offset } = req.query;

      const filters = {
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await this.onboardingModel.listTemplates(organizationId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit || result.total,
          offset: filters.offset || 0,
        },
      });
    } catch (error) {
      logger.error('Error fetching onboarding templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding templates',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const templateData: CreateHROnboardingTemplateData = {
        organization_id: organizationId,
        ...req.body,
      };

      // Validate required fields
      if (!templateData.role_name || !templateData.tasks || !Array.isArray(templateData.tasks)) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: role_name and tasks are required',
        });
        return;
      }

      // Validate tasks structure
      for (const task of templateData.tasks) {
        if (!task.id || !task.title || typeof task.required !== 'boolean' || typeof task.estimated_hours !== 'number' || typeof task.order_index !== 'number') {
          res.status(400).json({
            success: false,
            message: 'Invalid task structure. Each task must have id, title, required (boolean), estimated_hours (number), and order_index (number)',
          });
          return;
        }
      }

      const template = await this.onboardingModel.createTemplate(templateData);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Onboarding template created successfully',
      });
    } catch (error) {
      logger.error('Error creating onboarding template:', error);
      
      // Handle unique constraint violation
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(409).json({
          success: false,
          message: 'A template for this role already exists in the organization',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create onboarding template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await this.onboardingModel.findTemplateById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Onboarding template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Error fetching onboarding template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const updateData: UpdateHROnboardingTemplateData = req.body;

      // Validate tasks structure if provided
      if (updateData.tasks && Array.isArray(updateData.tasks)) {
        for (const task of updateData.tasks) {
          if (!task.id || !task.title || typeof task.required !== 'boolean' || typeof task.estimated_hours !== 'number' || typeof task.order_index !== 'number') {
            res.status(400).json({
              success: false,
              message: 'Invalid task structure. Each task must have id, title, required (boolean), estimated_hours (number), and order_index (number)',
            });
            return;
          }
        }
      }

      const template = await this.onboardingModel.updateTemplate(templateId, updateData);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Onboarding template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
        message: 'Onboarding template updated successfully',
      });
    } catch (error) {
      logger.error('Error updating onboarding template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update onboarding template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const deleted = await this.onboardingModel.deleteTemplate(templateId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Onboarding template not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Onboarding template deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting onboarding template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete onboarding template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Progress tracking endpoints
  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const { userId } = req.params;

      const progress = await this.onboardingModel.findProgressByUserAndOrganization(organizationId, userId);

      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Onboarding progress not found for this user',
        });
        return;
      }

      // Get additional progress information
      const template = await this.onboardingModel.findTemplateById(progress.template_id);
      const estimatedCompletion = await this.onboardingModel.getEstimatedCompletionDate(progress.id);
      const remainingTasks = await this.onboardingModel.getRequiredTasksRemaining(progress.id);

      res.json({
        success: true,
        data: {
          ...progress,
          template,
          estimated_completion_date: estimatedCompletion,
          remaining_required_tasks: remainingTasks,
        },
      });
    } catch (error) {
      logger.error('Error fetching onboarding progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const { userId } = req.params;
      const updateData: UpdateHROnboardingProgressData = req.body;

      const existingProgress = await this.onboardingModel.findProgressByUserAndOrganization(organizationId, userId);

      if (!existingProgress) {
        res.status(404).json({
          success: false,
          message: 'Onboarding progress not found for this user',
        });
        return;
      }

      const progress = await this.onboardingModel.updateProgress(existingProgress.id, updateData);

      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Failed to update onboarding progress',
        });
        return;
      }

      res.json({
        success: true,
        data: progress,
        message: 'Onboarding progress updated successfully',
      });
    } catch (error) {
      logger.error('Error updating onboarding progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update onboarding progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createProgress(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const progressData: CreateHROnboardingProgressData = {
        organization_id: organizationId,
        ...req.body,
      };

      // Validate required fields
      if (!progressData.user_id || !progressData.template_id) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id and template_id are required',
        });
        return;
      }

      // Check if progress already exists for this user
      const existingProgress = await this.onboardingModel.findProgressByUserAndOrganization(organizationId, progressData.user_id);
      if (existingProgress) {
        res.status(409).json({
          success: false,
          message: 'Onboarding progress already exists for this user',
        });
        return;
      }

      // Verify template exists
      const template = await this.onboardingModel.findTemplateById(progressData.template_id);
      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Onboarding template not found',
        });
        return;
      }

      const progress = await this.onboardingModel.createProgress(progressData);

      res.status(201).json({
        success: true,
        data: progress,
        message: 'Onboarding progress created successfully',
      });
    } catch (error) {
      logger.error('Error creating onboarding progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create onboarding progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAllProgress(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const { status, limit, offset } = req.query;

      const filters = {
        status: status as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await this.onboardingModel.getProgressWithUserInfo(organizationId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit || result.total,
          offset: filters.offset || 0,
        },
      });
    } catch (error) {
      logger.error('Error fetching onboarding progress list:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding progress list',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Task completion endpoint
  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;
      const { taskId } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          message: 'user_id is required in request body',
        });
        return;
      }

      // Find the user's progress
      const existingProgress = await this.onboardingModel.findProgressByUserAndOrganization(organizationId, user_id);

      if (!existingProgress) {
        res.status(404).json({
          success: false,
          message: 'Onboarding progress not found for this user',
        });
        return;
      }

      // Validate task completion
      const isValid = await this.onboardingModel.validateTaskCompletion(existingProgress.id, taskId);
      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Task is invalid or already completed',
        });
        return;
      }

      const updatedProgress = await this.onboardingModel.completeTask(existingProgress.id, taskId);

      if (!updatedProgress) {
        res.status(500).json({
          success: false,
          message: 'Failed to complete task',
        });
        return;
      }

      // Check if onboarding is now complete
      const isComplete = await this.onboardingModel.isOnboardingComplete(updatedProgress.id);

      res.json({
        success: true,
        data: updatedProgress,
        message: isComplete ? 'Task completed! Onboarding is now complete.' : 'Task completed successfully',
        onboarding_complete: isComplete,
      });
    } catch (error) {
      logger.error('Error completing onboarding task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete onboarding task',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Analytics and reporting endpoints
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;

      const statistics = await this.onboardingModel.getOnboardingStatistics(organizationId);
      const overdueProgress = await this.onboardingModel.getOverdueProgress(organizationId);

      res.json({
        success: true,
        data: {
          statistics,
          overdue_count: overdueProgress.length,
          overdue_progress: overdueProgress,
        },
      });
    } catch (error) {
      logger.error('Error fetching onboarding analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch onboarding analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getOverdueProgress(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.org!.id;

      const overdueProgress = await this.onboardingModel.getOverdueProgress(organizationId);

      res.json({
        success: true,
        data: overdueProgress,
      });
    } catch (error) {
      logger.error('Error fetching overdue onboarding progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch overdue onboarding progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async markOverdueProgress(req: Request, res: Response): Promise<void> {
    try {
      const updatedCount = await this.onboardingModel.markOverdueProgress();

      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
        },
        message: `Marked ${updatedCount} onboarding progress records as overdue`,
      });
    } catch (error) {
      logger.error('Error marking overdue onboarding progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark overdue onboarding progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}