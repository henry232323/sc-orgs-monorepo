import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { apiSlice } from '../../../services/apiSlice';
import DocumentLibrary from '../document_library';
import type { Document } from '../../../types/hr';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ organizationId: 'test-org' }),
  };
});

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      api: apiSlice.reducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

// Mock documents data
const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    organization_id: 'test-org',
    title: 'Organization Handbook',
    description: 'Complete guide to organization policies',
    file_path: '/documents/handbook.pdf',
    file_type: 'application/pdf',
    file_size: 2048576,
    folder_path: '/',
    version: 1,
    requires_acknowledgment: true,
    access_roles: ['member'],
    uploaded_by: 'admin-user',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-2',
    organization_id: 'test-org',
    title: 'Training Materials',
    description: 'Pilot training documentation',
    file_path: '/documents/training/pilot-guide.pdf',
    file_type: 'application/pdf',
    file_size: 1024768,
    folder_path: '/training',
    version: 2,
    requires_acknowledgment: false,
    access_roles: ['pilot', 'trainer'],
    uploaded_by: 'trainer-user',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'doc-3',
    organization_id: 'test-org',
    title: 'Safety Protocols',
    description: 'Emergency procedures and safety guidelines',
    file_path: '/documents/safety/protocols.md',
    file_type: 'text/markdown',
    file_size: 51200,
    folder_path: '/safety',
    version: 1,
    requires_acknowledgment: true,
    access_roles: ['member'],
    uploaded_by: 'safety-officer',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
];

const mockDocumentsResponse = {
  data: mockDocuments,
  total: 3,
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
  },
};

describe('DocumentLibrary', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockCreateDocument: ReturnType<typeof vi.fn>;
  let mockAcknowledgeDocument: ReturnType<typeof vi.fn>;
  let mockRefetch: ReturnType<typeof vi.fn>;
  let mockOnDocumentSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createMockStore();
    mockCreateDocument = vi.fn();
    mockAcknowledgeDocument = vi.fn();
    mockRefetch = vi.fn();
    mockOnDocumentSelect = vi.fn();
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.getDocuments, 'useQuery').mockReturnValue({
      data: mockDocumentsResponse,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    vi.spyOn(apiSlice.endpoints.uploadDocument, 'useMutation').mockReturnValue([
      mockCreateDocument,
      { isLoading: false }
    ] as any);
    
    vi.spyOn(apiSlice.endpoints.acknowledgeDocument, 'useMutation').mockReturnValue([
      mockAcknowledgeDocument,
      { isLoading: false }
    ] as any);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  it('renders document library with folder navigation', () => {
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getByText('Document Library')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search documents...')).toBeInTheDocument();
  });

  it('displays documents in the current folder', () => {
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getByText('Organization Handbook')).toBeInTheDocument();
    expect(screen.getByText('Complete guide to organization policies')).toBeInTheDocument();
    expect(screen.getByText('Documents (1)')).toBeInTheDocument(); // Only root folder document
  });

  it('shows folder structure with document counts', () => {
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    // Should show folders based on folder_path
    expect(screen.getByText('training')).toBeInTheDocument();
    expect(screen.getByText('safety')).toBeInTheDocument();
  });

  it('allows searching documents', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    await user.type(searchInput, 'handbook');
    
    // Should trigger debounced search after 300ms
    await waitFor(() => {
      expect(apiSlice.endpoints.getDocuments.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            title: 'handbook',
          }),
        }),
        expect.any(Object)
      );
    }, { timeout: 500 });
  });

  it('shows upload button when allowUpload is true', () => {
    renderWithProvider(
      <DocumentLibrary 
        onDocumentSelect={mockOnDocumentSelect} 
        allowUpload={true} 
      />
    );
    
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('hides upload button when allowUpload is false', () => {
    renderWithProvider(
      <DocumentLibrary 
        onDocumentSelect={mockOnDocumentSelect} 
        allowUpload={false} 
      />
    );
    
    expect(screen.queryByText('Upload Document')).not.toBeInTheDocument();
  });

  it('handles file upload process', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    // Trigger file selection
    const uploadButton = screen.getByText('Upload Document');
    await user.click(uploadButton);
    
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show upload form
    await waitFor(() => {
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test')).toBeInTheDocument(); // Auto-filled title
    });
    
    // Fill in required fields and submit
    const titleInput = screen.getByLabelText('Document Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Test Document');
    
    const submitButton = screen.getByRole('button', { name: /Upload/ });
    await user.click(submitButton);
    
    expect(mockCreateDocument).toHaveBeenCalledWith({
      organizationId: 'test-org',
      data: expect.objectContaining({
        title: 'Test Document',
        folder_path: '/',
        file: mockFile,
      }),
    });
  });

  it('displays document acknowledgment status', () => {
    renderWithProvider(
      <DocumentLibrary 
        onDocumentSelect={mockOnDocumentSelect} 
        showAcknowledgments={true} 
      />
    );
    
    // Should show acknowledgment chips for documents that require it
    const acknowledgmentChips = screen.getAllByText(/Acknowledged|Pending/);
    expect(acknowledgmentChips.length).toBeGreaterThan(0);
  });

  it('handles document acknowledgment', async () => {
    const user = userEvent.setup();
    mockAcknowledgeDocument.mockResolvedValue({ unwrap: () => Promise.resolve() });
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge/ });
    await user.click(acknowledgeButton);
    
    await waitFor(() => {
      expect(mockAcknowledgeDocument).toHaveBeenCalledWith({
        organizationId: 'test-org',
        data: { document_id: 'doc-1' },
      });
    });
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('calls onDocumentSelect when document is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const documentCard = screen.getByText('Organization Handbook').closest('[role="button"]') || 
                         screen.getByText('Organization Handbook').closest('div');
    
    if (documentCard) {
      await user.click(documentCard);
      expect(mockOnDocumentSelect).toHaveBeenCalledWith(mockDocuments[0]);
    }
  });

  it('formats file sizes correctly', () => {
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getByText('2 MB')).toBeInTheDocument(); // 2048576 bytes
  });

  it('shows appropriate file type icons', () => {
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    // Should show PDF icon for PDF files
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('handles folder navigation', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const trainingFolder = screen.getByText('training');
    await user.click(trainingFolder);
    
    // Should update the current folder display
    await waitFor(() => {
      expect(screen.getByText('Current folder: /training')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching documents', () => {
    vi.spyOn(apiSlice.endpoints.getDocuments, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getAllByTestId('loading-skeleton') || screen.getAllByText(/loading/i)).toBeTruthy();
  });

  it('shows error state when documents fail to load', () => {
    vi.spyOn(apiSlice.endpoints.getDocuments, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load documents' },
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('shows empty state when no documents are available', () => {
    vi.spyOn(apiSlice.endpoints.getDocuments, 'useQuery').mockReturnValue({
      data: { ...mockDocumentsResponse, data: [] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    expect(screen.getByText('No documents in this folder')).toBeInTheDocument();
    expect(screen.getByText('Upload First Document')).toBeInTheDocument();
  });

  it('handles document download', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });
    
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const viewButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg') // Looking for the eye icon
    );
    
    if (viewButton) {
      await user.click(viewButton);
      expect(mockOpen).toHaveBeenCalledWith('/api/documents/doc-1/download', '_blank');
    }
  });

  it('prevents event propagation when clicking action buttons', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DocumentLibrary onDocumentSelect={mockOnDocumentSelect} />);
    
    const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge/ });
    await user.click(acknowledgeButton);
    
    // Document selection should not be triggered
    expect(mockOnDocumentSelect).not.toHaveBeenCalled();
  });
});