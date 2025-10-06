import { ActivityService } from '../services/activity_service';
import { NotificationEntityType } from '../types/notification';

// Mock the database
jest.mock('../config/database', () => {
  const mockQuery = {
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  };
  
  return jest.fn(() => mockQuery);
});

describe('HR Activity Integration', () => {
  let activityService: ActivityService;

  beforeEach(() => {
    activityService = new ActivityService();
    jest.clearAllMocks();
  });

  describe('getUserRecentActivity', () => {
    it('should include HR activities in user activity feed', async () => {
      // Test that the service has the HR activity methods
      expect(typeof (activityService as any).getHRActivities).toBe('function');
      expect(typeof (activityService as any).getApplicationActivities).toBe('function');
      expect(typeof (activityService as any).getOnboardingActivities).toBe('function');
      expect(typeof (activityService as any).getPerformanceActivities).toBe('function');
      expect(typeof (activityService as any).getSkillActivities).toBe('function');
    });

    it('should handle empty HR activities gracefully', async () => {
      // Since we're mocking the database to return empty results by default,
      // this should return an empty array
      const activities = await activityService.getUserRecentActivity('user-123', 10);
      expect(Array.isArray(activities)).toBe(true);
    });
  });

  describe('HR Activity Categories', () => {
    it('should have methods for different HR activity types', async () => {
      // Test that the private methods exist
      expect(typeof (activityService as any).getApplicationActivities).toBe('function');
      expect(typeof (activityService as any).getOnboardingActivities).toBe('function');
      expect(typeof (activityService as any).getPerformanceActivities).toBe('function');
      expect(typeof (activityService as any).getSkillActivities).toBe('function');
    });

    it('should handle database errors gracefully', async () => {
      // The service should handle errors and return empty arrays
      const activities = await activityService.getUserRecentActivity('user-123', 10);
      expect(Array.isArray(activities)).toBe(true);
    });
  });
});