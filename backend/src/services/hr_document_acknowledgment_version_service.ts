import db from '../config/database';
import { HRDocumentAcknowledmentService } from './hr_document_acknowledgment_service';
import { HRDocumentVersionService, ChangeDetectionResult } from './hr_document_version_service';
import { NotificationService } from './notification_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface AcknowledmentVersionStatus {
  user_id: string;
  document_id: string;
  current_acknowledgment: {
    acknowledged_version: number;
    acknowledged_at: Date;
    is_valid: boolean;
    requires_reacknowledgment: boolean;
  } | null;
  latest_document_version: number;
  acknowledgment_gap: number; // How many versions behind the acknowledgment is
}

export interface ReacknowledgmentRequirement {
  document_id: string;
  document_title: string;
  affected_users: string[];
  reason: string;
  change_summary: string;
  previous_version: number;
  new_version: number;
}

export class HRDocumentAcknowledmentVersionService {
  private acknowledgmentService: HRDocumentAcknowledmentService;
  private versionService: HRDocumentVersionService;
  private notificationService: NotificationService;

  constructor() {
    this.acknowledgmentService = new HRDocumentAcknowledmentService();
    this.versionService = new HRDocumentVersionService();
    this.notificationService = new NotificationService();
  }

  /**
   * Handles acknowledgment validity when a document is updated
   */
  async handleDocumentUpdate(
    documentId: string,
    organizationId: string,
    newVersion: number,
    changeDetection: ChangeDetectionResult,
    updatedBy: string
  ): Promise<void> {
    try {
      if (!changeDetection.requires_reacknowledgment) {
        logger.info('Document update does not require re-acknowledgment', {
          documentId,
          newVersion,
          changeSummary: changeDetection.change_summary,
        });
        return;
      }

      // Get all existing acknowledgments for this document
      const acknowledgments = await db('hr_document_acknowledgments')
        .where({ document_id: documentId })
        .whereNull('invalidated_at'); // Only active acknowledgments

      if (acknowledgments.length === 0) {
        logger.info('No existing acknowledgments to invalidate', { documentId });
        return;
      }

      // Mark acknowledgments as requiring re-acknowledgment
      await db('hr_document_acknowledgments')
        .where({ document_id: documentId })
        .whereNull('invalidated_at')
        .update({
          requires_reacknowledgment: true,
          invalidated_at: new Date(),
          invalidated_by: updatedBy,
        });

      // Get document details for notifications
      const document = await db('hr_documents')
        .where({ id: documentId })
        .first();

      if (!document) {
        throw new Error('Document not found');
      }

      // Create reacknowledgment requirement record
      const reacknowledgmentRequirement: ReacknowledgmentRequirement = {
        document_id: documentId,
        document_title: document.title,
        affected_users: acknowledgments.map(ack => ack.user_id),
        reason: 'Significant document changes detected',
        change_summary: changeDetection.change_summary,
        previous_version: newVersion - 1,
        new_version: newVersion,
      };

      // Send notifications to affected users
      await this.sendReacknowledgmentNotifications(
        organizationId,
        reacknowledgmentRequirement,
        updatedBy
      );

      logger.info('Document acknowledgments invalidated due to significant changes', {
        documentId,
        affectedUsers: acknowledgments.length,
        newVersion,
        changeSummary: changeDetection.change_summary,
      });
    } catch (error) {
      logger.error('Failed to handle document update acknowledgments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        newVersion,
      });
      throw error;
    }
  }

  /**
   * Creates a new acknowledgment with version tracking
   */
  async acknowledgeDocumentVersion(
    organizationId: string,
    documentId: string,
    userId: string,
    currentVersion: number,
    ipAddress?: string,
    notes?: string
  ): Promise<void> {
    try {
      // Check if user already has a valid acknowledgment
      const existingAcknowledgment = await db('hr_document_acknowledgments')
        .where({ document_id: documentId, user_id: userId })
        .whereNull('invalidated_at')
        .first();

      if (existingAcknowledgment && !existingAcknowledgment.requires_reacknowledgment) {
        throw new Error('Document already acknowledged and acknowledgment is still valid');
      }

      // If there's an existing acknowledgment that requires re-acknowledgment, update it
      if (existingAcknowledgment && existingAcknowledgment.requires_reacknowledgment) {
        await db('hr_document_acknowledgments')
          .where({ id: existingAcknowledgment.id })
          .update({
            acknowledged_at: new Date(),
            acknowledged_version: currentVersion,
            requires_reacknowledgment: false,
            acknowledgment_notes: notes,
            invalidated_at: null,
            invalidated_by: null,
            ip_address: ipAddress,
          });
      } else {
        // Create new acknowledgment
        await db('hr_document_acknowledgments')
          .insert({
            document_id: documentId,
            user_id: userId,
            acknowledged_at: new Date(),
            acknowledged_version: currentVersion,
            requires_reacknowledgment: false,
            acknowledgment_notes: notes,
            ip_address: ipAddress,
          });
      }

      logger.info('Document acknowledged with version tracking', {
        documentId,
        userId,
        acknowledgedVersion: currentVersion,
        isReacknowledgment: !!existingAcknowledgment,
      });
    } catch (error) {
      logger.error('Failed to acknowledge document version', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        userId,
        currentVersion,
      });
      throw error;
    }
  }

  /**
   * Gets acknowledgment status with version information
   */
  async getAcknowledmentVersionStatus(
    documentId: string,
    userId: string
  ): Promise<AcknowledmentVersionStatus> {
    try {
      // Get current document version
      const document = await db('hr_documents')
        .where({ id: documentId })
        .first();

      if (!document) {
        throw new Error('Document not found');
      }

      // Get user's acknowledgment
      const acknowledgment = await db('hr_document_acknowledgments')
        .where({ document_id: documentId, user_id: userId })
        .orderBy('acknowledged_at', 'desc')
        .first();

      let currentAcknowledgment = null;
      if (acknowledgment) {
        currentAcknowledgment = {
          acknowledged_version: acknowledgment.acknowledged_version || document.version,
          acknowledged_at: acknowledgment.acknowledged_at,
          is_valid: !acknowledgment.requires_reacknowledgment && !acknowledgment.invalidated_at,
          requires_reacknowledgment: acknowledgment.requires_reacknowledgment || false,
        };
      }

      const acknowledgmentGap = currentAcknowledgment 
        ? document.version - currentAcknowledgment.acknowledged_version
        : document.version;

      return {
        user_id: userId,
        document_id: documentId,
        current_acknowledgment: currentAcknowledgment,
        latest_document_version: document.version,
        acknowledgment_gap: acknowledgmentGap,
      };
    } catch (error) {
      logger.error('Failed to get acknowledgment version status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Gets all users who need to re-acknowledge a document
   */
  async getUsersRequiringReacknowledgment(
    organizationId: string,
    documentId?: string
  ): Promise<Array<{
    user_id: string;
    user_handle: string;
    document_id: string;
    document_title: string;
    last_acknowledged_version: number;
    current_version: number;
    versions_behind: number;
    invalidated_at: Date;
    change_summary: string;
  }>> {
    try {
      let query = db('hr_document_acknowledgments')
        .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
        .join('users', 'hr_document_acknowledgments.user_id', 'users.id')
        .where({ 'hr_documents.organization_id': organizationId })
        .where({ 'hr_document_acknowledgments.requires_reacknowledgment': true })
        .whereNotNull('hr_document_acknowledgments.invalidated_at')
        .select(
          'hr_document_acknowledgments.user_id',
          'users.rsi_handle as user_handle',
          'hr_document_acknowledgments.document_id',
          'hr_documents.title as document_title',
          'hr_document_acknowledgments.acknowledged_version as last_acknowledged_version',
          'hr_documents.version as current_version',
          'hr_document_acknowledgments.invalidated_at',
          db.raw('hr_documents.version - COALESCE(hr_document_acknowledgments.acknowledged_version, 0) as versions_behind')
        );

      if (documentId) {
        query = query.where({ 'hr_document_acknowledgments.document_id': documentId });
      }

      const results = await query.orderBy('hr_document_acknowledgments.invalidated_at', 'desc');

      // Get change summaries from version history
      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          try {
            const latestVersion = await this.versionService.getVersion(
              result.document_id,
              result.current_version
            );
            
            return {
              ...result,
              change_summary: latestVersion?.change_summary || 'Document updated',
            };
          } catch (error) {
            return {
              ...result,
              change_summary: 'Document updated',
            };
          }
        })
      );

      return enrichedResults;
    } catch (error) {
      logger.error('Failed to get users requiring re-acknowledgment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Gets acknowledgment analytics with version information
   */
  async getAcknowledmentVersionAnalytics(
    organizationId: string
  ): Promise<{
    total_acknowledgments: number;
    valid_acknowledgments: number;
    invalid_acknowledgments: number;
    pending_reacknowledgments: number;
    acknowledgment_validity_rate: number;
    version_compliance_rate: number;
    average_acknowledgment_lag: number; // Average versions behind
  }> {
    try {
      const [acknowledgmentStats, documentStats] = await Promise.all([
        // Acknowledgment statistics
        db('hr_document_acknowledgments')
          .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
          .where({ 'hr_documents.organization_id': organizationId })
          .select(
            db.raw('COUNT(*) as total_acknowledgments'),
            db.raw('COUNT(CASE WHEN requires_reacknowledgment = false AND invalidated_at IS NULL THEN 1 END) as valid_acknowledgments'),
            db.raw('COUNT(CASE WHEN requires_reacknowledgment = true OR invalidated_at IS NOT NULL THEN 1 END) as invalid_acknowledgments'),
            db.raw('COUNT(CASE WHEN requires_reacknowledgment = true THEN 1 END) as pending_reacknowledgments'),
            db.raw('AVG(hr_documents.version - COALESCE(acknowledged_version, 0)) as average_acknowledgment_lag')
          )
          .first(),

        // Document statistics
        db('hr_documents')
          .where({ organization_id: organizationId, requires_acknowledgment: true })
          .count('* as total_documents_requiring_acknowledgment')
          .first(),
      ]);

      const totalAcknowledgments = parseInt(acknowledgmentStats?.total_acknowledgments as string) || 0;
      const validAcknowledgments = parseInt(acknowledgmentStats?.valid_acknowledgments as string) || 0;
      const invalidAcknowledgments = parseInt(acknowledgmentStats?.invalid_acknowledgments as string) || 0;
      const pendingReacknowledgments = parseInt(acknowledgmentStats?.pending_reacknowledgments as string) || 0;
      const averageAcknowledmentLag = parseFloat(acknowledgmentStats?.average_acknowledgment_lag as string) || 0;

      const acknowledgmentValidityRate = totalAcknowledgments > 0 
        ? (validAcknowledgments / totalAcknowledgments) * 100 
        : 100;

      // Version compliance rate: percentage of acknowledgments that are up-to-date (lag = 0)
      const upToDateAcknowledgments = await db('hr_document_acknowledgments')
        .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
        .where({ 'hr_documents.organization_id': organizationId })
        .whereRaw('hr_documents.version = COALESCE(acknowledged_version, 0)')
        .whereNull('invalidated_at')
        .count('* as count')
        .first();

      const upToDateCount = parseInt(upToDateAcknowledgments?.count as string) || 0;
      const versionComplianceRate = totalAcknowledgments > 0 
        ? (upToDateCount / totalAcknowledgments) * 100 
        : 100;

      return {
        total_acknowledgments: totalAcknowledgments,
        valid_acknowledgments: validAcknowledgments,
        invalid_acknowledgments: invalidAcknowledgments,
        pending_reacknowledgments: pendingReacknowledgments,
        acknowledgment_validity_rate: acknowledgmentValidityRate,
        version_compliance_rate: versionComplianceRate,
        average_acknowledgment_lag: averageAcknowledmentLag,
      };
    } catch (error) {
      logger.error('Failed to get acknowledgment version analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  // Private helper methods

  private async sendReacknowledgmentNotifications(
    organizationId: string,
    requirement: ReacknowledgmentRequirement,
    updatedBy: string
  ): Promise<void> {
    try {
      // Send notifications to all affected users
      for (const userId of requirement.affected_users) {
        await this.notificationService.createNotification({
          user_id: userId,
          entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
          entity_id: requirement.document_id,
          title: 'Document Re-acknowledgment Required',
          message: `"${requirement.document_title}" has been updated and requires re-acknowledgment. Changes: ${requirement.change_summary}`,
          actor_id: updatedBy,
          custom_data: {
            document_id: requirement.document_id,
            document_title: requirement.document_title,
            change_summary: requirement.change_summary,
            previous_version: requirement.previous_version,
            new_version: requirement.new_version,
            requires_reacknowledgment: true,
          },
        });
      }

      logger.info('Re-acknowledgment notifications sent', {
        documentId: requirement.document_id,
        affectedUsers: requirement.affected_users.length,
        changeSummary: requirement.change_summary,
      });
    } catch (error) {
      logger.error('Failed to send re-acknowledgment notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: requirement.document_id,
        affectedUsers: requirement.affected_users.length,
      });
    }
  }
}