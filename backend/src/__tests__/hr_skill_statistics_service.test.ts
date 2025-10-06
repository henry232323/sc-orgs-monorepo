import { HRSkillStatisticsService } from '../services/hr_skill_statistics_service';
import { HRSkillModel } from '../models/hr_skill_model';

// Mock the dependencies
jest.mock('../models/hr_skill_model');
jest.mock('../config/logger');

const mockSkillModel = {
  getSkillStatistics: jest.fn(),
  findSkillById: jest.fn(),
  getAllSkillsStatistics: jest.fn(),
  getSkillStatisticsByCategory: jest.fn(),
  getSkillVerificationTrends: jest.fn(),
  getOrganizationSkillsOverview: jest.fn(),
};

// Mock the constructor
(HRSkillModel as jest.MockedClass<typeof HRSkillModel>).mockImplementation(() => mockSkillModel as any);

describe('HRSkillStatisticsService', () => {
  let service: HRSkillStatisticsService;
  const organizationId = 'org-123';
  const skillId = 'skill-456';

  beforeEach(() => {
    service = new HRSkillStatisticsService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear cache after each test
    service.clearCache();
  });

  describe('getSkillStatistics', () => {
    it('should return skill statistics with skill details', async () => {
      const mockStats = {
        skill_id: skillId,
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
      };

      const mockSkill = {
        id: skillId,
        name: 'Pilot Training',
        category: 'pilot',
        description: 'Basic pilot training',
        verification_required: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSkillModel.getSkillStatistics.mockResolvedValue(mockStats);
      mockSkillModel.findSkillById.mockResolvedValue(mockSkill);

      const result = await service.getSkillStatistics(organizationId, skillId);

      expect(result).toEqual({
        skill_id: skillId,
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
        last_updated: expect.any(String),
      });

      expect(mockSkillModel.getSkillStatistics).toHaveBeenCalledWith(organizationId, skillId);
      expect(mockSkillModel.findSkillById).toHaveBeenCalledWith(skillId);
    });

    it('should throw error if skill not found', async () => {
      mockSkillModel.getSkillStatistics.mockResolvedValue({
        skill_id: skillId,
        total_members: 0,
        verified_members: 0,
        verification_rate: 0,
        proficiency_breakdown: {
          beginner: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0,
        },
        recent_verifications: 0,
      });
      mockSkillModel.findSkillById.mockResolvedValue(null);

      await expect(service.getSkillStatistics(organizationId, skillId))
        .rejects.toThrow('Skill not found');
    });

    it('should use cached data on subsequent calls', async () => {
      const mockStats = {
        skill_id: skillId,
        total_members: 5,
        verified_members: 3,
        verification_rate: 0.6,
        proficiency_breakdown: {
          beginner: 1,
          intermediate: 2,
          advanced: 2,
          expert: 0,
        },
        recent_verifications: 1,
      };

      const mockSkill = {
        id: skillId,
        name: 'Engineering',
        category: 'engineer',
        description: 'Engineering skills',
        verification_required: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSkillModel.getSkillStatistics.mockResolvedValue(mockStats);
      mockSkillModel.findSkillById.mockResolvedValue(mockSkill);

      // First call
      await service.getSkillStatistics(organizationId, skillId);
      
      // Second call should use cache
      await service.getSkillStatistics(organizationId, skillId);

      // Should only call the model once
      expect(mockSkillModel.getSkillStatistics).toHaveBeenCalledTimes(1);
      expect(mockSkillModel.findSkillById).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllSkillsStatistics', () => {
    it('should return all skills statistics with filters applied', async () => {
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
        },
        'skill-2': {
          skill_id: 'skill-2',
          skill_name: 'Engineering',
          skill_category: 'engineer',
          total_members: 0,
          verified_members: 0,
          verification_rate: 0,
          proficiency_breakdown: {
            beginner: 0,
            intermediate: 0,
            advanced: 0,
            expert: 0,
          },
          recent_verifications: 0,
        },
      };

      mockSkillModel.getAllSkillsStatistics.mockResolvedValue(mockAllStats);

      const filters = {
        category: 'pilot',
        include_zero_members: false,
      };

      const result = await service.getAllSkillsStatistics(organizationId, filters);

      // Should only include pilot skills with members
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['skill-1']).toBeDefined();
      expect(result['skill-2']).toBeUndefined();
      expect(result['skill-1'].last_updated).toBeDefined();
    });

    it('should include zero member skills when filter is set', async () => {
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
        },
        'skill-2': {
          skill_id: 'skill-2',
          skill_name: 'Engineering',
          skill_category: 'engineer',
          total_members: 0,
          verified_members: 0,
          verification_rate: 0,
          proficiency_breakdown: {
            beginner: 0,
            intermediate: 0,
            advanced: 0,
            expert: 0,
          },
          recent_verifications: 0,
        },
      };

      mockSkillModel.getAllSkillsStatistics.mockResolvedValue(mockAllStats);

      const filters = {
        include_zero_members: true,
      };

      const result = await service.getAllSkillsStatistics(organizationId, filters);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['skill-1']).toBeDefined();
      expect(result['skill-2']).toBeDefined();
    });
  });

  describe('getSkillStatisticsByCategory', () => {
    it('should return category statistics with calculated metrics', async () => {
      const mockCategorySkills = [
        {
          skill_id: 'skill-1',
          skill_name: 'Basic Piloting',
          total_members: 10,
          verified_members: 8,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 3,
            intermediate: 4,
            advanced: 2,
            expert: 1,
          },
          recent_verifications: 2,
        },
        {
          skill_id: 'skill-2',
          skill_name: 'Advanced Piloting',
          total_members: 5,
          verified_members: 4,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 1,
            intermediate: 2,
            advanced: 1,
            expert: 1,
          },
          recent_verifications: 1,
        },
      ];

      mockSkillModel.getSkillStatisticsByCategory.mockResolvedValue(mockCategorySkills);

      const result = await service.getSkillStatisticsByCategory(organizationId, 'pilot');

      expect(result).toEqual({
        category: 'pilot',
        unique_skills: 2,
        total_instances: 15, // 10 + 5
        verification_rate: 0.8, // (8 + 4) / (10 + 5)
        average_proficiency: expect.any(Number),
        top_skills: [
          {
            skill_name: 'Basic Piloting',
            member_count: 10,
            verification_rate: 0.8,
          },
          {
            skill_name: 'Advanced Piloting',
            member_count: 5,
            verification_rate: 0.8,
          },
        ],
      });

      expect(mockSkillModel.getSkillStatisticsByCategory).toHaveBeenCalledWith(organizationId, 'pilot');
    });
  });

  describe('getSkillVerificationTrends', () => {
    it('should return verification trends', async () => {
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

      mockSkillModel.getSkillVerificationTrends.mockResolvedValue(mockTrends);

      const result = await service.getSkillVerificationTrends(organizationId, skillId, 30);

      expect(result).toEqual(mockTrends);
      expect(mockSkillModel.getSkillVerificationTrends).toHaveBeenCalledWith(organizationId, skillId, 30);
    });
  });

  describe('getOrganizationSkillsOverview', () => {
    it('should return comprehensive overview with last_updated', async () => {
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
          engineer: {
            unique_skills: 4,
            total_instances: 20,
            verification_rate: 0.7,
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
      };

      mockSkillModel.getOrganizationSkillsOverview.mockResolvedValue(mockOverview);

      const result = await service.getOrganizationSkillsOverview(organizationId);

      expect(result).toEqual({
        ...mockOverview,
        last_updated: expect.any(String),
      });
      expect(mockSkillModel.getOrganizationSkillsOverview).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('performSkillGapAnalysis', () => {
    it('should identify skill gaps based on target requirements', async () => {
      const mockAllStats = {
        'skill-1': {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          total_members: 5,
          verified_members: 4,
          verification_rate: 0.8,
          proficiency_breakdown: {
            beginner: 1,
            intermediate: 2,
            advanced: 2,
            expert: 0,
          },
          recent_verifications: 1,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
        'skill-2': {
          skill_id: 'skill-2',
          skill_name: 'Engineering',
          skill_category: 'engineer',
          total_members: 2,
          verified_members: 1,
          verification_rate: 0.5,
          proficiency_breakdown: {
            beginner: 1,
            intermediate: 1,
            advanced: 0,
            expert: 0,
          },
          recent_verifications: 0,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      };

      // Mock the getAllSkillsStatistics method on the service instance
      jest.spyOn(service, 'getAllSkillsStatistics').mockResolvedValue(mockAllStats);

      const targetRequirements = {
        'skill-1': 10, // Need 5 more
        'skill-2': 8,  // Need 6 more
      };

      const result = await service.performSkillGapAnalysis(organizationId, targetRequirements);

      expect(result).toHaveLength(2);
      
      // Should be sorted by priority and gap percentage
      expect(result[0].skill_id).toBe('skill-2'); // Higher gap percentage
      expect(result[0].gap_count).toBe(6);
      expect(result[0].gap_percentage).toBe(75); // 6/8 * 100
      expect(result[0].priority).toBe('high');
      
      expect(result[1].skill_id).toBe('skill-1');
      expect(result[1].gap_count).toBe(5);
      expect(result[1].gap_percentage).toBe(50); // 5/10 * 100
      expect(result[1].priority).toBe('medium');
    });

    it('should generate automatic targets when none provided', async () => {
      const mockAllStats = {
        'skill-1': {
          skill_id: 'skill-1',
          skill_name: 'Pilot Training',
          skill_category: 'pilot',
          total_members: 2,
          verified_members: 2,
          verification_rate: 1.0,
          proficiency_breakdown: {
            beginner: 0,
            intermediate: 1,
            advanced: 1,
            expert: 0,
          },
          recent_verifications: 0,
          last_updated: '2024-01-01T00:00:00.000Z',
        },
      };

      const mockOverview = {
        total_unique_skills: 1,
        total_skill_instances: 2,
        overall_verification_rate: 1.0,
        skills_by_category: {},
        top_skills: [],
        verification_trends: [],
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      jest.spyOn(service, 'getAllSkillsStatistics').mockResolvedValue(mockAllStats);
      jest.spyOn(service, 'getOrganizationSkillsOverview').mockResolvedValue(mockOverview);

      const result = await service.performSkillGapAnalysis(organizationId);

      expect(result).toHaveLength(1);
      expect(result[0].target_members).toBe(3); // Math.max(Math.ceil(2/1), 3) = 3
      expect(result[0].gap_count).toBe(1);
    });
  });

  describe('getSkillStatisticsSummary', () => {
    it('should return comprehensive summary', async () => {
      const mockOverview = {
        total_unique_skills: 10,
        total_skill_instances: 50,
        overall_verification_rate: 0.75,
        skills_by_category: {
          pilot: {
            unique_skills: 3,
            total_instances: 15,
            verification_rate: 0.6,
          },
          engineer: {
            unique_skills: 4,
            total_instances: 20,
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
          {
            date: '2024-01-02',
            verifications_count: 3,
          },
        ],
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      const mockGaps = [
        {
          skill_id: 'skill-1',
          skill_name: 'Test Skill',
          skill_category: 'pilot',
          current_members: 5,
          target_members: 10,
          gap_count: 5,
          gap_percentage: 50,
          priority: 'medium' as const,
          recommended_actions: ['Recruit more members'],
        },
      ];

      jest.spyOn(service, 'getOrganizationSkillsOverview').mockResolvedValue(mockOverview);
      jest.spyOn(service, 'performSkillGapAnalysis').mockResolvedValue(mockGaps);

      const result = await service.getSkillStatisticsSummary(organizationId);

      expect(result).toEqual({
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
        recent_verifications_count: 8, // 5 + 3
        skill_gaps_count: 1,
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific organization', () => {
      // Add some mock cache entries
      service['cache'].set('skill_stats_org1_skill1', { data: {}, timestamp: Date.now() });
      service['cache'].set('skill_stats_org2_skill1', { data: {}, timestamp: Date.now() });
      service['cache'].set('overview_org1', { data: {}, timestamp: Date.now() });

      service.clearCache('org1');

      expect(service['cache'].has('skill_stats_org1_skill1')).toBe(false);
      expect(service['cache'].has('overview_org1')).toBe(false);
      expect(service['cache'].has('skill_stats_org2_skill1')).toBe(true);
    });

    it('should clear all cache when no organization specified', () => {
      service['cache'].set('skill_stats_org1_skill1', { data: {}, timestamp: Date.now() });
      service['cache'].set('skill_stats_org2_skill1', { data: {}, timestamp: Date.now() });

      service.clearCache();

      expect(service['cache'].size).toBe(0);
    });

    it('should invalidate specific skill cache', async () => {
      service['cache'].set('skill_stats_org1_skill1', { data: {}, timestamp: Date.now() });
      service['cache'].set('all_skills_stats_org1_{}', { data: {}, timestamp: Date.now() });
      service['cache'].set('skill_stats_org1_skill2', { data: {}, timestamp: Date.now() });

      await service.invalidateSkillCache('org1', 'skill1');

      // Only keys that include both org1 and skill1 should be deleted
      expect(service['cache'].has('skill_stats_org1_skill1')).toBe(false);
      expect(service['cache'].has('all_skills_stats_org1_{}')).toBe(true); // Should NOT be cleared since it doesn't include skill1
      expect(service['cache'].has('skill_stats_org1_skill2')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle model errors gracefully', async () => {
      mockSkillModel.getSkillStatistics.mockRejectedValue(new Error('Database error'));

      await expect(service.getSkillStatistics(organizationId, skillId))
        .rejects.toThrow('Database error');
    });

    it('should return cached data when fresh fetch fails', async () => {
      const cachedData = {
        skill_id: skillId,
        skill_name: 'Cached Skill',
        skill_category: 'pilot',
        total_members: 5,
        verified_members: 3,
        verification_rate: 0.6,
        proficiency_breakdown: {
          beginner: 1,
          intermediate: 2,
          advanced: 2,
          expert: 0,
        },
        recent_verifications: 1,
        last_updated: '2024-01-01T00:00:00.000Z',
      };

      // Set up cache with expired data
      const expiredTimestamp = Date.now() - (service['cacheTimeout'] + 1000);
      service['cache'].set(`skill_stats_${organizationId}_${skillId}`, {
        data: cachedData,
        timestamp: expiredTimestamp,
      });

      // Mock model to fail
      mockSkillModel.getSkillStatistics.mockRejectedValue(new Error('Database error'));
      mockSkillModel.findSkillById.mockRejectedValue(new Error('Database error'));

      const result = await service.getSkillStatistics(organizationId, skillId);

      expect(result).toEqual(cachedData);
    });
  });
});