import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock Knex before importing anything that uses it
jest.mock('../config/database', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    whereNot: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn(),
    first: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orWhereRaw: jest.fn(),
    orWhere: jest.fn().mockReturnThis(),
    migrate: { latest: jest.fn() },
    destroy: jest.fn(),
  } as any;

  const mockDb = jest.fn().mockReturnValue(mockQueryBuilder);
  Object.assign(mockDb, mockQueryBuilder);
  
  return {
    __esModule: true,
    default: mockDb,
  };
});

jest.mock('../config/logger');

// Import after mocking
import { HRDocumentModel, HRDocument, CreateHRDocumentData, UpdateHRDocumentData, HRDocumentAcknowledgment } from '../models/hr_document_model';
import db from '../config/database';

describe('HRDocumentModel', () => {
  let documentModel: HRDocumentModel;
  let testOrganizationId: string;
  let testUserId: string;
  let testDocumentId: string;

  beforeAll(() => {
    documentModel = new HRDocumentModel();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testOrganizationId = uuidv4();
    testUserId = uuidv4();
    testDocumentId = uuidv4();
  });

  describe('createDocument', () => {
    it('should create a new markdown document with default values', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        content: '# Test Document\n\nThis is a test markdown document.',
        word_count: 8,
        estimated_reading_time: 1,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as jest.MockedFunction<any>).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockDocument]),
        }),
      });

      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        content: '# Test Document\n\nThis is a test markdown document.',
        word_count: 8,
        estimated_reading_time: 1,
        created_by: testUserId,
      };

      const result = await documentModel.createDocument(documentData);

      expect(result).toEqual(mockDocument);
      expect(db).toHaveBeenCalledWith('hr_documents');
    });

    it('should create a document with custom folder path and access roles', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Confidential Document',
        description: 'Confidential description',
        content: '# Confidential Document\n\nThis is confidential content.',
        word_count: 6,
        estimated_reading_time: 1,
        folder_path: '/confidential',
        version: 1,
        requires_acknowledgment: true,
        access_roles: ['admin', 'hr'],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as jest.MockedFunction<any>).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockDocument]),
        }),
      });

      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Confidential Document',
        description: 'Confidential description',
        content: '# Confidential Document\n\nThis is confidential content.',
        word_count: 6,
        estimated_reading_time: 1,
        folder_path: '/confidential',
        requires_acknowledgment: true,
        access_roles: ['admin', 'hr'],
        created_by: testUserId,
      };

      const result = await documentModel.createDocument(documentData);

      expect(result).toEqual(mockDocument);
    });

    it('should throw error for empty content', async () => {
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Empty Document',
        content: '',
        created_by: testUserId,
      };

      await expect(documentModel.createDocument(documentData)).rejects.toThrow('Content cannot be empty for markdown documents');
    });

    it('should throw error for content exceeding size limit', async () => {
      const largeContent = 'a'.repeat(1000001); // Exceeds 1MB limit
      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Large Document',
        content: largeContent,
        created_by: testUserId,
      };

      await expect(documentModel.createDocument(documentData)).rejects.toThrow('Content exceeds maximum allowed size of 1MB');
    });
  });

  describe('findDocumentById', () => {
    it('should return document when found', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        content: '# Test Document\n\nThis is a test markdown document.',
        word_count: 8,
        estimated_reading_time: 1,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockDocument),
        }),
      });

      const result = await documentModel.findDocumentById(testDocumentId);

      expect(result).toEqual(mockDocument);
      expect(db).toHaveBeenCalledWith('hr_documents');
    });

    it('should return null when document not found', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await documentModel.findDocumentById(testDocumentId);

      expect(result).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('should update document successfully', async () => {
      const mockUpdatedDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Updated Document',
        description: 'Updated description',
        content: '# Updated Document\n\nThis is updated content.',
        word_count: 6,
        estimated_reading_time: 1,
        folder_path: '/',
        version: 2,
        requires_acknowledgment: false,
        access_roles: [],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedDocument]),
          }),
        }),
      });

      const updateData: UpdateHRDocumentData = {
        title: 'Updated Document',
        content: '# Updated Document\n\nThis is updated content.',
        word_count: 6,
        estimated_reading_time: 1,
        version: 2,
      };

      const result = await documentModel.updateDocument(testDocumentId, updateData);

      expect(result).toEqual(mockUpdatedDocument);
    });

    it('should return null when document not found for update', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const updateData: UpdateHRDocumentData = {
        title: 'Updated Document',
      };

      const result = await documentModel.updateDocument(testDocumentId, updateData);

      expect(result).toBeNull();
    });

    it('should throw error when updating with empty content', async () => {
      const updateData: UpdateHRDocumentData = {
        content: '',
      };

      await expect(documentModel.updateDocument(testDocumentId, updateData)).rejects.toThrow('Content cannot be empty for markdown documents');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(1),
        }),
      });

      const result = await documentModel.deleteDocument(testDocumentId);

      expect(result).toBe(true);
    });

    it('should return false when document not found for deletion', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(0),
        }),
      });

      const result = await documentModel.deleteDocument(testDocumentId);

      expect(result).toBe(false);
    });
  });

  describe('listDocuments', () => {
    it('should return list of documents with pagination', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Document 1',
          description: 'Description 1',
          content: '# Document 1\n\nContent 1',
          word_count: 4,
          estimated_reading_time: 1,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: false,
          access_roles: [],
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockDocuments),
        clone: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ count: '1' }),
          }),
        }),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      const result = await documentModel.listDocuments(testOrganizationId, {
        limit: 10,
        offset: 0,
      });

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
    });

    it('should return empty list when no documents found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
        clone: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ count: '0' }),
          }),
        }),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      const result = await documentModel.listDocuments(testOrganizationId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter documents by folder path', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
        clone: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ count: '0' }),
          }),
        }),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      await documentModel.listDocuments(testOrganizationId, {
        folder_path: '/confidential',
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ folder_path: '/confidential' });
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by content', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Test Document',
          description: 'Test description',
          content: '# Test Document\n\nThis contains the search term.',
          word_count: 8,
          estimated_reading_time: 1,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: false,
          access_roles: [],
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockDocuments),
        clone: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ count: '1' }),
          }),
        }),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      const result = await documentModel.searchDocuments(testOrganizationId, 'search term');

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
    });
  });

  describe('getDocumentContent', () => {
    it('should return document content', async () => {
      const mockDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        content: '# Test Document\n\nThis is the content.',
        word_count: 6,
        estimated_reading_time: 1,
        folder_path: '/',
        version: 1,
        requires_acknowledgment: false,
        access_roles: [],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      documentModel.findDocumentById = jest.fn().mockResolvedValue(mockDocument);

      const result = await documentModel.getDocumentContent(testDocumentId);

      expect(result).toEqual({
        content: '# Test Document\n\nThis is the content.',
      });
    });

    it('should return null when document not found', async () => {
      documentModel.findDocumentById = jest.fn().mockResolvedValue(null);

      const result = await documentModel.getDocumentContent(testDocumentId);

      expect(result).toBeNull();
    });
  });

  describe('acknowledgment methods', () => {
    const mockAcknowledgment: HRDocumentAcknowledgment = {
      id: uuidv4(),
      document_id: testDocumentId,
      user_id: testUserId,
      acknowledged_at: new Date(),
      ip_address: '127.0.0.1',
    };

    describe('createAcknowledgment', () => {
      it('should create acknowledgment successfully', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          insert: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockAcknowledgment]),
          }),
        });

        const result = await documentModel.createAcknowledgment({
          document_id: testDocumentId,
          user_id: testUserId,
          ip_address: '127.0.0.1',
        });

        expect(result).toEqual(mockAcknowledgment);
      });
    });

    describe('findAcknowledgment', () => {
      it('should return acknowledgment when found', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockAcknowledgment),
          }),
        });

        const result = await documentModel.findAcknowledgment(testDocumentId, testUserId);

        expect(result).toEqual(mockAcknowledgment);
      });

      it('should return null when acknowledgment not found', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        });

        const result = await documentModel.findAcknowledgment(testDocumentId, testUserId);

        expect(result).toBeNull();
      });
    });

    describe('deleteAcknowledgment', () => {
      it('should delete acknowledgment successfully', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            del: jest.fn().mockResolvedValue(1),
          }),
        });

        const result = await documentModel.deleteAcknowledgment(testDocumentId, testUserId);

        expect(result).toBe(true);
      });

      it('should return false when acknowledgment not found for deletion', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            del: jest.fn().mockResolvedValue(0),
          }),
        });

        const result = await documentModel.deleteAcknowledgment(testDocumentId, testUserId);

        expect(result).toBe(false);
      });
    });
  });

  describe('getComplianceReport', () => {
    it('should return compliance report', async () => {
      const mockDocStats = {
        total_documents: '5',
        documents_requiring_acknowledgment: '3',
      };

      const mockAckStats = {
        total_acknowledgments: '10',
      };

      const mockMemberCount = {
        count: '5',
      };

      (db as jest.MockedFunction<any>).mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDocStats),
          }),
        }),
      }).mockReturnValueOnce({
        join: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            count: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(mockAckStats),
            }),
          }),
        }),
      }).mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockMemberCount),
          }),
        }),
      });

      const result = await documentModel.getComplianceReport(testOrganizationId);

      expect(result.total_documents).toBe(5);
      expect(result.documents_requiring_acknowledgment).toBe(3);
      expect(result.total_acknowledgments).toBe(10);
      expect(result.compliance_rate).toBe(66.66666666666667); // 10 / 15 * 100
      expect(result.pending_acknowledgments).toBe(5); // 15 - 10
    });
  });

  describe('getPendingAcknowledgments', () => {
    it('should return pending acknowledgments for user', async () => {
      const mockDocuments: HRDocument[] = [
        {
          id: testDocumentId,
          organization_id: testOrganizationId,
          title: 'Pending Document',
          description: 'Pending description',
          content: '# Pending Document\n\nThis requires acknowledgment.',
          word_count: 6,
          estimated_reading_time: 1,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: true,
          access_roles: [],
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhereRaw: jest.fn().mockResolvedValue(mockDocuments),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      // Mock findAcknowledgment to return null (no acknowledgment found)
      documentModel.findAcknowledgment = jest.fn().mockResolvedValue(null) as any;

      const result = await documentModel.getPendingAcknowledgments(
        testOrganizationId,
        testUserId,
        ['member']
      );

      expect(result).toEqual(mockDocuments);
    });
  });
});