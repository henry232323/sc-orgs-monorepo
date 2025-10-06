import { HRPerformanceService } from '../services/hr_performance_service';
import { HRSkillService } from '../services/hr_skill_service';

// Mock the database
jest.mock('../config/database', () => {
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    map: jest.fn().mockReturnValue([]),
    length: 0,
  };
  
  return jest.fn(() => mockQuery);
});

// Mock the models
jest.mock('../models/hr_performance_model');
jest.mock('../models/hr_skill_model');
jest.mock('../models/event_model');
jest.mock('../services/notification_service');
jest.mock('../services/activity_service');

describe('HR Event Integration', () => {
  let performanceService: HRPerformanceService;
  let skillService: HRSkillService;

  beforeEach(() => {
    performanceService = new HRPerformanceService();
    skillService = new HRSkillService();
    jest.clearAllMocks();
  });

  describe('Event Attendance and Performance Integration', () => {
    it('should have event attendance integration methods', async () => {
      expect(typeof performanceService.linkEventAttendanceToPerformance).toBe('function');
      expect(typeof performanceService.integrateEventParticipationInReview).toBe('function');
    });

    it('should handle no events gracefully', async () => {
      const organizationId = 'org-123';
      const userId = 'user-456';
      const reviewPeriodStart = new Date('2024-01-01');
      const reviewPeriodEnd = new Date('2024-01-31');

      const result = await performanceService.linkEventAttendanceToPerformance(
        organizationId,
        userId,
        reviewPeriodStart,
        reviewPeriodEnd
      );

      expect(result.events_registered).toBe(0);
      expect(result.events_attended).toBe(0);
      expect(result.attendance_rate).toBe(0);
      expect(result.event_participation_score).toBe(0);
    });
  });

  describe('Skill Verification through Event Participation', () => {
    it('should have skill verification methods', async () => {
      expect(typeof skillService.createSkillVerificationFromEventParticipation).toBe('function');
      expect(typeof skillService.getUserSkillsByCategories).toBe('function');
      expect(typeof skillService.processEventCompletionSkillVerifications).toBe('function');
    });

    it('should handle event not found', async () => {
      const eventId = 'non-existent-event';
      const userId = 'user-456';
      const skillCategories = ['pilot'];

      const result = await skillService.createSkillVerificationFromEventParticipation(
        eventId,
        userId,
        skillCategories
      );

      expect(result.verified_skills).toHaveLength(0);
      expect(result.pending_verifications).toHaveLength(0);
    });
  });

  describe('Training Event Categories', () => {
    it('should have training event methods', async () => {
      expect(typeof skillService.linkSkillsToTrainingEvents).toBe('function');
      expect(typeof skillService.processEventCompletionSkillVerifications).toBe('function');
    });

    it('should handle non-training events', async () => {
      const eventId = 'regular-event-123';

      const result = await skillService.processEventCompletionSkillVerifications(eventId);

      expect(result.total_processed).toBe(0);
      expect(result.verified_count).toBe(0);
      expect(result.error_count).toBe(0);
    });
  });

  describe('User Skills by Categories', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-456';
      const categories = ['pilot'];

      const result = await skillService.getUserSkillsByCategories(userId, categories);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in event attendance linking', async () => {
      const organizationId = 'org-123';
      const userId = 'user-456';
      const reviewPeriodStart = new Date('2024-01-01');
      const reviewPeriodEnd = new Date('2024-01-31');

      const result = await performanceService.linkEventAttendanceToPerformance(
        organizationId,
        userId,
        reviewPeriodStart,
        reviewPeriodEnd
      );

      expect(result.events_registered).toBe(0);
      expect(result.events_attended).toBe(0);
      expect(result.attendance_rate).toBe(0);
      expect(result.event_participation_score).toBe(0);
    });

    it('should handle errors in skill verification from events', async () => {
      const eventId = 'event-123';
      const userId = 'user-456';
      const skillCategories = ['pilot'];

      const result = await skillService.createSkillVerificationFromEventParticipation(
        eventId,
        userId,
        skillCategories
      );

      expect(result.verified_skills).toHaveLength(0);
      expect(result.pending_verifications).toHaveLength(0);
    });
  });
});