import { Request, Response } from 'express';
import { HRDocumentModel } from '../models/hr_document_model';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

const documentModel = new HRDocumentModel();

export class HRDocumentController {
  /**
   * POST /api/organizations/:rsi_org_id/documents
   * Upload a new document to an organization
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
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

      // Check if user has permission to upload documents
      const hasAccess = await this.hasDocumentUploadAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to upload documents',
        });
        return;
      }

      const {
        title,
        description,
        file_path,
        file_type,
        file_size,
        folder_path,
        requires_acknowledgment,
        access_roles,
      } = req.body;

      if (!title || !file_path || !file_type || !file_size) {
        res.status(400).json({
          success: false,
          error: 'Title, file_path, file_type, and file_size are required',
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file_size > 50 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          error: 'File size cannot exceed 50MB',
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];

      if (!allowedTypes.includes(file_type)) {
        res.status(400).json({
          success: false,
          error: 'File type not supported',
        });
        return;
      }

      // Create document
      const document = await documentModel.createDocument({
        organization_id: organization.id,
        title,
        description,
        file_path,
        file_type,
        file_size,
        folder_path,
        requires_acknowledgment,
        access_roles,
        uploaded_by: user.id,
      });

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        organizationId: organization.id,
        userId: user.id,
        title,
        fileType: file_type,
        fileSize: file_size,
      });

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to upload document', {
        error: errorMessage,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to upload document',
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

      res.json({
        success: true,
        data: result.data,
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
   * Update document metadata
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
        folder_path,
        requires_acknowledgment,
        access_roles,
      } = req.body;

      const updateData = {
        title,
        description,
        folder_path,
        requires_acknowledgment,
        access_roles,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
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
        changes: updateData,
      });

      res.json({
        success: true,
        data: updatedDocument,
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
   * Search documents by title and description
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

      const { q: searchTerm, page = 1, limit = 20 } = req.query;

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

      const result = await documentModel.searchDocuments(
        organization.id,
        searchTerm,
        {
          user_roles: userRoles,
          limit: parsedLimit,
          offset,
        }
      );

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
        search_term: searchTerm,
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
      return true;
    }

    // Check if user has at least one matching role
    return userRoles.some(role => document.access_roles.includes(role));
  }

  private async getUserRoles(organizationId: string, userId: string): Promise<string[]> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return ['owner', 'admin', 'manager', 'member'];
      }

      // For now, return basic member role
      // This should be enhanced with proper role-based access control
      const isMember = await organizationModel.isUserMember(organizationId, userId);
      return isMember ? ['member'] : [];
    } catch (error) {
      logger.error('Error getting user roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return [];
    }
  }
}