import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  FolderIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import Paper from '../ui/Paper';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

import SidebarItem from '../ui/SidebarItem';
import { ComponentTitle, ComponentSubtitle, Caption } from '../ui/Typography';
import DocumentEditorModal from './document/DocumentEditorModal';
import { DocumentExportService } from '../../services/DocumentExportService';
import {
  useGetDocumentsQuery,
  useSearchDocumentsQuery,
  useAcknowledgeDocumentMutation,
  useGetDocumentAcknowledmentStatusQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
} from '../../services/apiSlice';
import type { Document, DocumentFilters } from '../../types/hr';

interface DocumentLibraryProps {
  onDocumentSelect?: (document: Document) => void;
  allowCreate?: boolean;
  showAcknowledgments?: boolean;
}

interface FolderStructure {
  [key: string]: {
    documents: Document[];
    subfolders: FolderStructure;
  };
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onDocumentSelect,
  allowCreate = true,
  showAcknowledgments = true,
}) => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  const [currentFolder, setCurrentFolder] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedDocument] = useState<Document | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [exportingDocument, setExportingDocument] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close export dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setExportingDocument(null);
    };

    if (exportingDocument) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }

    return undefined;
  }, [exportingDocument]);

  const filters: DocumentFilters = useMemo(() => ({
    ...(currentFolder !== '/' && { folder_path: currentFolder }),
    ...(debouncedSearch && { title: debouncedSearch }),
  }), [currentFolder, debouncedSearch]);

  // Use search query when there's a search term, otherwise use regular documents query
  const {
    data: documentsResponse,
    isLoading,
    error,
    refetch,
  } = useGetDocumentsQuery(
    { organizationId: spectrumId!, filters },
    { skip: !spectrumId || !!debouncedSearch }
  );

  const {
    data: searchResponse,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchDocumentsQuery(
    { organizationId: spectrumId!, query: debouncedSearch },
    { skip: !spectrumId || !debouncedSearch }
  );

  // Combine results from both queries
  const finalResponse = debouncedSearch ? searchResponse : documentsResponse;
  const finalIsLoading = debouncedSearch ? isSearching : isLoading;
  const finalError = debouncedSearch ? searchError : error;
  const finalRefetch = debouncedSearch ? refetchSearch : refetch;

  const [acknowledgeDocument, { isLoading: isAcknowledging }] = useAcknowledgeDocumentMutation();
  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation();
  const [updateDocument, { isLoading: isUpdating }] = useUpdateDocumentMutation();

  // Build folder structure from documents
  const folderStructure = useMemo((): FolderStructure => {
    if (!finalResponse?.data) return {};

    const structure: FolderStructure = {};

    finalResponse.data.forEach(doc => {
      const pathParts = doc.folder_path.split('/').filter(Boolean);
      let current = structure;

      // Build folder hierarchy
      pathParts.forEach(part => {
        if (!current[part]) {
          current[part] = { documents: [], subfolders: {} };
        }
        current = current[part].subfolders;
      });

      // Add document to appropriate folder
      const folderKey = pathParts[pathParts.length - 1] || 'root';
      if (!structure[folderKey]) {
        structure[folderKey] = { documents: [], subfolders: {} };
      }
      structure[folderKey].documents.push(doc);
    });

    return structure;
  }, [finalResponse]);

  const getCurrentFolderDocuments = useCallback((): Document[] => {
    if (!finalResponse?.data) return [];

    // If searching, return all results regardless of folder
    if (debouncedSearch) {
      return finalResponse.data;
    }

    return finalResponse.data.filter(doc =>
      doc.folder_path === currentFolder ||
      (currentFolder === '/' && doc.folder_path === '')
    );
  }, [finalResponse, currentFolder, debouncedSearch]);



  const handleDocumentAcknowledge = async (documentId: string) => {
    if (!spectrumId) return;

    try {
      await acknowledgeDocument({
        organizationId: spectrumId,
        documentId,
      }).unwrap();

      // Refetch both documents list and acknowledgment status
      finalRefetch();

      // Note: The acknowledgment status will be automatically refetched due to cache invalidation
      // when the component re-renders after the documents list is updated
    } catch (error) {
      console.error('Failed to acknowledge document:', error);
      // TODO: Show user-friendly error message
    }
  };

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min read';
    return `${minutes} min read`;
  };

  const highlightSearchTerm = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Utility function to generate a valid file path from title
  const generateFilePath = (title: string, folderPath: string): string => {
    // Sanitize title: remove special characters, replace spaces with underscores
    const sanitizedTitle = title
      .trim()
      .replace(/[^a-zA-Z0-9-_\s]/g, '') // Remove special chars except spaces, hyphens, underscores
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    if (!sanitizedTitle) {
      throw new Error('Title must contain at least one alphanumeric character');
    }
    
    // Ensure folder path ends with /
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    return `${normalizedFolderPath}${sanitizedTitle}.md`;
  };

  const handleSaveDocument = async (content: string, metadata: {
    title: string;
    description?: string;
    folder_path: string;
    requires_acknowledgment: boolean;
    access_roles: string[];
  }): Promise<Document> => {
    if (!spectrumId) throw new Error('Organization ID is required');

    // Validate required fields for document creation
    if (!metadata.title?.trim()) {
      throw new Error('Document title is required');
    }

    if (metadata.title.length > 200) {
      throw new Error('Document title cannot exceed 200 characters');
    }

    if (metadata.description && metadata.description.length > 1000) {
      throw new Error('Document description cannot exceed 1000 characters');
    }

    if (!content?.trim()) {
      throw new Error('Document content is required');
    }

    // Validate access roles
    if (!metadata.access_roles || metadata.access_roles.length === 0) {
      throw new Error('At least one access role must be selected');
    }

    try {
      let savedDocument: Document;
      
      if (editingDocument) {
        // Update existing document
        savedDocument = await updateDocument({
          organizationId: spectrumId,
          documentId: editingDocument.id,
          data: {
            ...metadata,
            content,
          },
        }).unwrap();
      } else {
        // Create new document - add required backend fields for validation
        const filePath = generateFilePath(metadata.title, metadata.folder_path);

        const fileSize = new Blob([content]).size;
        
        // Validate file size (1MB limit as per backend validation)
        if (fileSize < 1) {
          throw new Error('Document content cannot be empty');
        }
        
        if (fileSize > 1024 * 1024) { // 1MB limit
          throw new Error('Document content exceeds maximum size of 1MB');
        }

        const documentData = {
          ...metadata,
          content,
          // Add required fields that backend validation expects for document creation
          // Note: These fields are required by the backend validation schema even though
          // this is a markdown document (not a file upload). The backend expects:
          // - file_path: string (generated from title and folder)
          // - file_type: string (always 'text/markdown' for markdown docs)
          // - file_size: number (calculated from content size)
          file_path: filePath,
          file_type: 'text/markdown',
          file_size: fileSize,
        };

        savedDocument = await createDocument({
          organizationId: spectrumId,
          data: documentData,
        }).unwrap();
      }

      // Reset state and refetch documents
      setIsCreatingDocument(false);
      setEditingDocument(null);
      finalRefetch();
      
      return savedDocument;
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error; // Re-throw to let MarkdownEditor handle the error
    }
  };

  const handleCancelEdit = () => {
    setIsCreatingDocument(false);
    setEditingDocument(null);
  };

  const handleExportDocument = async (doc: Document, format: 'html' | 'pdf' | 'markdown') => {
    try {
      const metadata = {
        title: doc.title,
        description: doc.description || '',
        version: doc.version,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        word_count: doc.word_count || 0,
        estimated_reading_time: doc.estimated_reading_time || 0,
        folder_path: doc.folder_path,
        requires_acknowledgment: doc.requires_acknowledgment,
        access_roles: doc.access_roles,
      };

      switch (format) {
        case 'html':
          const htmlContent = DocumentExportService.exportToHtml(doc.content || '', metadata);
          DocumentExportService.downloadFile(htmlContent, `${doc.title}.html`, 'text/html');
          break;
        case 'pdf':
          await DocumentExportService.exportToPdf(doc.content || '', metadata);
          break;
        case 'markdown':
          const markdownContent = DocumentExportService.exportToMarkdown(doc.content || '', metadata);
          DocumentExportService.downloadFile(markdownContent, `${doc.title}.md`, 'text/markdown');
          break;
      }
    } catch (error) {
      console.error('Failed to export document:', error);
    }
  };

  const useDocumentAcknowledgmentStatus = (doc: Document) => {
    return useGetDocumentAcknowledmentStatusQuery({
      organizationId: spectrumId!,
      documentId: doc.id,
    }, {
      skip: !doc.requires_acknowledgment || !spectrumId,
    });
  };

  const getAcknowledgmentStatus = (doc: Document) => {
    const { data: acknowledgmentStatus, isLoading: isLoadingAcknowledgment, error: acknowledgmentError, refetch: refetchAcknowledgment } = useDocumentAcknowledgmentStatus(doc);

    if (!doc.requires_acknowledgment) {
      return null;
    }

    if (isLoadingAcknowledgment) {
      return (
        <Chip variant="default" size="sm" className="text-tertiary">
          <ClockIcon className="w-3 h-3 animate-spin" />
          Loading...
        </Chip>
      );
    }

    if (acknowledgmentError) {
      return (
        <div className="flex items-center gap-1">
          <Chip variant="default" size="sm" className="text-error">
            <ClockIcon className="w-3 h-3" />
            Error
          </Chip>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e?.stopPropagation();
              refetchAcknowledgment();
            }}
            className="text-xs px-1 py-0.5 h-auto"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!acknowledgmentStatus) {
      return (
        <Chip variant="default" size="sm" className="text-tertiary">
          <ClockIcon className="w-3 h-3" />
          Unknown
        </Chip>
      );
    }

    return acknowledgmentStatus.current_user_acknowledged ? (
      <Chip variant="status" size="sm" className="text-success">
        <CheckCircleIcon className="w-3 h-3" />
        Acknowledged
        {acknowledgmentStatus.current_user_acknowledged_at && (
          <span className="ml-1 text-xs opacity-75">
            {new Date(acknowledgmentStatus.current_user_acknowledged_at).toLocaleDateString()}
          </span>
        )}
      </Chip>
    ) : (
      <Chip variant="default" size="sm" className="text-warning">
        <ClockIcon className="w-3 h-3" />
        Pending
      </Chip>
    );
  };

  const isDocumentAcknowledged = (doc: Document) => {
    const { data: acknowledgmentStatus } = useDocumentAcknowledgmentStatus(doc);
    return acknowledgmentStatus?.current_user_acknowledged || false;
  };

  const currentDocuments = getCurrentFolderDocuments();

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-0">
      {/* Sidebar - Folder Navigation */}
      <div className="w-full lg:w-64 flex-shrink-0 order-2 lg:order-1">
        <Paper variant="glass-elevated" className="h-auto lg:h-full">
          <div className="responsive-padding-x responsive-padding-y border-b border-glass-border lg:border-b">
            <ComponentTitle className="mb-2 responsive-text-lg">Folders</ComponentTitle>
            <Input
              placeholder="Search documents and content..."
              value={searchQuery}
              onChange={setSearchQuery}
              icon={<MagnifyingGlassIcon />}
              className="w-full"
            />
          </div>

          <div className="p-2 overflow-y-auto max-h-48 lg:max-h-none">
            {debouncedSearch ? (
              <div className="text-center py-4">
                <p className="responsive-text-sm text-secondary">
                  Searching all documents...
                </p>
                {finalResponse?.total && (
                  <p className="text-xs text-muted mt-1">
                    {finalResponse.total} results found
                  </p>
                )}
              </div>
            ) : (
              <>
                <SidebarItem
                  icon={<FolderIcon />}
                  onClick={() => setCurrentFolder('/')}
                  className={`touch-friendly ${currentFolder === '/' ? 'bg-glass-elevated' : ''}`}
                >
                  Root
                </SidebarItem>

                {Object.entries(folderStructure).map(([folderName, folder]) => (
                  <SidebarItem
                    key={folderName}
                    icon={<FolderIcon />}
                    onClick={() => setCurrentFolder(`/${folderName}`)}
                    className={`touch-friendly ${currentFolder === `/${folderName}` ? 'bg-glass-elevated' : ''}`}
                  >
                    {folderName}
                    <span className="ml-auto text-xs text-muted">
                      {folder.documents.length}
                    </span>
                  </SidebarItem>
                ))}
              </>
            )}
          </div>
        </Paper>
      </div>

      {/* Main Content */}
      <div className="flex-1 order-1 lg:order-2 responsive-padding-x responsive-padding-y lg:p-[var(--spacing-section)]">
        <div className="space-y-4 lg:space-y-[var(--spacing-section)]">
          {/* Header */}
          <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <ComponentTitle className="mb-2 responsive-text-lg">
                  Document Library
                </ComponentTitle>
                <ComponentSubtitle className="responsive-text-sm">
                  {debouncedSearch
                    ? `Search results for "${debouncedSearch}"`
                    : `Current folder: ${currentFolder === '/' ? 'Root' : currentFolder}`
                  }
                </ComponentSubtitle>
              </div>

              {allowCreate && (
                <Button
                  variant="primary"
                  onClick={() => setIsCreatingDocument(true)}
                  className="w-full sm:w-auto touch-friendly"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Document</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>
          </Paper>

          {/* Document Editor Modal */}
          <DocumentEditorModal
            isOpen={isCreatingDocument || !!editingDocument}
            editingDocument={editingDocument}
            organizationId={spectrumId!}
            onClose={handleCancelEdit}
            onSave={handleSaveDocument}
            isLoading={isCreating || isUpdating}
          />

          {/* Document List */}
          <Paper variant="glass-subtle" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)]">
            <ComponentTitle className="mb-4 responsive-text-lg">
              Documents ({currentDocuments.length})
            </ComponentTitle>

            {finalIsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-glass rounded"></div>
                  </div>
                ))}
              </div>
            ) : finalError ? (
              <div className="text-center py-8">
                <p className="text-error mb-4">Failed to load documents</p>
                <Button variant="secondary" onClick={() => finalRefetch()}>
                  Retry
                </Button>
              </div>
            ) : currentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <DocumentIcon className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-secondary">No documents in this folder</p>
                {allowCreate && (
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => setIsCreatingDocument(true)}
                  >
                    Create First Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentDocuments.map((doc) => (
                  <Paper
                    key={doc.id}
                    variant="glass"
                    interactive
                    className="responsive-padding-x responsive-padding-y hover:shadow-[var(--shadow-glass-md)] glass-mobile-reduced"
                    onClick={() => {
                      setSelectedDocument(doc);
                      onDocumentSelect?.(doc);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="text-xl sm:text-2xl flex-shrink-0">
                          📝
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary truncate responsive-text-base">
                            {highlightSearchTerm(doc.title, debouncedSearch)}
                          </h4>
                          {doc.description && (
                            <p className="responsive-text-sm text-secondary truncate">
                              {highlightSearchTerm(doc.description, debouncedSearch)}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                            <Caption className="responsive-text-sm">
                              {doc.word_count || 0} words
                            </Caption>
                            <Caption className="responsive-text-sm">
                              {formatReadingTime(doc.estimated_reading_time || 0)}
                            </Caption>
                            <Caption className="responsive-text-sm">
                              v{doc.version}
                            </Caption>
                            <Caption className="responsive-text-sm">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </Caption>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 justify-end sm:justify-start">
                        {showAcknowledgments && (
                          <div className="w-full sm:w-auto">
                            {getAcknowledgmentStatus(doc)}
                          </div>
                        )}

                        {doc.requires_acknowledgment && !isDocumentAcknowledged(doc) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              handleDocumentAcknowledge(doc.id);
                            }}
                            disabled={isAcknowledging}
                            className="touch-friendly w-full sm:w-auto"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="sm:hidden">Acknowledge</span>
                            <span className="hidden sm:inline">Acknowledge</span>
                          </Button>
                        )}

                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              setEditingDocument(doc);
                            }}
                            className="touch-friendly"
                            title="Edit document"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              onDocumentSelect?.(doc);
                            }}
                            className="touch-friendly"
                            title="View document"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>

                          {/* Export dropdown */}
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e?.stopPropagation();
                                setExportingDocument(exportingDocument === doc.id ? null : doc.id);
                              }}
                              className="touch-friendly"
                              title="Export document"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </Button>

                            {exportingDocument === doc.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px] sm:min-w-[120px]">
                                <button
                                  className="w-full px-3 py-3 sm:py-2 text-left responsive-text-sm hover:bg-gray-50 first:rounded-t-md touch-friendly"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportDocument(doc, 'html');
                                    setExportingDocument(null);
                                  }}
                                >
                                  Export as HTML
                                </button>
                                <button
                                  className="w-full px-3 py-3 sm:py-2 text-left responsive-text-sm hover:bg-gray-50 touch-friendly"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportDocument(doc, 'pdf');
                                    setExportingDocument(null);
                                  }}
                                >
                                  Export as PDF
                                </button>
                                <button
                                  className="w-full px-3 py-3 sm:py-2 text-left responsive-text-sm hover:bg-gray-50 last:rounded-b-md touch-friendly"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportDocument(doc, 'markdown');
                                    setExportingDocument(null);
                                  }}
                                >
                                  Export as Markdown
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                ))}
              </div>
            )}
          </Paper>
        </div>
      </div>
    </div>
  );
};

export default DocumentLibrary;