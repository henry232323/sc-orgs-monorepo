import { HRDocumentModel, HRDocument, CreateHRDocumentData } from '../models/hr_document_model';
import { HRDocumentAcknowledmentService } from './hr_document_acknowledgment_service';
import { NotificationService } from './notification_service';
import { HRDocumentSearchService, SearchOptions, SearchResponse } from './hr_document_search_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DocumentUploadResult {
  success: boolean;
  document?: HRDocument;
  error?: string;
}

export interface ComplianceAnalytics {
  total_documents: number;
  documents_requiring_acknowledgment: number;
  total_acknowledgments: number;
  compliance_rate: number;
  pending_acknowledgments: number;
  compliance_by_department: Array<{
    department: string;
    compliance_rate: number;
    pending_count: number;
  }>;
  overdue_acknowledgments: Array<{
    document_id: string;
    document_title: string;
    user_id: string;
    days_overdue: number;
  }>;
}

export interface DocumentSearchOptions {
  searchTerm: string;
  fileTypes?: string[];
  folderPaths?: string[];
  requiresAcknowledgment?: boolean;
  userRoles?: string[];
  limit?: number;
  offset?: number;
}

export class HRDocumentService {
  private documentModel: HRDocumentModel;
  private acknowledgmentService: HRDocumentAcknowledmentService;
  private notificationService: NotificationService;
  private searchService: HRDocumentSearchService;

  constructor() {
    this.documentModel = new HRDocumentModel();
    this.acknowledgmentService = new HRDocumentAcknowledmentService();
    this.notificationService = new NotificationService();
    this.searchService = new HRDocumentSearchService();
  }

  /**
   * Validates document data and file before upload
   */
  async validateDocument(
    organizationId: string,
    documentData: CreateHRDocumentData,
    fileBuffer?: Buffer
  ): Promise<DocumentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!documentData.title || documentData.title.trim().length === 0) {
        errors.push('Document title is required');
      }

      if (documentData.title && documentData.title.length > 255) {
        errors.push('Document title cannot exceed 255 characters');
      }

      if (documentData.description && documentData.description.length > 1000) {
        errors.push('Document description cannot exceed 1000 characters');
      }

      // Validate content (markdown documents only)
      if (!documentData.content || documentData.content.trim().length === 0) {
        errors.push('Content cannot be empty for markdown documents');
      }

      if (documentData.content && documentData.content.length > 1000000) { // 1MB limit for content
        errors.push('Content cannot exceed 1MB');
      }

      // Validate folder path
      if (documentData.folder_path && !documentData.folder_path.startsWith('/')) {
        errors.push('Folder path must start with /');
      }

      // Validate access roles
      if (documentData.access_roles && documentData.access_roles.length > 0) {
        const validRoles = ['owner', 'admin', 'manager', 'member', 'recruiter', 'supervisor'];
        const invalidRoles = documentData.access_roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
          errors.push(`Invalid access roles: ${invalidRoles.join(', ')}`);
        }
      }

      // Check for duplicate document names in the same folder
      const existingDocuments = await this.documentModel.listDocuments(organizationId, {
        folder_path: documentData.folder_path || '/',
      });

      const duplicateTitle = existingDocuments.data.find(
        doc => doc.title.toLowerCase() === documentData.title.toLowerCase()
      );

      if (duplicateTitle) {
        warnings.push('A document with this title already exists in the same folder');
      }

      // File buffer validation is not needed for markdown documents

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Error validating document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        documentTitle: documentData.title,
      });

      return {
        isValid: false,
        errors: ['Failed to validate document'],
        warnings: [],
      };
    }
  }

  /**
   * Securely uploads and stores a document
   */
  async uploadDocument(
    organizationId: string,
    documentData: CreateHRDocumentData,
    fileBuffer: Buffer,
    uploadedBy: string
  ): Promise<DocumentUploadResult> {
    try {
      // Validate document first
      const validation = await this.validateDocument(organizationId, documentData, fileBuffer);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Create markdown document record
      const document = await this.documentModel.createDocument({
        ...documentData,
        created_by: uploadedBy,
      });

      // Send notifications if document requires acknowledgment
      if (documentData.requires_acknowledgment) {
        await this.sendAcknowledgmentNotifications(organizationId, document);
      }

      // Log successful upload
      logger.info('Markdown document created successfully', {
        documentId: document.id,
        organizationId,
        createdBy: uploadedBy,
        wordCount: documentData.word_count,
        estimatedReadingTime: documentData.estimated_reading_time,
      });

      return {
        success: true,
        document,
      };
    } catch (error) {
      logger.error('Failed to upload document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        uploadedBy,
        documentTitle: documentData.title,
      });

      return {
        success: false,
        error: 'Failed to upload document',
      };
    }
  }

  /**
   * Performs advanced document search with full-text indexing
   */
  async searchDocuments(
    organizationId: string,
    options: DocumentSearchOptions
  ): Promise<{ data: HRDocument[]; total: number }> {
    try {
      // Use the enhanced search service for full-text search
      const searchOptions: SearchOptions = {
        query: options.searchTerm,
        organization_id: organizationId,
        user_roles: options.userRoles,
        folder_paths: options.folderPaths,
        requires_acknowledgment: options.requiresAcknowledgment,
        limit: options.limit,
        offset: options.offset,
        sort_by: 'relevance',
        include_content: false, // Don't include full content in list results
        snippet_length: 200,
      };

      const searchResponse = await this.searchService.searchDocuments(searchOptions);

      return {
        data: searchResponse.results.map(result => result.document),
        total: searchResponse.total,
      };
    } catch (error) {
      logger.error('Failed to search documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        searchTerm: options.searchTerm,
      });

      return { data: [], total: 0 };
    }
  }

  /**
   * Performs enhanced search with snippets and highlighting
   */
  async searchDocumentsWithSnippets(
    organizationId: string,
    options: DocumentSearchOptions & {
      sort_by?: 'relevance' | 'date' | 'title';
      include_content?: boolean;
      snippet_length?: number;
    }
  ): Promise<SearchResponse> {
    try {
      const searchOptions: SearchOptions = {
        query: options.searchTerm,
        organization_id: organizationId,
        user_roles: options.userRoles,
        folder_paths: options.folderPaths,
        requires_acknowledgment: options.requiresAcknowledgment,
        limit: options.limit,
        offset: options.offset,
        sort_by: options.sort_by || 'relevance',
        include_content: options.include_content || false,
        snippet_length: options.snippet_length || 200,
      };

      return await this.searchService.searchDocuments(searchOptions);
    } catch (error) {
      logger.error('Failed to search documents with snippets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        searchTerm: options.searchTerm,
      });

      return {
        results: [],
        total: 0,
        query: options.searchTerm,
        execution_time_ms: 0,
        suggestions: [],
      };
    }
  }

  /**
   * Generates comprehensive compliance analytics
   */
  async generateComplianceAnalytics(organizationId: string): Promise<ComplianceAnalytics> {
    try {
      const baseReport = await this.documentModel.getComplianceReport(organizationId);

      // Get overdue acknowledgments (documents requiring acknowledgment for more than 30 days)
      const overdueThreshold = new Date();
      overdueThreshold.setDate(overdueThreshold.getDate() - 30);

      // This would require additional queries to get overdue acknowledgments
      // For now, return basic analytics
      const analytics: ComplianceAnalytics = {
        ...baseReport,
        compliance_by_department: [], // Would require department data
        overdue_acknowledgments: [], // Would require additional queries
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to generate compliance analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      return {
        total_documents: 0,
        documents_requiring_acknowledgment: 0,
        total_acknowledgments: 0,
        compliance_rate: 0,
        pending_acknowledgments: 0,
        compliance_by_department: [],
        overdue_acknowledgments: [],
      };
    }
  }

  /**
   * Enforces role-based access control for document viewing
   */
  async checkDocumentAccess(
    document: HRDocument,
    userRoles: string[]
  ): Promise<boolean> {
    try {
      // If document has no access restrictions, it's accessible to all organization members
      if (!document.access_roles || document.access_roles.length === 0) {
        return userRoles.length > 0; // User must be a member
      }

      // Check if user has at least one matching role
      return userRoles.some(role => document.access_roles.includes(role));
    } catch (error) {
      logger.error('Error checking document access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        userRoles,
      });

      return false;
    }
  }

  /**
   * Tracks document acknowledgments and sends compliance notifications
   */
  async trackAcknowledgment(
    organizationId: string,
    documentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Use the dedicated acknowledgment service
      await this.acknowledgmentService.acknowledgeDocument(
        organizationId,
        documentId,
        userId,
        ipAddress
      );

      logger.info('Document acknowledgment tracked via acknowledgment service', {
        documentId,
        organizationId,
        userId,
        ipAddress,
      });

      return true;
    } catch (error) {
      logger.error('Failed to track document acknowledgment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        organizationId,
        userId,
      });

      return false;
    }
  }

  /**
   * Get document acknowledgment status using the acknowledgment service
   */
  async getDocumentAcknowledmentStatus(
    organizationId: string,
    documentId: string,
    currentUserId: string
  ) {
    return this.acknowledgmentService.getDocumentAcknowledmentStatus(
      organizationId,
      documentId,
      currentUserId
    );
  }

  /**
   * Bulk acknowledge documents using the acknowledgment service
   */
  async bulkAcknowledgeDocuments(
    organizationId: string,
    documentIds: string[],
    userId: string,
    ipAddress?: string
  ) {
    return this.acknowledgmentService.bulkAcknowledgeDocuments(
      organizationId,
      documentIds,
      userId,
      ipAddress
    );
  }

  /**
   * Get acknowledgment analytics using the acknowledgment service
   */
  async getAcknowledmentAnalytics(
    organizationId: string,
    options?: {
      days?: number;
      includeOverdue?: boolean;
    }
  ) {
    return this.acknowledgmentService.getAcknowledmentAnalytics(organizationId, options);
  }

  /**
   * Generates compliance reports with detailed analytics
   */
  async generateComplianceReport(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      includeUserDetails?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const baseReport = await this.documentModel.getComplianceReport(organizationId);

      // Add time-based filtering if dates provided
      let additionalMetrics = {};

      if (options.startDate || options.endDate) {
        // This would require additional queries with date filtering
        // For now, return the base report
      }

      return {
        ...baseReport,
        ...additionalMetrics,
        generated_at: new Date(),
        organization_id: organizationId,
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      throw error;
    }
  }

  // Private helper methods

  private validateFileSignature(signature: string, fileType: string): boolean {
    const signatures: Record<string, string[]> = {
      'application/pdf': ['25504446'],
      'application/msword': ['d0cf11e0'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504b0304'],
      'text/plain': [], // Text files don't have consistent signatures
      'text/markdown': [], // Markdown files don't have consistent signatures
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
      'image/png': ['89504e47'],
      'image/gif': ['47494638'],
    };

    const expectedSignatures = signatures[fileType];
    
    // If no signatures defined (like for text files), assume valid
    if (!expectedSignatures || expectedSignatures.length === 0) {
      return true;
    }

    return expectedSignatures.some(expected => 
      signature.toLowerCase().startsWith(expected.toLowerCase())
    );
  }

  private getFileExtension(fileType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
    };

    return extensions[fileType] || '.bin';
  }

  private generateSecureFileName(title: string, extension: string): string {
    // Sanitize title for filename
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    // Add timestamp and random string for uniqueness
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');

    return `${sanitizedTitle}_${timestamp}_${randomString}${extension}`;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  private async sendAcknowledgmentNotifications(
    organizationId: string,
    document: HRDocument
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Get organization members who should receive this notification
      const organization = await organizationModel.findById(organizationId);
      if (!organization) {
        logger.warn('Organization not found for document notification', { organizationId });
        return;
      }

      // For now, notify the organization owner and any HR managers
      // In a full implementation, you'd filter by access_roles and get all relevant members
      const notifierIds = [organization.owner_id];

      await this.notificationService.createNotification({
        user_id: organization.owner_id,
        entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
        entity_id: document.id,
        title: 'Document Requires Acknowledgment',
        message: `Please review and acknowledge "${document.title}"`,
        actor_id: document.created_by,
        custom_data: {
          document_id: document.id,
          document_title: document.title,
          organization_id: organizationId,
          requires_acknowledgment: true,
        },
      });

      logger.info('Document acknowledgment notifications sent', {
        documentId: document.id,
        organizationId,
        documentTitle: document.title,
        notifierCount: notifierIds.length,
      });
    } catch (error) {
      logger.error('Failed to send acknowledgment notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        organizationId,
      });
    }
  }

  private async sendAcknowledgmentCompletedNotification(
    document: HRDocument,
    userId: string
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { UserModel } = await import('../models/user_model');
      const userModel = new UserModel();

      const user = await userModel.findById(userId);
      
      // Notify the document creator about the acknowledgment
      if (document.created_by && document.created_by !== userId) {
        await this.notificationService.createNotification({
          user_id: document.created_by,
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

      logger.info('Document acknowledgment completed notification sent', {
        documentId: document.id,
        userId,
        documentTitle: document.title,
        createdBy: document.created_by,
      });
    } catch (error) {
      logger.error('Failed to send acknowledgment completed notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        userId,
      });
    }
  }
}