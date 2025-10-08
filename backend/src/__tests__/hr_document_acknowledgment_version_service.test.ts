import { HRDocumentAcknowledmentVersionService } from '../services/hr_document_acknowledgment_version_service';
import { HRDocumentAcknowledmentService } from '../services/hr_document_acknowledgment_service';
import { HRDocumentVersionService, ChangeDetectionResult } from '../services/hr_document_version_service';
import { NotificationService } from '../services/notification_service';

// Mock dependencies
jest.mock('../services/hr_document_acknowledgment_service');
jest.mock('../services/hr_document_version_service');
jest.mock('../services/notification_service');

// Mock the database
jest.mock('../config/database', () => jest.fn());

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));


const MockAcknowledmentService = HRDocumentAcknowledmentService as jest.MockedClass<typeof HRDocumentAcknowledmentService>;
const MockVersionService = HRDocumentVersionService as jest.MockedClass<typeof HRDocumentVersionService>;
const MockNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('HRDocumentAcknowledmentVersionService', () => {
  let service: HRDocumentAcknowledmentVersionService;
  let mockAcknowledmentService: jest.Mocked<HRDocumentAcknowledmentService>;
  let mockVersionService: jest.Mocked<HRDocumentVersionService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockDb: jest.MockedFunction<any>;

  beforeEach(() => {
    mockDb = require('../config/database');
    service = new HRDocumentAcknowledmentVersionService();
    mockAcknowledmentService = new MockAcknowledmentService() as jest.Mocked<HRDocumentAcknowledmentService>;
    mockVersionService = new MockVersionService() as jest.Mocked<HRDocumentVersionService>;
    mockNotificationService = new MockNotificationService() as jest.Mocked<NotificationService>;
    
    // Access private properties for testing
    (service as any).acknowledgmentService = mockAcknowledmentService;
    (service as any).versionService = mockVersionService;
    (service as any).notificationService = mockNotificationService;
    
    jest.clearAllMocks();
  });

  describe('handleDocumentUpdate', () => {
    it('should not invalidate acknowledgments if re-acknowledgment not required', async () => {
      const changeDetection: ChangeDetectionResult = {
        has_significant_changes: true,
        has_content_changes: true,
        has_metadata_changes: false,
        change_summary: 'Minor content update',
        change_metadata: {},
        requires_reacknowledgment: false,
      };

      await service.handleDocumentUpdate(
        'doc-123',
        'org-123',
        2,
        changeDetection,
        'user-123'
      );

      expect(mockDb).not.toHaveBeenCalled();
    });

    it('should invalidate acknowledgments when re-acknowledgment is required', async () => {
      const changeDetection: ChangeDetectionResult = {
        has_significant_changes: true,
        has_content_changes: true,
        has_metadata_changes: true,
        change_summary: 'Significant content changes',
        change_metadata: {},
        requires_reacknowledgment: true,
      };

      const mockAcknowledgments = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];

      const mockDocument = {
        id: 'doc-123',
        title: 'Test Document',
      };

      // Mock database calls
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            whereNull: jest.fn().mockResolvedValue(mockAcknowledgments),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            whereNull: jest.fn().mockReturnValue({
              update: jest.fn().mockResolvedValue(2),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDocument),
          }),
        } as any);

      mockNotificationService.createNotification.mockResolvedValue({} as any);

      await service.handleDocumentUpdate(
        'doc-123',
        'org-123',
        2,
        changeDetection,
        'user-123'
      );

      expect(mockDb).toHaveBeenCalledWith('hr_document_acknowledgments');
      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle case with no existing acknowledgments', async () => {
      const changeDetection: ChangeDetectionResult = {
        has_significant_changes: true,
        has_content_changes: true,
        has_metadata_changes: false,
        change_summary: 'Content updated',
        change_metadata: {},
        requires_reacknowledgment: true,
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          whereNull: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      await service.handleDocumentUpdate(
        'doc-123',
        'org-123',
        2,
        changeDetection,
        'user-123'
      );

      // Should not attempt to update acknowledgments if none exist
      expect(mockDb).toHaveBeenCalledTimes(1);
    });
  });

  describe('acknowledgeDocumentVersion', () => {
    it('should create new acknowledgment', async () => {
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            whereNull: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(null),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue([{}]),
        } as any);

      await service.acknowledgeDocumentVersion(
        'org-123',
        'doc-123',
        'user-123',
        2,
        '127.0.0.1',
        'Acknowledged after review'
      );

      expect(mockDb).toHaveBeenCalledWith('hr_document_acknowledgments');
    });

    it('should update existing acknowledgment requiring re-acknowledgment', async () => {
      const existingAcknowledgment = {
        id: 'ack-123',
        requires_reacknowledgment: true,
      };

      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            whereNull: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(existingAcknowledgment),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            update: jest.fn().mockResolvedValue(1),
          }),
        } as any);

      await service.acknowledgeDocumentVersion(
        'org-123',
        'doc-123',
        'user-123',
        2,
        '127.0.0.1',
        'Re-acknowledged after changes'
      );

      expect(mockDb).toHaveBeenCalledWith('hr_document_acknowledgments');
    });

    it('should throw error if document already acknowledged and valid', async () => {
      const existingAcknowledgment = {
        id: 'ack-123',
        requires_reacknowledgment: false,
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          whereNull: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(existingAcknowledgment),
          }),
        }),
      } as any);

      await expect(service.acknowledgeDocumentVersion(
        'org-123',
        'doc-123',
        'user-123',
        2
      )).rejects.toThrow('Document already acknowledged and acknowledgment is still valid');
    });
  });

  describe('getAcknowledmentVersionStatus', () => {
    it('should return acknowledgment status with version information', async () => {
      const mockDocument = {
        id: 'doc-123',
        version: 3,
      };

      const mockAcknowledgment = {
        acknowledged_version: 2,
        acknowledged_at: new Date(),
        requires_reacknowledgment: false,
        invalidated_at: null,
      };

      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDocument),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(mockAcknowledgment),
            }),
          }),
        } as any);

      const result = await service.getAcknowledmentVersionStatus('doc-123', 'user-123');

      expect(result.user_id).toBe('user-123');
      expect(result.document_id).toBe('doc-123');
      expect(result.latest_document_version).toBe(3);
      expect(result.acknowledgment_gap).toBe(1);
      expect(result.current_acknowledgment?.is_valid).toBe(true);
    });

    it('should handle case with no acknowledgment', async () => {
      const mockDocument = {
        id: 'doc-123',
        version: 2,
      };

      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDocument),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(null),
            }),
          }),
        } as any);

      const result = await service.getAcknowledmentVersionStatus('doc-123', 'user-123');

      expect(result.current_acknowledgment).toBeNull();
      expect(result.acknowledgment_gap).toBe(2);
    });

    it('should throw error if document not found', async () => {
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      await expect(service.getAcknowledmentVersionStatus('doc-123', 'user-123'))
        .rejects.toThrow('Document not found');
    });
  });

  describe('getUsersRequiringReacknowledgment', () => {
    it('should return users requiring re-acknowledgment', async () => {
      const mockResults = [
        {
          user_id: 'user-1',
          user_handle: 'user1',
          document_id: 'doc-123',
          document_title: 'Test Document',
          last_acknowledged_version: 1,
          current_version: 3,
          versions_behind: 2,
          invalidated_at: new Date(),
        },
      ];

      mockDb.mockReturnValue({
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockResults),
      } as any);

      mockVersionService.getVersion.mockResolvedValue({
        change_summary: 'Significant updates',
      } as any);

      const result = await service.getUsersRequiringReacknowledgment('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user-1');
      expect(result[0].change_summary).toBe('Significant updates');
    });

    it('should filter by document ID when provided', async () => {
      mockDb.mockReturnValue({
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as any);

      await service.getUsersRequiringReacknowledgment('org-123', 'doc-123');

      expect(mockDb().where).toHaveBeenCalledWith({ 'hr_document_acknowledgments.document_id': 'doc-123' });
    });
  });

  describe('getAcknowledmentVersionAnalytics', () => {
    it('should return acknowledgment analytics with version information', async () => {
      const mockAcknowledmentStats = {
        total_acknowledgments: '10',
        valid_acknowledgments: '8',
        invalid_acknowledgments: '2',
        pending_reacknowledgments: '2',
        average_acknowledgment_lag: '1.5',
      };

      const mockDocumentStats = {
        total_documents_requiring_acknowledgment: '5',
      };

      const mockUpToDateAcknowledgments = {
        count: '6',
      };

      mockDb
        .mockReturnValueOnce({
          join: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(mockAcknowledmentStats),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            count: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(mockDocumentStats),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          join: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              whereRaw: jest.fn().mockReturnValue({
                whereNull: jest.fn().mockReturnValue({
                  count: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue(mockUpToDateAcknowledgments),
                  }),
                }),
              }),
            }),
          }),
        } as any);

      const result = await service.getAcknowledmentVersionAnalytics('org-123');

      expect(result.total_acknowledgments).toBe(10);
      expect(result.valid_acknowledgments).toBe(8);
      expect(result.invalid_acknowledgments).toBe(2);
      expect(result.pending_reacknowledgments).toBe(2);
      expect(result.acknowledgment_validity_rate).toBe(80);
      expect(result.version_compliance_rate).toBe(60);
      expect(result.average_acknowledgment_lag).toBe(1.5);
    });

    it('should handle case with no acknowledgments', async () => {
      const mockStats = {
        total_acknowledgments: '0',
        valid_acknowledgments: '0',
        invalid_acknowledgments: '0',
        pending_reacknowledgments: '0',
        average_acknowledgment_lag: '0',
      };

      mockDb
        .mockReturnValueOnce({
          join: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(mockStats),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnValue({
            count: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue({ total_documents_requiring_acknowledgment: '0' }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          join: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              whereRaw: jest.fn().mockReturnValue({
                whereNull: jest.fn().mockReturnValue({
                  count: jest.fn().mockReturnValue({
                    first: jest.fn().mockResolvedValue({ count: '0' }),
                  }),
                }),
              }),
            }),
          }),
        } as any);

      const result = await service.getAcknowledmentVersionAnalytics('org-123');

      expect(result.total_acknowledgments).toBe(0);
      expect(result.acknowledgment_validity_rate).toBe(100);
      expect(result.version_compliance_rate).toBe(100);
    });
  });
});