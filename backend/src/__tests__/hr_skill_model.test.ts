import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock Knex before importing anything that uses it
jest.mock('../config/database', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
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
    orWhere: jest.fn().mockReturnThis(),
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
import { HRSkillModel } from '../models/hr_skill_model';
import db from '../config/database';

describe('HRSkillModel', () => {
  let skillModel: HRSkillModel;
  let testSkillId: string;
  let testUserId: string;
  let testOrganizationId: string;

  beforeEach(() => {
    skillModel = new HRSkillModel();
    testSkillId = uuidv4();
    testUserId = uuidv4();
    testOrganizationId = uuidv4();
    jest.clearAllMocks();
  });

  describe('createSkill', () => {
    it('should create a new skill successfully', async () => {
      const skillData = {
        name: 'Advanced Piloting',
        category: 'pilot' as const,
        description: 'Advanced spacecraft piloting skills',
        verification_required: true,
      };

      const mockSkill = {
        id: testSkillId,
        ...skillData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockSkill]),
        }),
      });

      const result = await skillModel.createSkill(skillData);

      expect(result).toEqual(mockSkill);
      expect(db).toHaveBeenCalledWith('hr_skills');
    });
  });

  describe('findSkillById', () => {
    it('should find skill by ID', async () => {
      const mockSkill = {
        id: testSkillId,
        name: 'Combat Tactics',
        category: 'security' as const,
        verification_required: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockSkill),
        }),
      });

      const result = await skillModel.findSkillById(testSkillId);

      expect(result).toEqual(mockSkill);
      expect(db).toHaveBeenCalledWith('hr_skills');
    });

    it('should return null if skill not found', async () => {
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await skillModel.findSkillById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('createUserSkill', () => {
    it('should create a user skill successfully', async () => {
      const userSkillData = {
        user_id: testUserId,
        skill_id: testSkillId,
        proficiency_level: 'intermediate' as const,
        notes: 'Good understanding of basics',
      };

      const mockUserSkill = {
        id: uuidv4(),
        ...userSkillData,
        verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUserSkill]),
        }),
      });

      const result = await skillModel.createUserSkill(userSkillData);

      expect(result).toEqual(mockUserSkill);
      expect(result.verified).toBe(false);
      expect(db).toHaveBeenCalledWith('hr_user_skills');
    });
  });

  describe('createCertification', () => {
    it('should create a certification successfully', async () => {
      const certificationData = {
        user_id: testUserId,
        organization_id: testOrganizationId,
        name: 'Advanced Pilot License',
        description: 'Certification for advanced piloting skills',
        issued_date: new Date(),
        expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        issued_by: uuidv4(),
        certificate_url: 'https://example.com/cert.pdf',
      };

      const mockCertification = {
        id: uuidv4(),
        ...certificationData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCertification]),
        }),
      });

      const result = await skillModel.createCertification(certificationData);

      expect(result).toEqual(mockCertification);
      expect(db).toHaveBeenCalledWith('hr_certifications');
    });
  });

  describe('getSkillAnalytics', () => {
    it('should generate comprehensive skill analytics', async () => {
      const mockSkillStats = {
        total_skills: '25',
        verified_skills: '20',
      };

      const mockCategoryStats = [
        { category: 'pilot', count: '10' },
        { category: 'engineer', count: '8' },
      ];

      const mockProficiencyStats = [
        { proficiency_level: 'beginner', count: '5' },
        { proficiency_level: 'intermediate', count: '10' },
      ];

      // Mock the three separate queries
      (db as any)
        .mockReturnValueOnce({
          join: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockSkillStats),
          }),
        })
        .mockReturnValueOnce({
          join: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockResolvedValue(mockCategoryStats),
        })
        .mockReturnValueOnce({
          join: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockResolvedValue(mockProficiencyStats),
        });

      const result = await skillModel.getSkillAnalytics(testOrganizationId);

      expect(result.total_skills_tracked).toBe(25);
      expect(result.verification_rate).toBe(80); // 20/25 * 100
      expect(result.skills_by_category).toEqual({
        pilot: 10,
        engineer: 8,
      });
      expect(result.proficiency_distribution).toEqual({
        beginner: 5,
        intermediate: 10,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (db as any).mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      await expect(skillModel.createSkill({
        name: 'Test Skill',
        category: 'pilot',
      })).rejects.toThrow('Database connection failed');
    });
  });
});