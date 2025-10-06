import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_document_model');
jest.mock('../services/notification_service');
jest.mock('../config/logger');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));
jest.mock('path');
jest.mock('crypto');

// Import after mocking
import { HRDocumentService, DocumentValidationResult, DocumentUploadResult } from '../services/hr_document_service';
import { HRDocumentModel, HRDocument, CreateHRDocumentData } from '../models/hr_document_model';
import { NotificationService } from '../services/notification_service';
import * as fs from 'fs';
import * as crypto from 'crypto';

describe('HRDocumentService', () => {
  let service: HRDocumentService;
  let mockDocumentModel: jest.Mocked<HRDocumentModel>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let testOrganizationId: string;
  let testUserId: string;
  let testDocumentId: string;

  beforeEach(() => {
    service = new HRDocumentService();
    testOrganizationId = uuidv4();
    testUserId = uuidv4();
    testDocumentId = uuidv4();

    // Mock the model and service instances
    mockDocumentModel = {
      createDocument: jest.fn(),
      findDocumentById: jest.fn(),
      listDocuments: jest.fn(),
      searchDocuments: jest.fn(),
      createAcknowledgment: jest.fn(),
      findAcknowledgment: jest.fn(),
      getComplianceReport: jest.fn(),
      getPendingAcknowledgments: jest.fn(),
    } as any;

    mockNotificationService = {
      createNotification: jest.fn(),
      sendNotification: jest.fn(),
    } as any;

    // Replace the instances in the service
    (service as any).documentModel = mockDocumentModel;
    (service as any).notificationService = mockNotificationService;

    jest.clearAllMocks();
  });

  describe('validateDocument', () => {
    it('should validate a valid document successfully', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Valid Document',
        description: 'Valid description',
        file_path: '/documents/valid.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        uploaded_by: testUserId,
      };

      mockDocumentModel.listDocuments.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.validateDocument(testOrganizationId, documentData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid document', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: '', // Empty title
        description: 'A'.repeat(1001), // Too long description
        file_path: '/documents/invalid.exe',
        file_type: 'application/x-executable', // Unsupported type
        file_size: 60 * 1024 * 1024, // Too large
        folder_path: 'invalid-path', // Invalid folder path
        access_roles: ['invalid-role'], // Invalid role
        uploaded_by: testUserId,
      };

      mockDocumentModel.listDocuments.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.validateDocument(testOrganizationId, documentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Document title is required');
      expect(result.errors).toContain('Document description cannot exceed 1000 characters');
      expect(result.errors).toContain('File type application/x-executable is not supported');
      expect(result.errors).toContain('File size cannot exceed 50MB');
      expect(result.errors).toContain('Folder path must start with /');
      expect(result.errors).toContain('Invalid access roles: invalid-role');
    });

    it('should warn about duplicate document titles', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Duplicate Title',
        file_path: '/documents/duplicate.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        uploaded_by: testUserId,
      };

      const existingDocument: HRDocument = {
        id: uuidv4(),
        organization_id: testOrganizationId,
        title: 'duplicate title', // Case insensitive match
        description: 'Existing document',
        file_path: '/documents/existing.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDocumentModel.listDocuments.mockResolvedValue({
        data: [existingDocument],
        total: 1,
      });

      const result = await service.validateDocument(testOrganizationId, documentData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('A document with this title already exists in the same folder');
    });

    it('should validate file buffer when provided', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Buffer Test',
        file_path: '/documents/buffer.pdf',
        file_type: 'application/pdf',
        file_size: 4,
        uploaded_by: testUserId,
      };

      const fileBuffer = Buffer.from('test');
      mockDocumentModel.listDocuments.mockResolvedValue({ data: [], total: 0 });

      // Mock validateFileSignature to return true
      (service as any).validateFileSignature = jest.fn().mockReturnValue(true);

      const result = await service.validateDocument(testOrganizationId, documentData, fileBuffer);

      expect(result.isValid).toBe(true);
      expect((service as any).validateFileSignature).toHaveBeenCalled();
    });

    it('should detect file size mismatch', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Size Mismatch',
        file_path: '/documents/mismatch.pdf',
        file_type: 'application/pdf',
        file_size: 10, // Declared size
        uploaded_by: testUserId,
      };

      const fileBuffer = Buffer.from('test'); // Actual size is 4
      mockDocumentModel.listDocuments.mockResolvedValue({ data: [], total: 0 });

      const result = await service.validateDocument(testOrganizationId, documentData, fileBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size mismatch between declared size and actual file');
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Upload Test',
        file_path: '/documents/upload.pdf',
        file_type: 'application/pdf',
        file_size: 4,
        uploaded_by: testUserId,
      };

      const fileBuffer = Buffer.from('test');
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: documentData.organization_id,
        title: documentData.title,
        description: documentData.description,
        file_path: documentData.file_path,
        file_type: documentData.file_type,
        file_size: documentData.file_size,
        uploaded_by: documentData.uploaded_by,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock validation to pass
      service.validateDocument = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      }) as any;

      // Mock file system operations
      (fs.promises.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);
      (service as any).ensureDirectoryExists = jest.fn().mockResolvedValue(undefined);
      (service as any).generateSecureFileName = jest.fn().mockReturnValue('secure_filename.pdf');

      // Mock crypto
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mock-hash'),
      };
      (crypto.createHash as jest.MockedFunction<any>).mockReturnValue(mockHash);

      mockDocumentModel.createDocument.mockResolvedValue(mockDocument);

      const result = await service.uploadDocument(testOrganizationId, documentData, fileBuffer, testUserId);

      expect(result.success).toBe(true);
      expect(result.document).toEqual(mockDocument);
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(mockDocumentModel.createDocument).toHaveBeenCalled();
    });

    it('should fail upload when validation fails', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: '',
        file_path: '/documents/invalid.pdf',
        file_type: 'application/pdf',
        file_size: 4,
        uploaded_by: testUserId,
      };

      const fileBuffer = Buffer.from('test');

      // Mock validation to fail
      service.validateDocument = jest.fn().mockResolvedValue({
        isValid: false,
        errors: ['Document title is required'],
        warnings: [],
      }) as any;

      const result = await service.uploadDocument(testOrganizationId, documentData, fileBuffer, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document title is required');
      expect(mockDocumentModel.createDocument).not.toHaveBeenCalled();
    });

    it('should send acknowledgment notifications when required', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Acknowledgment Required',
        file_path: '/documents/ack.pdf',
        file_type: 'application/pdf',
        file_size: 4,
        requires_acknowledgment: true,
        uploaded_by: testUserId,
      };

      const fileBuffer = Buffer.from('test');
      const mockDocument: HRDocument = {
        id: testDocumentId,
        ...documentData,
        folder_path: '/',
        version: 1,
        access_roles: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      service.validateDocument = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      }) as any;

      (fs.promises.writeFile as jest.MockedFunction<any>).mockResolvedValue(undefined);
      (service as any).ensureDirectoryExists = jest.fn().mockResolvedValue(undefined);
      (service as any).generateSecureFileName = jest.fn().mockReturnValue('secure_filename.pdf');
      (service as any).sendAcknowledgmentNotifications = jest.fn().mockResolvedValue(undefined);

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mock-hash'),
      };
      (crypto.createHash as jest.MockedFunction<any>).mockReturnValue(mockHash);

      mockDocumentModel.createDocument.mockResolvedValue(mockDocument);

      const result = await service.uploadDocument(testOrganizationId, documentData, fileBuffer, testUserId);

      expect(result.success).toBe(true);
      expect((service as any).sendAcknowledgmentNotifications).toHaveBeenCalledWith(testOrganizationId, mockDocument);
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with basic options', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Search Result',
          description: 'Contains search term',
          file_path: '/documents/search.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: false,
          access_roles: [],
          uploaded_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDocumentModel.searchDocuments.mockResolvedValue({
        data: mockDocuments,
        total: 1,
      });

      const result = await service.searchDocuments(testOrganizationId, {
        searchTerm: 'search term',
        userRoles: ['member'],
      });

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      expect(mockDocumentModel.searchDocuments).toHaveBeenCalledWith(
        testOrganizationId,
        'search term',
        {
          user_roles: ['member'],
          limit: undefined,
          offset: undefined,
        }
      );
    });

    it('should apply additional filters', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'PDF Document',
          description: 'PDF file',
          file_path: '/documents/pdf.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          folder_path: '/public',
          version: 1,
          requires_acknowledgment: true,
          access_roles: [],
          uploaded_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDocumentModel.searchDocuments.mockResolvedValue({
        data: mockDocuments,
        total: 1,
      });

      const result = await service.searchDocuments(testOrganizationId, {
        searchTerm: 'pdf',
        fileTypes: ['application/pdf'],
        folderPaths: ['/public'],
        requiresAcknowledgment: true,
        userRoles: ['member'],
      });

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
    });

    it('should filter out documents that do not match additional criteria', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Word Document',
          description: 'Word file',
          file_path: '/documents/word.docx',
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size: 1024,
          folder_path: '/private',
          version: 1,
          requires_acknowledgment: false,
          access_roles: [],
          uploaded_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDocumentModel.searchDocuments.mockResolvedValue({
        data: mockDocuments,
        total: 1,
      });

      const result = await service.searchDocuments(testOrganizationId, {
        searchTerm: 'document',
        fileTypes: ['application/pdf'], // Filter for PDF only
        userRoles: ['member'],
      });

      expect(result.data).toHaveLength(0); // Should be filtered out
      expect(result.total).toBe(0);
    });
  });

  describe('checkDocumentAccess', () => {
    it('should allow access when document has no access restrictions', async () => {
      const document: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Public Document',
        description: 'Public access',
        file_path: '/documents/public.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [], // No restrictions
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const hasAccess = await service.checkDocumentAccess(document, ['member']);

      expect(hasAccess).toBe(true);
    });

    it('should allow access when user has matching role', async () => {
      const document: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Admin Document',
        description: 'Admin only',
        file_path: '/documents/admin.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: ['admin', 'manager'],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const hasAccess = await service.checkDocumentAccess(document, ['member', 'admin']);

      expect(hasAccess).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      const document: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Admin Document',
        description: 'Admin only',
        file_path: '/documents/admin.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: ['admin', 'manager'],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const hasAccess = await service.checkDocumentAccess(document, ['member']);

      expect(hasAccess).toBe(false);
    });

    it('should deny access when user has no roles', async () => {
      const document: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Public Document',
        description: 'Public access',
        file_path: '/documents/public.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const hasAccess = await service.checkDocumentAccess(document, []);

      expect(hasAccess).toBe(false);
    });
  });

  describe('trackAcknowledgment', () => {
    it('should track acknowledgment successfully', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Document to Acknowledge',
        description: 'Requires acknowledgment',
        file_path: '/documents/ack.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: true,
        access_roles: [],
        uploaded_by: 'other-user-id',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockAcknowledgment = {
        id: uuidv4(),
        document_id: testDocumentId,
        user_id: testUserId,
        acknowledged_at: new Date(),
        ip_address: '192.168.1.1',
      };

      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      mockDocumentModel.findAcknowledgment.mockResolvedValue(null);
      mockDocumentModel.createAcknowledgment.mockResolvedValue(mockAcknowledgment);
      (service as any).sendAcknowledgmentCompletedNotification = jest.fn().mockResolvedValue(undefined);

      const result = await service.trackAcknowledgment(testDocumentId, testUserId, '192.168.1.1');

      expect(result).toBe(true);
      expect(mockDocumentModel.createAcknowledgment).toHaveBeenCalledWith({
        document_id: testDocumentId,
        user_id: testUserId,
        ip_address: '192.168.1.1',
      });
      expect((service as any).sendAcknowledgmentCompletedNotification).toHaveBeenCalledWith(mockDocument, testUserId);
    });

    it('should fail when document does not exist', async () => {
      mockDocumentModel.findDocumentById.mockResolvedValue(null);

      const result = await service.trackAcknowledgment(testDocumentId, testUserId);

      expect(result).toBe(false);
      expect(mockDocumentModel.createAcknowledgment).not.toHaveBeenCalled();
    });

    it('should fail when document does not require acknowledgment', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'No Acknowledgment Required',
        description: 'Does not require acknowledgment',
        file_path: '/documents/no-ack.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);

      const result = await service.trackAcknowledgment(testDocumentId, testUserId);

      expect(result).toBe(false);
      expect(mockDocumentModel.createAcknowledgment).not.toHaveBeenCalled();
    });

    it('should fail when document is already acknowledged', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Already Acknowledged',
        description: 'Already acknowledged',
        file_path: '/documents/already.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: true,
        access_roles: [],
        uploaded_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const existingAcknowledgment = {
        id: uuidv4(),
        document_id: testDocumentId,
        user_id: testUserId,
        acknowledged_at: new Date(),
      };

      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      mockDocumentModel.findAcknowledgment.mockResolvedValue(existingAcknowledgment);

      const result = await service.trackAcknowledgment(testDocumentId, testUserId);

      expect(result).toBe(false);
      expect(mockDocumentModel.createAcknowledgment).not.toHaveBeenCalled();
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report successfully', async () => {
      const mockBaseReport = {
        total_documents: 10,
        documents_requiring_acknowledgment: 5,
        total_acknowledgments: 20,
        compliance_rate: 80,
        pending_acknowledgments: 5,
      };

      mockDocumentModel.getComplianceReport.mockResolvedValue(mockBaseReport);

      const result = await service.generateComplianceReport(testOrganizationId);

      expect(result).toEqual({
        ...mockBaseReport,
        generated_at: expect.any(Date),
        organization_id: testOrganizationId,
      });
    });

    it('should handle errors gracefully', async () => {
      mockDocumentModel.getComplianceReport.mockRejectedValue(new Error('Database error'));

      await expect(service.generateComplianceReport(testOrganizationId)).rejects.toThrow('Database error');
    });
  });

  describe('generateComplianceAnalytics', () => {
    it('should generate compliance analytics', async () => {
      const mockBaseReport = {
        total_documents: 10,
        documents_requiring_acknowledgment: 5,
        total_acknowledgments: 20,
        compliance_rate: 80,
        pending_acknowledgments: 5,
      };

      mockDocumentModel.getComplianceReport.mockResolvedValue(mockBaseReport);

      const result = await service.generateComplianceAnalytics(testOrganizationId);

      expect(result).toEqual({
        ...mockBaseReport,
        compliance_by_department: [],
        overdue_acknowledgments: [],
      });
    });
  });

  describe('Helper Methods', () => {
    describe('validateFileSignature', () => {
      it('should validate PDF signature correctly', () => {
        const pdfSignature = '25504446';
        const result = (service as any).validateFileSignature(pdfSignature, 'application/pdf');
        expect(result).toBe(true);
      });

      it('should validate JPEG signature correctly', () => {
        const jpegSignature = 'ffd8ffe0';
        const result = (service as any).validateFileSignature(jpegSignature, 'image/jpeg');
        expect(result).toBe(true);
      });

      it('should return true for text files without signatures', () => {
        const textSignature = '74657374'; // 'test' in hex
        const result = (service as any).validateFileSignature(textSignature, 'text/plain');
        expect(result).toBe(true);
      });

      it('should return false for mismatched signatures', () => {
        const wrongSignature = '89504e47'; // PNG signature
        const result = (service as any).validateFileSignature(wrongSignature, 'application/pdf');
        expect(result).toBe(false);
      });
    });

    describe('getFileExtension', () => {
      it('should return correct extension for PDF', () => {
        const extension = (service as any).getFileExtension('application/pdf');
        expect(extension).toBe('.pdf');
      });

      it('should return correct extension for DOCX', () => {
        const extension = (service as any).getFileExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(extension).toBe('.docx');
      });

      it('should return .bin for unknown types', () => {
        const extension = (service as any).getFileExtension('application/unknown');
        expect(extension).toBe('.bin');
      });
    });

    describe('generateSecureFileName', () => {
      beforeEach(() => {
        // Mock crypto.randomBytes
        (crypto.randomBytes as jest.MockedFunction<any>).mockReturnValue({
          toString: jest.fn().mockReturnValue('abcd1234'),
        });

        // Mock Date.now
        jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should generate secure filename with sanitized title', () => {
        const filename = (service as any).generateSecureFileName('Test Document!@#', '.pdf');
        expect(filename).toBe('Test_Document_1234567890_abcd1234.pdf');
      });

      it('should truncate long titles', () => {
        const longTitle = 'A'.repeat(100);
        const filename = (service as any).generateSecureFileName(longTitle, '.pdf');
        expect(filename.length).toBeLessThan(100);
        expect(filename).toContain('_1234567890_abcd1234.pdf');
      });
    });
  });
});