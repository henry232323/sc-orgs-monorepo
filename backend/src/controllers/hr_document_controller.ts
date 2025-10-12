import { Request, Response } from 'express';
import { HRDocumentModel } from '../models/hr_document_model';
import { MarkdownProcessingService } from '../services/markdown_processing_service';
import { HRDocumentService } from '../services/hr_document_service';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

const documentModel = new HRDocumentModel();
const markdownService = new MarkdownProcessingService();
const documentService = new HRDocumentService();

export class HRDocumentController {
  /**
   * POST /api/organizations/:rsi_org_id/documents
   * Create a new markdown document
   */
  async createDocument(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to create documents
      const hasAccess = await this.hasDocumentUploadAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create documents',
        });
        return;
      }

      const {
        title,
        description,
        content,
        folder_path,
        requires_acknowledgment,
        access_roles,
      } = req.body;

      if (!title || !content) {
        res.status(400).json({
          success: false,
          error: 'Title and content are required',
        });
        return;
      }

      // Validate and process markdown content
      const validation = await markdownService.validateContent(content);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid markdown content',
          details: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        });
        return;
      }

      // Sanitize content for safe storage
      const sanitizedContent = markdownService.sanitizeContent(content);

      // Create document
      const document = await documentModel.createDocument({
        organization_id: organization.id,
        title,
        description,
        content: sanitizedContent,
        word_count: validation.wordCount,
        estimated_reading_time: validation.estimatedReadingTime,
        folder_path,
        requires_acknowledgment,
        access_roles,
        created_by: user.id,
      });

      logger.info('Markdown document created successfully', {
        documentId: document.id,
        organizationId: organization.id,
        userId: user.id,
        title,
        wordCount: validation.wordCount,
        estimatedReadingTime: validation.estimatedReadingTime,
      });

      res.status(201).json({
        success: true,
        data: document,
        validation: {
          warnings: validation.warnings,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to create document', {
        error: errorMessage,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create document',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents
   * List documents for an organization with folder navigation and filtering
   */
  async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user roles for access control
      const userRoles = await this.getUserRoles(organization.id, user.id);

      const {
        folder_path,
        file_type,
        requires_acknowledgment,
        page = 1,
        limit = 20,
        include_uploader_info = 'false',
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100); // Max 100
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const filters = {
        folder_path: folder_path as string,
        file_type: file_type as string,
        requires_acknowledgment: requires_acknowledgment === 'true' ? true : 
                                requires_acknowledgment === 'false' ? false : undefined,
        user_roles: userRoles,
        limit: parsedLimit,
        offset,
      };

      let result;
      if (include_uploader_info === 'true') {
        result = await documentModel.getDocumentsWithUploaderInfo(organization.id, filters);
      } else {
        result = await documentModel.listDocuments(organization.id, filters);
      }

      // Ensure word count and reading time are included in response
      const enhancedData = result.data.map(doc => ({
        ...doc,
        word_count: doc.word_count || 0,
        estimated_reading_time: doc.estimated_reading_time || 1,
      }));

      res.json({
        success: true,
        data: enhancedData,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to list documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list documents',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId
   * Get a specific document by ID
   */
  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      // Get acknowledgment status for this user
      const acknowledgment = await documentModel.findAcknowledgment(documentId, user.id);

      res.json({
        success: true,
        data: {
          ...document,
          user_acknowledged: !!acknowledgment,
          acknowledged_at: acknowledgment?.acknowledged_at || null,
        },
      });
    } catch (error) {
      logger.error('Failed to get document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/documents/:documentId
   * Update document metadata and content
   */
  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has permission to update documents
      const hasAccess = await this.hasDocumentUpdateAccess(organization.id, user.id, document);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this document',
        });
        return;
      }

      const {
        title,
        description,
        content,
        folder_path,
        requires_acknowledgment,
        access_roles,
      } = req.body;

      let updateData: any = {
        title,
        description,
        folder_path,
        requires_acknowledgment,
        access_roles,
      };

      let validationWarnings: string[] = [];

      // If content is being updated, validate and process it
      if (content !== undefined) {
        const validation = await markdownService.validateContent(content);
        if (!validation.isValid) {
          res.status(400).json({
            success: false,
            error: 'Invalid markdown content',
            details: {
              errors: validation.errors,
              warnings: validation.warnings,
            },
          });
          return;
        }

        // Sanitize content for safe storage
        const sanitizedContent = markdownService.sanitizeContent(content);

        updateData.content = sanitizedContent;
        updateData.word_count = validation.wordCount;
        updateData.estimated_reading_time = validation.estimatedReadingTime;
        updateData.version = document.version + 1; // Increment version for content changes
        validationWarnings = validation.warnings;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedDocument = await documentModel.updateDocument(documentId, updateData);

      if (!updatedDocument) {
        res.status(500).json({
          success: false,
          error: 'Failed to update document',
        });
        return;
      }

      logger.info('Document updated successfully', {
        documentId,
        organizationId: organization.id,
        userId: user.id,
        changes: Object.keys(updateData),
        contentUpdated: content !== undefined,
        newVersion: updatedDocument.version,
      });

      res.json({
        success: true,
        data: updatedDocument,
        validation: {
          warnings: validationWarnings,
        },
      });
    } catch (error) {
      logger.error('Failed to update document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update document',
      });
    }
  }

  /**
   * DELETE /api/organizations/:rsi_org_id/documents/:documentId
   * Delete a document
   */
  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has permission to delete documents
      const hasAccess = await this.hasDocumentDeleteAccess(organization.id, user.id, document);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to delete this document',
        });
        return;
      }

      const deleted = await documentModel.deleteDocument(documentId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete document',
        });
        return;
      }

      logger.info('Document deleted successfully', {
        documentId,
        organizationId: organization.id,
        userId: user.id,
        documentTitle: document.title,
      });

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete document',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/documents/:documentId/acknowledge
   * Acknowledge a document
   */
  async acknowledgeDocument(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      // Check if document requires acknowledgment
      if (!document.requires_acknowledgment) {
        res.status(400).json({
          success: false,
          error: 'This document does not require acknowledgment',
        });
        return;
      }

      // Check if already acknowledged
      const existingAcknowledgment = await documentModel.findAcknowledgment(documentId, user.id);
      if (existingAcknowledgment) {
        res.status(400).json({
          success: false,
          error: 'Document already acknowledged',
        });
        return;
      }

      // Create acknowledgment
      const acknowledgment = await documentModel.createAcknowledgment({
        document_id: documentId,
        user_id: user.id,
        ip_address: req.ip,
      });

      logger.info('Document acknowledged successfully', {
        documentId,
        organizationId: organization.id,
        userId: user.id,
        documentTitle: document.title,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: acknowledgment,
      });
    } catch (error) {
      logger.error('Failed to acknowledge document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge document',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/search
   * Enhanced search documents with full-text search and highlighting
   */
  async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { 
        q: searchTerm, 
        page = 1, 
        limit = 20,
        highlight = 'true',
        include_content = 'false',
        sort_by = 'relevance',
        folder_paths,
        requires_acknowledgment
      } = req.query;

      if (!searchTerm || typeof searchTerm !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search term (q) is required',
        });
        return;
      }

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      // Get user roles for access control
      const userRoles = await this.getUserRoles(organization.id, user.id);

      // Parse folder paths if provided
      let folderPathsArray: string[] | undefined;
      if (folder_paths && typeof folder_paths === 'string') {
        folderPathsArray = folder_paths.split(',').map(path => path.trim());
      }

      // Parse requires_acknowledgment if provided
      let requiresAck: boolean | undefined;
      if (requires_acknowledgment === 'true') {
        requiresAck = true;
      } else if (requires_acknowledgment === 'false') {
        requiresAck = false;
      }

      // Use the enhanced search service
      const searchResponse = await documentService.searchDocumentsWithSnippets(
        organization.id,
        {
          searchTerm,
          userRoles,
          folderPaths: folderPathsArray,
          requiresAcknowledgment: requiresAck,
          limit: parsedLimit,
          offset,
          sort_by: sort_by as 'relevance' | 'date' | 'title',
          include_content: include_content === 'true',
          snippet_length: 200,
        }
      );

      // Format response for API
      const responseData = searchResponse.results.map(result => ({
        ...result.document,
        relevance_score: result.relevance_score,
        content_snippet: highlight === 'true' ? result.content_snippet : undefined,
        highlighted_snippet: highlight === 'true' ? result.highlighted_snippet : undefined,
        match_positions: highlight === 'true' ? result.match_positions : undefined,
      }));

      res.json({
        success: true,
        data: responseData,
        total: searchResponse.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(searchResponse.total / parsedLimit),
        search_term: searchResponse.query,
        execution_time_ms: searchResponse.execution_time_ms,
        suggestions: searchResponse.suggestions,
        search_options: {
          highlight: highlight === 'true',
          include_content: include_content === 'true',
          sort_by,
          folder_paths: folderPathsArray,
          requires_acknowledgment: requiresAck,
        },
      });
    } catch (error) {
      logger.error('Failed to search documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
        searchTerm: req.query.q,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to search documents',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/history
   * Get version history for a document
   */
  async getDocumentHistory(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const history = await documentModel.getVersionHistory(documentId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get document history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document history',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/folders
   * Get folder structure for the organization
   */
  async getFolderStructure(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user roles for access control
      const userRoles = await this.getUserRoles(organization.id, user.id);

      const folders = await documentModel.getFolderStructure(organization.id, userRoles);

      res.json({
        success: true,
        data: folders,
      });
    } catch (error) {
      logger.error('Failed to get folder structure', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get folder structure',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/acknowledgments
   * Get acknowledgments for a document
   */
  async getDocumentAcknowledgments(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view acknowledgments (admin/manager level)
      const hasAccess = await this.hasDocumentManagementAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view document acknowledgments',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const result = await documentModel.getDocumentAcknowledgments(documentId, {
        limit: parsedLimit,
        offset,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to get document acknowledgments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document acknowledgments',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/acknowledgment-status
   * Get acknowledgment status for a specific document
   */
  async getDocumentAcknowledmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const acknowledgmentStatus = await documentModel.getDocumentAcknowledmentStatus(
        organization.id,
        documentId,
        user.id
      );

      res.json({
        success: true,
        data: acknowledgmentStatus,
      });
    } catch (error) {
      logger.error('Failed to get document acknowledgment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document acknowledgment status',
      });
    }
  }

  /**
   * POST /api/organizations/:rsi_org_id/documents/bulk-acknowledge
   * Bulk acknowledge multiple documents
   */
  async bulkAcknowledgeDocuments(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { document_ids } = req.body;

      if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'document_ids array is required and must not be empty',
        });
        return;
      }

      if (document_ids.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Cannot acknowledge more than 50 documents at once',
        });
        return;
      }

      // Verify all documents belong to this organization and user has access
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const validDocumentIds: string[] = [];

      for (const documentId of document_ids) {
        const document = await documentModel.findDocumentById(documentId);
        if (document && 
            document.organization_id === organization.id && 
            await this.hasDocumentAccess(document, userRoles)) {
          validDocumentIds.push(documentId);
        }
      }

      if (validDocumentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid documents found for acknowledgment',
        });
        return;
      }

      const result = await documentModel.bulkAcknowledgeDocuments(
        validDocumentIds,
        user.id,
        req.ip
      );

      logger.info('Bulk document acknowledgment completed', {
        organizationId: organization.id,
        userId: user.id,
        requestedCount: document_ids.length,
        validCount: validDocumentIds.length,
        successCount: result.success,
        failedCount: result.failed,
      });

      res.json({
        success: true,
        data: {
          requested: document_ids.length,
          processed: validDocumentIds.length,
          acknowledged: result.success,
          failed: result.failed,
          errors: result.errors,
        },
      });
    } catch (error) {
      logger.error('Failed to bulk acknowledge documents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to bulk acknowledge documents',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/with-acknowledgment-status
   * List documents with acknowledgment status for current user
   */
  async listDocumentsWithAcknowledmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user roles for access control
      const userRoles = await this.getUserRoles(organization.id, user.id);

      const {
        folder_path,
        file_type,
        requires_acknowledgment,
        acknowledgment_status,
        page = 1,
        limit = 20,
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      const filters = {
        folder_path: folder_path as string,
        file_type: file_type as string,
        requires_acknowledgment: requires_acknowledgment === 'true' ? true : 
                                requires_acknowledgment === 'false' ? false : undefined,
        acknowledgment_status: acknowledgment_status as 'acknowledged' | 'pending' | 'all',
        user_roles: userRoles,
        limit: parsedLimit,
        offset,
      };

      const result = await documentModel.getDocumentsWithAcknowledmentStatus(
        organization.id,
        user.id,
        filters
      );

      // Ensure word count and reading time are included in response
      const enhancedData = result.data.map(doc => ({
        ...doc,
        word_count: doc.word_count || 0,
        estimated_reading_time: doc.estimated_reading_time || 1,
      }));

      res.json({
        success: true,
        data: enhancedData,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to list documents with acknowledgment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list documents with acknowledgment status',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/compliance-report
   * Get compliance report for the organization
   */
  async getComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view compliance reports
      const hasAccess = await this.hasDocumentManagementAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view compliance reports',
        });
        return;
      }

      const report = await documentModel.getComplianceReport(organization.id);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Failed to get compliance report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get compliance report',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/pending-acknowledgments
   * Get pending acknowledgments for the current user
   */
  async getPendingAcknowledgments(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user roles for access control
      const userRoles = await this.getUserRoles(organization.id, user.id);

      const pendingDocuments = await documentModel.getPendingAcknowledgments(
        organization.id,
        user.id,
        userRoles
      );

      res.json({
        success: true,
        data: pendingDocuments,
      });
    } catch (error) {
      logger.error('Failed to get pending acknowledgments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get pending acknowledgments',
      });
    }
  }

  // Helper methods for permission checking
  private async hasDocumentUploadAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Check if user is a member with appropriate permissions
      const isMember = await organizationModel.isUserMember(organizationId, userId);
      return isMember; // For now, all members can upload documents
    } catch (error) {
      logger.error('Error checking document upload access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }

  private async hasDocumentUpdateAccess(
    organizationId: string,
    userId: string,
    document: any
  ): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Check if user is the uploader of the document
      if (document.uploaded_by === userId) {
        return true;
      }

      // Check if user has management permissions (implement role-based access later)
      return false;
    } catch (error) {
      logger.error('Error checking document update access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }

  private async hasDocumentDeleteAccess(
    organizationId: string,
    userId: string,
    document: any
  ): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Only organization owners can delete documents for now
      return false;
    } catch (error) {
      logger.error('Error checking document delete access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }

  private async hasDocumentManagementAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Check if user has management permissions (implement role-based access later)
      return false;
    } catch (error) {
      logger.error('Error checking document management access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }

  private async hasDocumentAccess(document: any, userRoles: string[]): Promise<boolean> {
    // If document has no access restrictions, it's accessible to all organization members
    if (!document.access_roles || document.access_roles.length === 0) {
      return userRoles.length > 0; // User must be a member
    }

    // Check if user has at least one matching role ID
    return userRoles.some(roleId => document.access_roles.includes(roleId));
  }

  private async getUserRoles(organizationId: string, userId: string): Promise<string[]> {
    try {
      // Import here to avoid circular dependencies
      const { RoleModel } = await import('../models/role_model');
      const roleModel = new RoleModel();

      // Get user's actual role IDs in this organization
      const userRoles = await roleModel.getUserRoles(organizationId, userId);
      
      // Return array of role IDs
      return userRoles.map(role => role.id);
    } catch (error) {
      logger.error('Error getting user roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return [];
    }
  }

  /**
   * Highlights search terms in content and creates snippets
   */
  private highlightSearchTerms(content: string, searchTerm: string): {
    snippet: string;
    highlighted: string;
    matchCount: number;
  } {
    if (!content || !searchTerm) {
      return {
        snippet: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        highlighted: content,
        matchCount: 0,
      };
    }

    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    let matchCount = 0;
    let highlighted = content;
    
    // Create regex for each search word
    const regexes = searchWords.map(word => ({
      word,
      regex: new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    }));

    // Highlight matches
    for (const { regex } of regexes) {
      const matches = highlighted.match(regex);
      if (matches) {
        matchCount += matches.length;
        highlighted = highlighted.replace(regex, '<mark>$&</mark>');
      }
    }

    // Create snippet around first match
    let snippet = '';
    const firstMatch = regexes.find(({ regex }) => regex.test(content));
    if (firstMatch) {
      const match = content.match(firstMatch.regex);
      if (match && match.index !== undefined) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(content.length, match.index + match[0].length + 100);
        snippet = (start > 0 ? '...' : '') + 
                 content.substring(start, end) + 
                 (end < content.length ? '...' : '');
        
        // Highlight in snippet
        for (const { regex } of regexes) {
          snippet = snippet.replace(regex, '<mark>$&</mark>');
        }
      }
    } else {
      // No matches, return beginning of content
      snippet = content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }

    return {
      snippet,
      highlighted,
      matchCount,
    };
  }

  /**
   * Calculates relevance score for search results
   */
  private calculateRelevanceScore(document: any, searchTerm: string): number {
    if (!searchTerm) return 0;

    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    let score = 0;

    // Title matches (highest weight)
    if (document.title) {
      const titleLower = document.title.toLowerCase();
      for (const word of searchWords) {
        if (titleLower.includes(word)) {
          score += titleLower === word ? 100 : 50; // Exact match vs partial
        }
      }
    }

    // Description matches (medium weight)
    if (document.description) {
      const descLower = document.description.toLowerCase();
      for (const word of searchWords) {
        if (descLower.includes(word)) {
          score += 20;
        }
      }
    }

    // Content matches (lower weight but can accumulate)
    if (document.content) {
      const contentLower = document.content.toLowerCase();
      for (const word of searchWords) {
        const matches = contentLower.match(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'));
        if (matches) {
          score += matches.length * 5; // 5 points per content match
        }
      }
    }

    // Boost score for documents that require acknowledgment (might be more important)
    if (document.requires_acknowledgment) {
      score *= 1.1;
    }

    // Boost score for newer documents
    if (document.updated_at) {
      const daysSinceUpdate = (Date.now() - new Date(document.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        score *= 1.2; // Boost recent documents
      }
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }
  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/versions
   * Get version history for a document
   */
  async getDocumentVersionHistory(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const versionHistory = await documentService.getDocumentVersionHistory(documentId);
      const versionStatistics = await documentService.getDocumentVersionStatistics(documentId);

      res.json({
        success: true,
        data: {
          versions: versionHistory,
          statistics: versionStatistics,
        },
      });
    } catch (error) {
      logger.error('Failed to get document version history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document version history',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/versions/:versionNumber
   * Get a specific version of a document
   */
  async getDocumentVersion(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId, versionNumber } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const version = await documentService.getDocumentVersion(documentId, parseInt(versionNumber));

      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Document version not found',
        });
        return;
      }

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      logger.error('Failed to get document version', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        versionNumber: req.params.versionNumber,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document version',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/versions/compare
   * Compare two versions of a document
   */
  async compareDocumentVersions(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const { from_version, to_version } = req.query;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!from_version || !to_version) {
        res.status(400).json({
          success: false,
          error: 'from_version and to_version query parameters are required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const comparison = await documentService.compareDocumentVersions(
        documentId,
        parseInt(from_version as string),
        parseInt(to_version as string)
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Failed to compare document versions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        fromVersion: req.query.from_version,
        toVersion: req.query.to_version,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to compare document versions',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/documents/:documentId/acknowledge-version
   * Acknowledge a document with version tracking
   */
  async acknowledgeDocumentWithVersion(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const { notes } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      // Check if document requires acknowledgment
      if (!document.requires_acknowledgment) {
        res.status(400).json({
          success: false,
          error: 'This document does not require acknowledgment',
        });
        return;
      }

      await documentService.acknowledgeDocumentWithVersion(
        organization.id,
        documentId,
        user.id,
        req.ip,
        notes
      );

      // Get updated acknowledgment status
      const acknowledgmentStatus = await documentService.getAcknowledmentVersionStatus(
        documentId,
        user.id
      );

      logger.info('Document acknowledged with version tracking', {
        documentId,
        organizationId: organization.id,
        userId: user.id,
        documentTitle: document.title,
        documentVersion: document.version,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: acknowledgmentStatus,
        message: 'Document acknowledged successfully',
      });
    } catch (error) {
      logger.error('Failed to acknowledge document with version tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge document',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/:documentId/acknowledgment-version-status
   * Get acknowledgment status with version information
   */
  async getAcknowledmentVersionStatus(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has access to this document
      const userRoles = await this.getUserRoles(organization.id, user.id);
      const hasAccess = await this.hasDocumentAccess(document, userRoles);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this document',
        });
        return;
      }

      const acknowledgmentStatus = await documentService.getAcknowledmentVersionStatus(
        documentId,
        user.id
      );

      res.json({
        success: true,
        data: acknowledgmentStatus,
      });
    } catch (error) {
      logger.error('Failed to get acknowledgment version status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get acknowledgment version status',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/reacknowledgment-required
   * Get users who need to re-acknowledge documents
   */
  async getUsersRequiringReacknowledgment(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { document_id } = req.query;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view acknowledgment analytics
      const hasAccess = await this.hasDocumentManagementAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view acknowledgment analytics',
        });
        return;
      }

      const usersRequiringReacknowledgment = await documentService.getUsersRequiringReacknowledgment(
        organization.id,
        document_id as string
      );

      res.json({
        success: true,
        data: usersRequiringReacknowledgment,
      });
    } catch (error) {
      logger.error('Failed to get users requiring re-acknowledgment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
        documentId: req.query.document_id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get users requiring re-acknowledgment',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/documents/acknowledgment-version-analytics
   * Get acknowledgment analytics with version information
   */
  async getAcknowledmentVersionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view acknowledgment analytics
      const hasAccess = await this.hasDocumentManagementAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view acknowledgment analytics',
        });
        return;
      }

      const analytics = await documentService.getAcknowledmentVersionAnalytics(organization.id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get acknowledgment version analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get acknowledgment version analytics',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/documents/:documentId/update-with-version-control
   * Update document with comprehensive version control
   */
  async updateDocumentWithVersionControl(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { documentId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const document = await documentModel.findDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Verify document belongs to this organization
      if (document.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
        });
        return;
      }

      // Check if user has permission to update documents
      const hasAccess = await this.hasDocumentUpdateAccess(organization.id, user.id, document);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this document',
        });
        return;
      }

      const {
        title,
        description,
        content,
        folder_path,
        requires_acknowledgment,
        access_roles,
      } = req.body;

      let updateData: any = {
        title,
        description,
        folder_path,
        requires_acknowledgment,
        access_roles,
      };

      let validationWarnings: string[] = [];

      // If content is being updated, validate and process it
      if (content !== undefined) {
        const validation = await markdownService.validateContent(content);
        if (!validation.isValid) {
          res.status(400).json({
            success: false,
            error: 'Invalid markdown content',
            details: {
              errors: validation.errors,
              warnings: validation.warnings,
            },
          });
          return;
        }

        // Sanitize content for safe storage
        const sanitizedContent = markdownService.sanitizeContent(content);

        updateData.content = sanitizedContent;
        updateData.word_count = validation.wordCount;
        updateData.estimated_reading_time = validation.estimatedReadingTime;
        validationWarnings = validation.warnings;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const result = await documentService.updateDocumentWithVersionControl(
        documentId,
        organization.id,
        updateData,
        user.id
      );

      logger.info('Document updated with comprehensive version control', {
        documentId,
        organizationId: organization.id,
        userId: user.id,
        changes: Object.keys(updateData),
        versionCreated: result.version_created,
        requiresReacknowledgment: result.requires_reacknowledgment,
        newVersion: result.document.version,
      });

      res.json({
        success: true,
        data: {
          document: result.document,
          version_created: result.version_created,
          requires_reacknowledgment: result.requires_reacknowledgment,
        },
        validation: {
          warnings: validationWarnings,
        },
      });
    } catch (error) {
      logger.error('Failed to update document with version control', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: req.params.documentId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update document',
      });
    }
  }}
