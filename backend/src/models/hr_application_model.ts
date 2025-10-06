import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface HRApplication {
  id: string;
  organization_id: string;
  user_id: string;
  status: 'pending' | 'under_review' | 'interview_scheduled' | 'approved' | 'rejected';
  application_data: {
    cover_letter?: string;
    experience?: string;
    availability?: string;
    custom_fields?: Record<string, any>;
  };
  reviewer_id?: string;
  review_notes?: string;
  rejection_reason?: string;
  invite_code?: string;
  created_at: Date;
  updated_at: Date;
}

export type ApplicationStatus = HRApplication['status'];

export interface ApplicationValidationError {
  field: string;
  message: string;
}

export interface StatusTransitionValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CreateHRApplicationData {
  organization_id: string;
  user_id: string;
  application_data: HRApplication['application_data'];
}

export interface UpdateHRApplicationData {
  status?: HRApplication['status'];
  reviewer_id?: string;
  review_notes?: string;
  rejection_reason?: string;
  invite_code?: string;
}

export interface HRApplicationStatusHistory {
  id: string;
  application_id: string;
  status: string;
  changed_by: string;
  notes?: string;
  created_at: Date;
}

export class HRApplicationModel {
  // Valid status transitions
  private static readonly STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    pending: ['under_review', 'rejected'],
    under_review: ['interview_scheduled', 'approved', 'rejected'],
    interview_scheduled: ['approved', 'rejected', 'under_review'],
    approved: [], // Terminal state
    rejected: [], // Terminal state
  };

  /**
   * Validates application data before creation or update
   */
  validateApplicationData(data: CreateHRApplicationData['application_data']): ApplicationValidationError[] {
    const errors: ApplicationValidationError[] = [];

    // Validate cover letter if provided
    if (data.cover_letter && data.cover_letter.length > 5000) {
      errors.push({
        field: 'cover_letter',
        message: 'Cover letter must be less than 5000 characters'
      });
    }

    // Validate experience if provided
    if (data.experience && data.experience.length > 3000) {
      errors.push({
        field: 'experience',
        message: 'Experience description must be less than 3000 characters'
      });
    }

    // Validate availability if provided
    if (data.availability && data.availability.length > 1000) {
      errors.push({
        field: 'availability',
        message: 'Availability description must be less than 1000 characters'
      });
    }

    // Validate custom fields
    if (data.custom_fields) {
      const customFieldsStr = JSON.stringify(data.custom_fields);
      if (customFieldsStr.length > 10000) {
        errors.push({
          field: 'custom_fields',
          message: 'Custom fields data is too large (max 10KB)'
        });
      }
    }

    return errors;
  }

  /**
   * Validates status transitions
   */
  validateStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): StatusTransitionValidationResult {
    const allowedTransitions = HRApplicationModel.STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        isValid: false,
        errors: [`Cannot transition from ${currentStatus} to ${newStatus}`]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Checks if an application already exists for a user in an organization
   */
  async checkDuplicateApplication(organizationId: string, userId: string): Promise<boolean> {
    const existing = await db('hr_applications')
      .where({ organization_id: organizationId, user_id: userId })
      .first();
    
    return !!existing;
  }

  async create(applicationData: CreateHRApplicationData): Promise<HRApplication> {
    // Validate application data
    const validationErrors = this.validateApplicationData(applicationData.application_data);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicate applications
    const isDuplicate = await this.checkDuplicateApplication(
      applicationData.organization_id,
      applicationData.user_id
    );
    if (isDuplicate) {
      throw new Error('User already has an active application for this organization');
    }

    const insertData = {
      ...applicationData,
      status: 'pending' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [application] = await db('hr_applications')
      .insert(insertData)
      .returning('*');

    // Log initial status
    await this.logStatusChange(application.id, 'pending', applicationData.user_id, 'Application submitted');

    return application;
  }

  async findById(id: string): Promise<HRApplication | null> {
    const application = await db('hr_applications').where({ id }).first();
    return application || null;
  }

  async findByOrganizationAndUser(organizationId: string, userId: string): Promise<HRApplication | null> {
    const application = await db('hr_applications')
      .where({ organization_id: organizationId, user_id: userId })
      .first();
    return application || null;
  }

  async update(id: string, updateData: UpdateHRApplicationData): Promise<HRApplication | null> {
    const currentApplication = await this.findById(id);
    if (!currentApplication) {
      throw new Error('Application not found');
    }

    // Validate status transition if status is being updated
    if (updateData.status && updateData.status !== currentApplication.status) {
      const transitionValidation = this.validateStatusTransition(
        currentApplication.status,
        updateData.status
      );
      
      if (!transitionValidation.isValid) {
        throw new Error(`Invalid status transition: ${transitionValidation.errors.join(', ')}`);
      }

      // Require reviewer_id for status changes
      if (!updateData.reviewer_id) {
        throw new Error('Reviewer ID is required for status changes');
      }

      // Require rejection reason for rejected status
      if (updateData.status === 'rejected' && !updateData.rejection_reason) {
        throw new Error('Rejection reason is required when rejecting an application');
      }
    }

    const [application] = await db('hr_applications')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    // Log status change if status was updated
    if (updateData.status && updateData.status !== currentApplication.status) {
      await this.logStatusChange(
        id,
        updateData.status,
        updateData.reviewer_id!,
        updateData.review_notes || `Status changed to ${updateData.status}`
      );
    }

    return application || null;
  }

  /**
   * Updates application status with validation
   */
  async updateStatus(
    id: string,
    newStatus: ApplicationStatus,
    reviewerId: string,
    notes?: string,
    rejectionReason?: string
  ): Promise<HRApplication | null> {
    const updateData: UpdateHRApplicationData = {
      status: newStatus,
      reviewer_id: reviewerId,
      review_notes: notes,
    };

    if (newStatus === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    return this.update(id, updateData);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('hr_applications').where({ id }).del();
    return deleted > 0;
  }

  async list(
    organizationId: string,
    filters: {
      status?: HRApplication['status'];
      reviewer_id?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRApplication[]; total: number }> {
    let query = db('hr_applications').where({ organization_id: organizationId });

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.reviewer_id) {
      query = query.where({ reviewer_id: filters.reviewer_id });
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

    const applications = await query.orderBy('created_at', 'desc');

    return { data: applications, total };
  }

  async logStatusChange(
    applicationId: string,
    status: string,
    changedBy: string,
    notes?: string
  ): Promise<HRApplicationStatusHistory> {
    const [statusHistory] = await db('hr_application_status_history')
      .insert({
        application_id: applicationId,
        status,
        changed_by: changedBy,
        notes,
        created_at: new Date(),
      })
      .returning('*');

    return statusHistory;
  }

  async getStatusHistory(applicationId: string): Promise<HRApplicationStatusHistory[]> {
    return db('hr_application_status_history')
      .where({ application_id: applicationId })
      .orderBy('created_at', 'desc');
  }

  async generateInviteCode(applicationId: string): Promise<string> {
    const inviteCode = `HR-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    await this.update(applicationId, { invite_code: inviteCode });
    
    return inviteCode;
  }

  async bulkUpdateStatus(
    applicationIds: string[],
    status: HRApplication['status'],
    reviewerId: string,
    notes?: string
  ): Promise<number> {
    const updated = await db('hr_applications')
      .whereIn('id', applicationIds)
      .update({
        status,
        reviewer_id: reviewerId,
        review_notes: notes,
        updated_at: new Date(),
      });

    // Log status changes for all applications
    const statusHistoryPromises = applicationIds.map(id =>
      this.logStatusChange(id, status, reviewerId, notes || `Bulk status change to ${status}`)
    );
    await Promise.all(statusHistoryPromises);

    return updated;
  }

  async getApplicationsWithUserInfo(
    organizationId: string,
    filters: {
      status?: HRApplication['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_applications')
      .join('users', 'hr_applications.user_id', 'users.id')
      .leftJoin('users as reviewers', 'hr_applications.reviewer_id', 'reviewers.id')
      .where({ 'hr_applications.organization_id': organizationId })
      .select(
        'hr_applications.*',
        'users.rsi_handle as applicant_rsi_handle',
        'users.discord_username as applicant_discord_username',
        'reviewers.rsi_handle as reviewer_rsi_handle'
      );

    if (filters.status) {
      query = query.where({ 'hr_applications.status': filters.status });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_applications.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const applications = await query.orderBy('hr_applications.created_at', 'desc');

    return { data: applications, total };
  }

  /**
   * Gets all valid status transitions for a given status
   */
  getValidStatusTransitions(currentStatus: ApplicationStatus): ApplicationStatus[] {
    return HRApplicationModel.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Checks if a status is terminal (no further transitions allowed)
   */
  isTerminalStatus(status: ApplicationStatus): boolean {
    return HRApplicationModel.STATUS_TRANSITIONS[status].length === 0;
  }

  /**
   * Gets applications by status with optional date filtering
   */
  async getApplicationsByStatus(
    organizationId: string,
    status: ApplicationStatus,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<HRApplication[]> {
    let query = db('hr_applications')
      .where({ organization_id: organizationId, status });

    if (dateFrom) {
      query = query.where('created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('created_at', '<=', dateTo);
    }

    return query.orderBy('created_at', 'desc');
  }

  /**
   * Gets application statistics for an organization
   */
  async getApplicationStats(organizationId: string): Promise<{
    total: number;
    by_status: Record<ApplicationStatus, number>;
    recent_count: number; // Last 30 days
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total count
    const totalResult = await db('hr_applications')
      .where({ organization_id: organizationId })
      .count('* as count')
      .first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Get count by status
    const statusCounts = await db('hr_applications')
      .where({ organization_id: organizationId })
      .select('status')
      .count('* as count')
      .groupBy('status');

    const by_status: Record<ApplicationStatus, number> = {
      pending: 0,
      under_review: 0,
      interview_scheduled: 0,
      approved: 0,
      rejected: 0,
    };

    statusCounts.forEach(row => {
      by_status[row.status as ApplicationStatus] = parseInt(row.count as string);
    });

    // Get recent count
    const recentResult = await db('hr_applications')
      .where({ organization_id: organizationId })
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as count')
      .first();
    const recent_count = parseInt(recentResult?.count as string) || 0;

    return {
      total,
      by_status,
      recent_count,
    };
  }
}