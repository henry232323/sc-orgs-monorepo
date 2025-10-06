import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FolderIcon, 
  DocumentIcon, 
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Paper from '../ui/Paper';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

import SidebarItem from '../ui/SidebarItem';
import { ComponentTitle, ComponentSubtitle, Caption } from '../ui/Typography';
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useAcknowledgeDocumentMutation,
  useGetDocumentAcknowledmentStatusQuery,
} from '../../services/apiSlice';
import type { Document, DocumentFilters } from '../../types/hr';

interface DocumentLibraryProps {
  onDocumentSelect?: (document: Document) => void;
  allowUpload?: boolean;
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
  allowUpload = true,
  showAcknowledgments = true,
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [currentFolder, setCurrentFolder] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedDocument] = useState<Document | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    requires_acknowledgment: false,
    access_roles: [] as string[],
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters: DocumentFilters = useMemo(() => ({
    ...(currentFolder !== '/' && { folder_path: currentFolder }),
    ...(debouncedSearch && { title: debouncedSearch }),
  }), [currentFolder, debouncedSearch]);

  const {
    data: documentsResponse,
    isLoading,
    error,
    refetch,
  } = useGetDocumentsQuery(
    { organizationId: organizationId!, filters },
    { skip: !organizationId }
  );

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [acknowledgeDocument, { isLoading: isAcknowledging }] = useAcknowledgeDocumentMutation();

  // Build folder structure from documents
  const folderStructure = useMemo((): FolderStructure => {
    if (!documentsResponse?.data) return {};

    const structure: FolderStructure = {};
    
    documentsResponse.data.forEach(doc => {
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
  }, [documentsResponse]);

  const getCurrentFolderDocuments = useCallback((): Document[] => {
    if (!documentsResponse?.data) return [];
    
    return documentsResponse.data.filter(doc => 
      doc.folder_path === currentFolder ||
      (currentFolder === '/' && doc.folder_path === '')
    );
  }, [documentsResponse, currentFolder]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile || !organizationId || !uploadMetadata.title.trim()) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadMetadata.title);
      formData.append('description', uploadMetadata.description);
      formData.append('folder_path', currentFolder);
      formData.append('requires_acknowledgment', uploadMetadata.requires_acknowledgment.toString());
      formData.append('access_roles', JSON.stringify(uploadMetadata.access_roles));

      await uploadDocument({
        organizationId,
        data: formData,
      }).unwrap();

      // Reset form
      setUploadFile(null);
      setUploadMetadata({
        title: '',
        description: '',
        requires_acknowledgment: false,
        access_roles: [],
      });

      refetch();
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  const handleDocumentAcknowledge = async (documentId: string) => {
    if (!organizationId) return;

    try {
      await acknowledgeDocument({
        organizationId,
        documentId,
      }).unwrap();

      // Refetch both documents list and acknowledgment status
      refetch();
      
      // Note: The acknowledgment status will be automatically refetched due to cache invalidation
      // when the component re-renders after the documents list is updated
    } catch (error) {
      console.error('Failed to acknowledge document:', error);
      // TODO: Show user-friendly error message
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('text') || fileType.includes('markdown')) return '📝';
    return '📄';
  };

  const useDocumentAcknowledgmentStatus = (doc: Document) => {
    return useGetDocumentAcknowledmentStatusQuery({
      organizationId: organizationId!,
      documentId: doc.id,
    }, {
      skip: !doc.requires_acknowledgment || !organizationId,
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
    <div className="flex h-full">
      {/* Sidebar - Folder Navigation */}
      <div className="w-64 flex-shrink-0">
        <Paper variant="glass-elevated" className="h-full">
          <div className="p-4 border-b border-glass-border">
            <ComponentTitle className="mb-2">Folders</ComponentTitle>
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={setSearchQuery}
              icon={<MagnifyingGlassIcon />}
              className="w-full"
            />
          </div>
          
          <div className="p-2 overflow-y-auto">
            <SidebarItem
              icon={<FolderIcon />}
              onClick={() => setCurrentFolder('/')}
              className={currentFolder === '/' ? 'bg-glass-elevated' : ''}
            >
              Root
            </SidebarItem>
            
            {Object.entries(folderStructure).map(([folderName, folder]) => (
              <SidebarItem
                key={folderName}
                icon={<FolderIcon />}
                onClick={() => setCurrentFolder(`/${folderName}`)}
                className={currentFolder === `/${folderName}` ? 'bg-glass-elevated' : ''}
              >
                {folderName}
                <span className="ml-auto text-xs text-muted">
                  {folder.documents.length}
                </span>
              </SidebarItem>
            ))}
          </div>
        </Paper>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-[var(--spacing-section)]">
        <div className="space-y-[var(--spacing-section)]">
          {/* Header */}
          <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
            <div className="flex justify-between items-start">
              <div>
                <ComponentTitle className="mb-2">
                  Document Library
                </ComponentTitle>
                <ComponentSubtitle>
                  Current folder: {currentFolder === '/' ? 'Root' : currentFolder}
                </ComponentSubtitle>
              </div>
              
              {allowUpload && (
                <Button
                  variant="primary"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                  Upload Document
                </Button>
              )}
            </div>
          </Paper>

          {/* Upload Form */}
          {allowUpload && uploadFile && (
            <Paper variant="glass-elevated" className="p-[var(--spacing-card-lg)]">
              <ComponentTitle className="mb-4">Upload Document</ComponentTitle>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Document Title"
                    value={uploadMetadata.title}
                    onChange={(value) => setUploadMetadata(prev => ({ ...prev, title: value }))}
                    placeholder="Enter document title..."
                    required
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary">File:</span>
                    <span className="text-sm text-primary">{uploadFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                
                <Input
                  label="Description (Optional)"
                  value={uploadMetadata.description}
                  onChange={(value) => setUploadMetadata(prev => ({ ...prev, description: value }))}
                  placeholder="Brief description of the document..."
                />
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadMetadata.requires_acknowledgment}
                      onChange={(e) => setUploadMetadata(prev => ({ 
                        ...prev, 
                        requires_acknowledgment: e.target.checked 
                      }))}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border-2 rounded transition-all ${
                      uploadMetadata.requires_acknowledgment 
                        ? 'bg-brand-secondary border-brand-secondary' 
                        : 'border-glass-border'
                    }`}>
                      {uploadMetadata.requires_acknowledgment && (
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-secondary">Requires acknowledgment</span>
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isUploading || !uploadMetadata.title.trim()}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setUploadFile(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Paper>
          )}

          {/* Hidden file input */}
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadFile(file);
                setUploadMetadata(prev => ({ 
                  ...prev, 
                  title: file.name.replace(/\.[^/.]+$/, '') 
                }));
              }
            }}
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
          />

          {/* Document List */}
          <Paper variant="glass-subtle" className="p-[var(--spacing-card-lg)]">
            <ComponentTitle className="mb-4">
              Documents ({currentDocuments.length})
            </ComponentTitle>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-glass rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-error mb-4">Failed to load documents</p>
                <Button variant="secondary" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : currentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <DocumentIcon className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-secondary">No documents in this folder</p>
                {allowUpload && (
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Upload First Document
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
                    className="p-4 hover:shadow-[var(--shadow-glass-md)]"
                    onClick={() => {
                      setSelectedDocument(doc);
                      onDocumentSelect?.(doc);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">
                          {getDocumentIcon(doc.file_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary truncate">
                            {doc.title}
                          </h4>
                          {doc.description && (
                            <p className="text-sm text-secondary truncate">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1">
                            <Caption>
                              {formatFileSize(doc.file_size)}
                            </Caption>
                            <Caption>
                              v{doc.version}
                            </Caption>
                            <Caption>
                              {new Date(doc.created_at).toLocaleDateString()}
                            </Caption>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {showAcknowledgments && getAcknowledgmentStatus(doc)}
                        
                        {doc.requires_acknowledgment && !isDocumentAcknowledged(doc) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              handleDocumentAcknowledge(doc.id);
                            }}
                            disabled={isAcknowledging}
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            Acknowledge
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            // Open document in new tab
                            window.open(`/api/documents/${doc.id}/download`, '_blank');
                          }}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
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