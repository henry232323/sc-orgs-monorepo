import { HRDocumentModel, HRDocument, HRDocumentAcknowledgment } from '../models/hr_document_model';
import { NotificationService } from './notification_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface DocumentAcknowledmentStatus {
  document_id: string;
  user_acknowledgments: Array<{
    user_id: string;
    user_handle: string;
    acknowledged_at: string;
    ip_address?: string;
  }>;
  total_required: number;
  total_acknowledged: number;
  acknowledgment_rate: number;
  current_user_acknowledged: boolean;
  current_user_acknowledged_at?: string;
}

export interface AcknowledmentAnalytics {
  organization_id: string;
  total_documents_requiring_acknowledgment: number;
  total_acknowledgments: number;
  overall_compliance_rate: number;
  pending_acknowledgments_count: number;
  recent_acknowledgments: Array<{
    document_id: string;
    document_title: string;
    user_id: string;
    user_handle: string;
    acknowledged_at: string;
  }>;
  overdue_acknowledgments: Array<{
    document_id: string;
    document_title: string;
    user_id: string;
    user_handle: string;
    days_overdue: number;
  }>;
}

export interface BulkAcknowledmentResult {
  success: number;
  failed: number;
  errors: string[];
  acknowledged_documents: Array<{
    document_id: string;
    document_title: string;
    acknowledged_at: string;
  }>;
}

export class HRDocumentAcknowledmentService {
  private documentModel: HRDocumentModel;
  private notificationService: NotificationService;

  constructor() {
    this.documentModel = new HRDocumentModel();
    this.notificationService = new NotificationService();
  }

  /**
   * Get comprehensive acknowledgment status for a document
   */
  async getDocumentAcknowledmentStatus(
    organizationId: string,
    documentId: string,
    currentUserId: string
  ): Promise<DocumentAcknowledmentStatus> {
    try {
      const status = await this.documentModel.getDocumentAcknowledmentStatus(
        organizationId,
        documentId,
        currentUserId
      );

      logger.info('Document acknowledgment status retrieved', {
        documentId,
        organizationId,
        currentUserId,
        totalRequired: status.total_required,
        totalAcknowledged: status.total_acknowledged,
        currentUserAcknowledged: status.current_user_acknowledged,
      });

      return status;
    } catch (error) {
      logger.error('Failed to get document acknowledgment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        organizationId,
        currentUserId,
      });

      throw error;
    }
  }

  /**
   * Acknowledge a document with real-time notifications
   */
  async acknowledgeDocument(
    organizationId: string,
    documentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<HRDocumentAcknowledgment> {
    try {
      const document = await this.documentModel.findDocumentById(documentId);

      if (!document) {
        throw new Error('Document not found');
      }

      if (document.organization_id !== organizationId) {
        throw new Error('Document does not belong to this organization');
      }

      if (!document.requires_acknowledgment) {
        throw new Error('Document does not require acknowledgment');
      }

      // Check if already acknowledged
      const existingAcknowledgment = await this.documentModel.findAcknowledgment(documentId, userId);
      if (existingAcknowledgment) {
        throw new Error('Document already acknowledged');
      }

      // Create acknowledgment
      const acknowledgment = await this.documentModel.createAcknowledgment({
        document_id: documentId,
        user_id: userId,
        ip_address: ipAddress,
      });

      // Send real-time notifications
      await this.sendAcknowledgmentNotifications(document, userId);

      // Check if this completes the acknowledgment requirements
      const status = await this.documentModel.getDocumentAcknowledmentStatus(
        organizationId,
        documentId,
        userId
      );

      if (status.acknowledgment_rate >= 1.0) {
        await this.sendCompletionNotifications(document, status);
      }

      logger.info('Document acknowledged successfully', {
        documentId,
        organizationId,
        userId,
        documentTitle: document.title,
        ipAddress,
        newComplianceRate: status.acknowledgment_rate,
      });

      return acknowledgment;
    } catch (error) {
      logger.error('Failed to acknowledge document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        organizationId,
        userId,
      });

      throw error;
    }
  }

  /**
   * Bulk acknowledge multiple documents
   */
  async bulkAcknowledgeDocuments(
    organizationId: string,
    documentIds: string[],
    userId: string,
    ipAddress?: string
  ): Promise<BulkAcknowledmentResult> {
    const result: BulkAcknowledmentResult = {
      success: 0,
      failed: 0,
      errors: [],
      acknowledged_documents: [],
    };

    for (const documentId of documentIds) {
      try {
        const acknowledgment = await this.acknowledgeDocument(
          organizationId,
          documentId,
          userId,
          ipAddress
        );

        const document = await this.documentModel.findDocumentById(documentId);
        
        result.success++;
        result.acknowledged_documents.push({
          document_id: documentId,
          document_title: document?.title || 'Unknown',
          acknowledged_at: acknowledgment.acknowledged_at.toISOString(),
        });
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info('Bulk document acknowledgment completed', {
      organizationId,
      userId,
      totalRequested: documentIds.length,
      successCount: result.success,
      failedCount: result.failed,
    });

    return result;
  }

  /**
   * Get acknowledgment analytics for an organization
   */
  async getAcknowledmentAnalytics(
    organizationId: string,
    options: {
      days?: number;
      includeOverdue?: boolean;
    } = {}
  ): Promise<AcknowledmentAnalytics> {
    try {
      const { days = 30, includeOverdue = true } = options;

      // Get base compliance report
      const baseReport = await this.documentModel.getComplianceReport(organizationId);

      // Get recent acknowledgments
      const recentAcknowledgments = await this.getRecentAcknowledgments(organizationId, days);

      // Get overdue acknowledgments if requested
      let overdueAcknowledgments: any[] = [];
      if (includeOverdue) {
        overdueAcknowledgments = await this.getOverdueAcknowledgments(organizationId);
      }

      const analytics: AcknowledmentAnalytics = {
        organization_id: organizationId,
        total_documents_requiring_acknowledgment: baseReport.documents_requiring_acknowledgment,
        total_acknowledgments: baseReport.total_acknowledgments,
        overall_compliance_rate: baseReport.compliance_rate,
        pending_acknowledgments_count: baseReport.pending_acknowledgments,
        recent_acknowledgments: recentAcknowledgments,
        overdue_acknowledgments: overdueAcknowledgments,
      };

      logger.info('Acknowledgment analytics generated', {
        organizationId,
        totalDocuments: analytics.total_documents_requiring_acknowledgment,
        complianceRate: analytics.overall_compliance_rate,
        pendingCount: analytics.pending_acknowledgments_count,
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to generate acknowledgment analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      throw error;
    }
  }

  /**
   * Track acknowledgment status changes and send notifications
   */
  async trackStatusChange(
    organizationId: string,
    documentId: string,
    userId: string,
    oldStatus: boolean,
    newStatus: boolean
  ): Promise<void> {
    try {
      if (oldStatus === newStatus) {
        return; // No change
      }

      const document = await this.documentModel.findDocumentById(documentId);
      if (!document) {
        return;
      }

      const statusText = newStatus ? 'acknowledged' : 'unacknowledged';
      
      // Send status change notification
      await this.notificationService.createNotification({
        user_id: document.uploaded_by,
        entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
        entity_id: documentId,
        title: 'Document Acknowledgment Status Changed',
        message: `Document "${document.title}" has been ${statusText}`,
        actor_id: userId,
        custom_data: {
          document_id: documentId,
          document_title: document.title,
          organization_id: organizationId,
          old_status: oldStatus,
          new_status: newStatus,
          status_text: statusText,
        },
      });

      logger.info('Document acknowledgment status change tracked', {
        documentId,
        organizationId,
        userId,
        oldStatus,
        newStatus,
        statusText,
      });
    } catch (error) {
      logger.error('Failed to track acknowledgment status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        organizationId,
        userId,
      });
    }
  }

  /**
   * Send reminder notifications for pending acknowledgments
   */
  async sendAcknowledmentReminders(
    organizationId: string,
    documentId?: string
  ): Promise<{ sent: number; failed: number }> {
    try {
      let documentsToRemind: HRDocument[] = [];

      if (documentId) {
        const document = await this.documentModel.findDocumentById(documentId);
        if (document && document.requires_acknowledgment) {
          documentsToRemind = [document];
        }
      } else {
        // Get all documents requiring acknowledgment
        const { data: documents } = await this.documentModel.listDocuments(organizationId, {
          requires_acknowledgment: true,
        });
        documentsToRemind = documents;
      }

      let sent = 0;
      let failed = 0;

      for (const document of documentsToRemind) {
        try {
          // Get users who haven't acknowledged this document
          const pendingUsers = await this.getPendingAcknowledgmentUsers(organizationId, document.id);

          for (const user of pendingUsers) {
            await this.notificationService.createNotification({
              user_id: user.id,
              entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
              entity_id: document.id,
              title: 'Document Acknowledgment Reminder',
              message: `Please review and acknowledge "${document.title}"`,
              actor_id: document.uploaded_by,
              custom_data: {
                document_id: document.id,
                document_title: document.title,
                organization_id: organizationId,
                is_reminder: true,
              },
            });
            sent++;
          }
        } catch (error) {
          failed++;
          logger.error('Failed to send reminder for document', {
            error: error instanceof Error ? error.message : 'Unknown error',
            documentId: document.id,
            organizationId,
          });
        }
      }

      logger.info('Acknowledgment reminders sent', {
        organizationId,
        documentId,
        documentsProcessed: documentsToRemind.length,
        remindersSent: sent,
        remindersFailed: failed,
      });

      return { sent, failed };
    } catch (error) {
      logger.error('Failed to send acknowledgment reminders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        documentId,
      });

      return { sent: 0, failed: 1 };
    }
  }

  // Private helper methods

  private async sendAcknowledgmentNotifications(
    document: HRDocument,
    userId: string
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { UserModel } = await import('../models/user_model');
      const userModel = new UserModel();

      const user = await userModel.findById(userId);
      
      // Notify the document uploader about the acknowledgment
      if (document.uploaded_by && document.uploaded_by !== userId) {
        await this.notificationService.createNotification({
          user_id: document.uploaded_by,
          entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
          entity_id: document.id,
          title: 'Document Acknowledged',
          message: `${user?.rsi_handle || 'Someone'} has acknowledged "${document.title}"`,
          actor_id: userId,
          custom_data: {
            document_id: document.id,
            document_title: document.title,
            acknowledged_by: userId,
            acknowledged_by_handle: user?.rsi_handle,
          },
        });
      }

      logger.info('Acknowledgment notifications sent', {
        documentId: document.id,
        userId,
        documentTitle: document.title,
        uploadedBy: document.uploaded_by,
      });
    } catch (error) {
      logger.error('Failed to send acknowledgment notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        userId,
      });
    }
  }

  private async sendCompletionNotifications(
    document: HRDocument,
    status: DocumentAcknowledmentStatus
  ): Promise<void> {
    try {
      // Notify document uploader that all acknowledgments are complete
      if (document.uploaded_by) {
        await this.notificationService.createNotification({
          user_id: document.uploaded_by,
          entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
          entity_id: document.id,
          title: 'Document Fully Acknowledged',
          message: `All required users have acknowledged "${document.title}"`,
          actor_id: undefined,
          custom_data: {
            document_id: document.id,
            document_title: document.title,
            total_acknowledgments: status.total_acknowledged,
            compliance_rate: status.acknowledgment_rate,
            completion_achieved: true,
          },
        });
      }

      logger.info('Completion notifications sent', {
        documentId: document.id,
        documentTitle: document.title,
        totalAcknowledgments: status.total_acknowledged,
        complianceRate: status.acknowledgment_rate,
      });
    } catch (error) {
      logger.error('Failed to send completion notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
      });
    }
  }

  private async getRecentAcknowledgments(
    organizationId: string,
    days: number
  ): Promise<Array<{
    document_id: string;
    document_title: string;
    user_id: string;
    user_handle: string;
    acknowledged_at: string;
  }>> {
    try {
      // Import here to avoid circular dependencies
      const db = (await import('../config/database')).default;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentAcknowledgments = await db('hr_document_acknowledgments')
        .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
        .join('users', 'hr_document_acknowledgments.user_id', 'users.id')
        .where('hr_documents.organization_id', organizationId)
        .where('hr_document_acknowledgments.acknowledged_at', '>=', cutoffDate)
        .select(
          'hr_document_acknowledgments.document_id',
          'hr_documents.title as document_title',
          'hr_document_acknowledgments.user_id',
          'users.rsi_handle as user_handle',
          'hr_document_acknowledgments.acknowledged_at'
        )
        .orderBy('hr_document_acknowledgments.acknowledged_at', 'desc')
        .limit(50);

      return recentAcknowledgments.map(ack => ({
        document_id: ack.document_id,
        document_title: ack.document_title,
        user_id: ack.user_id,
        user_handle: ack.user_handle,
        acknowledged_at: ack.acknowledged_at.toISOString(),
      }));
    } catch (error) {
      logger.error('Failed to get recent acknowledgments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        days,
      });

      return [];
    }
  }

  private async getOverdueAcknowledgments(
    organizationId: string,
    overdueThresholdDays: number = 30
  ): Promise<Array<{
    document_id: string;
    document_title: string;
    user_id: string;
    user_handle: string;
    days_overdue: number;
  }>> {
    try {
      // This would require more complex queries to determine overdue acknowledgments
      // For now, return empty array as this would need additional tracking
      // In a full implementation, you'd track when documents were assigned/published
      return [];
    } catch (error) {
      logger.error('Failed to get overdue acknowledgments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      return [];
    }
  }

  private async getPendingAcknowledgmentUsers(
    organizationId: string,
    documentId: string
  ): Promise<Array<{ id: string; rsi_handle: string }>> {
    try {
      // Import here to avoid circular dependencies
      const db = (await import('../config/database')).default;

      // Get organization members who haven't acknowledged this document
      const pendingUsers = await db('organization_members')
        .join('users', 'organization_members.user_id', 'users.id')
        .leftJoin('hr_document_acknowledgments', function() {
          this.on('organization_members.user_id', '=', 'hr_document_acknowledgments.user_id')
              .andOn('hr_document_acknowledgments.document_id', '=', db.raw('?', [documentId]));
        })
        .where('organization_members.organization_id', organizationId)
        .where('organization_members.is_active', true)
        .whereNull('hr_document_acknowledgments.id')
        .select('users.id', 'users.rsi_handle');

      return pendingUsers;
    } catch (error) {
      logger.error('Failed to get pending acknowledgment users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        documentId,
      });

      return [];
    }
  }
}