import { HRApplicationModel, HRApplication, ApplicationStatus } from '../models/hr_application_model';
import { NotificationService } from './notification_service';
import { ActivityService } from './activity_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface ApplicationAnalytics {
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  applications_by_month: Array<{
    month: string;
    count: number;
  }>;
  average_processing_time_days: number;
  approval_rate: number;
  rejection_rate: number;
  top_rejection_reasons: Array<{
    reason: string;
    count: number;
  }>;
}

export interface ApplicationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class HRApplicationService {
  private applicationModel: HRApplicationModel;
  private notificationService: NotificationService;
  private activityService: ActivityService;

  constructor() {
    this.applicationModel = new HRApplicationModel();
    this.notificationService = new NotificationService();
    this.activityService = new ActivityService();
  }

  /**
   * Validates application data with comprehensive checks
   */
  async validateApplication(
    organizationId: string,
    userId: string,
    applicationData: any
  ): Promise<ApplicationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for duplicate applications
      const isDuplicate = await this.applicationModel.checkDuplicateApplication(
        organizationId,
        userId
      );

      if (isDuplicate) {
        errors.push('User already has an active application for this organization');
      }

      // Validate application data structure
      const dataValidationErrors = this.applicationModel.validateApplicationData(applicationData);
      errors.push(...dataValidationErrors.map(e => e.message));

      // Business logic validations
      if (!applicationData.cover_letter && !applicationData.experience) {
        warnings.push('Applications with both cover letter and experience have higher approval rates');
      }

      if (applicationData.cover_letter && applicationData.cover_letter.length < 100) {
        warnings.push('Cover letters with more detail tend to be more successful');
      }

      // Check if user has been rejected recently (within 30 days)
      const recentRejection = await this.checkRecentRejection(organizationId, userId);
      if (recentRejection) {
        errors.push('Cannot reapply within 30 days of a rejection');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Error validating application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });

      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: [],
      };
    }
  }

  /**
   * Prevents duplicate applications by checking existing applications
   */
  async preventDuplicateApplication(
    organizationId: string,
    userId: string
  ): Promise<{ canApply: boolean; reason?: string; existingApplication?: HRApplication }> {
    try {
      const existingApplication = await this.applicationModel.findByOrganizationAndUser(
        organizationId,
        userId
      );

      if (!existingApplication) {
        return { canApply: true };
      }

      // Allow reapplication if previous application was rejected more than 30 days ago
      if (existingApplication.status === 'rejected') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (existingApplication.updated_at < thirtyDaysAgo) {
          return { canApply: true };
        }

        return {
          canApply: false,
          reason: 'Cannot reapply within 30 days of rejection',
          existingApplication,
        };
      }

      // Don't allow reapplication if application is still active
      if (['pending', 'under_review', 'interview_scheduled'].includes(existingApplication.status)) {
        return {
          canApply: false,
          reason: 'You already have an active application for this organization',
          existingApplication,
        };
      }

      // Don't allow reapplication if already approved
      if (existingApplication.status === 'approved') {
        return {
          canApply: false,
          reason: 'You have already been approved for this organization',
          existingApplication,
        };
      }

      return { canApply: true };
    } catch (error) {
      logger.error('Error checking duplicate application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });

      return {
        canApply: false,
        reason: 'Unable to verify application status',
      };
    }
  }

  /**
   * Triggers automatic notifications for status changes
   */
  async triggerStatusChangeNotifications(
    application: HRApplication,
    oldStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
    reviewerId: string
  ): Promise<void> {
    try {
      // Notify the applicant about status changes
      await this.notifyApplicantStatusChange(application, oldStatus, newStatus);

      // Notify organization members about new applications
      if (newStatus === 'pending' && oldStatus !== 'pending') {
        await this.notifyOrganizationNewApplication(application);
      }

      // Notify organization members about approvals
      if (newStatus === 'approved') {
        await this.notifyOrganizationApproval(application, reviewerId);
      }

      logger.info('Status change notifications sent', {
        applicationId: application.id,
        oldStatus,
        newStatus,
        organizationId: application.organization_id,
      });
    } catch (error) {
      logger.error('Error sending status change notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: application.id,
        oldStatus,
        newStatus,
      });
      // Don't throw error - notifications are not critical
    }
  }

  /**
   * Generates invite codes for approved applications
   */
  async generateInviteCodeForApproval(applicationId: string): Promise<string | null> {
    try {
      const application = await this.applicationModel.findById(applicationId);
      
      if (!application) {
        logger.error('Application not found for invite code generation', { applicationId });
        return null;
      }

      if (application.status !== 'approved') {
        logger.warn('Attempted to generate invite code for non-approved application', {
          applicationId,
          status: application.status,
        });
        return null;
      }

      // Generate invite code if not already present
      if (!application.invite_code) {
        const inviteCode = await this.applicationModel.generateInviteCode(applicationId);
        
        logger.info('Invite code generated for approved application', {
          applicationId,
          inviteCode,
          organizationId: application.organization_id,
        });

        return inviteCode;
      }

      return application.invite_code;
    } catch (error) {
      logger.error('Error generating invite code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId,
      });
      return null;
    }
  }

  /**
   * Builds comprehensive application analytics and reporting
   */
  async generateApplicationAnalytics(organizationId: string): Promise<ApplicationAnalytics> {
    try {
      // Get basic stats
      const stats = await this.applicationModel.getApplicationStats(organizationId);

      // Get applications by month for the last 12 months
      const applicationsByMonth = await this.getApplicationsByMonth(organizationId, 12);

      // Calculate processing times
      const averageProcessingTime = await this.calculateAverageProcessingTime(organizationId);

      // Calculate rates
      const totalProcessed = stats.by_status.approved + stats.by_status.rejected;
      const approvalRate = totalProcessed > 0 ? (stats.by_status.approved / totalProcessed) * 100 : 0;
      const rejectionRate = totalProcessed > 0 ? (stats.by_status.rejected / totalProcessed) * 100 : 0;

      // Get top rejection reasons
      const topRejectionReasons = await this.getTopRejectionReasons(organizationId);

      return {
        total_applications: stats.total,
        applications_by_status: stats.by_status,
        applications_by_month: applicationsByMonth,
        average_processing_time_days: averageProcessingTime,
        approval_rate: Math.round(approvalRate * 100) / 100,
        rejection_rate: Math.round(rejectionRate * 100) / 100,
        top_rejection_reasons: topRejectionReasons,
      };
    } catch (error) {
      logger.error('Error generating application analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      // Return empty analytics on error
      return {
        total_applications: 0,
        applications_by_status: {
          pending: 0,
          under_review: 0,
          interview_scheduled: 0,
          approved: 0,
          rejected: 0,
        },
        applications_by_month: [],
        average_processing_time_days: 0,
        approval_rate: 0,
        rejection_rate: 0,
        top_rejection_reasons: [],
      };
    }
  }  /**

   * Checks if user has been rejected recently
   */
  private async checkRecentRejection(organizationId: string, userId: string): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentApplications = await this.applicationModel.getApplicationsByStatus(
        organizationId,
        'rejected',
        thirtyDaysAgo
      );

      return recentApplications.some(app => app.user_id === userId);
    } catch (error) {
      logger.error('Error checking recent rejection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }

  /**
   * Notifies applicant about status changes
   */
  private async notifyApplicantStatusChange(
    application: HRApplication,
    oldStatus: ApplicationStatus,
    newStatus: ApplicationStatus
  ): Promise<void> {
    try {
      let entityType: NotificationEntityType;
      let title: string;
      let message: string;

      switch (newStatus) {
        case 'under_review':
          entityType = NotificationEntityType.ORGANIZATION_UPDATED;
          title = 'Application Under Review';
          message = 'Your application is now under review';
          break;
        case 'interview_scheduled':
          entityType = NotificationEntityType.ORGANIZATION_UPDATED;
          title = 'Interview Scheduled';
          message = 'An interview has been scheduled for your application';
          break;
        case 'approved':
          entityType = NotificationEntityType.ORGANIZATION_INVITED;
          title = 'Application Approved!';
          message = 'Congratulations! Your application has been approved';
          break;
        case 'rejected':
          entityType = NotificationEntityType.ORGANIZATION_UPDATED;
          title = 'Application Status Update';
          message = 'Your application status has been updated';
          break;
        default:
          return; // Don't send notification for other status changes
      }

      await this.notificationService.createCustomEventNotification(
        entityType,
        application.organization_id,
        'system',
        [application.user_id],
        title,
        message,
        {
          application_id: application.id,
          status: newStatus,
          previous_status: oldStatus,
        }
      );
    } catch (error) {
      logger.error('Error notifying applicant of status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: application.id,
        newStatus,
      });
    }
  }

  /**
   * Notifies organization members about new applications
   */
  private async notifyOrganizationNewApplication(application: HRApplication): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Get organization members who should be notified (owners, admins, HR managers)
      const organization = await organizationModel.findById(application.organization_id);
      if (!organization) return;

      // For now, just notify the organization owner
      // In a full implementation, you'd get all members with HR permissions
      const notifierIds = [organization.owner_id];

      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        application.organization_id,
        application.user_id,
        notifierIds,
        'New Application Received',
        'A new application has been submitted to your organization',
        {
          application_id: application.id,
          applicant_id: application.user_id,
        }
      );
    } catch (error) {
      logger.error('Error notifying organization of new application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: application.id,
      });
    }
  }

  /**
   * Notifies organization members about approvals
   */
  private async notifyOrganizationApproval(
    application: HRApplication,
    reviewerId: string
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(application.organization_id);
      if (!organization) return;

      // Notify organization owner (excluding the reviewer if they're the owner)
      const notifierIds = organization.owner_id !== reviewerId 
        ? [organization.owner_id] 
        : [];

      if (notifierIds.length > 0) {
        await this.notificationService.createCustomEventNotification(
          NotificationEntityType.ORGANIZATION_UPDATED,
          application.organization_id,
          reviewerId,
          notifierIds,
          'Application Approved',
          'An application has been approved for your organization',
          {
            application_id: application.id,
            applicant_id: application.user_id,
            reviewer_id: reviewerId,
          }
        );
      }
    } catch (error) {
      logger.error('Error notifying organization of approval', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId: application.id,
        reviewerId,
      });
    }
  }

  /**
   * Gets applications by month for analytics
   */
  private async getApplicationsByMonth(
    organizationId: string,
    monthsBack: number
  ): Promise<Array<{ month: string; count: number }>> {
    try {
      // Import database here to avoid circular dependencies
      const db = (await import('../config/database')).default;

      const result = await db('hr_applications')
        .select(
          db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
          db.raw('COUNT(*) as count')
        )
        .where('organization_id', organizationId)
        .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${monthsBack} months'`))
        .groupBy(db.raw("TO_CHAR(created_at, 'YYYY-MM')"))
        .orderBy('month', 'desc');

      return result.map((row: any) => ({
        month: row.month,
        count: parseInt(row.count),
      }));
    } catch (error) {
      logger.error('Error getting applications by month', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        monthsBack,
      });
      return [];
    }
  }

  /**
   * Calculates average processing time for applications
   */
  private async calculateAverageProcessingTime(organizationId: string): Promise<number> {
    try {
      // Import database here to avoid circular dependencies
      const db = (await import('../config/database')).default;

      const result = await db('hr_applications')
        .select(
          db.raw('AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days')
        )
        .where('organization_id', organizationId)
        .whereIn('status', ['approved', 'rejected'])
        .first();

      return result?.avg_days ? Math.round(parseFloat(result.avg_days) * 100) / 100 : 0;
    } catch (error) {
      logger.error('Error calculating average processing time', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return 0;
    }
  }

  /**
   * Gets top rejection reasons for analytics
   */
  private async getTopRejectionReasons(
    organizationId: string,
    limit: number = 5
  ): Promise<Array<{ reason: string; count: number }>> {
    try {
      // Import database here to avoid circular dependencies
      const db = (await import('../config/database')).default;

      const result = await db('hr_applications')
        .select('rejection_reason')
        .count('* as count')
        .where('organization_id', organizationId)
        .where('status', 'rejected')
        .whereNotNull('rejection_reason')
        .groupBy('rejection_reason')
        .orderBy('count', 'desc')
        .limit(limit);

      return result.map((row: any) => ({
        reason: row.rejection_reason as string,
        count: parseInt(row.count as string),
      }));
    } catch (error) {
      logger.error('Error getting top rejection reasons', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return [];
    }
  }

  /**
   * Processes application status change with all business logic
   */
  async processStatusChange(
    applicationId: string,
    newStatus: ApplicationStatus,
    reviewerId: string,
    notes?: string,
    rejectionReason?: string
  ): Promise<HRApplication | null> {
    try {
      const application = await this.applicationModel.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      const oldStatus = application.status;

      // Update the application status
      const updatedApplication = await this.applicationModel.updateStatus(
        applicationId,
        newStatus,
        reviewerId,
        notes,
        rejectionReason
      );

      if (!updatedApplication) {
        throw new Error('Failed to update application status');
      }

      // Trigger notifications
      await this.triggerStatusChangeNotifications(
        updatedApplication,
        oldStatus,
        newStatus,
        reviewerId
      );

      // Generate invite code for approved applications
      if (newStatus === 'approved') {
        await this.generateInviteCodeForApproval(applicationId);
      }

      logger.info('Application status change processed successfully', {
        applicationId,
        oldStatus,
        newStatus,
        reviewerId,
        organizationId: updatedApplication.organization_id,
      });

      return updatedApplication;
    } catch (error) {
      logger.error('Error processing status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        applicationId,
        newStatus,
        reviewerId,
      });
      throw error;
    }
  }

  /**
   * Bulk processes multiple application status changes
   */
  async processBulkStatusChange(
    applicationIds: string[],
    newStatus: ApplicationStatus,
    reviewerId: string,
    notes?: string
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const applicationId of applicationIds) {
      try {
        await this.processStatusChange(applicationId, newStatus, reviewerId, notes);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Application ${applicationId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info('Bulk status change processed', {
      total: applicationIds.length,
      successful: results.successful,
      failed: results.failed,
      newStatus,
      reviewerId,
    });

    return results;
  }
}