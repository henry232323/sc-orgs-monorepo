import { HROnboardingModel, HROnboardingTemplate, HROnboardingProgress, OnboardingTask, CreateHROnboardingProgressData, UpdateHROnboardingProgressData } from '../models/hr_onboarding_model';
import { NotificationService } from './notification_service';
import { ActivityService } from './activity_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface OnboardingCompletionCertificate {
  user_id: string;
  organization_id: string;
  template_id: string;
  role_name: string;
  completed_at: Date;
  completion_percentage: number;
  certificate_id: string;
}

export interface OnboardingNotificationData {
  user_id: string;
  organization_id: string;
  template_id: string;
  progress_id: string;
  role_name: string;
  notification_type: 'started' | 'task_completed' | 'completed' | 'overdue' | 'reminder';
  task_title?: string;
  completion_percentage?: number;
  days_overdue?: number;
}

export class HROnboardingService {
  private onboardingModel: HROnboardingModel;
  private notificationService: NotificationService;
  private activityService: ActivityService;

  constructor() {
    this.onboardingModel = new HROnboardingModel();
    this.notificationService = new NotificationService();
    this.activityService = new ActivityService();
  }

  // Role-based template assignment and customization
  async assignTemplateToUser(
    organizationId: string,
    userId: string,
    roleName: string
  ): Promise<HROnboardingProgress | null> {
    try {
      // Find the template for the role
      const template = await this.onboardingModel.findTemplateByRoleAndOrganization(organizationId, roleName);
      
      if (!template) {
        logger.warn(`No onboarding template found for role ${roleName} in organization ${organizationId}`);
        return null;
      }

      // Check if user already has onboarding progress
      const existingProgress = await this.onboardingModel.findProgressByUserAndOrganization(organizationId, userId);
      if (existingProgress) {
        logger.warn(`User ${userId} already has onboarding progress in organization ${organizationId}`);
        return existingProgress;
      }

      // Create progress for the user
      const progressData: CreateHROnboardingProgressData = {
        organization_id: organizationId,
        user_id: userId,
        template_id: template.id,
      };

      const progress = await this.onboardingModel.createProgress(progressData);

      // Send notification about onboarding start
      await this.sendOnboardingNotification({
        user_id: userId,
        organization_id: organizationId,
        template_id: template.id,
        progress_id: progress.id,
        role_name: roleName,
        notification_type: 'started',
      });

      logger.info(`Onboarding assigned to user ${userId} for role ${roleName} in organization ${organizationId}`);
      return progress;
    } catch (error) {
      logger.error('Error assigning onboarding template to user:', error);
      throw error;
    }
  }

  async customizeTemplateForRole(
    templateId: string,
    customizations: {
      additional_tasks?: OnboardingTask[];
      modified_tasks?: Partial<OnboardingTask>[];
      estimated_duration_days?: number;
    }
  ): Promise<HROnboardingTemplate | null> {
    try {
      const template = await this.onboardingModel.findTemplateById(templateId);
      if (!template) {
        return null;
      }

      let updatedTasks = [...template.tasks];

      // Apply task modifications
      if (customizations.modified_tasks) {
        customizations.modified_tasks.forEach(modifiedTask => {
          const taskIndex = updatedTasks.findIndex(task => task.id === modifiedTask.id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...modifiedTask };
          }
        });
      }

      // Add additional tasks
      if (customizations.additional_tasks) {
        updatedTasks = [...updatedTasks, ...customizations.additional_tasks];
      }

      // Sort tasks by order_index
      updatedTasks.sort((a, b) => a.order_index - b.order_index);

      const updateData = {
        tasks: updatedTasks,
        estimated_duration_days: customizations.estimated_duration_days || template.estimated_duration_days,
      };

      return await this.onboardingModel.updateTemplate(templateId, updateData);
    } catch (error) {
      logger.error('Error customizing onboarding template:', error);
      throw error;
    }
  }

  // Progress tracking with automatic status updates
  async updateProgressWithStatusCheck(
    progressId: string,
    updateData: {
      completed_tasks?: string[];
      status?: HROnboardingProgress['status'];
    }
  ): Promise<HROnboardingProgress | null> {
    try {
      const progress = await this.onboardingModel.findProgressById(progressId);
      if (!progress) {
        return null;
      }

      const template = await this.onboardingModel.findTemplateById(progress.template_id);
      if (!template) {
        return null;
      }

      let finalUpdateData: UpdateHROnboardingProgressData = { ...updateData };

      // If completed_tasks is provided, recalculate status and completion percentage
      if (updateData.completed_tasks) {
        const completedTasks = updateData.completed_tasks;
        const totalTasks = template.tasks.length;
        const requiredTasks = template.tasks.filter(task => task.required);
        const completedRequiredTasks = requiredTasks.filter(task => completedTasks.includes(task.id));

        const completionPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        // Determine status based on completion
        let status: HROnboardingProgress['status'] = 'in_progress';
        let completedAt: Date | undefined;

        if (completedRequiredTasks.length === requiredTasks.length) {
          status = 'completed';
          completedAt = new Date();
        } else if (progress.status === 'not_started' && completedTasks.length > 0) {
          status = 'in_progress';
        }

        finalUpdateData = {
          ...finalUpdateData,
          completion_percentage: completionPercentage,
          status,
          started_at: progress.started_at || new Date(),
        };

        if (completedAt) {
          finalUpdateData.completed_at = completedAt;
        }
      }

      const updatedProgress = await this.onboardingModel.updateProgress(progressId, finalUpdateData);

      // Send notifications based on status changes
      if (updatedProgress && updatedProgress.status !== progress.status) {
        await this.handleStatusChangeNotifications(progress, updatedProgress, template);
      }

      return updatedProgress;
    } catch (error) {
      logger.error('Error updating onboarding progress with status check:', error);
      throw error;
    }
  }

  async completeTaskWithNotification(
    progressId: string,
    taskId: string
  ): Promise<{ progress: HROnboardingProgress | null; isComplete: boolean }> {
    try {
      const progress = await this.onboardingModel.findProgressById(progressId);
      if (!progress) {
        return { progress: null, isComplete: false };
      }

      const template = await this.onboardingModel.findTemplateById(progress.template_id);
      if (!template) {
        return { progress: null, isComplete: false };
      }

      const task = template.tasks.find(t => t.id === taskId);
      if (!task) {
        return { progress: null, isComplete: false };
      }

      const updatedProgress = await this.onboardingModel.completeTask(progressId, taskId);
      if (!updatedProgress) {
        return { progress: null, isComplete: false };
      }

      // Send task completion notification
      await this.sendOnboardingNotification({
        user_id: updatedProgress.user_id,
        organization_id: updatedProgress.organization_id,
        template_id: updatedProgress.template_id,
        progress_id: updatedProgress.id,
        role_name: template.role_name,
        notification_type: 'task_completed',
        task_title: task.title,
        completion_percentage: updatedProgress.completion_percentage,
      });

      const isComplete = await this.onboardingModel.isOnboardingComplete(progressId);

      // If onboarding is complete, generate certificate and send completion notification
      if (isComplete && updatedProgress.status === 'completed') {
        const certificate = await this.generateCompletionCertificate(updatedProgress, template);
        
        await this.sendOnboardingNotification({
          user_id: updatedProgress.user_id,
          organization_id: updatedProgress.organization_id,
          template_id: updatedProgress.template_id,
          progress_id: updatedProgress.id,
          role_name: template.role_name,
          notification_type: 'completed',
          completion_percentage: updatedProgress.completion_percentage,
        });

        logger.info(`Onboarding completed for user ${updatedProgress.user_id} in organization ${updatedProgress.organization_id}`);
      }

      return { progress: updatedProgress, isComplete };
    } catch (error) {
      logger.error('Error completing onboarding task with notification:', error);
      throw error;
    }
  }

  // Overdue notification system integration
  async processOverdueNotifications(): Promise<number> {
    try {
      // Mark overdue progress
      const markedCount = await this.onboardingModel.markOverdueProgress();

      if (markedCount > 0) {
        logger.info(`Marked ${markedCount} onboarding progress records as overdue`);

        // Get all overdue progress to send notifications
        const overdueProgress = await this.getOverdueProgressWithDetails();

        for (const progress of overdueProgress) {
          const daysSinceCreated = Math.floor(
            (new Date().getTime() - new Date(progress.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          await this.sendOnboardingNotification({
            user_id: progress.user_id,
            organization_id: progress.organization_id,
            template_id: progress.template_id,
            progress_id: progress.id,
            role_name: progress.role_name || 'Unknown',
            notification_type: 'overdue',
            days_overdue: daysSinceCreated - 30, // 30 days is the threshold
            completion_percentage: progress.completion_percentage,
          });
        }
      }

      return markedCount;
    } catch (error) {
      logger.error('Error processing overdue notifications:', error);
      throw error;
    }
  }

  async sendReminderNotifications(organizationId: string, daysBefore: number = 7): Promise<number> {
    try {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() - (30 - daysBefore)); // 30 days total - days before

      const progressNeedingReminders = await this.onboardingModel.listProgress(organizationId, {
        status: 'in_progress',
      });

      let remindersSent = 0;

      for (const progress of progressNeedingReminders.data) {
        const createdDate = new Date(progress.created_at);
        const daysSinceCreated = Math.floor(
          (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send reminder if approaching deadline (e.g., 23 days since creation for 30-day deadline)
        if (daysSinceCreated >= (30 - daysBefore) && daysSinceCreated < 30) {
          const template = await this.onboardingModel.findTemplateById(progress.template_id);
          
          await this.sendOnboardingNotification({
            user_id: progress.user_id,
            organization_id: progress.organization_id,
            template_id: progress.template_id,
            progress_id: progress.id,
            role_name: template?.role_name || 'Unknown',
            notification_type: 'reminder',
            completion_percentage: progress.completion_percentage,
          });

          remindersSent++;
        }
      }

      logger.info(`Sent ${remindersSent} onboarding reminder notifications for organization ${organizationId}`);
      return remindersSent;
    } catch (error) {
      logger.error('Error sending reminder notifications:', error);
      throw error;
    }
  }

  // Completion certificate generation
  async generateCompletionCertificate(
    progress: HROnboardingProgress,
    template: HROnboardingTemplate
  ): Promise<OnboardingCompletionCertificate> {
    try {
      const certificate: OnboardingCompletionCertificate = {
        user_id: progress.user_id,
        organization_id: progress.organization_id,
        template_id: progress.template_id,
        role_name: template.role_name,
        completed_at: progress.completed_at || new Date(),
        completion_percentage: progress.completion_percentage,
        certificate_id: `cert_${progress.id}_${Date.now()}`,
      };

      // In a real implementation, you might store this certificate in a database
      // or generate a PDF certificate file
      logger.info(`Generated completion certificate ${certificate.certificate_id} for user ${progress.user_id}`);

      return certificate;
    } catch (error) {
      logger.error('Error generating completion certificate:', error);
      throw error;
    }
  }

  // Helper methods
  private async handleStatusChangeNotifications(
    oldProgress: HROnboardingProgress,
    newProgress: HROnboardingProgress,
    template: HROnboardingTemplate
  ): Promise<void> {
    try {
      if (oldProgress.status !== 'completed' && newProgress.status === 'completed') {
        await this.sendOnboardingNotification({
          user_id: newProgress.user_id,
          organization_id: newProgress.organization_id,
          template_id: newProgress.template_id,
          progress_id: newProgress.id,
          role_name: template.role_name,
          notification_type: 'completed',
          completion_percentage: newProgress.completion_percentage,
        });
      } else if (oldProgress.status !== 'overdue' && newProgress.status === 'overdue') {
        const daysSinceCreated = Math.floor(
          (new Date().getTime() - new Date(newProgress.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        await this.sendOnboardingNotification({
          user_id: newProgress.user_id,
          organization_id: newProgress.organization_id,
          template_id: newProgress.template_id,
          progress_id: newProgress.id,
          role_name: template.role_name,
          notification_type: 'overdue',
          days_overdue: daysSinceCreated - 30,
          completion_percentage: newProgress.completion_percentage,
        });
      }
    } catch (error) {
      logger.error('Error handling status change notifications:', error);
    }
  }

  private async sendOnboardingNotification(data: OnboardingNotificationData): Promise<void> {
    try {
      let title = '';
      let message = '';

      switch (data.notification_type) {
        case 'started':
          title = 'Onboarding Started';
          message = `Your onboarding for the ${data.role_name} role has begun. Please complete all required tasks.`;
          break;
        case 'task_completed':
          title = 'Task Completed';
          message = `You've completed the task "${data.task_title}". Progress: ${data.completion_percentage?.toFixed(1)}%`;
          break;
        case 'completed':
          title = 'Onboarding Complete!';
          message = `Congratulations! You've completed your onboarding for the ${data.role_name} role.`;
          break;
        case 'overdue':
          title = 'Onboarding Overdue';
          message = `Your onboarding for the ${data.role_name} role is ${data.days_overdue} days overdue. Please complete the remaining tasks.`;
          break;
        case 'reminder':
          title = 'Onboarding Reminder';
          message = `Don't forget to complete your onboarding for the ${data.role_name} role. Current progress: ${data.completion_percentage?.toFixed(1)}%`;
          break;
      }

      let entityType: NotificationEntityType;
      
      switch (data.notification_type) {
        case 'started':
          entityType = NotificationEntityType.HR_ONBOARDING_STARTED;
          break;
        case 'completed':
          entityType = NotificationEntityType.HR_ONBOARDING_COMPLETED;
          break;
        case 'overdue':
          entityType = NotificationEntityType.HR_ONBOARDING_OVERDUE;
          break;
        default:
          entityType = NotificationEntityType.HR_ONBOARDING_STARTED;
      }

      await this.notificationService.createCustomEventNotification(
        entityType,
        data.progress_id,
        data.user_id, // actor_id
        [data.user_id], // notifier_ids
        title,
        message,
        {
          progress_id: data.progress_id,
          template_id: data.template_id,
          role_name: data.role_name,
          notification_type: data.notification_type,
          completion_percentage: data.completion_percentage,
          organization_id: data.organization_id,
        }
      );
    } catch (error) {
      logger.error('Error sending onboarding notification:', error);
    }
  }

  private async getOverdueProgressWithDetails(): Promise<any[]> {
    try {
      // This would need to be implemented with a join query to get role names
      // For now, we'll use a simple approach
      const allOrganizations = await this.getAllOrganizationIds();
      const overdueProgress = [];

      for (const orgId of allOrganizations) {
        const orgOverdue = await this.onboardingModel.getOverdueProgress(orgId);
        for (const progress of orgOverdue) {
          const template = await this.onboardingModel.findTemplateById(progress.template_id);
          overdueProgress.push({
            ...progress,
            role_name: template?.role_name || 'Unknown',
          });
        }
      }

      return overdueProgress;
    } catch (error) {
      logger.error('Error getting overdue progress with details:', error);
      return [];
    }
  }

  private async getAllOrganizationIds(): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd query the organizations table
      const templates = await this.onboardingModel.listTemplates('', { limit: 1000 });
      const orgIds = [...new Set(templates.data.map(t => t.organization_id))];
      return orgIds;
    } catch (error) {
      logger.error('Error getting organization IDs:', error);
      return [];
    }
  }

  // Public methods for external use
  async getOnboardingStatistics(organizationId: string) {
    return this.onboardingModel.getOnboardingStatistics(organizationId);
  }

  async getProgressWithTemplate(progressId: string) {
    const progress = await this.onboardingModel.findProgressById(progressId);
    if (!progress) return null;

    const template = await this.onboardingModel.findTemplateById(progress.template_id);
    const estimatedCompletion = await this.onboardingModel.getEstimatedCompletionDate(progressId);
    const remainingTasks = await this.onboardingModel.getRequiredTasksRemaining(progressId);

    return {
      progress,
      template,
      estimated_completion_date: estimatedCompletion,
      remaining_required_tasks: remainingTasks,
    };
  }

  async bulkAssignOnboarding(
    organizationId: string,
    assignments: Array<{ user_id: string; role_name: string }>
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const assignment of assignments) {
      try {
        const result = await this.assignTemplateToUser(
          organizationId,
          assignment.user_id,
          assignment.role_name
        );
        
        if (result) {
          successful++;
        } else {
          failed++;
          errors.push(`No template found for role ${assignment.role_name}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Failed to assign onboarding to user ${assignment.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    logger.info(`Bulk onboarding assignment completed: ${successful} successful, ${failed} failed`);
    return { successful, failed, errors };
  }
}