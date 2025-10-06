import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_skill_model');
jest.mock('../utils/user-casting');
jest.mock('../config/logger');

import { HRSkillController } from '../controllers/hr_skill_controller';
import { HRSkillModel } from '../models/hr_skill_model';
import { getUserFromRequest } from '../utils/user-casting';

describe('HRSkillController', () => {
  let controller: HRSkillController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSkillModel: jest.Mocked<HRSkillModel>;
  let testUserId: string;
  let testOrganizationId: string;
  let testSkillId: string;

  beforeEach(() => {
    controller = new HRSkillController();
    testUserId = uuidv4();
    testOrganizationId = uuidv4();
    testSkillId = uuidv4();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      org: {
        id: testOrganizationId,
        name: 'Test Organization',
        rsi_org_id: 'TESTORG',
      } as any,
    };

    const mockStatus = jest.fn().mockReturnThis();
    const mockJson = jest.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock HRSkillModel
    mockSkillModel = {
      listSkills: jest.fn(),
      searchSkills: jest.fn(),
      createSkill: jest.fn(),
      findSkillByName: jest.fn(),
      findSkillById: jest.fn(),
      getSkillsByOrganization: jest.fn(),
      createUserSkill: jest.fn(),
      findUserSkillByUserAndSkill: jest.fn(),
      getUserSkills: jest.fn(),
      findUserSkillById: jest.fn(),
      verifyUserSkill: jest.fn(),
      updateUserSkill: jest.fn(),
      deleteUserSkill: jest.fn(),
      getSkillAnalytics: jest.fn(),
      createCertification: jest.fn(),
      getOrganizationCertifications: jest.fn(),
      getUserCertifications: jest.fn(),
      getExpiringCertifications: jest.fn(),
      findCertificationById: jest.fn(),
      updateCertification: jest.fn(),
      deleteCertification: jest.fn(),
    } as any;

    // Replace the model instance
    (controller as any).skillModel = mockSkillModel;

    jest.clearAllMocks();
  });

  describe('listSkills', () => {
    it('should list skills successfully', async () => {
      const mockSkills = [
        {
          id: testSkillId,
          name: 'Advanced Piloting',
          category: 'pilot',
          verification_required: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockSkillModel.listSkills.mockResolvedValue({
        data: mockSkills,
        total: 1,
      });

      mockRequest.query = { page: '1', limit: '20' };

      await controller.listSkills(mockRequest as Request, mockResponse as Response);

      expect(mockSkillModel.listSkills).toHaveBeenCalledWith({
        category: undefined,
        verification_required: undefined,
        limit: 20,
        offset: 0,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSkills,
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });

    it('should handle errors gracefully', async () => {
      mockSkillModel.listSkills.mockRejectedValue(new Error('Database error'));

      await controller.listSkills(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to list skills',
      });
    });
  });

  describe('createSkill', () => {
    it('should create skill successfully', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'testuser' };
      (getUserFromRequest as jest.Mock).mockReturnValue(mockUser);

      const skillData = {
        name: 'Advanced Engineering',
        category: 'engineer',
        description: 'Advanced engineering skills',
        verification_required: true,
      };

      const mockSkill = {
        id: testSkillId,
        ...skillData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSkillModel.findSkillByName.mockResolvedValue(null);
      mockSkillModel.createSkill.mockResolvedValue(mockSkill as any);

      mockRequest.body = skillData;

      await controller.createSkill(mockRequest as Request, mockResponse as Response);

      expect(mockSkillModel.findSkillByName).toHaveBeenCalledWith('Advanced Engineering');
      expect(mockSkillModel.createSkill).toHaveBeenCalledWith(skillData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSkill,
      });
    });

    it('should return 401 if user not authenticated', async () => {
      (getUserFromRequest as jest.Mock).mockReturnValue(null);

      await controller.createSkill(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('getSkillAnalytics', () => {
    it('should return skill analytics successfully', async () => {
      const mockAnalytics = {
        total_skills_tracked: 50,
        verification_rate: 75.5,
        skill_gaps: [],
        skills_by_category: {
          pilot: 20,
          engineer: 15,
          security: 10,
          medic: 5,
        },
        proficiency_distribution: {
          beginner: 10,
          intermediate: 20,
          advanced: 15,
          expert: 5,
        },
      };

      mockSkillModel.getSkillAnalytics.mockResolvedValue(mockAnalytics);

      await controller.getSkillAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockSkillModel.getSkillAnalytics).toHaveBeenCalledWith(testOrganizationId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('verifyUserSkill', () => {
    it('should verify user skill successfully', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'verifier' };
      (getUserFromRequest as jest.Mock).mockReturnValue(mockUser);

      const userSkillId = uuidv4();
      const mockUserSkill = {
        id: userSkillId,
        user_id: 'other-user-id',
        skill_id: testSkillId,
        verified: false,
      };

      const mockVerifiedSkill = {
        ...mockUserSkill,
        verified: true,
        verified_by: testUserId,
        verified_at: new Date(),
      };

      mockSkillModel.findUserSkillById.mockResolvedValue(mockUserSkill as any);
      mockSkillModel.verifyUserSkill.mockResolvedValue(mockVerifiedSkill as any);

      mockRequest.params = { skillId: userSkillId };
      mockRequest.body = { notes: 'Skill verified through demonstration' };

      await controller.verifyUserSkill(mockRequest as Request, mockResponse as Response);

      expect(mockSkillModel.verifyUserSkill).toHaveBeenCalledWith(
        userSkillId,
        testUserId,
        'Skill verified through demonstration'
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockVerifiedSkill,
      });
    });

    it('should return 404 if user skill not found', async () => {
      const mockUser = { id: testUserId, rsi_handle: 'verifier' };
      (getUserFromRequest as jest.Mock).mockReturnValue(mockUser);

      mockSkillModel.findUserSkillById.mockResolvedValue(null);

      mockRequest.params = { skillId: 'nonexistent-skill' };

      await controller.verifyUserSkill(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User skill not found',
      });
    });
  });
});