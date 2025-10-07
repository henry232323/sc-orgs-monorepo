
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDropdown } from '../ExportDropdown';
import { DocumentExportService } from '../../../../services/DocumentExportService';

// Mock the DocumentExportService
vi.mock('../../../../services/DocumentExportService', () => ({
  DocumentExportService: {
    exportAndDownload: vi.fn(),
    exportToPdfPrint: vi.fn(),
    getPdfExportPresets: vi.fn(() => ({
      standard: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        includeMetadata: true,
      },
      compact: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        includeMetadata: false,
      },
    })),
    validatePdfOptions: vi.fn(() => []),
  },
}));

const mockMetadata = {
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

const mockContent = '# Test Document\n\nThis is a test document.';

describe('ExportDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render export button', () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should show export options when clicked', async () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('Export Options')).toBeInTheDocument();
      expect(screen.getByText('HTML')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('Markdown')).toBeInTheDocument();
    });
  });

  it('should call exportAndDownload when format is selected', async () => {
    const mockExportAndDownload = vi.mocked(DocumentExportService.exportAndDownload);
    mockExportAndDownload.mockResolvedValue();

    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('HTML')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('HTML'));

    await waitFor(() => {
      expect(mockExportAndDownload).toHaveBeenCalledWith(
        mockContent,
        mockMetadata,
        'html',
        expect.any(Object)
      );
    });
  });

  it('should show PDF presets', async () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('PDF Presets')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Compact')).toBeInTheDocument();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
        disabled={true}
      />
    );

    const exportButton = screen.getByText('Export').closest('button');
    expect(exportButton).toBeDisabled();
  });

  it('should show export settings option', async () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('Export Settings')).toBeInTheDocument();
    });
  });

  it('should show print option', async () => {
    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('Print')).toBeInTheDocument();
    });
  });

  it('should handle export errors gracefully', async () => {
    const mockExportAndDownload = vi.mocked(DocumentExportService.exportAndDownload);
    mockExportAndDownload.mockRejectedValue(new Error('Export failed'));

    render(
      <ExportDropdown
        content={mockContent}
        metadata={mockMetadata}
      />
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(screen.getByText('HTML')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('HTML'));

    // Should not throw error and should handle gracefully
    await waitFor(() => {
      expect(mockExportAndDownload).toHaveBeenCalled();
    });
  });
});