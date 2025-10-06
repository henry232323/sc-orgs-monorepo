import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { HROnboardingController } from '../controllers/hr_onboarding_controller';
import { HROnboardingModel } from '../models/hr_onboarding_model';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_onboarding_model');
jest.mock('../config/logger');

const MockedHROnboardingModel = HROnboardingModel as jest.MockedClass<typeof HROnboardingModel>;

describe('HROnboardingController', () => {
  let app: express.Application;
  let controller: HROnboardingController;
  let mockOnboardingModel: jest.Mocked<HROnboardingModel>;
  
  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testTemplateId = uuidv4();
  const testProgressId = uuidv4();

  const sampleTasks = [
    {
      id: 'task-1',
      title: 'Complete Profile',
      description: 'Fill out your complete profile information',
      required: true,
      estimated_hours: 1,
      order_index: 1,
    },
    {
      id: 'task-2',
      title: 'Read Handbook',
      description: 'Review the organization handbook',
      required: true,
      estimated_hours: 2,
      order_index: 2,
    },
  ];

  const mockTemplate = {
    id: testTemplateId,
    organization_id: testOrganizationId,
    role_name: 'Pilot',
    tasks: sampleTasks,
    estimated_duration_days: 30,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockProgress = {
    id: testProgressId,
    organization_id: testOrganizationId,
    user_id: testUserId,
    template_id: testTemplateId,
    status: 'not_started' as const,
    completed_tasks: [],
    completion_percentage: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUser = {
    id: testUserId,
    rsi_handle: 'testuser',
  };

  const mockOrganization = {
    id: testOrganizationId,
    rsi_org_id: 'TEST_ORG',
    name: 'Test Organization',
    owner_id: testUserId,
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware
    app.use((req, res, next) => {
      req.user = mockUser;
      req.params.id = testOrganizationId;
      next();
    });

    controller = new HROnboardingController();

    // Setup routes
    app.get('/api/organizations/:id/onboarding/templates', controller.getTemplates.bind(controller));
    app.post('/api/organizations/:id/onboarding/templates', controller.createTemplate.bind(controller));
    app.get('/api/organizations/:id/onboarding/templates/:templateId', controller.getTemplate.bind(controller));
    app.put('/api/organizations/:id/onboarding/templates/:templateId', controller.updateTemplate.bind(controller));
    app.delete('/api/organizations/:id/onboarding/templates/:templateId', controller.deleteTemplate.bind(controller));
    app.get('/api/organizations/:id/onboarding/progress/:userId', controller.getProgress.bind(controller));
    app.put('/api/organizations/:id/onboarding/progress/:userId', controller.updateProgress.bind(controller));
    app.post('/api/organizations/:id/onboarding/progress', controller.createProgress.bind(controller));
    app.get('/api/organizations/:id/onboarding/progress', controller.getAllProgress.bind(controller));
    app.post('/api/organizations/:id/onboarding/tasks/:taskId/complete', controller.completeTask.bind(controller));
    app.get('/api/organizations/:id/onboarding/analytics', controller.getAnalytics.bind(controller));
    app.get('/api/organizations/:id/onboarding/overdue', controller.getOverdueProgress.bind(controller));
    app.post('/api/organizations/:id/onboarding/mark-overdue', controller.markOverdueProgress.bind(controller));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnboardingModel = {
      createTemplate: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplateByRoleAndOrganization: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      listTemplates: jest.fn(),
      createProgress: jest.fn(),
      findProgressById: jest.fn(),
      findProgressByUserAndOrganization: jest.fn(),
      updateProgress: jest.fn(),
      listProgress: jest.fn(),
      getProgressWithUserInfo: jest.fn(),
      completeTask: jest.fn(),
      validateTaskCompletion: jest.fn(),
      isOnboardingComplete: jest.fn(),
      getEstimatedCompletionDate: jest.fn(),
      getRequiredTasksRemaining: jest.fn(),
      getOnboardingStatistics: jest.fn(),
      getOverdueProgress: jest.fn(),
      markOverdueProgress: jest.fn(),
    } as any;

    // Reset the mock implementation
    MockedHROnboardingModel.mockClear();
    MockedHROnboardingModel.mockImplementation(() => mockOnboardingModel);
  });

  describe('Template Management', () => {
    describe('GET /api/organizations/:id/onboarding/templates', () => {
      it('should get templates successfully', async () => {
        const mockTemplatesList = {
          data: [mockTemplate],
          total: 1,
        };

        mockOnboardingModel.listTemplates.mockResolvedValue(mockTemplatesList as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/templates`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockTemplatesList.data);
        expect(response.body.pagination.total).toBe(1);
      });

      it('should apply filters and pagination', async () => {
        const mockTemplatesList = {
          data: [mockTemplate],
          total: 1,
        };

        mockOnboardingModel.listTemplates.mockResolvedValue(mockTemplatesList as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .query({
            is_active: 'true',
            limit: 10,
            offset: 0,
          });

        expect(response.status).toBe(200);
        expect(mockOnboardingModel.listTemplates).toHaveBeenCalledWith(testOrganizationId, {
          is_active: true,
          limit: 10,
          offset: 0,
        });
      });

      it('should handle database errors gracefully', async () => {
        mockOnboardingModel.listTemplates.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/templates`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to fetch onboarding templates');
      });
    });

    describe('POST /api/organizations/:id/onboarding/templates', () => {
      it('should create template successfully', async () => {
        mockOnboardingModel.createTemplate.mockResolvedValue(mockTemplate as any);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .send({
            role_name: 'Pilot',
            tasks: sampleTasks,
            estimated_duration_days: 30,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockTemplate);
        expect(response.body.message).toBe('Onboarding template created successfully');
      });

      it('should return 400 when role_name is missing', async () => {
        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .send({
            tasks: sampleTasks,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Missing required fields: role_name and tasks are required');
      });

      it('should return 400 when tasks is missing', async () => {
        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .send({
            role_name: 'Pilot',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Missing required fields: role_name and tasks are required');
      });

      it('should return 400 for invalid task structure', async () => {
        const invalidTasks = [
          {
            id: 'task-1',
            title: 'Test Task',
            // Missing required fields
          },
        ];

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .send({
            role_name: 'Pilot',
            tasks: invalidTasks,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid task structure');
      });

      it('should handle duplicate template error', async () => {
        const duplicateError = new Error('duplicate key');
        mockOnboardingModel.createTemplate.mockRejectedValue(duplicateError);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
          .send({
            role_name: 'Pilot',
            tasks: sampleTasks,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('A template for this role already exists in the organization');
      });
    });

    describe('GET /api/organizations/:id/onboarding/templates/:templateId', () => {
      it('should get template successfully', async () => {
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockTemplate);
      });

      it('should return 404 for non-existent template', async () => {
        mockOnboardingModel.findTemplateById.mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding template not found');
      });
    });

    describe('PUT /api/organizations/:id/onboarding/templates/:templateId', () => {
      it('should update template successfully', async () => {
        const updatedTemplate = { ...mockTemplate, role_name: 'Senior Pilot' };
        mockOnboardingModel.updateTemplate.mockResolvedValue(updatedTemplate as any);

        const response = await request(app)
          .put(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`)
          .send({
            role_name: 'Senior Pilot',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.role_name).toBe('Senior Pilot');
        expect(response.body.message).toBe('Onboarding template updated successfully');
      });

      it('should return 404 for non-existent template', async () => {
        mockOnboardingModel.updateTemplate.mockResolvedValue(null);

        const response = await request(app)
          .put(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`)
          .send({
            role_name: 'Senior Pilot',
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding template not found');
      });

      it('should validate task structure when updating tasks', async () => {
        const invalidTasks = [
          {
            id: 'task-1',
            title: 'Test Task',
            // Missing required fields
          },
        ];

        const response = await request(app)
          .put(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`)
          .send({
            tasks: invalidTasks,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid task structure');
      });
    });

    describe('DELETE /api/organizations/:id/onboarding/templates/:templateId', () => {
      it('should delete template successfully', async () => {
        mockOnboardingModel.deleteTemplate.mockResolvedValue(true);

        const response = await request(app)
          .delete(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Onboarding template deleted successfully');
      });

      it('should return 404 for non-existent template', async () => {
        mockOnboardingModel.deleteTemplate.mockResolvedValue(false);

        const response = await request(app)
          .delete(`/api/organizations/${testOrganizationId}/onboarding/templates/${testTemplateId}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding template not found');
      });
    });
  });

  describe('Progress Management', () => {
    describe('GET /api/organizations/:id/onboarding/progress/:userId', () => {
      it('should get progress successfully', async () => {
        const mockProgressWithDetails = {
          ...mockProgress,
          template: mockTemplate,
          estimated_completion_date: new Date(),
          remaining_required_tasks: [],
        };

        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate as any);
        mockOnboardingModel.getEstimatedCompletionDate.mockResolvedValue(new Date());
        mockOnboardingModel.getRequiredTasksRemaining.mockResolvedValue([]);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/progress/${testUserId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testProgressId);
        expect(response.body.data.template).toBeDefined();
      });

      it('should return 404 for non-existent progress', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/progress/${testUserId}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding progress not found for this user');
      });
    });

    describe('PUT /api/organizations/:id/onboarding/progress/:userId', () => {
      it('should update progress successfully', async () => {
        const updatedProgress = { ...mockProgress, status: 'in_progress' as const };
        
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
        mockOnboardingModel.updateProgress.mockResolvedValue(updatedProgress as any);

        const response = await request(app)
          .put(`/api/organizations/${testOrganizationId}/onboarding/progress/${testUserId}`)
          .send({
            status: 'in_progress',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('in_progress');
        expect(response.body.message).toBe('Onboarding progress updated successfully');
      });

      it('should return 404 for non-existent progress', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);

        const response = await request(app)
          .put(`/api/organizations/${testOrganizationId}/onboarding/progress/${testUserId}`)
          .send({
            status: 'in_progress',
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding progress not found for this user');
      });
    });

    describe('POST /api/organizations/:id/onboarding/progress', () => {
      it('should create progress successfully', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate as any);
        mockOnboardingModel.createProgress.mockResolvedValue(mockProgress as any);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
          .send({
            user_id: testUserId,
            template_id: testTemplateId,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockProgress);
        expect(response.body.message).toBe('Onboarding progress created successfully');
      });

      it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
          .send({
            user_id: testUserId,
            // Missing template_id
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Missing required fields: user_id and template_id are required');
      });

      it('should return 409 for duplicate progress', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
          .send({
            user_id: testUserId,
            template_id: testTemplateId,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding progress already exists for this user');
      });

      it('should return 404 for non-existent template', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);
        mockOnboardingModel.findTemplateById.mockResolvedValue(null);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
          .send({
            user_id: testUserId,
            template_id: testTemplateId,
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding template not found');
      });
    });

    describe('GET /api/organizations/:id/onboarding/progress', () => {
      it('should get all progress successfully', async () => {
        const mockProgressList = {
          data: [mockProgress],
          total: 1,
        };

        mockOnboardingModel.getProgressWithUserInfo.mockResolvedValue(mockProgressList as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/progress`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockProgressList.data);
        expect(response.body.pagination.total).toBe(1);
      });

      it('should apply filters', async () => {
        const mockProgressList = {
          data: [mockProgress],
          total: 1,
        };

        mockOnboardingModel.getProgressWithUserInfo.mockResolvedValue(mockProgressList as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/progress`)
          .query({
            status: 'in_progress',
            limit: 10,
            offset: 0,
          });

        expect(response.status).toBe(200);
        expect(mockOnboardingModel.getProgressWithUserInfo).toHaveBeenCalledWith(testOrganizationId, {
          status: 'in_progress',
          limit: 10,
          offset: 0,
        });
      });
    });

    describe('POST /api/organizations/:id/onboarding/tasks/:taskId/complete', () => {
      it('should complete task successfully', async () => {
        const updatedProgress = { ...mockProgress, completed_tasks: ['task-1'], completion_percentage: 50 };
        
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
        mockOnboardingModel.validateTaskCompletion.mockResolvedValue(true);
        mockOnboardingModel.completeTask.mockResolvedValue(updatedProgress as any);
        mockOnboardingModel.isOnboardingComplete.mockResolvedValue(false);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
          .send({
            user_id: testUserId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.completed_tasks).toContain('task-1');
        expect(response.body.message).toBe('Task completed successfully');
        expect(response.body.onboarding_complete).toBe(false);
      });

      it('should return completion message when onboarding is complete', async () => {
        const completedProgress = { ...mockProgress, status: 'completed', completion_percentage: 100 };
        
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
        mockOnboardingModel.validateTaskCompletion.mockResolvedValue(true);
        mockOnboardingModel.completeTask.mockResolvedValue(completedProgress as any);
        mockOnboardingModel.isOnboardingComplete.mockResolvedValue(true);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
          .send({
            user_id: testUserId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Task completed! Onboarding is now complete.');
        expect(response.body.onboarding_complete).toBe(true);
      });

      it('should return 400 when user_id is missing', async () => {
        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('user_id is required in request body');
      });

      it('should return 404 for non-existent progress', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
          .send({
            user_id: testUserId,
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Onboarding progress not found for this user');
      });

      it('should return 400 for invalid task completion', async () => {
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
        mockOnboardingModel.validateTaskCompletion.mockResolvedValue(false);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
          .send({
            user_id: testUserId,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Task is invalid or already completed');
      });
    });
  });

  describe('Analytics and Reporting', () => {
    describe('GET /api/organizations/:id/onboarding/analytics', () => {
      it('should get analytics successfully', async () => {
        const mockStatistics = {
          total: 10,
          completed: 3,
          in_progress: 4,
          overdue: 2,
          not_started: 1,
          average_completion_time_days: 15.5,
          completion_rate: 30,
        };

        const mockOverdueProgress = [
          { ...mockProgress, status: 'overdue' },
        ];

        mockOnboardingModel.getOnboardingStatistics.mockResolvedValue(mockStatistics);
        mockOnboardingModel.getOverdueProgress.mockResolvedValue(mockOverdueProgress as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/analytics`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toEqual(mockStatistics);
        expect(response.body.data.overdue_count).toBe(1);
        expect(response.body.data.overdue_progress).toEqual(mockOverdueProgress);
      });

      it('should handle analytics errors gracefully', async () => {
        mockOnboardingModel.getOnboardingStatistics.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/analytics`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to fetch onboarding analytics');
      });
    });

    describe('GET /api/organizations/:id/onboarding/overdue', () => {
      it('should get overdue progress successfully', async () => {
        const mockOverdueProgress = [
          { ...mockProgress, status: 'overdue' },
        ];

        mockOnboardingModel.getOverdueProgress.mockResolvedValue(mockOverdueProgress as any);

        const response = await request(app)
          .get(`/api/organizations/${testOrganizationId}/onboarding/overdue`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOverdueProgress);
      });
    });

    describe('POST /api/organizations/:id/onboarding/mark-overdue', () => {
      it('should mark overdue progress successfully', async () => {
        mockOnboardingModel.markOverdueProgress.mockResolvedValue(5);

        const response = await request(app)
          .post(`/api/organizations/${testOrganizationId}/onboarding/mark-overdue`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updated_count).toBe(5);
        expect(response.body.message).toBe('Marked 5 onboarding progress records as overdue');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should handle role-based access for HR managers', async () => {
      // Mock user with HR manager role
      const hrManagerApp = express();
      hrManagerApp.use(express.json());
      hrManagerApp.use((req, res, next) => {
        req.user = { ...mockUser, roles: ['HR_MANAGER'] };
        req.params.id = testOrganizationId;
        next();
      });
      hrManagerApp.get('/templates', controller.getTemplates.bind(controller));

      mockOnboardingModel.listTemplates.mockResolvedValue({ data: [mockTemplate], total: 1 } as any);

      const response = await request(hrManagerApp)
        .get('/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle role-based access for supervisors', async () => {
      // Mock user with supervisor role
      const supervisorApp = express();
      supervisorApp.use(express.json());
      supervisorApp.use((req, res, next) => {
        req.user = { ...mockUser, roles: ['SUPERVISOR'] };
        req.params.id = testOrganizationId;
        next();
      });
      supervisorApp.get('/progress', controller.getAllProgress.bind(controller));

      mockOnboardingModel.getProgressWithUserInfo.mockResolvedValue({ data: [mockProgress], total: 1 } as any);

      const response = await request(supervisorApp)
        .get('/progress');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockOnboardingModel.listTemplates.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get(`/api/organizations/${testOrganizationId}/onboarding/templates`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch onboarding templates');
    });

    it('should handle unexpected errors in progress creation', async () => {
      mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);
      mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate as any);
      mockOnboardingModel.createProgress.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
        .send({
          user_id: testUserId,
          template_id: testTemplateId,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create onboarding progress');
    });

    it('should handle task completion failures', async () => {
      mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress as any);
      mockOnboardingModel.validateTaskCompletion.mockResolvedValue(true);
      mockOnboardingModel.completeTask.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
        .send({
          user_id: testUserId,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to complete task');
    });
  });

  describe('Input Validation', () => {
    it('should validate template creation input', async () => {
      const response = await request(app)
        .post(`/api/organizations/${testOrganizationId}/onboarding/templates`)
        .send({
          role_name: '', // Empty role name
          tasks: sampleTasks,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate progress creation input', async () => {
      const response = await request(app)
        .post(`/api/organizations/${testOrganizationId}/onboarding/progress`)
        .send({
          user_id: '', // Empty user ID
          template_id: testTemplateId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate task completion input', async () => {
      const response = await request(app)
        .post(`/api/organizations/${testOrganizationId}/onboarding/tasks/task-1/complete`)
        .send({
          // Missing user_id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('user_id is required in request body');
    });
  });
});