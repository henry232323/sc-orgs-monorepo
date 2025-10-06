import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { HRApplicationController } from '../controllers/hr_application_controller';
import { HRApplicationModel } from '../models/hr_application_model';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_application_model');
jest.mock('../models/organization_model');
jest.mock('../config/logger');

const MockedHRApplicationModel = HRApplicationModel as jest.MockedClass<typeof HRApplicationModel>;

describe('HRApplicationController', () => {
  let app: express.Application;
  let controller: HRApplicationController;
  let mockApplicationModel: jest.Mocked<HRApplicationModel>;
  
  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testApplicationId = uuidv4();

  const mockOrganization: any = {
    id: testOrganizationId,
    rsi_org_id: 'TEST_ORG',
    name: 'Test Organization',
    owner_id: testUserId,
    is_registered: true,
    languages: [],
    total_upvotes: 0,
    total_members: 1
  };

  const mockUser = {
    id: testUserId,
    rsi_handle: 'testuser'
  };

  const mockApplication = {
    id: testApplicationId,
    organization_id: testOrganizationId,
    user_id: testUserId,
    status: 'pending' as const,
    application_data: {
      cover_letter: 'Test cover letter'
    },
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware
    app.use((req, res, next) => {
      req.org = mockOrganization;
      req.user = mockUser;
      next();
    });

    controller = new HRApplicationController();

    // Setup routes
    app.post('/api/organizations/:rsi_org_id/applications', controller.submitApplication.bind(controller));
    app.get('/api/organizations/:rsi_org_id/applications', controller.listApplications.bind(controller));
    app.get('/api/organizations/:rsi_org_id/applications/:applicationId', controller.getApplication.bind(controller));
    app.put('/api/organizations/:rsi_org_id/applications/:applicationId/status', controller.updateApplicationStatus.bind(controller));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApplicationModel = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
      getStatusHistory: jest.fn(),
    } as any;

    MockedHRApplicationModel.mockImplementation(() => mockApplicationModel);
  });

  describe('POST /api/organizations/:rsi_org_id/applications', () => {
    it('should submit application successfully', async () => {
      mockApplicationModel.create.mockResolvedValue(mockApplication as any);

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/applications`)
        .send({
          application_data: {
            cover_letter: 'Test cover letter'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockApplication);
    });

    it('should return 400 when application_data is missing', async () => {
      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/applications`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Application data is required');
    });

    it('should return 400 for validation errors', async () => {
      mockApplicationModel.create.mockRejectedValue(
        new Error('Validation failed: Cover letter must be less than 5000 characters')
      );

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/applications`)
        .send({
          application_data: {
            cover_letter: 'a'.repeat(5001)
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed: Cover letter must be less than 5000 characters');
    });
  });

  describe('GET /api/organizations/:rsi_org_id/applications', () => {
    it('should list applications successfully', async () => {
      const mockApplicationsList = {
        data: [mockApplication],
        total: 1
      };

      mockApplicationModel.list.mockResolvedValue(mockApplicationsList as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/applications`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockApplicationsList.data);
      expect(response.body.total).toBe(1);
    });

    it('should apply filters and pagination', async () => {
      const mockApplicationsList = {
        data: [mockApplication],
        total: 1
      };

      mockApplicationModel.list.mockResolvedValue(mockApplicationsList as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/applications`)
        .query({
          status: 'pending',
          page: 2,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(mockApplicationModel.list).toHaveBeenCalledWith(testOrganizationId, {
        status: 'pending',
        reviewer_id: undefined,
        limit: 10,
        offset: 10
      });
    });
  });

  describe('GET /api/organizations/:rsi_org_id/applications/:applicationId', () => {
    it('should return application for organization member', async () => {
      mockApplicationModel.findById.mockResolvedValue(mockApplication as any);
      mockApplicationModel.getStatusHistory.mockResolvedValue([]);

      // Mock organization access check
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel: any = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(true)
      };
      (OrganizationModel as any).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testApplicationId);
    });

    it('should return 404 for non-existent application', async () => {
      mockApplicationModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Application not found');
    });
  });

  describe('PUT /api/organizations/:rsi_org_id/applications/:applicationId/status', () => {
    it('should update application status successfully', async () => {
      const updatedApplication = {
        ...mockApplication,
        status: 'under_review' as const,
        reviewer_id: testUserId
      };

      mockApplicationModel.findById.mockResolvedValue(mockApplication as any);
      mockApplicationModel.updateStatus.mockResolvedValue(updatedApplication as any);

      // Mock organization access check
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel: any = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(true)
      };
      (OrganizationModel as any).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}/status`)
        .send({
          status: 'under_review',
          notes: 'Application looks good'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('under_review');
    });

    it('should return 400 when status is missing', async () => {
      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}/status`)
        .send({
          notes: 'Some notes'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 404 for non-existent application', async () => {
      mockApplicationModel.findById.mockResolvedValue(null);

      // Mock organization access check
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel: any = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(true)
      };
      (OrganizationModel as any).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}/status`)
        .send({
          status: 'under_review'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Application not found');
    });

    it('should return 403 for insufficient permissions', async () => {
      // Mock organization access check to return false
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel: any = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(false)
      };
      (OrganizationModel as any).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}/status`)
        .send({
          status: 'under_review'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to update application status');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Create app without user middleware
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use((req, res, next) => {
        req.org = mockOrganization;
        // No req.user set
        next();
      });
      unauthenticatedApp.post('/applications', controller.submitApplication.bind(controller));

      const response = await request(unauthenticatedApp)
        .post('/applications')
        .send({
          application_data: {
            cover_letter: 'Test'
          }
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockApplicationModel.list.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/applications`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to list applications');
    });

    it('should handle unexpected errors in status update', async () => {
      mockApplicationModel.findById.mockResolvedValue(mockApplication as any);
      mockApplicationModel.updateStatus.mockRejectedValue(new Error('Unexpected error'));

      // Mock organization access check
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel: any = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(true)
      };
      (OrganizationModel as any).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/applications/${testApplicationId}/status`)
        .send({
          status: 'under_review'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update application status');
    });
  });
});