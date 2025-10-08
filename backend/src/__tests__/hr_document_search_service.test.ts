import { HRDocumentSearchService } from '../services/hr_document_search_service';
import db from '../config/database';

// Mock the database
jest.mock('../config/database');
const mockDb = db as jest.Mocked<typeof db>;

describe('HRDocumentSearchService', () => {
  let searchService: HRDocumentSearchService;

  beforeEach(() => {
    searchService = new HRDocumentSearchService();
    jest.clearAllMocks();
  });

  describe('searchDocuments', () => {
    it('should perform basic search with relevance scoring', async () => {
      const mockDocuments = [
        {
          id: '1',
          organization_id: 'org1',
          title: 'Test Document',
          description: 'A test document',
          content: 'This is test content with search terms',
          word_count: 10,
          estimated_reading_time: 1,
          folder_path: '/',
          version: 1,
          requires_acknowledgment: false,
          access_roles: [],
          created_by: 'user1',
          created_at: new Date(),
          updated_at: new Date(),
          relevance_score: 0.5,
        },
      ];

      // Mock the database query chain
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        clearSelect: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '1' }),
      };

      mockDb.mockReturnValue(mockQuery as any);
      mockQuery.where.mockResolvedValue(mockDocuments);

      const searchOptions = {
        query: 'test',
        organization_id: 'org1',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchDocuments(searchOptions);

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.query).toBe('test');
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it('should handle empty search results', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        clearSelect: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '0' }),
      };

      mockDb.mockReturnValue(mockQuery as any);
      mockQuery.where.mockResolvedValue([]);

      const searchOptions = {
        query: 'nonexistent',
        organization_id: 'org1',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchDocuments(searchOptions);

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.suggestions).toEqual([]);
    });

    it('should sanitize search query', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        clearSelect: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '0' }),
      };

      mockDb.mockReturnValue(mockQuery as any);
      mockQuery.where.mockResolvedValue([]);

      const searchOptions = {
        query: '<script>alert("xss")</script>',
        organization_id: 'org1',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchDocuments(searchOptions);

      // Should not throw an error and should sanitize the query
      expect(result.query).not.toContain('<script>');
      expect(result.results).toHaveLength(0);
    });
  });

  describe('generateContentSnippet', () => {
    it('should generate snippet with highlighting', () => {
      const content = 'This is a long document with many words that contains the search term multiple times. The search term appears here and also here.';
      const searchQuery = 'search term';

      // Access private method for testing
      const snippet = (searchService as any).generateContentSnippet(content, searchQuery, 100);

      expect(snippet).toBeTruthy();
      expect(snippet.text).toContain('search term');
      expect(snippet.highlighted).toContain('<mark>');
      expect(snippet.positions).toHaveLength(2); // Two occurrences
    });

    it('should handle empty content', () => {
      const snippet = (searchService as any).generateContentSnippet('', 'test', 100);
      expect(snippet).toBeNull();
    });
  });

  describe('reindexDocuments', () => {
    it('should reindex documents successfully', async () => {
      const mockResult = { rowCount: 5 };
      mockDb.raw = jest.fn().mockResolvedValue(mockResult);

      const result = await searchService.reindexDocuments('org1');

      expect(result.indexed).toBe(5);
      expect(result.errors).toBe(0);
      expect(mockDb.raw).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hr_documents'),
        ['org1']
      );
    });

    it('should handle reindexing errors', async () => {
      mockDb.raw = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await searchService.reindexDocuments('org1');

      expect(result.indexed).toBe(0);
      expect(result.errors).toBe(1);
    });
  });
});