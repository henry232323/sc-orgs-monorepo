import { NotificationEntityType } from '../types/notification';
import { EventModel } from '../models/event_model';
import { OrganizationModel } from '../models/organization_model';
import { UserModel } from '../models/user_model';
import { HRApplicationModel } from '../models/hr_application_model';
import { HROnboardingModel } from '../models/hr_onboarding_model';
import { HRPerformanceModel } from '../models/hr_performance_model';
import { HRSkillModel } from '../models/hr_skill_model';
import { HRDocumentModel } from '../models/hr_document_model';
import logger from '../config/logger';

export interface NotificationContent {
  title: string;
  message: string;
}

export class NotificationSerializer {
  private static eventModel = new EventModel();
  private static organizationModel = new OrganizationModel();
  private static userModel = new UserModel();
  private static hrApplicationModel = new HRApplicationModel();
  private static hrOnboardingModel = new HROnboardingModel();
  private static hrPerformanceModel = new HRPerformanceModel();
  private static hrSkillModel = new HRSkillModel();
  private static hrDocumentModel = new HRDocumentModel();

  /**
   * Generate title and message for a notification based on entity type and data
   */
  static async generateNotificationContent(
    entityType: NotificationEntityType,
    entityId: string,
    actorId?: string,
    customData?: { title?: string; message?: string }
  ): Promise<NotificationContent> {
    try {
      // If custom title and message are provided, use them (for custom notifications)
      if (customData?.title && customData?.message) {
        // Check if this is an event-related custom notification to add organizer context
        if (
          entityType >= NotificationEntityType.EVENT_CREATED &&
          entityType <= NotificationEntityType.EVENT_REMINDER
        ) {
          return {
            title: `📢 ${customData.title}`,
            message: `Notification from event organizer: ${customData.message}`,
          };
        }
        return {
          title: customData.title,
          message: customData.message,
        };
      }

      // Generate content based on entity type
      switch (entityType) {
        case NotificationEntityType.EVENT_CREATED:
          return await this.generateEventCreatedContent(entityId, actorId);

        case NotificationEntityType.EVENT_UPDATED:
          return await this.generateEventUpdatedContent(entityId, actorId);

        case NotificationEntityType.EVENT_DELETED:
          return await this.generateEventDeletedContent(entityId, actorId);

        case NotificationEntityType.EVENT_REGISTERED:
          return await this.generateEventRegisteredContent(entityId, actorId);

        case NotificationEntityType.EVENT_UNREGISTERED:
          return await this.generateEventUnregisteredContent(entityId, actorId);

        case NotificationEntityType.EVENT_STARTING_SOON:
          return await this.generateEventStartingSoonContent(entityId);

        case NotificationEntityType.EVENT_REMINDER:
          return await this.generateEventReminderContent(entityId, customData);

        case NotificationEntityType.ORGANIZATION_CREATED:
          return await this.generateOrganizationCreatedContent(
            entityId,
            actorId
          );

        case NotificationEntityType.ORGANIZATION_UPDATED:
          return await this.generateOrganizationUpdatedContent(
            entityId,
            actorId
          );

        // HR notification cases
        case NotificationEntityType.HR_APPLICATION_SUBMITTED:
          return await this.generateHRApplicationSubmittedContent(entityId, actorId);

        case NotificationEntityType.HR_APPLICATION_STATUS_CHANGED:
          return await this.generateHRApplicationStatusChangedContent(entityId, actorId);

        case NotificationEntityType.HR_ONBOARDING_STARTED:
          return await this.generateHROnboardingStartedContent(entityId, actorId);

        case NotificationEntityType.HR_ONBOARDING_COMPLETED:
          return await this.generateHROnboardingCompletedContent(entityId, actorId);

        case NotificationEntityType.HR_ONBOARDING_OVERDUE:
          return await this.generateHROnboardingOverdueContent(entityId, actorId);

        case NotificationEntityType.HR_PERFORMANCE_REVIEW_DUE:
          return await this.generateHRPerformanceReviewDueContent(entityId, actorId);

        case NotificationEntityType.HR_PERFORMANCE_REVIEW_SUBMITTED:
          return await this.generateHRPerformanceReviewSubmittedContent(entityId, actorId);

        case NotificationEntityType.HR_SKILL_VERIFIED:
          return await this.generateHRSkillVerifiedContent(entityId, actorId);

        case NotificationEntityType.HR_CERTIFICATION_EXPIRING:
          return await this.generateHRCertificationExpiringContent(entityId, actorId);

        case NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT:
          return await this.generateHRDocumentAcknowledgmentContent(entityId, actorId);

        case NotificationEntityType.HR_ANALYTICS_ALERT:
          return await this.generateHRAnalyticsAlertContent(entityId, customData);

        default:
          return {
            title: 'Notification',
            message: 'You have a new notification',
          };
      }
    } catch (error) {
      logger.error('Error generating notification content:', error);
      return {
        title: 'Notification',
        message: 'You have a new notification',
      };
    }
  }

  // Event notification content generators
  private static async generateEventCreatedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Created',
        message: 'A new event has been created',
      };
    }

    return {
      title: 'New Event Created',
      message: `"${event.title}" has been created and is available for registration`,
    };
  }

  private static async generateEventUpdatedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return { title: 'Event Updated', message: 'An event has been updated' };
    }

    return {
      title: 'Event Updated',
      message: `"${event.title}" has been updated. Check out the latest details!`,
    };
  }

  private static async generateEventDeletedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    return {
      title: 'Event Cancelled',
      message: 'An event you were registered for has been cancelled',
    };
  }

  private static async generateEventRegisteredContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Registration',
        message: 'Someone registered for an event',
      };
    }

    return {
      title: 'New Registration',
      message: `Someone registered for "${event.title}"`,
    };
  }

  private static async generateEventUnregisteredContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Unregistration',
        message: 'Someone unregistered from an event',
      };
    }

    return {
      title: 'Registration Cancelled',
      message: `Someone cancelled their registration for "${event.title}"`,
    };
  }

  private static async generateEventStartingSoonContent(
    eventId: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Starting Soon',
        message: 'An event is starting soon',
      };
    }

    const startTime = new Date(event.start_time);
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return {
      title: 'Event Starting Soon!',
      message: `"${event.title}" is starting at ${timeString}`,
    };
  }

  private static async generateEventReminderContent(
    entityId: string,
    customData?: any
  ): Promise<NotificationContent> {
    // For custom notifications, use the provided title and message
    if (customData?.title && customData?.message) {
      return {
        title: customData.title,
        message: customData.message,
      };
    }

    // For automatic reminders, generate based on event data
    const event = await this.eventModel.findById(entityId);
    if (!event) {
      return { title: 'Event Reminder', message: 'You have an upcoming event' };
    }

    const startTime = new Date(event.start_time);
    const now = new Date();
    const hoursUntil = Math.round(
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    let timeText = '';
    if (hoursUntil <= 1) {
      timeText = 'starting soon';
    } else if (hoursUntil <= 2) {
      timeText = 'in 2 hours';
    } else if (hoursUntil <= 24) {
      timeText = `in ${hoursUntil} hours`;
    } else {
      timeText = 'tomorrow';
    }

    return {
      title: `Event Reminder: ${event.title}`,
      message: `Don't forget! "${event.title}" is ${timeText}`,
    };
  }

  // Organization notification content generators
  private static async generateOrganizationCreatedContent(
    orgId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) {
      return {
        title: 'Organization Created',
        message: 'A new organization has been created',
      };
    }

    return {
      title: 'New Organization',
      message: `"${organization.name}" has joined the platform`,
    };
  }

  private static async generateOrganizationUpdatedContent(
    orgId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) {
      return {
        title: 'Organization Updated',
        message: 'An organization has been updated',
      };
    }

    return {
      title: 'Organization Updated',
      message: `"${organization.name}" has updated their information`,
    };
  }

  // HR notification content generators
  private static async generateHRApplicationSubmittedContent(
    applicationId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const application = await this.hrApplicationModel.findById(applicationId);
      if (!application) {
        return {
          title: 'New Application',
          message: 'A new application has been submitted',
        };
      }

      const organization = await this.organizationModel.findById(application.organization_id);
      const applicant = actorId ? await this.userModel.findById(actorId) : null;

      return {
        title: 'New Application Submitted',
        message: `${applicant?.rsi_handle || 'Someone'} has applied to join ${organization?.name || 'your organization'}`,
      };
    } catch (error) {
      logger.error('Error generating HR application submitted content:', error);
      return {
        title: 'New Application',
        message: 'A new application has been submitted',
      };
    }
  }

  private static async generateHRApplicationStatusChangedContent(
    applicationId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const application = await this.hrApplicationModel.findById(applicationId);
      if (!application) {
        return {
          title: 'Application Status Updated',
          message: 'Your application status has been updated',
        };
      }

      const organization = await this.organizationModel.findById(application.organization_id);
      const statusMessages = {
        pending: 'is now under review',
        under_review: 'is being reviewed',
        interview_scheduled: 'has an interview scheduled',
        approved: 'has been approved! Welcome aboard!',
        rejected: 'was not successful this time',
      };

      return {
        title: 'Application Status Update',
        message: `Your application to ${organization?.name || 'the organization'} ${statusMessages[application.status] || 'has been updated'}`,
      };
    } catch (error) {
      logger.error('Error generating HR application status changed content:', error);
      return {
        title: 'Application Status Updated',
        message: 'Your application status has been updated',
      };
    }
  }

  private static async generateHROnboardingStartedContent(
    progressId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const progress = await this.hrOnboardingModel.findProgressById(progressId);
      if (!progress) {
        return {
          title: 'Onboarding Started',
          message: 'Your onboarding process has begun',
        };
      }

      const organization = await this.organizationModel.findById(progress.organization_id);

      return {
        title: 'Welcome! Onboarding Started',
        message: `Your onboarding process at ${organization?.name || 'the organization'} has begun. Complete your checklist to get started!`,
      };
    } catch (error) {
      logger.error('Error generating HR onboarding started content:', error);
      return {
        title: 'Onboarding Started',
        message: 'Your onboarding process has begun',
      };
    }
  }

  private static async generateHROnboardingCompletedContent(
    progressId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const progress = await this.hrOnboardingModel.findProgressById(progressId);
      if (!progress) {
        return {
          title: 'Onboarding Complete',
          message: 'Congratulations! Your onboarding is complete',
        };
      }

      const organization = await this.organizationModel.findById(progress.organization_id);

      return {
        title: 'Onboarding Complete! 🎉',
        message: `Congratulations! You've completed your onboarding at ${organization?.name || 'the organization'}. You're now fully integrated!`,
      };
    } catch (error) {
      logger.error('Error generating HR onboarding completed content:', error);
      return {
        title: 'Onboarding Complete',
        message: 'Congratulations! Your onboarding is complete',
      };
    }
  }

  private static async generateHROnboardingOverdueContent(
    progressId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const progress = await this.hrOnboardingModel.findProgressById(progressId);
      if (!progress) {
        return {
          title: 'Onboarding Overdue',
          message: 'Your onboarding tasks are overdue',
        };
      }

      const organization = await this.organizationModel.findById(progress.organization_id);

      return {
        title: 'Onboarding Tasks Overdue',
        message: `Your onboarding at ${organization?.name || 'the organization'} is overdue. Please complete your remaining tasks.`,
      };
    } catch (error) {
      logger.error('Error generating HR onboarding overdue content:', error);
      return {
        title: 'Onboarding Overdue',
        message: 'Your onboarding tasks are overdue',
      };
    }
  }

  private static async generateHRPerformanceReviewDueContent(
    reviewId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const review = await this.hrPerformanceModel.findReviewById(reviewId);
      if (!review) {
        return {
          title: 'Performance Review Due',
          message: 'You have a performance review due',
        };
      }

      const organization = await this.organizationModel.findById(review.organization_id);

      return {
        title: 'Performance Review Due',
        message: `Your performance review at ${organization?.name || 'the organization'} is due. Please schedule time with your reviewer.`,
      };
    } catch (error) {
      logger.error('Error generating HR performance review due content:', error);
      return {
        title: 'Performance Review Due',
        message: 'You have a performance review due',
      };
    }
  }

  private static async generateHRPerformanceReviewSubmittedContent(
    reviewId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const review = await this.hrPerformanceModel.findReviewById(reviewId);
      if (!review) {
        return {
          title: 'Performance Review Submitted',
          message: 'A performance review has been submitted',
        };
      }

      const organization = await this.organizationModel.findById(review.organization_id);
      const reviewee = await this.userModel.findById(review.reviewee_id);

      return {
        title: 'Performance Review Submitted',
        message: `Performance review for ${reviewee?.rsi_handle || 'team member'} at ${organization?.name || 'the organization'} has been submitted`,
      };
    } catch (error) {
      logger.error('Error generating HR performance review submitted content:', error);
      return {
        title: 'Performance Review Submitted',
        message: 'A performance review has been submitted',
      };
    }
  }

  private static async generateHRSkillVerifiedContent(
    userSkillId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const userSkill = await this.hrSkillModel.findUserSkillById(userSkillId);
      if (!userSkill) {
        return {
          title: 'Skill Verified',
          message: 'One of your skills has been verified',
        };
      }

      const skill = await this.hrSkillModel.findSkillById(userSkill.skill_id);
      const verifier = actorId ? await this.userModel.findById(actorId) : null;

      return {
        title: 'Skill Verified! ✅',
        message: `Your ${skill?.name || 'skill'} has been verified by ${verifier?.rsi_handle || 'a skill validator'}`,
      };
    } catch (error) {
      logger.error('Error generating HR skill verified content:', error);
      return {
        title: 'Skill Verified',
        message: 'One of your skills has been verified',
      };
    }
  }

  private static async generateHRCertificationExpiringContent(
    certificationId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const certification = await this.hrSkillModel.findCertificationById(certificationId);
      if (!certification) {
        return {
          title: 'Certification Expiring',
          message: 'One of your certifications is expiring soon',
        };
      }

      const expirationDate = new Date(certification.expiration_date!);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        title: 'Certification Expiring Soon ⚠️',
        message: `Your "${certification.name}" certification expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}. Consider renewing it.`,
      };
    } catch (error) {
      logger.error('Error generating HR certification expiring content:', error);
      return {
        title: 'Certification Expiring',
        message: 'One of your certifications is expiring soon',
      };
    }
  }

  private static async generateHRDocumentAcknowledgmentContent(
    documentId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    try {
      const document = await this.hrDocumentModel.findDocumentById(documentId);
      if (!document) {
        return {
          title: 'Document Requires Acknowledgment',
          message: 'A document requires your acknowledgment',
        };
      }

      const organization = await this.organizationModel.findById(document.organization_id);

      return {
        title: 'Document Acknowledgment Required 📄',
        message: `Please review and acknowledge "${document.title}" from ${organization?.name || 'your organization'}`,
      };
    } catch (error) {
      logger.error('Error generating HR document acknowledgment content:', error);
      return {
        title: 'Document Requires Acknowledgment',
        message: 'A document requires your acknowledgment',
      };
    }
  }

  private static async generateHRAnalyticsAlertContent(
    alertId: string,
    customData?: any
  ): Promise<NotificationContent> {
    try {
      // Use custom data for analytics alerts since they're generated dynamically
      if (customData?.title && customData?.message) {
        return {
          title: `📊 ${customData.title}`,
          message: customData.message,
        };
      }

      return {
        title: 'HR Analytics Alert',
        message: 'An important HR metric requires your attention',
      };
    } catch (error) {
      logger.error('Error generating HR analytics alert content:', error);
      return {
        title: 'HR Analytics Alert',
        message: 'An important HR metric requires your attention',
      };
    }
  }
}
