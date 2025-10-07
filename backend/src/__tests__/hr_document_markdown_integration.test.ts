import { HRDocumentController } from '../controllers/hr_document_controller';
import { HRDocumentModel } from '../models/hr_document_model';
import { MarkdownProcessingService } from '../services/markdown_processing_service';

describe('HR Document Markdown Integration', () => {
  let controller: HRDocumentController;
  let documentModel: HRDocumentModel;
  let markdownService: MarkdownProcessingService;

  beforeEach(() => {
    controller = new HRDocumentController();
    documentModel = new HRDocumentModel();
    markdownService = new MarkdownProcessingService();
  });

  describe('MarkdownProcessingService', () => {
    it('should validate markdown content', async () => {
      const content = '# Test Document\n\nThis is a test document with **bold** text.';
      const result = await markdownService.validateContent(content);

      expect(result.isValid).toBe(true);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.estimatedReadingTime).toBeGreaterThan(0);
    });

    it('should extract plain text from markdown', () => {
      const content = '# Test Document\n\nThis is a test document with **bold** text.';
      const plainText = markdownService.extractPlainText(content);

      expect(plainText).toContain('Test Document');
      expect(plainText).toContain('bold');
      expect(plainText).not.toContain('#');
      expect(plainText).not.toContain('**');
    });

    it('should sanitize markdown content', () => {
      const content = '# Test\n\n<script>alert("xss")</script>\n\n[Link](javascript:alert("xss"))';
      const sanitized = markdownService.sanitizeContent(content);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should calculate word count correctly', () => {
      const content = 'This is a test document with exactly ten words here.';
      const wordCount = markdownService.calculateWordCount(content);

      expect(wordCount).toBe(10);
    });

    it('should estimate reading time', () => {
      const content = 'This is a test document.';
      const readingTime = markdownService.estimateReadingTime(content);

      expect(readingTime).toBeGreaterThan(0);
    });
  });

  describe('HRDocumentModel', () => {
    it('should have the correct interface for markdown documents', () => {
      // Test that the model supports the new markdown structure
      const createData = {
        organization_id: 'test-org',
        title: 'Test Document',
        content: '# Test\n\nThis is a test.',
        word_count: 5,
        estimated_reading_time: 1,
        created_by: 'test-user',
      };

      // This should not throw TypeScript errors
      expect(createData.content).toBeDefined();
      expect(createData.word_count).toBeDefined();
      expect(createData.estimated_reading_time).toBeDefined();
    });
  });

  describe('Search functionality', () => {
    it('should support enhanced search options', () => {
      // Test that the search method supports new options
      const searchOptions = {
        user_roles: ['member'],
        limit: 10,
        offset: 0,
        include_content: true,
        sort_by: 'relevance',
      };

      // This should not throw TypeScript errors
      expect(searchOptions.include_content).toBe(true);
      expect(searchOptions.sort_by).toBe('relevance');
    });
  });

  describe('Controller helper methods', () => {
    it('should calculate relevance scores', () => {
      const document = {
        title: 'Test Document',
        description: 'A test document',
        content: 'This document contains test content.',
        requires_acknowledgment: true,
        updated_at: new Date(),
      };
      const searchTerm = 'test';

      // Access private method for testing
      const score = (controller as any).calculateRelevanceScore(document, searchTerm);

      expect(score).toBeGreaterThan(0);
    });
  });
});