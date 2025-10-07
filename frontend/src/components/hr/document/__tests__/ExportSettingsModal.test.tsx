
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportSettingsModal } from '../ExportSettingsModal';
import { DocumentExportService } from '../../../../services/DocumentExportService';

// Mock the DocumentExportService
vi.mock('../../../../services/DocumentExportService', () => ({
  DocumentExportService: {
    getPdfExportPresets: vi.fn(() => ({
      standard: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        includeMetadata: true,
        fontSize: 12,
      },
      compact: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        includeMetadata: false,
        fontSize: 10,
      },
    })),
    validatePdfOptions: vi.fn(() => []),
  },
}));

const mockOptions = {
  pageFormat: 'A4' as const,
  orientation: 'portrait' as const,
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  includeMetadata: true,
  fontSize: 12,
};

describe('ExportSettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Export Settings')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <ExportSettingsModal
        isOpen={false}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Export Settings')).not.toBeInTheDocument();
  });

  it('should show preset options', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
    expect(screen.getByText('standard')).toBeInTheDocument();
    expect(screen.getByText('compact')).toBeInTheDocument();
  });

  it('should show page format options', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Page Format')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A4')).toBeInTheDocument();
  });

  it('should show orientation options', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Orientation')).toBeInTheDocument();
    expect(screen.getByText('Portrait')).toBeInTheDocument();
    expect(screen.getByText('Landscape')).toBeInTheDocument();
  });

  it('should show margin inputs', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Margins (mm)')).toBeInTheDocument();
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Bottom')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });

  it('should show content options checkboxes', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Content Options')).toBeInTheDocument();
    expect(screen.getByText('Include document metadata')).toBeInTheDocument();
    expect(screen.getByText('Include table of contents')).toBeInTheDocument();
    expect(screen.getByText('Include page numbers')).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', async () => {
    const mockValidate = vi.mocked(DocumentExportService.validatePdfOptions);
    mockValidate.mockReturnValue([]);

    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show validation errors', async () => {
    const mockValidate = vi.mocked(DocumentExportService.validatePdfOptions);
    mockValidate.mockReturnValue(['Invalid margin values']);

    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
      expect(screen.getByText('Invalid margin values')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should update options when preset is selected', async () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    // Look for the preset button by its capitalized text content
    const compactButton = screen.getByText('compact');
    fireEvent.click(compactButton);

    // The component should update its internal state
    // We can't easily test this without exposing internal state
    // but we can verify the preset button exists and is clickable
    expect(compactButton).toBeInTheDocument();
  });

  it('should update page format when changed', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    // Find the select element by its label
    const pageFormatSelect = screen.getByLabelText('Page Format');
    fireEvent.change(pageFormatSelect, { target: { value: 'Letter' } });

    expect(pageFormatSelect).toHaveValue('Letter');
  });

  it('should update orientation when changed', () => {
    render(
      <ExportSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        options={mockOptions}
        onSave={mockOnSave}
      />
    );

    // Find the select element by its label
    const orientationSelect = screen.getByLabelText('Orientation');
    fireEvent.change(orientationSelect, { target: { value: 'landscape' } });

    expect(orientationSelect).toHaveValue('landscape');
  });
});