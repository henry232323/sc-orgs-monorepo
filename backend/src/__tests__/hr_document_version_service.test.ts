import { HRDocumentVersionService, CreateVersionData, ChangeDetectionResult } from '../services/hr_document_version_service';

// Mock the database
jest.mock('../config/database', () => jest.fn());

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('HRDocumentVersionService', () => {
  let versionService: HRDocumentVersionService;
  let mockDb: jest.MockedFunction<any>;

  beforeEach(() => {
    mockDb = require('../config/database');
    versionService = new HRDocumentVersionService();
    jest.clearAllMocks();
  });

  describe('createVersion', () => {
    it('should create a new document version', async () => {
      const versionData: CreateVersionData = {
        document_id: 'doc-123',
        version_number: 2,
        content: '# Updated Content',
        title: 'Updated Title',
        description: 'Updated description',
        word_count: 10,
        estimated_reading_time: 1,
        folder_path: '/documents',
        requires_acknowledgment: true,
        access_roles: ['admin'],
        change_summary: 'Content updated',
        change_metadata: { test: true },
        created_by: 'user-123',
      };

      const mockVersion = {
        id: 'version-123',
        ...versionData,
        created_at: new Date(),
      };

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockVersion]),
        }),
      });

      const result = await versionService.createVersion(versionData);

      expect(result).toEqual(mockVersion);
      expect(mockDb).toHaveBeenCalledWith('hr_document_versions');
    });

    it('should handle creation errors', async () => {
      const versionData: CreateVersionData = {
        document_id: 'doc-123',
        version_number: 2,
        content: '# Updated Content',
        title: 'Updated Title',
        word_count: 10,
        estimated_reading_time: 1,
        folder_path: '/documents',
        requires_acknowledgment: true,
        access_roles: ['admin'],
        created_by: 'user-123',
      };

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(versionService.createVersion(versionData)).rejects.toThrow('Database error');
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history for a document', async () => {
      const mockVersions = [
        {
          id: 'version-2',
          document_id: 'doc-123',
          version_number: 2,
          content: '# Version 2',
          title: 'Title v2',
          created_at: new Date(),
        },
        {
          id: 'version-1',
          document_id: 'doc-123',
          version_number: 1,
          content: '# Version 1',
          title: 'Title v1',
          created_at: new Date(),
        },
      ];

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(mockVersions),
        }),
      });

      const result = await versionService.getVersionHistory('doc-123');

      expect(result).toEqual(mockVersions);
      expect(mockDb).toHaveBeenCalledWith('hr_document_versions');
    });
  });

  describe('getVersion', () => {
    it('should return a specific version', async () => {
      const mockVersion = {
        id: 'version-123',
        document_id: 'doc-123',
        version_number: 2,
        content: '# Version 2',
        title: 'Title v2',
        created_at: new Date(),
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockVersion),
        }),
      });

      const result = await versionService.getVersion('doc-123', 2);

      expect(result).toEqual(mockVersion);
    });

    it('should return null if version not found', async () => {
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await versionService.getVersion('doc-123', 999);

      expect(result).toBeNull();
    });
  });

  describe('detectChanges', () => {
    it('should detect initial version', async () => {
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      const currentData = {
        title: 'New Document',
        content: '# New Content',
        folder_path: '/documents',
        requires_acknowledgment: false,
        access_roles: [],
        word_count: 10,
        estimated_reading_time: 1,
      };

      const result = await versionService.detectChanges('doc-123', currentData);

      expect(result.has_significant_changes).toBe(true);
      expect(result.has_content_changes).toBe(true);
      expect(result.change_summary).toBe('Initial version');
      expect(result.requires_reacknowledgment).toBe(false);
    });

    it('should detect content changes', async () => {
      const mockLatestVersion = {
        version_number: 1,
        title: 'Original Title',
        description: 'Original description',
        content: '# Original Content',
        folder_path: '/documents',
        requires_acknowledgment: false,
        access_roles: [],
        word_count: 5,
        estimated_reading_time: 1,
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockLatestVersion),
          }),
        }),
      });

      const currentData = {
        title: 'Updated Title',
        content: '# Updated Content with much more text',
        folder_path: '/documents',
        requires_acknowledgment: false,
        access_roles: [],
        word_count: 15,
        estimated_reading_time: 2,
      };

      const result = await versionService.detectChanges('doc-123', currentData);

      expect(result.has_significant_changes).toBe(true);
      expect(result.has_content_changes).toBe(true);
      expect(result.has_metadata_changes).toBe(true);
      expect(result.change_summary).toContain('title updated');
      expect(result.change_summary).toContain('content modified');
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions', async () => {
      const mockFromVersion = {
        version_number: 1,
        title: 'Original Title',
        content: '# Original Content',
        folder_path: '/documents',
        requires_acknowledgment: false,
        access_roles: [],
        word_count: 5,
        estimated_reading_time: 1,
      };

      const mockToVersion = {
        version_number: 2,
        title: 'Updated Title',
        content: '# Updated Content',
        folder_path: '/new-documents',
        requires_acknowledgment: true,
        access_roles: ['admin'],
        word_count: 8,
        estimated_reading_time: 1,
      };

      // Mock getVersion calls
      jest.spyOn(versionService, 'getVersion')
        .mockResolvedValueOnce(mockFromVersion as any)
        .mockResolvedValueOnce(mockToVersion as any);

      const result = await versionService.compareVersions('doc-123', 1, 2);

      expect(result.from_version).toBe(1);
      expect(result.to_version).toBe(2);
      expect(result.changes.title_changed).toBe(true);
      expect(result.changes.content_changed).toBe(true);
      expect(result.changes.folder_changed).toBe(true);
      expect(result.changes.acknowledgment_requirement_changed).toBe(true);
      expect(result.changes.access_roles_changed).toBe(true);
      expect(result.changes.word_count_delta).toBe(3);
    });

    it('should throw error if version not found', async () => {
      jest.spyOn(versionService, 'getVersion')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({} as any);

      await expect(versionService.compareVersions('doc-123', 1, 2))
        .rejects.toThrow('One or both versions not found');
    });
  });

  describe('getVersionStatistics', () => {
    it('should return version statistics', async () => {
      const mockStats = {
        total_versions: '3',
        first_version_date: new Date('2023-01-01'),
        last_version_date: new Date('2023-01-03'),
        total_contributors: '2',
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockStats),
          }),
        }),
      });
      
      // Mock db.raw function
      mockDb.raw = jest.fn().mockReturnValue('mocked_raw_query');

      const result = await versionService.getVersionStatistics('doc-123');

      expect(result.total_versions).toBe(3);
      expect(result.total_contributors).toBe(2);
      expect(result.version_frequency).toBeGreaterThan(0);
    });
  });
});