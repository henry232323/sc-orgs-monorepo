import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { HROnboardingService, OnboardingCompletionCertificate, OnboardingNotificationData } from '../services/hr_onboarding_service';
import { HROnboardingModel, HROnboardingTemplate, HROnboardingProgress, OnboardingTask } from '../models/hr_onboarding_model';
import { NotificationService } from '../services/notification_service';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_onboarding_model');
jest.mock('../services/notification_service');
jest.mock('../config/logger');

const MockedHROnboardingModel = HROnboardingModel as jest.MockedClass<typeof HROnboardingModel>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('HROnboardingService', () => {
  let service: HROnboardingService;
  let mockOnboardingModel: jest.Mocked<HROnboardingModel>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testTemplateId = uuidv4();
  const testProgressId = uuidv4();

  const sampleTasks: OnboardingTask[] = [
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
    {
      id: 'task-3',
      title: 'Optional Training',
      description: 'Complete optional training module',
      required: false,
      estimated_hours: 4,
      order_index: 3,
    },
  ];

  const mockTemplate: HROnboardingTemplate = {
    id: testTemplateId,
    organization_id: testOrganizationId,
    role_name: 'Pilot',
    tasks: sampleTasks,
    estimated_duration_days: 30,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockProgress: HROnboardingProgress = {
    id: testProgressId,
    organization_id: testOrganizationId,
    user_id: testUserId,
    template_id: testTemplateId,
    status: 'not_started',
    completed_tasks: [],
    completion_percentage: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeAll(() => {
    mockOnboardingModel = {
      findTemplateByRoleAndOrganization: jest.fn(),
      findProgressByUserAndOrganization: jest.fn(),
      createProgress: jest.fn(),
      findTemplateById: jest.fn(),
      findProgressById: jest.fn(),
      updateProgress: jest.fn(),
      completeTask: jest.fn(),
      isOnboardingComplete: jest.fn(),
      listProgress: jest.fn(),
      getOverdueProgress: jest.fn(),
      markOverdueProgress: jest.fn(),
      getOnboardingStatistics: jest.fn(),
      updateTemplate: jest.fn(),
      listTemplates: jest.fn(),
    } as any;

    mockNotificationService = {
      createCustomEventNotification: jest.fn(),
    } as any;

    MockedHROnboardingModel.mockImplementation(() => mockOnboardingModel);
    MockedNotificationService.mockImplementation(() => mockNotificationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HROnboardingService();
  });

  describe('Role-based Template Assignment', () => {
    describe('assignTemplateToUser', () => {
      it('should assign template to user successfully', async () => {
        mockOnboardingModel.findTemplateByRoleAndOrganization.mockResolvedValue(mockTemplate);
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);
        mockOnboardingModel.createProgress.mockResolvedValue(mockProgress);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.assignTemplateToUser(
          testOrganizationId,
          testUserId,
          'Pilot'
        );

        expect(result).toEqual(mockProgress);
        expect(mockOnboardingModel.createProgress).toHaveBeenCalledWith({
          organization_id: testOrganizationId,
          user_id: testUserId,
          template_id: testTemplateId,
        });
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Onboarding Started',
          expect.stringContaining('Your onboarding for the Pilot role has begun'),
          expect.objectContaining({
            progress_id: testProgressId,
            template_id: testTemplateId,
            role_name: 'Pilot',
            notification_type: 'started',
          })
        );
      });

      it('should return null when no template found for role', async () => {
        mockOnboardingModel.findTemplateByRoleAndOrganization.mockResolvedValue(null);

        const result = await service.assignTemplateToUser(
          testOrganizationId,
          testUserId,
          'NonExistentRole'
        );

        expect(result).toBeNull();
        expect(mockOnboardingModel.createProgress).not.toHaveBeenCalled();
      });

      it('should return existing progress when user already has onboarding', async () => {
        mockOnboardingModel.findTemplateByRoleAndOrganization.mockResolvedValue(mockTemplate);
        mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(mockProgress);

        const result = await service.assignTemplateToUser(
          testOrganizationId,
          testUserId,
          'Pilot'
        );

        expect(result).toEqual(mockProgress);
        expect(mockOnboardingModel.createProgress).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        mockOnboardingModel.findTemplateByRoleAndOrganization.mockRejectedValue(new Error('Database error'));

        await expect(service.assignTemplateToUser(
          testOrganizationId,
          testUserId,
          'Pilot'
        )).rejects.toThrow('Database error');
      });
    });

    describe('customizeTemplateForRole', () => {
      it('should customize template with additional tasks', async () => {
        const additionalTasks: OnboardingTask[] = [
          {
            id: 'task-4',
            title: 'Additional Task',
            description: 'An additional task for customization',
            required: true,
            estimated_hours: 2,
            order_index: 4,
          },
        ];

        const customizedTemplate = {
          ...mockTemplate,
          tasks: [...sampleTasks, ...additionalTasks],
        };

        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.updateTemplate.mockResolvedValue(customizedTemplate);

        const result = await service.customizeTemplateForRole(testTemplateId, {
          additional_tasks: additionalTasks,
        });

        expect(result).toEqual(customizedTemplate);
        expect(mockOnboardingModel.updateTemplate).toHaveBeenCalledWith(testTemplateId, {
          tasks: expect.arrayContaining([...sampleTasks, ...additionalTasks]),
          estimated_duration_days: mockTemplate.estimated_duration_days,
        });
      });

      it('should customize template with modified tasks', async () => {
        const modifiedTasks = [
          {
            id: 'task-1',
            title: 'Updated Profile Task',
            estimated_hours: 2,
          },
        ];

        const expectedTasks = [
          { ...sampleTasks[0], title: 'Updated Profile Task', estimated_hours: 2 },
          sampleTasks[1],
          sampleTasks[2],
        ];

        const customizedTemplate = {
          ...mockTemplate,
          tasks: expectedTasks,
        };

        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.updateTemplate.mockResolvedValue(customizedTemplate);

        const result = await service.customizeTemplateForRole(testTemplateId, {
          modified_tasks: modifiedTasks,
        });

        expect(result).toEqual(customizedTemplate);
        expect(mockOnboardingModel.updateTemplate).toHaveBeenCalledWith(testTemplateId, {
          tasks: expectedTasks,
          estimated_duration_days: mockTemplate.estimated_duration_days,
        });
      });

      it('should return null for non-existent template', async () => {
        mockOnboardingModel.findTemplateById.mockResolvedValue(null);

        const result = await service.customizeTemplateForRole(testTemplateId, {
          estimated_duration_days: 45,
        });

        expect(result).toBeNull();
        expect(mockOnboardingModel.updateTemplate).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        mockOnboardingModel.findTemplateById.mockRejectedValue(new Error('Database error'));

        await expect(service.customizeTemplateForRole(testTemplateId, {}))
          .rejects.toThrow('Database error');
      });
    });
  });

  describe('Progress Tracking with Automatic Status Updates', () => {
    describe('updateProgressWithStatusCheck', () => {
      it('should update progress and recalculate status', async () => {
        const progressWithTasks = {
          ...mockProgress,
          completed_tasks: ['task-1'],
        };

        const updatedProgress = {
          ...progressWithTasks,
          status: 'in_progress' as const,
          completion_percentage: 33.33,
          started_at: new Date(),
        };

        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.updateProgress.mockResolvedValue(updatedProgress);

        const result = await service.updateProgressWithStatusCheck(testProgressId, {
          completed_tasks: ['task-1'],
        });

        expect(result).toEqual(updatedProgress);
        expect(mockOnboardingModel.updateProgress).toHaveBeenCalledWith(testProgressId, {
          completed_tasks: ['task-1'],
          completion_percentage: expect.any(Number),
          status: 'in_progress',
          started_at: expect.any(Date),
        });
      });

      it('should mark as completed when all required tasks are done', async () => {
        const completedProgress = {
          ...mockProgress,
          completed_tasks: ['task-1', 'task-2'], // All required tasks
          status: 'completed' as const,
          completion_percentage: 100,
          completed_at: new Date(),
        };

        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.updateProgress.mockResolvedValue(completedProgress);

        const result = await service.updateProgressWithStatusCheck(testProgressId, {
          completed_tasks: ['task-1', 'task-2'],
        });

        expect(result).toEqual(completedProgress);
        expect(mockOnboardingModel.updateProgress).toHaveBeenCalledWith(testProgressId, {
          completed_tasks: ['task-1', 'task-2'],
          completion_percentage: expect.any(Number),
          status: 'completed',
          started_at: expect.any(Date),
          completed_at: expect.any(Date),
        });
      });

      it('should return null for non-existent progress', async () => {
        mockOnboardingModel.findProgressById.mockResolvedValue(null);

        const result = await service.updateProgressWithStatusCheck(testProgressId, {
          completed_tasks: ['task-1'],
        });

        expect(result).toBeNull();
        expect(mockOnboardingModel.updateProgress).not.toHaveBeenCalled();
      });

      it('should handle status change notifications', async () => {
        const oldProgress = { ...mockProgress, status: 'not_started' as const };
        const newProgress = { ...mockProgress, status: 'completed' as const };

        mockOnboardingModel.findProgressById.mockResolvedValue(oldProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.updateProgress.mockResolvedValue(newProgress);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        await service.updateProgressWithStatusCheck(testProgressId, {
          status: 'completed',
        });

        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Onboarding Complete!',
          expect.stringContaining('Congratulations! You\'ve completed your onboarding'),
          expect.objectContaining({
            notification_type: 'completed',
          })
        );
      });
    });

    describe('completeTaskWithNotification', () => {
      it('should complete task and send notification', async () => {
        const task = sampleTasks[0];
        const updatedProgress = {
          ...mockProgress,
          completed_tasks: ['task-1'],
          completion_percentage: 33.33,
          status: 'in_progress' as const,
        };

        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.completeTask.mockResolvedValue(updatedProgress);
        mockOnboardingModel.isOnboardingComplete.mockResolvedValue(false);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.completeTaskWithNotification(testProgressId, 'task-1');

        expect(result.progress).toEqual(updatedProgress);
        expect(result.isComplete).toBe(false);
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Task Completed',
          expect.stringContaining(`You've completed the task "${task.title}"`),
          expect.objectContaining({
            notification_type: 'task_completed',
            task_title: task.title,
            progress_id: testProgressId,
            template_id: testTemplateId,
            role_name: 'Pilot',
            organization_id: testOrganizationId,
          })
        );
      });

      it('should generate certificate and send completion notification when onboarding is complete', async () => {
        const completedProgress = {
          ...mockProgress,
          completed_tasks: ['task-1', 'task-2'],
          completion_percentage: 100,
          status: 'completed' as const,
        };

        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.completeTask.mockResolvedValue(completedProgress);
        mockOnboardingModel.isOnboardingComplete.mockResolvedValue(true);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.completeTaskWithNotification(testProgressId, 'task-1');

        expect(result.progress).toEqual(completedProgress);
        expect(result.isComplete).toBe(true);
        
        // Should send both task completion and onboarding completion notifications
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledTimes(2);
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Onboarding Complete!',
          expect.stringContaining('Congratulations! You\'ve completed your onboarding'),
          expect.objectContaining({
            notification_type: 'completed',
          })
        );
      });

      it('should return null progress for non-existent progress', async () => {
        mockOnboardingModel.findProgressById.mockResolvedValue(null);

        const result = await service.completeTaskWithNotification(testProgressId, 'task-1');

        expect(result.progress).toBeNull();
        expect(result.isComplete).toBe(false);
      });

      it('should return null progress for non-existent task', async () => {
        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);

        const result = await service.completeTaskWithNotification(testProgressId, 'non-existent-task');

        expect(result.progress).toBeNull();
        expect(result.isComplete).toBe(false);
      });
    });
  });

  describe('Overdue Notification System', () => {
    describe('processOverdueNotifications', () => {
      it('should process overdue notifications successfully', async () => {
        const overdueProgress = [
          {
            ...mockProgress,
            status: 'overdue' as const,
            role_name: 'Pilot',
            created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          },
        ];

        mockOnboardingModel.markOverdueProgress.mockResolvedValue(1);
        // Mock the private method by mocking the service's internal behavior
        jest.spyOn(service as any, 'getOverdueProgressWithDetails').mockResolvedValue(overdueProgress);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.processOverdueNotifications();

        expect(result).toBe(1);
        expect(mockOnboardingModel.markOverdueProgress).toHaveBeenCalled();
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Onboarding Overdue',
          expect.stringContaining('Your onboarding for the Pilot role is'),
          expect.objectContaining({
            notification_type: 'overdue',
            days_overdue: expect.any(Number),
            progress_id: testProgressId,
            template_id: testTemplateId,
            role_name: 'Pilot',
            organization_id: testOrganizationId,
          })
        );
      });

      it('should return 0 when no overdue progress found', async () => {
        mockOnboardingModel.markOverdueProgress.mockResolvedValue(0);

        const result = await service.processOverdueNotifications();

        expect(result).toBe(0);
        expect(mockNotificationService.createCustomEventNotification).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        mockOnboardingModel.markOverdueProgress.mockRejectedValue(new Error('Database error'));

        await expect(service.processOverdueNotifications()).rejects.toThrow('Database error');
      });
    });

    describe('sendReminderNotifications', () => {
      it('should send reminder notifications for approaching deadlines', async () => {
        const progressNeedingReminders = {
          data: [
            {
              ...mockProgress,
              status: 'in_progress' as const,
              created_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), // 23 days ago
            },
          ],
          total: 1,
        };

        mockOnboardingModel.listProgress.mockResolvedValue(progressNeedingReminders);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.sendReminderNotifications(testOrganizationId, 7);

        expect(result).toBe(1);
        expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
          'hr_onboarding',
          testProgressId,
          testUserId,
          [testUserId],
          'Onboarding Reminder',
          expect.stringContaining('Don\'t forget to complete your onboarding'),
          expect.objectContaining({
            notification_type: 'reminder',
          })
        );
      });

      it('should not send reminders for progress not approaching deadline', async () => {
        const progressNotNeedingReminders = {
          data: [
            {
              ...mockProgress,
              status: 'in_progress' as const,
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            },
          ],
          total: 1,
        };

        mockOnboardingModel.listProgress.mockResolvedValue(progressNotNeedingReminders);

        const result = await service.sendReminderNotifications(testOrganizationId, 7);

        expect(result).toBe(0);
        expect(mockNotificationService.createCustomEventNotification).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        mockOnboardingModel.listProgress.mockRejectedValue(new Error('Database error'));

        await expect(service.sendReminderNotifications(testOrganizationId))
          .rejects.toThrow('Database error');
      });
    });
  });

  describe('Completion Certificate Generation', () => {
    describe('generateCompletionCertificate', () => {
      it('should generate completion certificate', async () => {
        const completedProgress = {
          ...mockProgress,
          status: 'completed' as const,
          completion_percentage: 100,
          completed_at: new Date(),
        };

        const certificate = await service.generateCompletionCertificate(
          completedProgress,
          mockTemplate
        );

        expect(certificate).toBeDefined();
        expect(certificate.user_id).toBe(testUserId);
        expect(certificate.organization_id).toBe(testOrganizationId);
        expect(certificate.template_id).toBe(testTemplateId);
        expect(certificate.role_name).toBe('Pilot');
        expect(certificate.completion_percentage).toBe(100);
        expect(certificate.certificate_id).toMatch(/^cert_/);
        expect(certificate.completed_at).toBeDefined();
      });

      it('should use current date when completed_at is not set', async () => {
        const progressWithoutCompletedAt = {
          ...mockProgress,
          status: 'completed' as const,
          completion_percentage: 100,
          completed_at: undefined,
        };

        const certificate = await service.generateCompletionCertificate(
          progressWithoutCompletedAt,
          mockTemplate
        );

        expect(certificate.completed_at).toBeDefined();
        expect(certificate.completed_at.getTime()).toBeCloseTo(new Date().getTime(), -1000);
      });

      it('should handle errors gracefully', async () => {
        // Force an error by passing invalid data
        const invalidProgress = null as any;

        await expect(service.generateCompletionCertificate(invalidProgress, mockTemplate))
          .rejects.toThrow();
      });
    });
  });

  describe('Public Methods for External Use', () => {
    describe('getOnboardingStatistics', () => {
      it('should return onboarding statistics', async () => {
        const mockStats = {
          total: 10,
          completed: 3,
          in_progress: 4,
          overdue: 2,
          not_started: 1,
          average_completion_time_days: 15.5,
          completion_rate: 30,
        };

        mockOnboardingModel.getOnboardingStatistics.mockResolvedValue(mockStats);

        const result = await service.getOnboardingStatistics(testOrganizationId);

        expect(result).toEqual(mockStats);
        expect(mockOnboardingModel.getOnboardingStatistics).toHaveBeenCalledWith(testOrganizationId);
      });
    });

    describe('getProgressWithTemplate', () => {
      it('should return progress with template details', async () => {
        const estimatedCompletion = new Date();
        const remainingTasks = [sampleTasks[1]];

        mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
        mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
        mockOnboardingModel.getEstimatedCompletionDate = jest.fn().mockResolvedValue(estimatedCompletion);
        mockOnboardingModel.getRequiredTasksRemaining = jest.fn().mockResolvedValue(remainingTasks);

        const result = await service.getProgressWithTemplate(testProgressId);

        expect(result).toEqual({
          progress: mockProgress,
          template: mockTemplate,
          estimated_completion_date: estimatedCompletion,
          remaining_required_tasks: remainingTasks,
        });
      });

      it('should return null for non-existent progress', async () => {
        mockOnboardingModel.findProgressById.mockResolvedValue(null);

        const result = await service.getProgressWithTemplate(testProgressId);

        expect(result).toBeNull();
      });
    });

    describe('bulkAssignOnboarding', () => {
      it('should assign onboarding to multiple users successfully', async () => {
        const assignments = [
          { user_id: `${testUserId}_1`, role_name: 'Pilot' },
          { user_id: `${testUserId}_2`, role_name: 'Engineer' },
        ];

        mockOnboardingModel.findTemplateByRoleAndOrganization
          .mockResolvedValueOnce(mockTemplate)
          .mockResolvedValueOnce({ ...mockTemplate, role_name: 'Engineer' });
        mockOnboardingModel.findProgressByUserAndOrganization
          .mockResolvedValue(null);
        mockOnboardingModel.createProgress
          .mockResolvedValueOnce({ ...mockProgress, user_id: `${testUserId}_1` })
          .mockResolvedValueOnce({ ...mockProgress, user_id: `${testUserId}_2` });
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.bulkAssignOnboarding(testOrganizationId, assignments);

        expect(result.successful).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle partial failures in bulk assignment', async () => {
        const assignments = [
          { user_id: `${testUserId}_1`, role_name: 'Pilot' },
          { user_id: `${testUserId}_2`, role_name: 'NonExistentRole' },
        ];

        mockOnboardingModel.findTemplateByRoleAndOrganization
          .mockResolvedValueOnce(mockTemplate)
          .mockResolvedValueOnce(null); // No template for NonExistentRole
        mockOnboardingModel.findProgressByUserAndOrganization
          .mockResolvedValue(null);
        mockOnboardingModel.createProgress
          .mockResolvedValueOnce({ ...mockProgress, user_id: `${testUserId}_1` });
        mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

        const result = await service.bulkAssignOnboarding(testOrganizationId, assignments);

        expect(result.successful).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('No template found for role NonExistentRole');
      });

      it('should handle errors in bulk assignment', async () => {
        const assignments = [
          { user_id: `${testUserId}_1`, role_name: 'Pilot' },
        ];

        mockOnboardingModel.findTemplateByRoleAndOrganization.mockRejectedValue(new Error('Database error'));

        const result = await service.bulkAssignOnboarding(testOrganizationId, assignments);

        expect(result.successful).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Database error');
      });
    });
  });

  describe('Notification Triggers', () => {
    it('should send appropriate notifications for different events', async () => {
      const notificationData: OnboardingNotificationData = {
        user_id: testUserId,
        organization_id: testOrganizationId,
        template_id: testTemplateId,
        progress_id: testProgressId,
        role_name: 'Pilot',
        notification_type: 'started',
      };

      mockNotificationService.createCustomEventNotification.mockResolvedValue(undefined);

      // Test private method through public interface
      await service.assignTemplateToUser(testOrganizationId, testUserId, 'Pilot');

      // Verify notification was sent
      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalled();
    });

    it('should handle notification failures gracefully', async () => {
      mockOnboardingModel.findTemplateByRoleAndOrganization.mockResolvedValue(mockTemplate);
      mockOnboardingModel.findProgressByUserAndOrganization.mockResolvedValue(null);
      mockOnboardingModel.createProgress.mockResolvedValue(mockProgress);
      mockNotificationService.createCustomEventNotification.mockRejectedValue(new Error('Notification service error'));

      // Should not throw error even if notification fails
      const result = await service.assignTemplateToUser(testOrganizationId, testUserId, 'Pilot');

      expect(result).toEqual(mockProgress);
    });
  });

  describe('Business Logic and Edge Cases', () => {
    it('should handle template customization with empty arrays', async () => {
      mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
      mockOnboardingModel.updateTemplate.mockResolvedValue(mockTemplate);

      const result = await service.customizeTemplateForRole(testTemplateId, {
        additional_tasks: [],
        modified_tasks: [],
      });

      expect(result).toEqual(mockTemplate);
      expect(mockOnboardingModel.updateTemplate).toHaveBeenCalledWith(testTemplateId, {
        tasks: sampleTasks, // Should remain unchanged
        estimated_duration_days: mockTemplate.estimated_duration_days,
      });
    });

    it('should handle progress updates without completed_tasks', async () => {
      mockOnboardingModel.findProgressById.mockResolvedValue(mockProgress);
      mockOnboardingModel.findTemplateById.mockResolvedValue(mockTemplate);
      mockOnboardingModel.updateProgress.mockResolvedValue(mockProgress);

      const result = await service.updateProgressWithStatusCheck(testProgressId, {
        status: 'in_progress',
      });

      expect(result).toEqual(mockProgress);
      expect(mockOnboardingModel.updateProgress).toHaveBeenCalledWith(testProgressId, {
        status: 'in_progress',
      });
    });

    it('should handle certificate generation with missing completed_at', async () => {
      const progressWithoutCompletedAt = {
        ...mockProgress,
        completed_at: undefined,
      };

      const certificate = await service.generateCompletionCertificate(
        progressWithoutCompletedAt,
        mockTemplate
      );

      expect(certificate.completed_at).toBeDefined();
      expect(certificate.completed_at.getTime()).toBeCloseTo(new Date().getTime(), -1000);
    });
  });
});