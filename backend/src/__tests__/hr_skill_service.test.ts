import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_skill_model');
jest.mock('../services/notification_service');
jest.mock('../config/logger');

import { HRSkillService } from '../services/hr_skill_service';
import { HRSkillModel } from '../models/hr_skill_model';
import { NotificationService } from '../services/notification_service';
import { NotificationEntityType } from '../types/notification';

describe('HRSkillService', () => {
  let service: HRSkillService;
  let mockSkillModel: jest.Mocked<HRSkillModel>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let testUserId: string;
  let testOrganizationId: string;
  let testSkillId: string;
  let testUserSkillId: string;

  beforeEach(() => {
    testUserId = uuidv4();
    testOrganizationId = uuidv4();
    testSkillId = uuidv4();
    testUserSkillId = uuidv4();

    // Mock HRSkillModel
    mockSkillModel = {
      findUserSkillById: jest.fn(),
      findSkillById: jest.fn(),
      verifyUserSkill: jest.fn(),
      getSkillsByOrganization: jest.fn(),
      getExpiringCertifications: jest.fn(),
      getSkillAnalytics: jest.fn(),
      searchSkills: jest.fn(),
      listSkills: jest.fn(),
      getUserSkills: jest.fn(),
      findSkillByName: jest.fn(),
      getOrganizationCertifications: jest.fn(),
      findUserSkillByUserAndSkill: jest.fn(),
    } as any;

    // Mock NotificationService
    mockNotificationService = {
      createNotification: jest.fn(),
    } as any;

    service = new HRSkillService();
    (service as any).skillModel = mockSkillModel;
    (service as any).notificationService = mockNotificationService;

    jest.clearAllMocks();
  });

  describe('createSkillVerificationWorkflow', () => {
    it('should verify skill that does not require verification', async () => {
      const mockUserSkill = {
        id: testUserSkillId,
        user_id: testUserId,
        skill_id: testSkillId,
        proficiency_level: 'intermediate',
        verified: false,
      };

      const mockSkill = {
        id: testSkillId,
        name: 'Basic Piloting',
        category: 'pilot',
        verification_required: false,
      };

      const mockVerifiedSkill = {
        ...mockUserSkill,
        verified: true,
        verified_by: 'verifier-id',
        verified_at: new Date(),
      };

      mockSkillModel.findUserSkillById.mockResolvedValue(mockUserSkill as any);
      mockSkillModel.findSkillById.mockResolvedValue(mockSkill as any);
      mockSkillModel.verifyUserSkill.mockResolvedValue(mockVerifiedSkill as any);
      mockNotificationService.createNotification.mockResolvedValue({} as any);

      const result = await service.createSkillVerificationWorkflow(
        testUserSkillId,
        'verifier-id',
        'Auto-verified skill'
      );

      expect(result).toEqual(mockVerifiedSkill);
      expect(mockSkillModel.verifyUserSkill).toHaveBeenCalledWith(
        testUserSkillId,
        'verifier-id',
        'Auto-verified skill'
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: testUserId,
        entity_type: NotificationEntityType.HR_SKILL_VERIFIED,
        entity_id: testUserSkillId,
        title: 'Skill Verified',
        message: 'Your Basic Piloting skill has been verified',
        custom_data: {
          skill_name: 'Basic Piloting',
          proficiency_level: 'intermediate',
          verified_by: 'verifier-id',
        },
      });
    });

    it('should throw error if user skill not found', async () => {
      mockSkillModel.findUserSkillById.mockResolvedValue(null);

      await expect(
        service.createSkillVerificationWorkflow(testUserSkillId, 'verifier-id')
      ).rejects.toThrow('User skill not found');
    });
  });

  describe('getPendingSkillVerifications', () => {
    it('should return pending skill verifications', async () => {
      const mockOrgSkills = {
        data: [
          {
            id: testUserSkillId,
            skill_name: 'Advanced Engineering',
            user_rsi_handle: 'engineer123',
            proficiency_level: 'expert',
            verification_required: true,
            verified: false,
          },
          {
            id: uuidv4(),
            skill_name: 'Basic Piloting',
            user_rsi_handle: 'pilot456',
            proficiency_level: 'intermediate',
            verification_required: false,
            verified: false,
          },
        ],
        total: 2,
      };

      mockSkillModel.getSkillsByOrganization.mockResolvedValue(mockOrgSkills as any);

      const result = await service.getPendingSkillVerifications(testOrganizationId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        user_skill_id: testUserSkillId,
        skill_name: 'Advanced Engineering',
        user_rsi_handle: 'engineer123',
        proficiency_level: 'expert',
        verification_required: true,
        current_verifiers: [],
        pending_verification: true,
      });
    });
  });

  describe('processCertificationExpirationNotifications', () => {
    it('should send notifications for expiring certifications', async () => {
      const mockExpiringCerts = [
        {
          id: uuidv4(),
          user_id: testUserId,
          name: 'Pilot License',
          expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        },
      ];

      mockSkillModel.getExpiringCertifications.mockResolvedValue(mockExpiringCerts as any);
      mockNotificationService.createNotification.mockResolvedValue({} as any);

      await service.processCertificationExpirationNotifications(testOrganizationId);

      expect(mockSkillModel.getExpiringCertifications).toHaveBeenCalledWith(testOrganizationId, 30);
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: testUserId,
        entity_type: NotificationEntityType.HR_CERTIFICATION_EXPIRING,
        entity_id: mockExpiringCerts[0].id,
        title: 'Certification Expiring Soon',
        message: 'Your Pilot License certification expires in 5 days',
        custom_data: {
          certification_name: 'Pilot License',
          expiration_date: mockExpiringCerts[0].expiration_date,
          days_until_expiration: 5,
        },
      });
    });
  });

  describe('generateSkillGapAnalysis', () => {
    it('should generate skill gap analysis with required skills', async () => {
      const mockAnalytics = {
        skills_by_category: {
          pilot: 10,
          engineer: 5,
          security: 2,
        },
      };

      const requiredSkills = [
        { skill_name: 'pilot', required_count: 15, priority: 'medium' as const },
        { skill_name: 'engineer', required_count: 10, priority: 'high' as const },
      ];

      mockSkillModel.getSkillAnalytics.mockResolvedValue(mockAnalytics as any);

      const result = await service.generateSkillGapAnalysis(testOrganizationId, requiredSkills);

      expect(result).toHaveLength(2);
      
      // Check pilot gap (10/15 = 33.33% gap)
      expect(result.find(gap => gap.skill_name === 'pilot')).toEqual({
        skill_name: 'pilot',
        skill_category: 'unknown',
        required_count: 15,
        current_count: 10,
        gap_percentage: 33.333333333333336,
        priority: 'medium',
      });
    });
  });

  describe('searchSkills', () => {
    it('should search skills by search term', async () => {
      const mockSkills = [
        { id: testSkillId, name: 'Advanced Piloting', category: 'pilot' },
      ];

      mockSkillModel.searchSkills.mockResolvedValue(mockSkills as any);

      const result = await service.searchSkills({ search_term: 'pilot' });

      expect(mockSkillModel.searchSkills).toHaveBeenCalledWith('pilot');
      expect(result).toEqual(mockSkills);
    });

    it('should get organization skills with filters', async () => {
      const mockOrgSkills = {
        data: [
          { id: testSkillId, skill_name: 'Engineering', category: 'engineer', verified: true },
        ],
        total: 1,
      };

      mockSkillModel.getSkillsByOrganization.mockResolvedValue(mockOrgSkills);

      const result = await service.searchSkills({
        organization_id: testOrganizationId,
        category: 'engineer',
        verified: true,
      });

      expect(mockSkillModel.getSkillsByOrganization).toHaveBeenCalledWith(testOrganizationId, {
        category: 'engineer',
        verified: true,
      });
      expect(result).toEqual(mockOrgSkills.data);
    });
  });

  describe('validateSkillAssignment', () => {
    it('should validate successful skill assignment', async () => {
      const mockSkill = { id: testSkillId, name: 'Test Skill' };
      
      mockSkillModel.findSkillById.mockResolvedValue(mockSkill as any);
      mockSkillModel.findUserSkillByUserAndSkill.mockResolvedValue(null);

      const result = await service.validateSkillAssignment(testOrgId, testUserId, testSkillId, 'intermediate');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid skill assignment', async () => {
      mockSkillModel.findSkillById.mockResolvedValue(null);
      mockSkillModel.findUserSkillByUserAndSkill.mockResolvedValue(null);

      const result = await service.validateSkillAssignment(testOrgId, testUserId, 'invalid-skill', 'invalid-level');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Skill not found');
      expect(result.errors).toContain('Invalid proficiency level');
    });
  });

  describe('Error Handling', () => {
    it('should handle model errors gracefully', async () => {
      mockSkillModel.findUserSkillById.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createSkillVerificationWorkflow(testUserSkillId, 'verifier-id')
      ).rejects.toThrow('Database error');
    });
  });
});