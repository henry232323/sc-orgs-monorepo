import { Request, Response } from 'express';
import { HRSkillStatisticsController } from '../controllers/hr_skill_statistics_controller';
import { HRSkillStatisticsService } from '../services/hr_skill_statistics_service';

// Mock the service
jest.mock('../services/hr_skill_statistics_service');
jest.mock('../config/logger');

const mockStatisticsService = {
  getAllSkillsStatistics: jest.fn(),
  getSkillStatistics: jest.fn(),
  getSkillStatisticsByCategory: jest.fn(),
  getOrganizationSkillsOverview: jest.fn(),
  getSkillStatisticsSummary: jest.fn(),
  getSkillVerificationTrends: jest.fn(),
  performSkillGapAnalysis: jest.fn(),
  refreshStatisticsCache: jest.fn(),
  invalidateSkillCache: jest.fn(),
  exportSkillStatistics: jest.fn(),
};

(HRSkillStatisticsService as jest.MockedClass<typeof HRSkillStatisticsService>).mockImplementation(() => mockStatisticsService as any);

describe('HRSkillStatisticsController', () => {
  let controller: HRSkillStatisticsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new HRSkillStatisticsController();
    
    mockRequest = {
      org: {
        id: 'org-123',
        name: 'Test Organization',
        rsi_org_id: 'TEST',
        is_registered: true,
        owner_id: 'owner-123',
        languages: ['en'],
        total_upvotes: 0,
        total_downvotes: 0,
        total_members: 10,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user-123',
        rsi_handle: 'testuser',
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('getAllSkillsStatistics', () => {
    it('should return all skills statistics with filters', async () => {
      const mockStatistics = {
        'skill-1': {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          total_members: 10,
          verified_members: 8,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 2,
            intermediate: 4,
            advanced: 3,
            expert: 1,
          },
          recent_verifications: 3,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      };

      mockRequest.query = {
        category: 'pilot',
        include_zero_members: 'false',
        min_member_count: '5',
      };

      mockStatisticsService.getAllSkillsStatistics.mockResolvedValue(mockStatistics);

      await controller.getAllSkillsStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getAllSkillsStatistics).toHaveBeenCalledWith('org-123', {
        category: 'pilot',
        skill_ids: undefined,
        include_zero_members: false,
        min_member_count: 5,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatistics,
        organization_id: 'org-123',
        filters_applied: {
          category: 'pilot',
          skill_ids: undefined,
          include_zero_members: false,
          min_member_count: 5,
        },
        total_skills: 1,
      });
    });

    it('should handle skill_ids parameter', async () => {
      mockRequest.query = {
        skill_ids: 'skill-1,skill-2,skill-3',
      };

      mockStatisticsService.getAllSkillsStatistics.mockResolvedValue({});

      await controller.getAllSkillsStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getAllSkillsStatistics).toHaveBeenCalledWith('org-123', {
        category: undefined,
        skill_ids: ['skill-1', 'skill-2', 'skill-3'],
        include_zero_members: false,
        min_member_count: undefined,
      });
    });

    it('should handle service errors', async () => {
      mockStatisticsService.getAllSkillsStatistics.mockRejectedValue(new Error('Service error'));

      await controller.getAllSkillsStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get skills statistics',
      });
    });
  });

  describe('getSkillStatistics', () => {
    it('should return specific skill statistics', async () => {
      const mockStatistics = {
        skill_id: 'skill-123',
        skill_name: 'Pilot Training',
        skill_category: 'pilot',
        total_members: 10,
        verified_members: 8,
        verification_rate: 0.8,
        proficiency_breakdown: {
          beginner: 2,
          intermediate: 4,
          advanced: 3,
          expert: 1,
        },
        recent_verifications: 3,
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      mockRequest.params = { skillId: 'skill-123' };
      mockStatisticsService.getSkillStatistics.mockResolvedValue(mockStatistics);

      await controller.getSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getSkillStatistics).toHaveBeenCalledWith('org-123', 'skill-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatistics,
        organization_id: 'org-123',
      });
    });

    it('should return 400 if skillId is missing', async () => {
      mockRequest.params = {};

      await controller.getSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Skill ID is required',
      });
    });

    it('should return 404 if skill not found', async () => {
      mockRequest.params = { skillId: 'skill-123' };
      mockStatisticsService.getSkillStatistics.mockRejectedValue(new Error('Skill not found'));

      await controller.getSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Skill not found',
      });
    });
  });

  describe('getSkillStatisticsByCategory', () => {
    it('should return category statistics', async () => {
      const mockCategoryStats = {
        category: 'pilot',
        unique_skills: 5,
        total_instances: 25,
        verification_rate: 0.8,
        average_proficiency: 2.5,
        top_skills: [
          {
            skill_name: 'Basic Piloting',
            member_count: 10,
            verification_rate: 0.8,
          },
        ],
      };

      mockRequest.params = { category: 'pilot' };
      mockStatisticsService.getSkillStatisticsByCategory.mockResolvedValue(mockCategoryStats);

      await controller.getSkillStatisticsByCategory(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getSkillStatisticsByCategory).toHaveBeenCalledWith('org-123', 'pilot');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategoryStats,
        organization_id: 'org-123',
        category: 'pilot',
      });
    });

    it('should return 400 for invalid category', async () => {
      mockRequest.params = { category: 'invalid' };

      await controller.getSkillStatisticsByCategory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid category. Must be one of: pilot, engineer, medic, security, logistics, leadership',
      });
    });

    it('should return 400 if category is missing', async () => {
      mockRequest.params = {};

      await controller.getSkillStatisticsByCategory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Category is required',
      });
    });
  });

  describe('getOrganizationSkillsOverview', () => {
    it('should return organization overview', async () => {
      const mockOverview = {
        total_unique_skills: 10,
        total_skill_instances: 50,
        overall_verification_rate: 0.75,
        skills_by_category: {
          pilot: {
            unique_skills: 3,
            total_instances: 15,
            verification_rate: 0.8,
          },
        },
        top_skills: [
          {
            skill_name: 'Basic Piloting',
            member_count: 10,
            verification_rate: 0.8,
          },
        ],
        verification_trends: [
          {
            date: '2024-01-01',
            verifications_count: 5,
          },
        ],
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      mockStatisticsService.getOrganizationSkillsOverview.mockResolvedValue(mockOverview);

      await controller.getOrganizationSkillsOverview(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getOrganizationSkillsOverview).toHaveBeenCalledWith('org-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOverview,
        organization_id: 'org-123',
      });
    });
  });

  describe('getSkillStatisticsSummary', () => {
    it('should return statistics summary', async () => {
      const mockSummary = {
        total_skills: 10,
        total_members_with_skills: 50,
        overall_verification_rate: 0.75,
        most_common_skill: {
          name: 'Basic Piloting',
          member_count: 10,
        },
        least_verified_category: {
          category: 'pilot',
          verification_rate: 0.6,
        },
        recent_verifications_count: 8,
        skill_gaps_count: 3,
      };

      mockStatisticsService.getSkillStatisticsSummary.mockResolvedValue(mockSummary);

      await controller.getSkillStatisticsSummary(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getSkillStatisticsSummary).toHaveBeenCalledWith('org-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
        organization_id: 'org-123',
      });
    });
  });

  describe('getSkillVerificationTrends', () => {
    it('should return verification trends with default parameters', async () => {
      const mockTrends = [
        {
          date: '2024-01-01',
          verifications_count: 5,
        },
        {
          date: '2024-01-02',
          verifications_count: 3,
        },
      ];

      mockStatisticsService.getSkillVerificationTrends.mockResolvedValue(mockTrends);

      await controller.getSkillVerificationTrends(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getSkillVerificationTrends).toHaveBeenCalledWith('org-123', undefined, 30);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTrends,
        organization_id: 'org-123',
        skill_id: null,
        days: 30,
      });
    });

    it('should handle custom parameters', async () => {
      mockRequest.query = {
        skill_id: 'skill-123',
        days: '60',
      };

      const mockTrends = [
        {
          date: '2024-01-01',
          verifications_count: 5,
          skill_id: 'skill-123',
          skill_name: 'Pilot Training',
        },
      ];

      mockStatisticsService.getSkillVerificationTrends.mockResolvedValue(mockTrends);

      await controller.getSkillVerificationTrends(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.getSkillVerificationTrends).toHaveBeenCalledWith('org-123', 'skill-123', 60);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTrends,
        organization_id: 'org-123',
        skill_id: 'skill-123',
        days: 60,
      });
    });

    it('should return 400 for invalid days parameter', async () => {
      mockRequest.query = { days: 'invalid' };

      await controller.getSkillVerificationTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Days must be a number between 1 and 365',
      });
    });

    it('should return 400 for days out of range', async () => {
      mockRequest.query = { days: '400' };

      await controller.getSkillVerificationTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Days must be a number between 1 and 365',
      });
    });
  });

  describe('getSkillGapAnalysis', () => {
    it('should return skill gap analysis', async () => {
      const mockGaps = [
        {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          current_members: 5,
          target_members: 10,
          gap_count: 5,
          gap_percentage: 50,
          priority: 'medium' as const,
          recommended_actions: ['Recruit more pilots', 'Provide training'],
        },
      ];

      mockRequest.body = {
        target_requirements: {
          'skill-1': 10,
          'skill-2': 8,
        },
      };

      mockStatisticsService.performSkillGapAnalysis.mockResolvedValue(mockGaps);

      await controller.getSkillGapAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.performSkillGapAnalysis).toHaveBeenCalledWith('org-123', {
        'skill-1': 10,
        'skill-2': 8,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockGaps,
        organization_id: 'org-123',
        total_gaps: 1,
        high_priority_gaps: 0,
        medium_priority_gaps: 1,
        low_priority_gaps: 0,
      });
    });

    it('should handle string JSON in target_requirements', async () => {
      mockRequest.body = {
        target_requirements: '{"skill-1": 10}',
      };

      mockStatisticsService.performSkillGapAnalysis.mockResolvedValue([]);

      await controller.getSkillGapAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.performSkillGapAnalysis).toHaveBeenCalledWith('org-123', {
        'skill-1': 10,
      });
    });

    it('should return 400 for invalid JSON', async () => {
      mockRequest.body = {
        target_requirements: 'invalid json',
      };

      await controller.getSkillGapAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid target_requirements format. Must be valid JSON object.',
      });
    });
  });

  describe('refreshStatisticsCache', () => {
    it('should refresh cache successfully', async () => {
      mockStatisticsService.refreshStatisticsCache.mockResolvedValue(undefined);

      await controller.refreshStatisticsCache(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.refreshStatisticsCache).toHaveBeenCalledWith('org-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statistics cache refreshed successfully',
        organization_id: 'org-123',
        refreshed_at: expect.any(String),
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.refreshStatisticsCache(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('clearStatisticsCache', () => {
    it('should clear cache successfully', async () => {
      mockStatisticsService.invalidateSkillCache.mockResolvedValue(undefined);

      await controller.clearStatisticsCache(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.invalidateSkillCache).toHaveBeenCalledWith('org-123', undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statistics cache cleared successfully',
        organization_id: 'org-123',
        skill_id: null,
        cleared_at: expect.any(String),
      });
    });

    it('should clear specific skill cache', async () => {
      mockRequest.query = { skill_id: 'skill-123' };
      mockStatisticsService.invalidateSkillCache.mockResolvedValue(undefined);

      await controller.clearStatisticsCache(mockRequest as Request, mockResponse as Response);

      expect(mockStatisticsService.invalidateSkillCache).toHaveBeenCalledWith('org-123', 'skill-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statistics cache cleared successfully',
        organization_id: 'org-123',
        skill_id: 'skill-123',
        cleared_at: expect.any(String),
      });
    });
  });

  describe('exportSkillStatistics', () => {
    it('should export statistics as JSON', async () => {
      const mockOverview = {
        total_unique_skills: 10,
        total_skill_instances: 50,
        overall_verification_rate: 0.75,
        skills_by_category: {},
        top_skills: [],
        verification_trends: [],
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const mockAllStats = {
        'skill-1': {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          total_members: 10,
          verified_members: 8,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 2,
            intermediate: 4,
            advanced: 3,
            expert: 1,
          },
          recent_verifications: 3,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      };

      mockRequest.query = { format: 'json', include_details: 'true' };
      mockStatisticsService.getOrganizationSkillsOverview.mockResolvedValue(mockOverview);
      mockStatisticsService.getAllSkillsStatistics.mockResolvedValue(mockAllStats);

      await controller.exportSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="skill-statistics-TEST-'));
      expect(mockResponse.json).toHaveBeenCalledWith({
        organization_id: 'org-123',
        organization_name: 'Test Organization',
        exported_at: expect.any(String),
        overview: mockOverview,
        detailed_statistics: mockAllStats,
      });
    });

    it('should export statistics as CSV', async () => {
      const mockOverview = {
        total_unique_skills: 1,
        total_skill_instances: 10,
        overall_verification_rate: 0.8,
        skills_by_category: {},
        top_skills: [],
        verification_trends: [],
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const mockAllStats = {
        'skill-1': {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          total_members: 10,
          verified_members: 8,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 2,
            intermediate: 4,
            advanced: 3,
            expert: 1,
          },
          recent_verifications: 3,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      };

      mockRequest.query = { format: 'csv', include_details: 'true' };
      mockStatisticsService.getOrganizationSkillsOverview.mockResolvedValue(mockOverview);
      mockStatisticsService.getAllSkillsStatistics.mockResolvedValue(mockAllStats);

      await controller.exportSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="skill-statistics-TEST-'));
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Skill Name,Category,Total Members'));
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Pilot Training,pilot,10,8,80.00%,2,4,3,1,3'));
    });

    it('should return 400 for invalid format', async () => {
      mockRequest.query = { format: 'xml' };

      await controller.exportSkillStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Format must be either "json" or "csv"',
      });
    });
  });
});