# Implementation Plan

- [x] 1. Database Schema Migration and Backend Foundation
  - Replace file upload system with markdown-only document storage
  - Add content, word_count, and estimated_reading_time columns
  - Remove file-related columns (file_path, file_type, file_size)
  - Add database indexes for content search
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 1.1 Create database migration file
  - Write migration to replace file fields with markdown content
  - Add content TEXT NOT NULL column for markdown storage
  - Add word_count INTEGER and estimated_reading_time INTEGER columns
  - Remove file_path, file_type, file_size columns
  - _Requirements: 3.1, 3.2_

- [x] 1.2 Add database indexes for content search
  - Add GIN index for full-text search on content column
  - Add index for word_count for filtering and sorting
  - Test migration rollback functionality
  - Verify content search performance
  - _Requirements: 3.3, 3.4, 7.3_

- [x] 1.3 Update HR document model interfaces
  - Simplify HRDocument interface to markdown-only fields
  - Remove file-related fields from interface
  - Update CreateDocumentData and UpdateDocumentData interfaces
  - Add validation for required markdown content
  - _Requirements: 3.1, 3.4_

- [x] 2. Backend Markdown Processing Service Implementation
  - Create simplified markdown processing service for content validation
  - Implement content sanitization and security measures
  - Add plain text extraction for search indexing
  - Calculate word count and reading time estimation
  - _Requirements: 2.2, 4.3, 7.1_

- [x] 2.1 Create simplified MarkdownProcessingService class
  - Implement validateContent method with syntax checking
  - Create extractPlainText method for search indexing
  - Add calculateWordCount and estimateReadingTime methods
  - Implement content sanitization for storage
  - _Requirements: 2.2, 7.1_

- [x] 2.2 Implement content sanitization and security
  - Add content sanitization for safe storage
  - Implement content length and complexity validation
  - Add XSS prevention for markdown content storage
  - Create validation rules for markdown syntax
  - _Requirements: 4.3, 2.6_

- [x] 3. Backend API Enhancement
  - Extend document controller with markdown-specific endpoints
  - Update existing endpoints to support both file and markdown documents
  - Implement content search functionality with full-text indexing
  - Add validation and error handling for markdown operations
  - _Requirements: 2.1, 3.4, 5.1, 7.1, 7.4_

- [x] 3.1 Update document endpoints for markdown-only
  - Update POST /documents for creating markdown documents
  - Modify PUT /documents/:id for updating markdown content
  - Ensure GET /documents/:id returns markdown content
  - Remove file upload endpoints and logic
  - _Requirements: 2.1_

- [x] 3.2 Enhance document endpoints for content search
  - Update GET /documents to return markdown documents with content
  - Modify document search to include full-text search on content
  - Add word count and reading time to document responses
  - Update acknowledgment endpoints to work with markdown documents
  - _Requirements: 3.4, 7.1_

- [x] 3.3 Implement enhanced search functionality
  - Add full-text search capability for markdown content
  - Create search result highlighting for matched content
  - Implement relevance ranking for search results
  - Add search filters for document type (file vs markdown)
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 3.4 Add comprehensive error handling and validation
  - Create custom error types for markdown processing failures
  - Implement validation middleware for markdown content
  - Add error boundaries for document processing operations
  - Create user-friendly error messages for validation failures
  - _Requirements: 2.6, 9.3_

- [x] 4. Frontend Markdown Editor Component
  - Create new MarkdownEditor component using @uiw/react-md-editor
  - Implement live preview functionality with split-pane view
  - Add toolbar with common formatting options and shortcuts
  - Implement auto-save functionality with debounced saves
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2_

- [x] 4.1 Create MarkdownEditor component structure
  - Set up component with @uiw/react-md-editor integration
  - Implement controlled component pattern for content management
  - Add props for initial content, save handlers, and metadata
  - Create responsive layout that works on different screen sizes
  - _Requirements: 2.1, 9.4_

- [x] 4.2 Implement editor features and functionality
  - Add live preview with real-time markdown rendering
  - Implement toolbar with formatting buttons and shortcuts
  - Add syntax highlighting for markdown in edit mode
  - Create keyboard shortcuts for common formatting operations
  - _Requirements: 2.2, 2.3, 2.6, 9.2_

- [x] 4.3 Add auto-save and content management
  - Implement debounced auto-save functionality
  - Add unsaved changes warning when navigating away
  - Create save status indicators for user feedback
  - Add content validation before saving
  - _Requirements: 9.3, 9.5_

- [x] 4.4 Add advanced editor features
  - Implement drag-and-drop for images and links
  - Add table editing assistance
  - Create markdown cheat sheet or help panel
  - Add word count and reading time estimation
  - _Requirements: 2.6, 9.2_

- [x] 5. Enhanced Document Viewer Component
  - Update DocumentViewer to handle both file and markdown documents
  - Implement markdown rendering using react-markdown with GFM support
  - Add print-friendly styling for rendered markdown content
  - Maintain acknowledgment functionality for markdown documents
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 5.1 Update DocumentViewer component structure
  - Add document type detection and conditional rendering
  - Implement markdown rendering using react-markdown
  - Maintain existing file document display functionality
  - Add proper error handling for rendering failures
  - _Requirements: 4.1, 6.2_

- [x] 5.2 Implement markdown rendering features
  - Configure react-markdown with GitHub Flavored Markdown support
  - Add syntax highlighting for code blocks
  - Implement table rendering and styling
  - Add support for task lists and other GFM features
  - _Requirements: 4.2_

- [x] 5.3 Add print and export functionality
  - Create print-friendly CSS for rendered markdown
  - Add export buttons for different formats
  - Implement client-side export for HTML, PDF, and markdown
  - Create download functionality for exported files
  - _Requirements: 4.5, 8.1_

- [x] 6. Document Library Integration
  - Update DocumentLibrary component to support markdown document creation
  - Remove file upload interface and replace with markdown editor
  - Implement unified document list showing both file and markdown documents
  - Add document type indicators and appropriate actions for each type
  - _Requirements: 1.1, 1.2, 1.4, 6.2, 9.1_

- [x] 6.1 Remove file upload functionality completely
  - Remove all file upload UI components and buttons
  - Remove file selection inputs and upload forms
  - Update component props to remove upload-related features
  - Replace with markdown document creation interface
  - _Requirements: 1.1, 1.4_

- [x] 6.2 Integrate markdown editor into document library
  - Add "Create Document" button that opens markdown editor
  - Implement modal or inline editing interface
  - Add document metadata form (title, description, folder, etc.)
  - Create save and cancel functionality for new documents
  - _Requirements: 2.1, 9.1_

- [x] 6.3 Update document list display for markdown-only
  - Remove document type indicators (all documents are markdown)
  - Update document cards to show word count and reading time
  - Implement edit functionality for all documents
  - Add export functionality buttons for each document
  - _Requirements: 6.2, 6.3_

- [x] 6.4 Enhance search and filtering for content
  - Update search to include full-text search on markdown content
  - Remove document type filters (all documents are markdown)
  - Implement search result highlighting within content
  - Add advanced search options for content-specific queries
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 7. Frontend Export Service Implementation
  - Create frontend service for document export functionality
  - Implement HTML export with embedded styles
  - Add PDF export using client-side libraries
  - Create markdown export with metadata preservation
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 7.1 Create DocumentExportService class
  - Implement exportToHtml method with styling
  - Add exportToPdf method using jsPDF or similar
  - Create exportToMarkdown method with metadata
  - Add downloadFile utility for triggering downloads
  - _Requirements: 8.1, 8.3_

- [ ] 7.2 Implement PDF export functionality
  - Add client-side PDF generation using jsPDF or Puppeteer
  - Create print-friendly styling for PDF output
  - Include document metadata in PDF exports
  - Add page formatting and layout options
  - _Requirements: 8.1, 8.3_

- [ ] 7.3 Add export UI components
  - Create export dropdown menu with format options
  - Add export progress indicators
  - Implement export preview functionality
  - Add export settings and customization options
  - _Requirements: 8.1, 9.1_

- [ ] 8. Search Enhancement and Content Indexing
  - Implement full-text search for markdown content
  - Add search result highlighting and context snippets
  - Create content indexing for improved search performance
  - Update search UI to handle enhanced search capabilities
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8.1 Implement backend content search
  - Add database full-text search using PostgreSQL's text search features
  - Create search indexing for markdown content
  - Implement search ranking and relevance scoring
  - Add search result pagination and filtering
  - _Requirements: 7.1, 7.3_

- [ ] 8.2 Add search result highlighting
  - Implement content snippet extraction around matched terms
  - Add highlighting for search terms in results
  - Create context-aware result summaries
  - Add search term highlighting in document viewer
  - _Requirements: 7.2, 7.4_

- [ ] 8.3 Update frontend search interface
  - Enhance search input with advanced options
  - Add document type filters to search results
  - Implement search suggestions and autocomplete
  - Create search history and saved searches
  - _Requirements: 7.4_

- [ ] 9. Version Control and History
  - Implement version tracking for markdown document changes
  - Update version control to handle content changes vs file changes
  - Add change tracking and diff visualization for future enhancement
  - Maintain acknowledgment validity across document versions
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9.1 Implement version control for markdown documents
  - Update version increment logic for content changes
  - Add change detection for markdown content
  - Implement version history storage and retrieval
  - Create version comparison functionality
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9.2 Handle acknowledgments across versions
  - Determine when acknowledgments should remain valid
  - Implement logic for requiring re-acknowledgment on significant changes
  - Add acknowledgment history tracking
  - Create notifications for acknowledgment requirements
  - _Requirements: 5.4_

- [ ] 10. Testing and Quality Assurance
  - Create comprehensive test suite for markdown functionality
  - Add integration tests for hybrid document system
  - Implement performance tests for large documents and search
  - Add security tests for content sanitization and XSS prevention
  - _Requirements: All requirements validation_

- [ ] 10.1 Frontend component testing
  - Write unit tests for MarkdownEditor component
  - Add tests for DocumentViewer markdown rendering
  - Create integration tests for DocumentLibrary
  - Add accessibility tests for all components
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [ ] 10.2 Backend service testing
  - Write unit tests for MarkdownProcessingService
  - Add tests for enhanced DocumentService methods
  - Create API endpoint tests for markdown operations
  - Add database migration and schema tests
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 10.3 Integration and performance testing
  - Create end-to-end tests for document creation workflow
  - Add performance tests for large document handling
  - Test search functionality with large content datasets
  - Add load testing for concurrent document editing
  - _Requirements: 10.1, 10.2, 10.4_

- [ ] 10.4 Security and validation testing
  - Test content sanitization and XSS prevention
  - Add validation tests for malicious markdown content
  - Test access control for markdown documents
  - Add penetration testing for new endpoints
  - _Requirements: 4.3, 2.6_

- [ ] 10.5 Frontend export functionality testing
  - Test HTML export with proper styling
  - Add PDF export functionality tests
  - Test markdown export with metadata preservation
  - Add download functionality tests
  - _Requirements: 8.1, 8.3_

- [ ] 11. Migration and Deployment
  - Create migration scripts and deployment procedures
  - Implement feature flags for gradual rollout
  - Add monitoring and analytics for new functionality
  - Create user documentation and training materials
  - _Requirements: 6.1, 6.5, 10.3_

- [ ] 11.1 Prepare deployment and migration
  - Create database migration deployment scripts
  - Add feature flags for markdown functionality
  - Implement rollback procedures for failed deployments
  - Create monitoring dashboards for new features
  - _Requirements: 6.5, 10.3_

- [ ] 11.2 Create user documentation
  - Write user guide for markdown editor
  - Create migration guide for existing users
  - Add help documentation for markdown syntax
  - Create video tutorials for new functionality
  - _Requirements: 9.2_

- [ ] 11.3 Deploy and monitor
  - Deploy database changes with zero downtime
  - Roll out backend API changes with feature flags
  - Deploy frontend changes with progressive rollout
  - Monitor system performance and user adoption
  - _Requirements: 6.5, 10.1, 10.2, 10.4, 10.5_