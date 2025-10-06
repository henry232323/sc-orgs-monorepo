import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_document_model');
jest.mock('../utils/user-casting');
jest.mock('../config/logger');

// Import after mocking
import { HRDocumentController } from '../controllers/hr_document_controller';
import { HRDocumentModel, HRDocument } from '../models/hr_document_model';
import { getUserFromRequest } from '../utils/user-casting';

describe('HRDocumentController', () => {
  let controller: HRDocumentController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDocumentModel: jest.Mocked<HRDocumentModel>;
  let testOrganizationId: string;
  let testUserId: string;
  let testDocumentId: string;

  beforeEach(() => {
    controller = new HRDocumentController();
    testOrganizationId = uuidv4();
    testUserId = uuidv4();
    testDocumentId = uuidv4();

    mockRequest = {
      org: {
        id: testOrganizationId,
        rsi_org_id: 'TEST-ORG',
        name: 'Test Organization',
        owner_id: testUserId,
      } as any,
      params: {},
      query: {},
      body: {},
      ip: '192.168.1.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };

    // Mock the model instance
    mockDocumentModel = {
      createDocument: jest.fn(),
      findDocumentById: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
      listDocuments: jest.fn(),
      getDocumentsWithUploaderInfo: jest.fn(),
      searchDocuments: jest.fn(),
      getFolderStructure: jest.fn(),
      createAcknowledgment: jest.fn(),
      findAcknowledgment: jest.fn(),
      getDocumentAcknowledgments: jest.fn(),
      getComplianceReport: jest.fn(),
      getPendingAcknowledgments: jest.fn(),
      getVersionHistory: jest.fn(),
    } as any;

    // Replace the model instance in the controller
    (controller as any).documentModel = mockDocumentModel;

    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        file_path: '/documents/test.pdf',
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

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.createDocument.mockResolvedValue(mockDocument);

      // Mock hasDocumentUploadAccess to return true
      (controller as any).hasDocumentUploadAccess = jest.fn().mockResolvedValue(true);

      mockRequest.body = {
        title: 'Test Document',
        description: 'Test description',
        file_path: '/documents/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
      };

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocument,
      });
      expect(mockDocumentModel.createDocument).toHaveBeenCalledWith({
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        file_path: '/documents/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: undefined,
        requires_acknowledgment: undefined,
        access_roles: undefined,
        uploaded_by: testUserId,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(null);

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 403 when user lacks upload permissions', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);

      // Mock hasDocumentUploadAccess to return false
      (controller as any).hasDocumentUploadAccess = jest.fn().mockResolvedValue(false);

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions to upload documents',
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).hasDocumentUploadAccess = jest.fn().mockResolvedValue(true);

      mockRequest.body = {
        title: 'Test Document',
        // Missing required fields
      };

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Title, file_path, file_type, and file_size are required',
      });
    });

    it('should return 400 when file size exceeds limit', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).hasDocumentUploadAccess = jest.fn().mockResolvedValue(true);

      mockRequest.body = {
        title: 'Large Document',
        file_path: '/documents/large.pdf',
        file_type: 'application/pdf',
        file_size: 60 * 1024 * 1024, // 60MB - exceeds 50MB limit
      };

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'File size cannot exceed 50MB',
      });
    });

    it('should return 400 when file type is not supported', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).hasDocumentUploadAccess = jest.fn().mockResolvedValue(true);

      mockRequest.body = {
        title: 'Unsupported Document',
        file_path: '/documents/unsupported.exe',
        file_type: 'application/x-executable',
        file_size: 1024,
      };

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'File type not supported',
      });
    });
  });

  describe('listDocuments', () => {
    it('should list documents with pagination', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Document 1',
          description: 'Description 1',
          file_path: '/documents/doc1.pdf',
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

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      mockDocumentModel.listDocuments.mockResolvedValue({
        data: mockDocuments,
        total: 1,
      });

      mockRequest.query = {
        page: '1',
        limit: '20',
      };

      await controller.listDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocuments,
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(null);

      await controller.listDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should include uploader info when requested', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocumentsWithUploader = [
        {
          id: testDocumentId,
          title: 'Document 1',
          uploaded_by_rsi_handle: 'uploader',
          uploaded_by_discord_username: 'uploader#1234',
        },
      ];

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      mockDocumentModel.getDocumentsWithUploaderInfo.mockResolvedValue({
        data: mockDocumentsWithUploader,
        total: 1,
      });

      mockRequest.query = {
        include_uploader_info: 'true',
      };

      await controller.listDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentModel.getDocumentsWithUploaderInfo).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocumentsWithUploader,
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });
  });

  describe('getDocument', () => {
    it('should return a document when user has access', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        file_path: '/documents/test.pdf',
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

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      mockDocumentModel.findAcknowledgment.mockResolvedValue(null);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      (controller as any).hasDocumentAccess = jest.fn().mockResolvedValue(true);

      mockRequest.params = { documentId: testDocumentId };

      await controller.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockDocument,
          user_acknowledged: false,
          acknowledged_at: null,
        },
      });
    });

    it('should return 404 when document not found', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(null);

      mockRequest.params = { documentId: 'non-existent-id' };

      await controller.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Document not found',
      });
    });

    it('should return 403 when user lacks access to document', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Confidential Document',
        description: 'Confidential',
        file_path: '/documents/confidential.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/confidential',
        version: 1,
        requires_acknowledgment: false,
        access_roles: ['admin'],
        uploaded_by: 'other-user-id',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      (controller as any).hasDocumentAccess = jest.fn().mockResolvedValue(false);

      mockRequest.params = { documentId: testDocumentId };

      await controller.getDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions to access this document',
      });
    });
  });

  describe('acknowledgeDocument', () => {
    it('should acknowledge a document successfully', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Document to Acknowledge',
        description: 'Requires acknowledgment',
        file_path: '/documents/acknowledge.pdf',
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

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      mockDocumentModel.findAcknowledgment.mockResolvedValue(null);
      mockDocumentModel.createAcknowledgment.mockResolvedValue(mockAcknowledgment);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      (controller as any).hasDocumentAccess = jest.fn().mockResolvedValue(true);

      mockRequest.params = { documentId: testDocumentId };

      await controller.acknowledgeDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAcknowledgment,
      });
      expect(mockDocumentModel.createAcknowledgment).toHaveBeenCalledWith({
        document_id: testDocumentId,
        user_id: testUserId,
        ip_address: '192.168.1.1',
      });
    });

    it('should return 400 when document does not require acknowledgment', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
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
        uploaded_by: 'other-user-id',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      (controller as any).hasDocumentAccess = jest.fn().mockResolvedValue(true);

      mockRequest.params = { documentId: testDocumentId };

      await controller.acknowledgeDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'This document does not require acknowledgment',
      });
    });

    it('should return 400 when document is already acknowledged', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Already Acknowledged',
        description: 'Already acknowledged',
        file_path: '/documents/already-ack.pdf',
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

      const existingAcknowledgment = {
        id: uuidv4(),
        document_id: testDocumentId,
        user_id: testUserId,
        acknowledged_at: new Date(),
      };

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      mockDocumentModel.findDocumentById.mockResolvedValue(mockDocument);
      mockDocumentModel.findAcknowledgment.mockResolvedValue(existingAcknowledgment);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      (controller as any).hasDocumentAccess = jest.fn().mockResolvedValue(true);

      mockRequest.params = { documentId: testDocumentId };

      await controller.acknowledgeDocument(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Document already acknowledged',
      });
    });
  });

  describe('searchDocuments', () => {
    it('should search documents successfully', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Search Result Document',
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

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      mockDocumentModel.searchDocuments.mockResolvedValue({
        data: mockDocuments,
        total: 1,
      });

      mockRequest.query = {
        q: 'search term',
        page: '1',
        limit: '20',
      };

      await controller.searchDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocuments,
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
        search_term: 'search term',
      });
    });

    it('should return 400 when search term is missing', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);

      mockRequest.query = {};

      await controller.searchDocuments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Search term (q) is required',
      });
    });
  });

  describe('getComplianceReport', () => {
    it('should return compliance report for authorized users', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockReport = {
        total_documents: 10,
        documents_requiring_acknowledgment: 5,
        total_acknowledgments: 20,
        compliance_rate: 80,
        pending_acknowledgments: 5,
      };

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).hasDocumentManagementAccess = jest.fn().mockResolvedValue(true);
      mockDocumentModel.getComplianceReport.mockResolvedValue(mockReport);

      await controller.getComplianceReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
      });
    });

    it('should return 403 when user lacks management access', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).hasDocumentManagementAccess = jest.fn().mockResolvedValue(false);

      await controller.getComplianceReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions to view compliance reports',
      });
    });
  });

  describe('getPendingAcknowledgments', () => {
    it('should return pending acknowledgments for user', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      const mockPendingDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Pending Document',
          description: 'Requires acknowledgment',
          file_path: '/documents/pending.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: true,
          access_roles: [],
          uploaded_by: 'other-user-id',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(mockUser);
      (controller as any).getUserRoles = jest.fn().mockResolvedValue(['member']);
      mockDocumentModel.getPendingAcknowledgments.mockResolvedValue(mockPendingDocuments);

      await controller.getPendingAcknowledgments(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPendingDocuments,
      });
      expect(mockDocumentModel.getPendingAcknowledgments).toHaveBeenCalledWith(
        testOrganizationId,
        testUserId,
        ['member']
      );
    });
  });
});