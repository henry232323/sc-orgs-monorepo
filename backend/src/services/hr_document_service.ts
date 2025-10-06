import { HRDocumentModel, HRDocument, CreateHRDocumentData } from '../models/hr_document_model';
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
  private notificationService: NotificationService;

  constructor() {
    this.documentModel = new HRDocumentModel();
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
    documentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      const document = await this.documentModel.findDocumentById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
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
      await this.documentModel.createAcknowledgment({
        document_id: documentId,
        user_id: userId,
        ip_address: ipAddress,
      });

      // Send notification to document uploader/managers
      await this.sendAcknowledgmentCompletedNotification(document, userId);

      logger.info('Document acknowledgment tracked', {
        documentId,
        userId,
        documentTitle: document.title,
        ipAddress,
      });

      return true;
    } catch (error) {
      logger.error('Failed to track document acknowledgment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        userId,
      });

      return false;
    }
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
      // Get organization members who need to acknowledge this document
      const pendingUsers = await this.documentModel.getPendingAcknowledgments(
        organizationId,
        '', // We'll get all users and filter
        [] // No role filtering for this notification
      );

      // This would require getting organization members and filtering
      // For now, just log the notification intent
      logger.info('Document acknowledgment notifications would be sent', {
        documentId: document.id,
        organizationId,
        documentTitle: document.title,
      });

      // In a full implementation, this would:
      // 1. Get all organization members
      // 2. Filter by access_roles if specified
      // 3. Send notifications to each member
      // 4. Track notification delivery
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
      // Send notification to document uploader and organization managers
      logger.info('Document acknowledgment completed notification would be sent', {
        documentId: document.id,
        userId,
        documentTitle: document.title,
        uploadedBy: document.uploaded_by,
      });

      // In a full implementation, this would send notifications to:
      // 1. Document uploader
      // 2. Organization managers/admins
      // 3. HR personnel
    } catch (error) {
      logger.error('Failed to send acknowledgment completed notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        userId,
      });
    }
  }
}