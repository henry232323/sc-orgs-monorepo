import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock Knex before importing anything that uses it
jest.mock('../config/database', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    whereNot: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    first: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    migrate: { latest: jest.fn() },
    destroy: jest.fn(),
  };

  const mockDb = jest.fn().mockReturnValue(mockQueryBuilder);
  Object.assign(mockDb, mockQueryBuilder);
  
  return {
    __esModule: true,
    default: mockDb,
  };
});

jest.mock('../config/logger');

// Import after mocking
import { HRApplicationModel, HRApplication, ApplicationStatus, CreateHRApplicationData, UpdateHRApplicationData } from '../models/hr_application_model';

describe('HRApplicationModel', () => {
  let applicationModel: HRApplicationModel;
  let testOrganizationId: string;
  let testUserId: string;
  let testReviewerId: string;
  let mockDb: any;

  beforeAll(() => {
    // Get the mocked database
    mockDb = require('../config/database').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    applicationModel = new HRApplicationModel();
    testOrganizationId = uuidv4();
    testUserId = uuidv4();
    testReviewerId = uuidv4();
  });

  describe('validateApplicationData', () => {
    it('should return no errors for valid application data', () => {
      const validData = {
        cover_letter: 'This is a valid cover letter',
        experience: 'Some experience',
        availability: 'Available weekends',
        custom_fields: { skill: 'pilot' }
      };

      const errors = applicationModel.validateApplicationData(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return error for cover letter that is too long', () => {
      const invalidData = {
        cover_letter: 'a'.repeat(5001), // Exceeds 5000 character limit
      };

      const errors = applicationModel.validateApplicationData(invalidData);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('cover_letter');
      expect(errors[0].message).toBe('Cover letter must be less than 5000 characters');
    });

    it('should return error for experience that is too long', () => {
      const invalidData = {
        experience: 'a'.repeat(3001), // Exceeds 3000 character limit
      };

      const errors = applicationModel.validateApplicationData(invalidData);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('experience');
      expect(errors[0].message).toBe('Experience description must be less than 3000 characters');
    });

    it('should return error for availability that is too long', () => {
      const invalidData = {
        availability: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const errors = applicationModel.validateApplicationData(invalidData);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('availability');
      expect(errors[0].message).toBe('Availability description must be less than 1000 characters');
    });

    it('should return error for custom fields that are too large', () => {
      const largeCustomFields: Record<string, string> = {};
      // Create a large object that exceeds 10KB when stringified
      for (let i = 0; i < 1000; i++) {
        largeCustomFields[`field_${i}`] = 'a'.repeat(20);
      }

      const invalidData = {
        custom_fields: largeCustomFields
      };

      const errors = applicationModel.validateApplicationData(invalidData);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('custom_fields');
      expect(errors[0].message).toBe('Custom fields data is too large (max 10KB)');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        cover_letter: 'a'.repeat(5001),
        experience: 'b'.repeat(3001),
        availability: 'c'.repeat(1001),
      };

      const errors = applicationModel.validateApplicationData(invalidData);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.field)).toContain('cover_letter');
      expect(errors.map(e => e.field)).toContain('experience');
      expect(errors.map(e => e.field)).toContain('availability');
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      const validTransitions = [
        { from: 'pending' as ApplicationStatus, to: 'under_review' as ApplicationStatus },
        { from: 'pending' as ApplicationStatus, to: 'rejected' as ApplicationStatus },
        { from: 'under_review' as ApplicationStatus, to: 'interview_scheduled' as ApplicationStatus },
        { from: 'under_review' as ApplicationStatus, to: 'approved' as ApplicationStatus },
        { from: 'under_review' as ApplicationStatus, to: 'rejected' as ApplicationStatus },
        { from: 'interview_scheduled' as ApplicationStatus, to: 'approved' as ApplicationStatus },
        { from: 'interview_scheduled' as ApplicationStatus, to: 'rejected' as ApplicationStatus },
        { from: 'interview_scheduled' as ApplicationStatus, to: 'under_review' as ApplicationStatus },
      ];

      validTransitions.forEach(({ from, to }) => {
        const result = applicationModel.validateStatusTransition(from, to);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        { from: 'pending' as ApplicationStatus, to: 'approved' as ApplicationStatus },
        { from: 'pending' as ApplicationStatus, to: 'interview_scheduled' as ApplicationStatus },
        { from: 'approved' as ApplicationStatus, to: 'rejected' as ApplicationStatus },
        { from: 'rejected' as ApplicationStatus, to: 'approved' as ApplicationStatus },
        { from: 'approved' as ApplicationStatus, to: 'pending' as ApplicationStatus },
        { from: 'rejected' as ApplicationStatus, to: 'pending' as ApplicationStatus },
      ];

      invalidTransitions.forEach(({ from, to }) => {
        const result = applicationModel.validateStatusTransition(from, to);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(`Cannot transition from ${from} to ${to}`);
      });
    });
  });

  describe('checkDuplicateApplication', () => {
    it('should return false when no duplicate application exists', async () => {
      mockDb.first.mockResolvedValue(null);

      const isDuplicate = await applicationModel.checkDuplicateApplication(
        testOrganizationId,
        testUserId
      );
      expect(isDuplicate).toBe(false);
    });

    it('should return true when duplicate application exists', async () => {
      mockDb.first.mockResolvedValue({ id: uuidv4() });

      const isDuplicate = await applicationModel.checkDuplicateApplication(
        testOrganizationId,
        testUserId
      );
      expect(isDuplicate).toBe(true);
    });

    it('should return false for same user in different organization', async () => {
      mockDb.first.mockResolvedValue(null);

      const isDuplicate = await applicationModel.checkDuplicateApplication(
        testOrganizationId,
        testUserId
      );
      expect(isDuplicate).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new application with valid data', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: {
          cover_letter: 'I am interested in joining your organization',
          experience: '5 years of Star Citizen experience',
          availability: 'Weekends and evenings',
          custom_fields: { preferred_role: 'pilot' }
        }
      };

      const mockApplication = {
        id: uuidv4(),
        ...applicationData,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock no duplicate check
      mockDb.first.mockResolvedValue(null);
      // Mock successful creation
      mockDb.returning.mockResolvedValue([mockApplication]);

      const application = await applicationModel.create(applicationData);

      expect(application).toBeDefined();
      expect(application.organization_id).toBe(testOrganizationId);
      expect(application.user_id).toBe(testUserId);
      expect(application.status).toBe('pending');
      expect(application.application_data.cover_letter).toBe('I am interested in joining your organization');
    });

    it('should throw error for invalid application data', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: {
          cover_letter: 'a'.repeat(5001), // Too long
        }
      };

      await expect(applicationModel.create(applicationData)).rejects.toThrow(
        'Validation failed: Cover letter must be less than 5000 characters'
      );
    });

    it('should throw error for duplicate application', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };

      // Create first application
      await applicationModel.create(applicationData);

      // Try to create duplicate
      await expect(applicationModel.create(applicationData)).rejects.toThrow(
        'User already has an active application for this organization'
      );
    });

    it('should log initial status change', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };

      const application = await applicationModel.create(applicationData);

      // Check that status history was created
      const history = await applicationModel.getStatusHistory(application.id);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('pending');
      expect(history[0].changed_by).toBe(testUserId);
      expect(history[0].notes).toBe('Application submitted');
    });
  });

  describe('findById', () => {
    it('should return application when it exists', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };

      const createdApplication = await applicationModel.create(applicationData);
      const foundApplication = await applicationModel.findById(createdApplication.id);

      expect(foundApplication).toBeDefined();
      expect(foundApplication!.id).toBe(createdApplication.id);
      expect(foundApplication!.organization_id).toBe(testOrganizationId);
      expect(foundApplication!.user_id).toBe(testUserId);
    });

    it('should return null when application does not exist', async () => {
      const nonExistentId = uuidv4();
      const application = await applicationModel.findById(nonExistentId);
      expect(application).toBeNull();
    });
  });

  describe('findByOrganizationAndUser', () => {
    it('should return application when it exists', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };

      await applicationModel.create(applicationData);
      const foundApplication = await applicationModel.findByOrganizationAndUser(
        testOrganizationId,
        testUserId
      );

      expect(foundApplication).toBeDefined();
      expect(foundApplication!.organization_id).toBe(testOrganizationId);
      expect(foundApplication!.user_id).toBe(testUserId);
    });

    it('should return null when application does not exist', async () => {
      const application = await applicationModel.findByOrganizationAndUser(
        testOrganizationId,
        testUserId
      );
      expect(application).toBeNull();
    });
  });

  describe('update', () => {
    let testApplication: HRApplication;

    beforeEach(async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };
      testApplication = await applicationModel.create(applicationData);
    });

    it('should update application with valid data', async () => {
      const updateData: UpdateHRApplicationData = {
        status: 'under_review',
        reviewer_id: testReviewerId,
        review_notes: 'Application looks promising'
      };

      const updatedApplication = await applicationModel.update(testApplication.id, updateData);

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication!.status).toBe('under_review');
      expect(updatedApplication!.reviewer_id).toBe(testReviewerId);
      expect(updatedApplication!.review_notes).toBe('Application looks promising');
    });

    it('should throw error for invalid status transition', async () => {
      const updateData: UpdateHRApplicationData = {
        status: 'approved', // Invalid transition from pending to approved
        reviewer_id: testReviewerId
      };

      await expect(applicationModel.update(testApplication.id, updateData)).rejects.toThrow(
        'Invalid status transition: Cannot transition from pending to approved'
      );
    });

    it('should throw error when reviewer_id is missing for status change', async () => {
      const updateData: UpdateHRApplicationData = {
        status: 'under_review'
        // Missing reviewer_id
      };

      await expect(applicationModel.update(testApplication.id, updateData)).rejects.toThrow(
        'Reviewer ID is required for status changes'
      );
    });

    it('should throw error when rejection reason is missing for rejected status', async () => {
      // First move to under_review
      await applicationModel.update(testApplication.id, {
        status: 'under_review',
        reviewer_id: testReviewerId
      });

      const updateData: UpdateHRApplicationData = {
        status: 'rejected',
        reviewer_id: testReviewerId
        // Missing rejection_reason
      };

      await expect(applicationModel.update(testApplication.id, updateData)).rejects.toThrow(
        'Rejection reason is required when rejecting an application'
      );
    });

    it('should log status change when status is updated', async () => {
      const updateData: UpdateHRApplicationData = {
        status: 'under_review',
        reviewer_id: testReviewerId,
        review_notes: 'Moving to review'
      };

      await applicationModel.update(testApplication.id, updateData);

      const history = await applicationModel.getStatusHistory(testApplication.id);
      expect(history).toHaveLength(2); // Initial + update
      expect(history[0].status).toBe('under_review');
      expect(history[0].changed_by).toBe(testReviewerId);
      expect(history[0].notes).toBe('Moving to review');
    });

    it('should throw error for non-existent application', async () => {
      const nonExistentId = uuidv4();
      const updateData: UpdateHRApplicationData = {
        review_notes: 'Some notes'
      };

      await expect(applicationModel.update(nonExistentId, updateData)).rejects.toThrow(
        'Application not found'
      );
    });
  });

  describe('updateStatus', () => {
    let testApplication: HRApplication;

    beforeEach(async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };
      testApplication = await applicationModel.create(applicationData);
    });

    it('should update status with valid transition', async () => {
      const updatedApplication = await applicationModel.updateStatus(
        testApplication.id,
        'under_review',
        testReviewerId,
        'Starting review process'
      );

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication!.status).toBe('under_review');
      expect(updatedApplication!.reviewer_id).toBe(testReviewerId);
      expect(updatedApplication!.review_notes).toBe('Starting review process');
    });

    it('should update status with rejection reason', async () => {
      // First move to under_review
      await applicationModel.updateStatus(
        testApplication.id,
        'under_review',
        testReviewerId
      );

      const updatedApplication = await applicationModel.updateStatus(
        testApplication.id,
        'rejected',
        testReviewerId,
        'Application rejected',
        'Insufficient experience'
      );

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication!.status).toBe('rejected');
      expect(updatedApplication!.rejection_reason).toBe('Insufficient experience');
    });
  });

  describe('delete', () => {
    it('should delete existing application', async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };

      const application = await applicationModel.create(applicationData);
      const deleted = await applicationModel.delete(application.id);

      expect(deleted).toBe(true);

      // Verify application is deleted
      const foundApplication = await applicationModel.findById(application.id);
      expect(foundApplication).toBeNull();
    });

    it('should return false for non-existent application', async () => {
      const nonExistentId = uuidv4();
      const deleted = await applicationModel.delete(nonExistentId);
      expect(deleted).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test applications with different statuses
      const applications = [
        { status: 'pending', reviewer_id: null },
        { status: 'under_review', reviewer_id: testReviewerId },
        { status: 'approved', reviewer_id: testReviewerId },
        { status: 'rejected', reviewer_id: testReviewerId },
      ];

      for (const [index, appData] of applications.entries()) {
        const application = await applicationModel.create({
          organization_id: testOrganizationId,
          user_id: `${testUserId}_${index}`,
          application_data: { cover_letter: `Application ${index}` }
        });

        if (appData.status !== 'pending') {
          await applicationModel.updateStatus(
            application.id,
            appData.status as ApplicationStatus,
            appData.reviewer_id!,
            `Status change to ${appData.status}`,
            appData.status === 'rejected' ? 'Test rejection' : undefined
          );
        }
      }
    });

    it('should list all applications for organization', async () => {
      const result = await applicationModel.list(testOrganizationId);

      expect(result.data).toHaveLength(4);
      expect(result.total).toBe(4);
      expect(result.data[0].organization_id).toBe(testOrganizationId);
    });

    it('should filter applications by status', async () => {
      const result = await applicationModel.list(testOrganizationId, {
        status: 'pending'
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('pending');
    });

    it('should filter applications by reviewer', async () => {
      const result = await applicationModel.list(testOrganizationId, {
        reviewer_id: testReviewerId
      });

      expect(result.data).toHaveLength(3); // under_review, approved, rejected
      expect(result.total).toBe(3);
      result.data.forEach(app => {
        expect(app.reviewer_id).toBe(testReviewerId);
      });
    });

    it('should apply pagination', async () => {
      const result = await applicationModel.list(testOrganizationId, {
        limit: 2,
        offset: 1
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
    });

    it('should return empty result for non-existent organization', async () => {
      const nonExistentOrgId = uuidv4();
      const result = await applicationModel.list(nonExistentOrgId);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('generateInviteCode', () => {
    let testApplication: HRApplication;

    beforeEach(async () => {
      const applicationData: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: testUserId,
        application_data: { cover_letter: 'Test application' }
      };
      testApplication = await applicationModel.create(applicationData);
    });

    it('should generate invite code and update application', async () => {
      const inviteCode = await applicationModel.generateInviteCode(testApplication.id);

      expect(inviteCode).toBeDefined();
      expect(inviteCode).toMatch(/^HR-[A-Z0-9]{8}$/);

      // Verify application was updated
      const updatedApplication = await applicationModel.findById(testApplication.id);
      expect(updatedApplication!.invite_code).toBe(inviteCode);
    });

    it('should generate unique invite codes', async () => {
      const inviteCode1 = await applicationModel.generateInviteCode(testApplication.id);
      
      // Create another application
      const applicationData2: CreateHRApplicationData = {
        organization_id: testOrganizationId,
        user_id: `${testUserId}_2`,
        application_data: { cover_letter: 'Test application 2' }
      };
      const testApplication2 = await applicationModel.create(applicationData2);
      
      const inviteCode2 = await applicationModel.generateInviteCode(testApplication2.id);

      expect(inviteCode1).not.toBe(inviteCode2);
    });
  });

  describe('bulkUpdateStatus', () => {
    let testApplicationIds: string[];

    beforeEach(async () => {
      testApplicationIds = [];
      
      // Create multiple test applications
      for (let i = 0; i < 3; i++) {
        const application = await applicationModel.create({
          organization_id: testOrganizationId,
          user_id: `${testUserId}_${i}`,
          application_data: { cover_letter: `Application ${i}` }
        });
        testApplicationIds.push(application.id);
      }
    });

    it('should update multiple applications', async () => {
      const updatedCount = await applicationModel.bulkUpdateStatus(
        testApplicationIds,
        'under_review',
        testReviewerId,
        'Bulk review started'
      );

      expect(updatedCount).toBe(3);

      // Verify all applications were updated
      for (const id of testApplicationIds) {
        const application = await applicationModel.findById(id);
        expect(application!.status).toBe('under_review');
        expect(application!.reviewer_id).toBe(testReviewerId);
        expect(application!.review_notes).toBe('Bulk review started');
      }
    });

    it('should log status changes for all applications', async () => {
      await applicationModel.bulkUpdateStatus(
        testApplicationIds,
        'under_review',
        testReviewerId,
        'Bulk review started'
      );

      // Verify status history was created for all applications
      for (const id of testApplicationIds) {
        const history = await applicationModel.getStatusHistory(id);
        expect(history).toHaveLength(2); // Initial + bulk update
        expect(history[0].status).toBe('under_review');
        expect(history[0].changed_by).toBe(testReviewerId);
        expect(history[0].notes).toBe('Bulk status change to under_review');
      }
    });

    it('should return 0 for empty application list', async () => {
      const updatedCount = await applicationModel.bulkUpdateStatus(
        [],
        'under_review',
        testReviewerId
      );

      expect(updatedCount).toBe(0);
    });
  });

  describe('getApplicationStats', () => {
    beforeEach(async () => {
      // Create applications with different statuses
      const statuses: ApplicationStatus[] = ['pending', 'under_review', 'approved', 'rejected'];
      
      for (const [index, status] of statuses.entries()) {
        const application = await applicationModel.create({
          organization_id: testOrganizationId,
          user_id: `${testUserId}_${index}`,
          application_data: { cover_letter: `Application ${index}` }
        });

        if (status !== 'pending') {
          await applicationModel.updateStatus(
            application.id,
            status,
            testReviewerId,
            `Status change to ${status}`,
            status === 'rejected' ? 'Test rejection' : undefined
          );
        }
      }

      // Create an old application (more than 30 days ago)
      const oldApplication = await applicationModel.create({
        organization_id: testOrganizationId,
        user_id: `${testUserId}_old`,
        application_data: { cover_letter: 'Old application' }
      });

      // Mock the old application creation
      mockDb.returning.mockResolvedValue([{
        ...oldApplication,
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
      }]);
    });

    it('should return correct application statistics', async () => {
      const stats = await applicationModel.getApplicationStats(testOrganizationId);

      expect(stats.total).toBe(5); // 4 recent + 1 old
      expect(stats.by_status.pending).toBe(1);
      expect(stats.by_status.under_review).toBe(1);
      expect(stats.by_status.approved).toBe(1);
      expect(stats.by_status.rejected).toBe(1);
      expect(stats.recent_count).toBe(4); // Only recent applications
    });

    it('should return zero stats for non-existent organization', async () => {
      const nonExistentOrgId = uuidv4();
      const stats = await applicationModel.getApplicationStats(nonExistentOrgId);

      expect(stats.total).toBe(0);
      expect(stats.by_status.pending).toBe(0);
      expect(stats.by_status.under_review).toBe(0);
      expect(stats.by_status.approved).toBe(0);
      expect(stats.by_status.rejected).toBe(0);
      expect(stats.recent_count).toBe(0);
    });
  });

  describe('getValidStatusTransitions', () => {
    it('should return correct transitions for each status', () => {
      expect(applicationModel.getValidStatusTransitions('pending')).toEqual(['under_review', 'rejected']);
      expect(applicationModel.getValidStatusTransitions('under_review')).toEqual(['interview_scheduled', 'approved', 'rejected']);
      expect(applicationModel.getValidStatusTransitions('interview_scheduled')).toEqual(['approved', 'rejected', 'under_review']);
      expect(applicationModel.getValidStatusTransitions('approved')).toEqual([]);
      expect(applicationModel.getValidStatusTransitions('rejected')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('should correctly identify terminal statuses', () => {
      expect(applicationModel.isTerminalStatus('pending')).toBe(false);
      expect(applicationModel.isTerminalStatus('under_review')).toBe(false);
      expect(applicationModel.isTerminalStatus('interview_scheduled')).toBe(false);
      expect(applicationModel.isTerminalStatus('approved')).toBe(true);
      expect(applicationModel.isTerminalStatus('rejected')).toBe(true);
    });
  });

  describe('getApplicationsByStatus', () => {
    beforeEach(async () => {
      // Create applications with different statuses and dates
      const applications = [
        { status: 'pending', daysAgo: 5 },
        { status: 'pending', daysAgo: 15 },
        { status: 'approved', daysAgo: 10 },
        { status: 'rejected', daysAgo: 20 },
      ];

      for (const [index, appData] of applications.entries()) {
        const application = await applicationModel.create({
          organization_id: testOrganizationId,
          user_id: `${testUserId}_${index}`,
          application_data: { cover_letter: `Application ${index}` }
        });

        if (appData.status !== 'pending') {
          await applicationModel.updateStatus(
            application.id,
            appData.status as ApplicationStatus,
            testReviewerId,
            `Status change to ${appData.status}`,
            appData.status === 'rejected' ? 'Test rejection' : undefined
          );
        }

        // Mock application with different dates
        const date = new Date();
        date.setDate(date.getDate() - appData.daysAgo);
        mockDb.returning.mockResolvedValue([{
          ...application,
          created_at: date
        }]);
      }
    });

    it('should return applications by status', async () => {
      const pendingApps = await applicationModel.getApplicationsByStatus(
        testOrganizationId,
        'pending'
      );

      expect(pendingApps).toHaveLength(2);
      pendingApps.forEach(app => {
        expect(app.status).toBe('pending');
      });
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 12);
      
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() - 8);

      const apps = await applicationModel.getApplicationsByStatus(
        testOrganizationId,
        'approved',
        dateFrom,
        dateTo
      );

      expect(apps).toHaveLength(1);
      expect(apps[0].status).toBe('approved');
    });

    it('should return empty array for non-matching criteria', async () => {
      const apps = await applicationModel.getApplicationsByStatus(
        testOrganizationId,
        'interview_scheduled'
      );

      expect(apps).toHaveLength(0);
    });
  });
});