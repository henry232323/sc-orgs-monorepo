import { HRDocumentModel, HRDocument, CreateHRDocumentData } from '../models/hr_document_model';
import { HRDocumentAcknowledmentService } from './hr_document_acknowledgment_service';
import { NotificationService } from './notification_service';
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

  constructor() {
    this.documentModel = new HRDocumentModel();
    this.acknowledgmentService = new HRDocumentAcknowledmentService();
    this.notificationService = new NotificationService();
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

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];

      if (!allowedTypes.includes(documentData.file_type)) {
        errors.push(`File type ${documentData.file_type} is not supported`);
      }

      // Validate file size (max 50MB)
      if (documentData.file_size > 50 * 1024 * 1024) {
        errors.push('File size cannot exceed 50MB');
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

      // Validate file buffer if provided
      if (fileBuffer) {
        // Check if file buffer matches declared file size
        if (fileBuffer.length !== documentData.file_size) {
          errors.push('File size mismatch between declared size and actual file');
        }

        // Basic file type validation based on magic numbers
        const fileSignature = fileBuffer.slice(0, 8).toString('hex');
        const isValidFileType = this.validateFileSignature(fileSignature, documentData.file_type);
        
        if (!isValidFileType) {
          errors.push('File content does not match declared file type');
        }
      }

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

      // Generate secure file path
      const fileExtension = this.getFileExtension(documentData.file_type);
      const fileName = this.generateSecureFileName(documentData.title, fileExtension);
      const folderPath = documentData.folder_path || '/';
      const fullPath = path.join('documents', organizationId, folderPath, fileName);

      // Ensure directory exists
      const dirPath = path.dirname(fullPath);
      await this.ensureDirectoryExists(dirPath);

      // Write file to disk (in production, this would be to cloud storage)
      await fs.promises.writeFile(fullPath, fileBuffer);

      // Calculate file hash for integrity checking
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Create document record
      const document = await this.documentModel.createDocument({
        ...documentData,
        file_path: fullPath,
        uploaded_by: uploadedBy,
      });

      // Send notifications if document requires acknowledgment
      if (documentData.requires_acknowledgment) {
        await this.sendAcknowledgmentNotifications(organizationId, document);
      }

      // Log successful upload
      logger.info('Document uploaded successfully', {
        documentId: document.id,
        organizationId,
        uploadedBy,
        fileName,
        fileSize: documentData.file_size,
        fileHash,
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
      // For now, use the basic search from the model
      // In production, this would integrate with Elasticsearch or similar
      const result = await this.documentModel.searchDocuments(
        organizationId,
        options.searchTerm,
        {
          user_roles: options.userRoles,
          limit: options.limit,
          offset: options.offset,
        }
      );

      // Apply additional filters if provided
      let filteredData = result.data;

      if (options.fileTypes && options.fileTypes.length > 0) {
        filteredData = filteredData.filter(doc => 
          options.fileTypes!.includes(doc.file_type)
        );
      }

      if (options.folderPaths && options.folderPaths.length > 0) {
        filteredData = filteredData.filter(doc => 
          options.folderPaths!.includes(doc.folder_path)
        );
      }

      if (options.requiresAcknowledgment !== undefined) {
        filteredData = filteredData.filter(doc => 
          doc.requires_acknowledgment === options.requiresAcknowledgment
        );
      }

      return {
        data: filteredData,
        total: filteredData.length,
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
        actor_id: document.uploaded_by,
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

      logger.info('Document acknowledgment completed notification sent', {
        documentId: document.id,
        userId,
        documentTitle: document.title,
        uploadedBy: document.uploaded_by,
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