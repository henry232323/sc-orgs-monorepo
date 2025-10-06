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
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    returning: jest.fn() as any,
    first: jest.fn() as any,
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orWhereRaw: jest.fn().mockReturnThis(),
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
    it('should create a new document with default values', async () => {
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

      (db as jest.MockedFunction<any>).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockDocument]),
        }),
      });

      const documentData: CreateHRDocumentData = {
        organization_id: testOrganizationId,
        title: 'Test Document',
        description: 'Test description',
        file_path: '/documents/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        uploaded_by: testUserId,
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
        file_path: '/documents/confidential.pdf',
        file_type: 'application/pdf',
        file_size: 2048,
        folder_path: '/confidential',
        version: 1,
        requires_acknowledgment: true,
        access_roles: ['admin', 'manager'],
        uploaded_by: testUserId,
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
        file_path: '/documents/confidential.pdf',
        file_type: 'application/pdf',
        file_size: 2048,
        folder_path: '/confidential',
        requires_acknowledgment: true,
        access_roles: ['admin', 'manager'],
        uploaded_by: testUserId,
      };

      const result = await documentModel.createDocument(documentData);

      expect(result).toEqual(mockDocument);
      expect(result.folder_path).toBe('/confidential');
      expect(result.requires_acknowledgment).toBe(true);
      expect(result.access_roles).toEqual(['admin', 'manager']);
    });
  });

  describe('findDocumentById', () => {
    it('should return a document when found', async () => {
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

      const result = await documentModel.findDocumentById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('should update document metadata', async () => {
      const mockUpdatedDocument: HRDocument = {
        id: testDocumentId,
        organization_id: testOrganizationId,
        title: 'Updated Document',
        description: 'Updated description',
        file_path: '/documents/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        folder_path: '/updated',
        version: 1,
        requires_acknowledgment: true,
        access_roles: ['member'],
        uploaded_by: testUserId,
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
        description: 'Updated description',
        folder_path: '/updated',
        requires_acknowledgment: true,
        access_roles: ['member'],
      };

      const result = await documentModel.updateDocument(testDocumentId, updateData);

      expect(result).toEqual(mockUpdatedDocument);
      expect(db).toHaveBeenCalledWith('hr_documents');
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

      const result = await documentModel.updateDocument('non-existent-id', updateData);

      expect(result).toBeNull();
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(1),
        }),
      });

      const result = await documentModel.deleteDocument(testDocumentId);

      expect(result).toBe(true);
      expect(db).toHaveBeenCalledWith('hr_documents');
    });

    it('should return false when document not found for deletion', async () => {
      (db as jest.MockedFunction<any>).mockReturnValue({
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockResolvedValue(0),
        }),
      });

      const result = await documentModel.deleteDocument('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('listDocuments', () => {
    it('should list documents with pagination', async () => {
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

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhereRaw: jest.fn().mockReturnThis(),
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

    it('should filter documents by folder path', async () => {
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

      await documentModel.listDocuments(testOrganizationId, {
        folder_path: '/confidential',
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ folder_path: '/confidential' });
    });

    it('should filter documents by user roles', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhereRaw: jest.fn().mockReturnThis(),
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

      await documentModel.listDocuments(testOrganizationId, {
        user_roles: ['admin', 'manager'],
      });

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalled();
      expect(mockQueryBuilder.orWhereRaw).toHaveBeenCalled();
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by title and description', async () => {
      const mockDocuments: HRDocument[] = [
        {
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
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhereRaw: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
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

      const result = await documentModel.searchDocuments(testOrganizationId, 'test');

      expect(result.data).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ organization_id: testOrganizationId });
    });
  });

  describe('getFolderStructure', () => {
    it('should return unique folder paths', async () => {
      const mockFolders = [
        { folder_path: '/' },
        { folder_path: '/confidential' },
        { folder_path: '/public' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhereRaw: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockFolders),
      };

      (db as jest.MockedFunction<any>).mockReturnValue(mockQueryBuilder);

      const result = await documentModel.getFolderStructure(testOrganizationId);

      expect(result).toEqual(['/', '/confidential', '/public']);
      expect(mockQueryBuilder.distinct).toHaveBeenCalledWith('folder_path');
    });
  });

  describe('Document Acknowledgments', () => {
    describe('createAcknowledgment', () => {
      it('should create a new acknowledgment', async () => {
        const mockAcknowledgment: HRDocumentAcknowledgment = {
          id: uuidv4(),
          document_id: testDocumentId,
          user_id: testUserId,
          acknowledged_at: new Date(),
          ip_address: '192.168.1.1',
        };

        (db as jest.MockedFunction<any>).mockReturnValue({
          insert: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockAcknowledgment]),
          }),
        });

        const result = await documentModel.createAcknowledgment({
          document_id: testDocumentId,
          user_id: testUserId,
          ip_address: '192.168.1.1',
        });

        expect(result).toEqual(mockAcknowledgment);
        expect(db).toHaveBeenCalledWith('hr_document_acknowledgments');
      });
    });

    describe('findAcknowledgment', () => {
      it('should find an existing acknowledgment', async () => {
        const mockAcknowledgment: HRDocumentAcknowledgment = {
          id: uuidv4(),
          document_id: testDocumentId,
          user_id: testUserId,
          acknowledged_at: new Date(),
          ip_address: '192.168.1.1',
        };

        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockAcknowledgment),
          }),
        });

        const result = await documentModel.findAcknowledgment(testDocumentId, testUserId);

        expect(result).toEqual(mockAcknowledgment);
        expect(db).toHaveBeenCalledWith('hr_document_acknowledgments');
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
      it('should delete an acknowledgment successfully', async () => {
        (db as jest.MockedFunction<any>).mockReturnValue({
          where: jest.fn().mockReturnValue({
            del: jest.fn().mockResolvedValue(1),
          }),
        });

        const result = await documentModel.deleteAcknowledgment(testDocumentId, testUserId);

        expect(result).toBe(true);
        expect(db).toHaveBeenCalledWith('hr_document_acknowledgments');
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
    it('should generate compliance report', async () => {
      const mockDocStats = {
        total_documents: '5',
        documents_requiring_acknowledgment: '3',
      };

      const mockAckStats = {
        total_acknowledgments: '8',
      };

      const mockMemberCount = {
        count: '4',
      };

      (db as jest.MockedFunction<any>)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(mockDocStats),
            }),
          }),
        })
        .mockReturnValueOnce({
          join: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              count: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(mockAckStats),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            count: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(mockMemberCount),
            }),
          }),
        });

      const result = await documentModel.getComplianceReport(testOrganizationId);

      expect(result.total_documents).toBe(5);
      expect(result.documents_requiring_acknowledgment).toBe(3);
      expect(result.total_acknowledgments).toBe(8);
      expect(result.compliance_rate).toBeCloseTo(66.67, 2);
      expect(result.pending_acknowledgments).toBe(4);
    });
  });

  describe('getPendingAcknowledgments', () => {
    it('should return documents requiring acknowledgment that user has not acknowledged', async () => {
      const mockDocuments: HRDocument[] = [
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
          uploaded_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (db as jest.MockedFunction<any>)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            whereRaw: jest.fn().mockReturnThis(),
            orWhereRaw: jest.fn().mockResolvedValue(mockDocuments),
          }),
        });

      // Mock findAcknowledgment to return null (not acknowledged)
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