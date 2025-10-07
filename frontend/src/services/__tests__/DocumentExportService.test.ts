import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentExportService, type DocumentMetadata } from '../DocumentExportService';

const mockMetadata: DocumentMetadata = {
  title: 'Test Document',
  description: 'A test document',
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  word_count: 100,
  estimated_reading_time: 2,
  folder_path: '/test',
  requires_acknowledgment: true,
  access_roles: ['member'],
};

const mockContent = '# Test Document\n\nThis is a **test** document with *markdown* content.\n\n- Item 1\n- Item 2\n- Item 3';

describe('DocumentExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToHtml', () => {
    it('should convert markdown to HTML', () => {
      const html = DocumentExportService.exportToHtml(mockContent, mockMetadata);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Document</title>');
      expect(html).toContain('<h1>Test Document</h1>');
      expect(html).toContain('A test document');
    });

    it('should include metadata when requested', () => {
      const html = DocumentExportService.exportToHtml(mockContent, mockMetadata, {
        includeMetadata: true,
      });
      
      expect(html).toContain('Document Information');
      expect(html).toContain('Version');
      expect(html).toContain('Word Count');
      expect(html).toContain('100');
    });

    it('should exclude metadata when not requested', () => {
      const html = DocumentExportService.exportToHtml(mockContent, mockMetadata, {
        includeMetadata: false,
      });
      
      expect(html).not.toContain('Document Information');
    });

    it('should include table of contents when requested', () => {
      const contentWithHeaders = '# Header 1\n\n## Header 2\n\n### Header 3\n\nContent here.';
      const html = DocumentExportService.exportToHtml(contentWithHeaders, mockMetadata, {
        includeTableOfContents: true,
      });
      
      expect(html).toContain('Table of Contents');
    });

    it('should include custom styles', () => {
      const customStyles = 'body { background: red; }';
      const html = DocumentExportService.exportToHtml(mockContent, mockMetadata, {
        customStyles,
      });
      
      expect(html).toContain(customStyles);
    });
  });

  describe('exportToMarkdown', () => {
    it('should export markdown with metadata', () => {
      const markdown = DocumentExportService.exportToMarkdown(mockContent, mockMetadata);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "Test Document"');
      expect(markdown).toContain('version: 1');
      expect(markdown).toContain(mockContent);
      expect(markdown).toContain('## Document Information');
    });

    it('should export markdown without metadata when not requested', () => {
      const markdown = DocumentExportService.exportToMarkdown(mockContent, mockMetadata, {
        includeMetadata: false,
      });
      
      expect(markdown).not.toContain('---');
      expect(markdown).not.toContain('title:');
      expect(markdown).toBe(mockContent);
    });
  });

  describe('getExportFilename', () => {
    it('should generate proper filename for HTML', () => {
      const filename = DocumentExportService.getExportFilename('Test Document', 'html');
      
      expect(filename).toMatch(/^test-document-\d{4}-\d{2}-\d{2}\.html$/);
    });

    it('should generate proper filename for PDF', () => {
      const filename = DocumentExportService.getExportFilename('Test Document', 'pdf');
      
      expect(filename).toMatch(/^test-document-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should generate proper filename for Markdown', () => {
      const filename = DocumentExportService.getExportFilename('Test Document', 'md');
      
      expect(filename).toMatch(/^test-document-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it('should sanitize special characters in title', () => {
      const filename = DocumentExportService.getExportFilename('Test/Document: Special!', 'html');
      
      expect(filename).toMatch(/^testdocument-special-\d{4}-\d{2}-\d{2}\.html$/);
    });
  });

  describe('downloadFile', () => {
    it('should create download link and trigger download', () => {
      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
      };
      
      const mockCreateElement = vi.fn().mockReturnValue(mockLink);
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true,
      });
      
      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true,
      });
      
      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true,
      });
      
      Object.defineProperty(URL, 'createObjectURL', {
        value: mockCreateObjectURL,
        writable: true,
      });
      
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: mockRevokeObjectURL,
        writable: true,
      });
      
      DocumentExportService.downloadFile('test content', 'test.txt', 'text/plain');
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('exportToPdf', () => {
    it('should be a function that returns a Promise', () => {
      expect(typeof DocumentExportService.exportToPdf).toBe('function');
      const result = DocumentExportService.exportToPdf(mockContent, mockMetadata);
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {
        // Expected to fail in test environment due to DOM limitations
      });
    });

    it('should accept export options', () => {
      const options = {
        pageFormat: 'A4' as const,
        orientation: 'portrait' as const,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      };
      
      const result = DocumentExportService.exportToPdf(mockContent, mockMetadata, options);
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {
        // Expected to fail in test environment due to DOM limitations
      });
    });
  });

  describe('exportToPdfPrint', () => {
    it('should open print window with HTML content', async () => {
      const mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
        close: vi.fn(),
        onload: null as any,
      };
      
      const mockWindowOpen = vi.fn().mockReturnValue(mockPrintWindow);
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      });
      
      const exportPromise = DocumentExportService.exportToPdfPrint(mockContent, mockMetadata);
      
      expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.document.close).toHaveBeenCalled();
      
      // Simulate onload event
      if (mockPrintWindow.onload) {
        mockPrintWindow.onload();
      }
      
      await exportPromise;
    });

    it('should throw error if popup is blocked', async () => {
      const mockWindowOpen = vi.fn().mockReturnValue(null);
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      });
      
      await expect(
        DocumentExportService.exportToPdfPrint(mockContent, mockMetadata)
      ).rejects.toThrow('Unable to open print window');
    });
  });

  describe('getPdfExportPresets', () => {
    it('should return predefined PDF export presets', () => {
      const presets = DocumentExportService.getPdfExportPresets();
      
      expect(presets).toHaveProperty('standard');
      expect(presets).toHaveProperty('compact');
      expect(presets).toHaveProperty('presentation');
      expect(presets).toHaveProperty('minimal');
      
      expect(presets.standard?.pageFormat).toBe('A4');
      expect(presets.standard?.orientation).toBe('portrait');
      expect(presets.standard?.includeMetadata).toBe(true);
      
      expect(presets.presentation?.orientation).toBe('landscape');
      expect(presets.presentation?.includeTableOfContents).toBe(true);
      
      expect(presets.minimal?.includeMetadata).toBe(false);
      expect(presets.minimal?.includePageNumbers).toBe(false);
    });
  });

  describe('validatePdfOptions', () => {
    it('should return no errors for valid options', () => {
      const validOptions = {
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        fontSize: 12,
      };
      
      const errors = DocumentExportService.validatePdfOptions(validOptions);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for negative margins', () => {
      const invalidOptions = {
        margins: { top: -5, right: 20, bottom: 20, left: 20 },
      };
      
      const errors = DocumentExportService.validatePdfOptions(invalidOptions);
      expect(errors).toContain('Margins must be non-negative values');
    });

    it('should return errors for too large margins', () => {
      const invalidOptions = {
        margins: { top: 150, right: 20, bottom: 150, left: 20 },
      };
      
      const errors = DocumentExportService.validatePdfOptions(invalidOptions);
      expect(errors).toContain('Margins are too large for the page format');
    });

    it('should return errors for invalid font size', () => {
      const invalidOptions = {
        fontSize: 100,
      };
      
      const errors = DocumentExportService.validatePdfOptions(invalidOptions);
      expect(errors).toContain('Font size must be between 6 and 72 points');
    });
  });

  describe('exportAndDownload', () => {
    it('should export and download HTML format', async () => {
      const mockDownloadFile = vi.spyOn(DocumentExportService, 'downloadFile').mockImplementation(() => {});
      
      await DocumentExportService.exportAndDownload(mockContent, mockMetadata, 'html');
      
      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>'),
        expect.stringMatching(/test-document-\d{4}-\d{2}-\d{2}\.html/),
        'text/html'
      );
      
      mockDownloadFile.mockRestore();
    });

    it('should export and download markdown format', async () => {
      const mockDownloadFile = vi.spyOn(DocumentExportService, 'downloadFile').mockImplementation(() => {});
      
      await DocumentExportService.exportAndDownload(mockContent, mockMetadata, 'md');
      
      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('---'),
        expect.stringMatching(/test-document-\d{4}-\d{2}-\d{2}\.md/),
        'text/markdown'
      );
      
      mockDownloadFile.mockRestore();
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        DocumentExportService.exportAndDownload(mockContent, mockMetadata, 'unsupported' as any)
      ).rejects.toThrow('Unsupported export format: unsupported');
    });
  });
});