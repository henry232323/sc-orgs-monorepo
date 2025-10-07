import db from '../config/database';

export interface HRDocument {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  content: string;
  word_count: number;
  estimated_reading_time: number;
  folder_path: string;
  version: number;
  requires_acknowledgment: boolean;
  access_roles: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRDocumentData {
  organization_id: string;
  title: string;
  description?: string;
  content: string;
  word_count?: number;
  estimated_reading_time?: number;
  folder_path?: string;
  requires_acknowledgment?: boolean;
  access_roles?: string[];
  created_by: string;
}

// Alias for backward compatibility
export interface CreateMarkdownDocumentData extends CreateHRDocumentData {}

export interface UpdateHRDocumentData {
  title?: string;
  description?: string;
  content?: string;
  word_count?: number;
  estimated_reading_time?: number;
  folder_path?: string;
  requires_acknowledgment?: boolean;
  access_roles?: string[];
  version?: number;
}

// Alias for backward compatibility
export interface UpdateMarkdownDocumentData extends UpdateHRDocumentData {}

export interface HRDocumentAcknowledgment {
  id: string;
  document_id: string;
  user_id: string;
  acknowledged_at: Date;
  ip_address?: string;
}

export interface CreateHRDocumentAcknowledgmentData {
  document_id: string;
  user_id: string;
  ip_address?: string;
}

export class HRDocumentModel {
  // Validation methods
  private validateDocumentData(documentData: CreateHRDocumentData): void {
    if (!documentData.content || documentData.content.trim().length === 0) {
      throw new Error('Content cannot be empty for markdown documents');
    }

    if (documentData.content.length > 1000000) { // 1MB limit for content
      throw new Error('Content exceeds maximum allowed size of 1MB');
    }
  }

  // Document methods
  async createDocument(documentData: CreateHRDocumentData): Promise<HRDocument> {
    this.validateDocumentData(documentData);

    const insertData = {
      ...documentData,
      folder_path: documentData.folder_path || '/',
      version: 1,
      requires_acknowledgment: documentData.requires_acknowledgment || false,
      access_roles: documentData.access_roles || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [document] = await db('hr_documents')
      .insert(insertData)
      .returning('*');

    return document;
  }

  // Alias method for backward compatibility
  async createMarkdownDocument(documentData: CreateMarkdownDocumentData): Promise<HRDocument> {
    return this.createDocument(documentData);
  }

  async findDocumentById(id: string): Promise<HRDocument | null> {
    const document = await db('hr_documents').where({ id }).first();
    return document || null;
  }

  async updateDocument(id: string, updateData: UpdateHRDocumentData): Promise<HRDocument | null> {
    // Validate content if it's being updated
    if (updateData.content !== undefined) {
      if (!updateData.content || updateData.content.trim().length === 0) {
        throw new Error('Content cannot be empty for markdown documents');
      }
      if (updateData.content.length > 1000000) { // 1MB limit for content
        throw new Error('Content exceeds maximum allowed size of 1MB');
      }
    }

    const [document] = await db('hr_documents')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return document || null;
  }

  // Alias method for backward compatibility
  async updateMarkdownDocument(id: string, updateData: UpdateMarkdownDocumentData): Promise<HRDocument | null> {
    return this.updateDocument(id, updateData);
  }

  async getDocumentContent(id: string): Promise<{ content: string } | null> {
    const document = await this.findDocumentById(id);
    if (!document) {
      return null;
    }

    return {
      content: document.content
    };
  }

  async deleteDocument(id: string): Promise<boolean> {
    const deleted = await db('hr_documents').where({ id }).del();
    return deleted > 0;
  }

  async listDocuments(
    organizationId: string,
    filters: {
      folder_path?: string;
      requires_acknowledgment?: boolean;
      user_roles?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRDocument[]; total: number }> {
    let query = db('hr_documents').where({ organization_id: organizationId });

    if (filters.folder_path) {
      query = query.where({ folder_path: filters.folder_path });
    }

    if (filters.requires_acknowledgment !== undefined) {
      query = query.where({ requires_acknowledgment: filters.requires_acknowledgment });
    }

    // Filter by user roles if provided
    if (filters.user_roles && filters.user_roles.length > 0) {
      query = query.where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(access_roles) = 0');
        
        // Or documents where user has at least one matching role
        filters.user_roles!.forEach(role => {
          this.orWhereRaw('access_roles @> ?', [JSON.stringify([role])]);
        });
      });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const documents = await query.orderBy('folder_path', 'asc').orderBy('title', 'asc');

    return { 
      data: documents, 
      total 
    };
  }

  async getDocumentsWithUploaderInfo(
    organizationId: string,
    filters: {
      folder_path?: string;
      requires_acknowledgment?: boolean;
      user_roles?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_documents')
      .join('users', 'hr_documents.created_by', 'users.id')
      .where({ 'hr_documents.organization_id': organizationId })
      .select(
        'hr_documents.*',
        'users.rsi_handle as created_by_rsi_handle',
        'users.discord_username as created_by_discord_username'
      );

    if (filters.folder_path) {
      query = query.where({ 'hr_documents.folder_path': filters.folder_path });
    }

    if (filters.requires_acknowledgment !== undefined) {
      query = query.where({ 'hr_documents.requires_acknowledgment': filters.requires_acknowledgment });
    }

    // Filter by user roles if provided
    if (filters.user_roles && filters.user_roles.length > 0) {
      query = query.where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(hr_documents.access_roles) = 0');
        
        // Or documents where user has at least one matching role
        filters.user_roles!.forEach(role => {
          this.orWhereRaw('hr_documents.access_roles @> ?', [JSON.stringify([role])]);
        });
      });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_documents.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const documents = await query
      .orderBy('hr_documents.folder_path', 'asc')
      .orderBy('hr_documents.title', 'asc');

    return { 
      data: documents, 
      total 
    };
  }

  async searchDocuments(
    organizationId: string,
    searchTerm: string,
    filters: {
      user_roles?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRDocument[]; total: number }> {
    let query = db('hr_documents')
      .where({ organization_id: organizationId })
      .where(function() {
        this.where('title', 'ilike', `%${searchTerm}%`)
          .orWhere('description', 'ilike', `%${searchTerm}%`)
          // Add content search for markdown documents
          .orWhere('content', 'ilike', `%${searchTerm}%`);
      });

    // Filter by user roles if provided
    if (filters.user_roles && filters.user_roles.length > 0) {
      query = query.where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(access_roles) = 0');
        
        // Or documents where user has at least one matching role
        filters.user_roles!.forEach(role => {
          this.orWhereRaw('access_roles @> ?', [JSON.stringify([role])]);
        });
      });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const documents = await query.orderBy('title', 'asc');

    return { 
      data: documents, 
      total 
    };
  }

  async getFolderStructure(organizationId: string, userRoles?: string[]): Promise<string[]> {
    let query = db('hr_documents')
      .where({ organization_id: organizationId })
      .distinct('folder_path');

    // Filter by user roles if provided
    if (userRoles && userRoles.length > 0) {
      query = query.where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(access_roles) = 0');
        
        // Or documents where user has at least one matching role
        userRoles.forEach(role => {
          this.orWhereRaw('access_roles @> ?', [JSON.stringify([role])]);
        });
      });
    }

    const results = await query.orderBy('folder_path', 'asc');
    return results.map(result => result.folder_path);
  }

  // Acknowledgment methods
  async createAcknowledgment(
    acknowledgmentData: CreateHRDocumentAcknowledgmentData
  ): Promise<HRDocumentAcknowledgment> {
    const insertData = {
      ...acknowledgmentData,
      acknowledged_at: new Date(),
    };

    const [acknowledgment] = await db('hr_document_acknowledgments')
      .insert(insertData)
      .returning('*');

    return acknowledgment;
  }

  async findAcknowledgment(documentId: string, userId: string): Promise<HRDocumentAcknowledgment | null> {
    const acknowledgment = await db('hr_document_acknowledgments')
      .where({ document_id: documentId, user_id: userId })
      .first();
    return acknowledgment || null;
  }

  async deleteAcknowledgment(documentId: string, userId: string): Promise<boolean> {
    const deleted = await db('hr_document_acknowledgments')
      .where({ document_id: documentId, user_id: userId })
      .del();
    return deleted > 0;
  }

  async getDocumentAcknowledgments(
    documentId: string,
    filters: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_document_acknowledgments')
      .join('users', 'hr_document_acknowledgments.user_id', 'users.id')
      .where({ 'hr_document_acknowledgments.document_id': documentId })
      .select(
        'hr_document_acknowledgments.*',
        'users.rsi_handle as user_rsi_handle',
        'users.discord_username as user_discord_username'
      );

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_document_acknowledgments.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const acknowledgments = await query.orderBy('hr_document_acknowledgments.acknowledged_at', 'desc');

    return { data: acknowledgments, total };
  }

  async getDocumentAcknowledmentStatus(
    organizationId: string,
    documentId: string,
    currentUserId: string
  ): Promise<{
    document_id: string;
    user_acknowledgments: Array<{
      user_id: string;
      user_handle: string;
      acknowledged_at: string;
      ip_address?: string;
    }>;
    total_required: number;
    total_acknowledged: number;
    acknowledgment_rate: number;
    current_user_acknowledged: boolean;
    current_user_acknowledged_at?: string;
  }> {
    // Get document to verify it exists and belongs to organization
    const document = await this.findDocumentById(documentId);
    if (!document || document.organization_id !== organizationId) {
      throw new Error('Document not found');
    }

    // Get all acknowledgments for this document
    const acknowledgments = await db('hr_document_acknowledgments')
      .join('users', 'hr_document_acknowledgments.user_id', 'users.id')
      .where({ 'hr_document_acknowledgments.document_id': documentId })
      .select(
        'hr_document_acknowledgments.user_id',
        'hr_document_acknowledgments.acknowledged_at',
        'hr_document_acknowledgments.ip_address',
        'users.rsi_handle as user_handle'
      )
      .orderBy('hr_document_acknowledgments.acknowledged_at', 'desc');

    // Get total organization members who should acknowledge this document
    const requiredUsers = await db('organization_members')
      .where({ organization_id: organizationId, is_active: true })
      .count('* as count')
      .first();

    const totalRequired = parseInt(requiredUsers?.count as string) || 0;
    const totalAcknowledged = acknowledgments.length;
    const acknowledgmentRate = totalRequired > 0 ? (totalAcknowledged / totalRequired) : 0;

    // Find current user's acknowledgment
    const currentUserAcknowledgment = acknowledgments.find(ack => ack.user_id === currentUserId);

    return {
      document_id: documentId,
      user_acknowledgments: acknowledgments.map(ack => ({
        user_id: ack.user_id,
        user_handle: ack.user_handle,
        acknowledged_at: ack.acknowledged_at.toISOString(),
        ip_address: ack.ip_address,
      })),
      total_required: totalRequired,
      total_acknowledged: totalAcknowledged,
      acknowledgment_rate: acknowledgmentRate,
      current_user_acknowledged: !!currentUserAcknowledgment,
      current_user_acknowledged_at: currentUserAcknowledgment?.acknowledged_at?.toISOString(),
    };
  }

  async getDocumentsWithAcknowledmentStatus(
    organizationId: string,
    userId: string,
    filters: {
      folder_path?: string;
      requires_acknowledgment?: boolean;
      user_roles?: string[];
      acknowledgment_status?: 'acknowledged' | 'pending' | 'all';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_documents')
      .leftJoin('hr_document_acknowledgments', function() {
        this.on('hr_documents.id', '=', 'hr_document_acknowledgments.document_id')
            .andOn('hr_document_acknowledgments.user_id', '=', db.raw('?', [userId]));
      })
      .where({ 'hr_documents.organization_id': organizationId })
      .select(
        'hr_documents.*',
        'hr_document_acknowledgments.acknowledged_at as user_acknowledged_at',
        db.raw('CASE WHEN hr_document_acknowledgments.id IS NOT NULL THEN true ELSE false END as user_acknowledged')
      );

    // Apply filters
    if (filters.folder_path) {
      query = query.where({ 'hr_documents.folder_path': filters.folder_path });
    }



    if (filters.requires_acknowledgment !== undefined) {
      query = query.where({ 'hr_documents.requires_acknowledgment': filters.requires_acknowledgment });
    }

    // Filter by acknowledgment status
    if (filters.acknowledgment_status === 'acknowledged') {
      query = query.whereNotNull('hr_document_acknowledgments.id');
    } else if (filters.acknowledgment_status === 'pending') {
      query = query.where({ 'hr_documents.requires_acknowledgment': true })
                   .whereNull('hr_document_acknowledgments.id');
    }

    // Filter by user roles if provided
    if (filters.user_roles && filters.user_roles.length > 0) {
      query = query.where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(hr_documents.access_roles) = 0');
        
        // Or documents where user has at least one matching role
        filters.user_roles!.forEach(role => {
          this.orWhereRaw('hr_documents.access_roles @> ?', [JSON.stringify([role])]);
        });
      });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_documents.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const documents = await query
      .orderBy('hr_documents.folder_path', 'asc')
      .orderBy('hr_documents.title', 'asc');

    return { 
      data: documents, 
      total 
    };
  }

  async bulkAcknowledgeDocuments(
    documentIds: string[],
    userId: string,
    ipAddress?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const documentId of documentIds) {
      try {
        // Check if document exists and requires acknowledgment
        const document = await this.findDocumentById(documentId);
        if (!document) {
          results.failed++;
          results.errors.push(`Document ${documentId} not found`);
          continue;
        }

        if (!document.requires_acknowledgment) {
          results.failed++;
          results.errors.push(`Document ${documentId} does not require acknowledgment`);
          continue;
        }

        // Check if already acknowledged
        const existingAcknowledgment = await this.findAcknowledgment(documentId, userId);
        if (existingAcknowledgment) {
          results.failed++;
          results.errors.push(`Document ${documentId} already acknowledged`);
          continue;
        }

        // Create acknowledgment
        await this.createAcknowledgment({
          document_id: documentId,
          user_id: userId,
          ip_address: ipAddress,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to acknowledge document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  async getUserAcknowledgments(
    userId: string,
    organizationId: string
  ): Promise<any[]> {
    return db('hr_document_acknowledgments')
      .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
      .where({ 'hr_document_acknowledgments.user_id': userId })
      .where({ 'hr_documents.organization_id': organizationId })
      .select(
        'hr_document_acknowledgments.*',
        'hr_documents.title as document_title',
        'hr_documents.folder_path as document_folder_path'
      )
      .orderBy('hr_document_acknowledgments.acknowledged_at', 'desc');
  }

  async getPendingAcknowledgments(
    organizationId: string,
    userId: string,
    userRoles: string[]
  ): Promise<HRDocument[]> {
    // Get documents that require acknowledgment and are accessible to the user
    const accessibleDocuments = await db('hr_documents')
      .where({ organization_id: organizationId, requires_acknowledgment: true })
      .where(function() {
        // Documents with empty access_roles are accessible to all
        this.whereRaw('jsonb_array_length(access_roles) = 0');
        
        // Or documents where user has at least one matching role
        userRoles.forEach(role => {
          this.orWhereRaw('access_roles @> ?', [JSON.stringify([role])]);
        });
      });

    // Filter out documents that have already been acknowledged
    const pendingDocuments = [];
    for (const document of accessibleDocuments) {
      const acknowledgment = await this.findAcknowledgment(document.id, userId);
      if (!acknowledgment) {
        pendingDocuments.push(document);
      }
    }

    return pendingDocuments;
  }

  async getComplianceReport(organizationId: string): Promise<{
    total_documents: number;
    documents_requiring_acknowledgment: number;
    total_acknowledgments: number;
    compliance_rate: number;
    pending_acknowledgments: number;
  }> {
    const [docStats, ackStats] = await Promise.all([
      // Document statistics
      db('hr_documents')
        .where({ organization_id: organizationId })
        .select(
          db.raw('COUNT(*) as total_documents'),
          db.raw('COUNT(CASE WHEN requires_acknowledgment = true THEN 1 END) as documents_requiring_acknowledgment')
        )
        .first(),

      // Acknowledgment statistics
      db('hr_document_acknowledgments')
        .join('hr_documents', 'hr_document_acknowledgments.document_id', 'hr_documents.id')
        .where({ 'hr_documents.organization_id': organizationId })
        .count('* as total_acknowledgments')
        .first(),
    ]);

    const totalDocuments = parseInt((docStats as any)?.total_documents as string) || 0;
    const documentsRequiringAcknowledgment = parseInt((docStats as any)?.documents_requiring_acknowledgment as string) || 0;
    const totalAcknowledgments = parseInt((ackStats as any)?.total_acknowledgments as string) || 0;

    // Get organization member count for compliance calculation
    const memberCount = await db('organization_members')
      .where({ organization_id: organizationId, is_active: true })
      .count('* as count')
      .first();

    const activeMemberCount = parseInt(memberCount?.count as string) || 0;
    const expectedAcknowledgments = documentsRequiringAcknowledgment * activeMemberCount;
    const complianceRate = expectedAcknowledgments > 0 ? (totalAcknowledgments / expectedAcknowledgments) * 100 : 100;
    const pendingAcknowledgments = Math.max(0, expectedAcknowledgments - totalAcknowledgments);

    return {
      total_documents: totalDocuments,
      documents_requiring_acknowledgment: documentsRequiringAcknowledgment,
      total_acknowledgments: totalAcknowledgments,
      compliance_rate: complianceRate,
      pending_acknowledgments: pendingAcknowledgments,
    };
  }

  async getVersionHistory(documentId: string): Promise<any[]> {
    // This would require a separate document_versions table for full version history
    // For now, return the current document as the only version
    const document = await this.findDocumentById(documentId);
    if (!document) return [];

    return [
      {
        version: document.version,
        created_at: document.updated_at,
        created_by: document.created_by,
        word_count: document.word_count,
        estimated_reading_time: document.estimated_reading_time,
      },
    ];
  }
}