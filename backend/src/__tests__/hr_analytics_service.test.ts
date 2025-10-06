import { HRAnalyticsService } from '../services/hr_analytics_service';
import db from '../config/database';

// Mock the database
jest.mock('../config/database', () => {
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn(),
    del: jest.fn(),
  };
  
  return jest.fn(() => mockQuery);
});

const mockDb = db as jest.MockedFunction<typeof db>;

describe('HRAnalyticsService', () => {
  let analyticsService: HRAnalyticsService;

  beforeEach(() => {
    analyticsService = new HRAnalyticsService();
    jest.clearAllMocks();
  });

  describe('checkOrganizationAccess', () => {
    it('should have checkOrganizationAccess method', () => {
      expect(typeof analyticsService.checkOrganizationAccess).toBe('function');
    });
  });

  describe('clearCache', () => {
    it('should have clearCache method', () => {
      expect(typeof analyticsService.clearCache).toBe('function');
    });
  });

  describe('exportToCSV', () => {
    it('should export analytics data to CSV format', async () => {
      const analyticsData = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        metrics: {
          applications: {
            total_received: 10,
            approval_rate: 65,
          },
        },
      };

      const result = await analyticsService.exportToCSV(analyticsData);

      expect(result).toContain('Metric Category,Metric Name,Value,Period Start,Period End');
      expect(result).toContain('Applications,Total Received,10');
    });

    it('should handle empty data gracefully', async () => {
      const analyticsData = {};

      const result = await analyticsService.exportToCSV(analyticsData);

      expect(result).toContain('Metric Category,Metric Name,Value,Period Start,Period End');
    });
  });

  describe('exportToPDF', () => {
    it('should export analytics data to PDF format', async () => {
      const analyticsData = {
        metrics: {
          applications: { total_received: 10, approval_rate: 65 },
        },
      };
      const organizationId = 'org-123';

      const result = await analyticsService.exportToPDF(analyticsData, organizationId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('HR Analytics Report');
    });
  });

  describe('exportToExcel', () => {
    it('should export analytics data to Excel format', async () => {
      const analyticsData = {
        metrics: {
          applications: { total_received: 10 },
        },
      };

      const result = await analyticsService.exportToExcel(analyticsData);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generatePredictiveInsights', () => {
    it('should generate predictive insights with sufficient data', async () => {
      const organizationId = 'org-123';
      const metricName = 'applications_received';
      const historicalData = [
        { value: 8 },
        { value: 10 },
        { value: 12 },
        { value: 14 },
        { value: 16 },
      ];

      const result = await analyticsService.generatePredictiveInsights(organizationId, metricName, historicalData);

      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('insights');
    });

    it('should handle insufficient data', async () => {
      const organizationId = 'org-123';
      const metricName = 'applications_received';
      const historicalData = [{ value: 10 }, { value: 12 }];

      const result = await analyticsService.generatePredictiveInsights(organizationId, metricName, historicalData);

      expect(result.insights).toContain('Insufficient data for prediction');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies', async () => {
      const metricName = 'applications_received';
      const currentValue = 50;
      const historicalData = [
        { value: 10 },
        { value: 12 },
        { value: 11 },
        { value: 9 },
        { value: 13 },
      ];

      const result = await analyticsService.detectAnomalies(metricName, currentValue, historicalData);

      expect(result).toHaveProperty('isAnomaly');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('description');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations', async () => {
      const organizationId = 'org-123';
      const metrics = {
        applications: {
          total_received: 20,
          approval_rate: 40,
          average_processing_time_days: 7,
          conversion_rate: 80,
          by_status: {},
        },
        onboarding: {
          total_started: 10,
          completion_rate: 85,
          average_completion_time_days: 12,
          overdue_count: 2,
          by_status: {},
        },
        performance: {
          reviews_completed: 8,
          average_rating: 4.0,
          improvement_plans_active: 2,
          goals_completion_rate: 75,
          reviews_by_status: {},
        },
        skills: {
          total_skills_tracked: 50,
          verification_rate: 70,
          skill_gaps: [],
          skills_by_category: {},
          proficiency_distribution: {},
        },
        documents: {
          total_documents: 25,
          documents_requiring_acknowledgment: 20,
          compliance_rate: 95,
          pending_acknowledgments: 3,
        },
        retention: {
          member_turnover_rate: 10,
          average_tenure_days: 400,
          active_members: 60,
          new_members_period: 8,
          departed_members_period: 3,
        },
      };

      const result = await analyticsService.generateRecommendations(organizationId, metrics);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('calculateBenchmarks', () => {
    it('should return benchmarks for organizations', async () => {
      const organizationId = 'org-123';
      const organizationSize = 'small';

      const result = await analyticsService.calculateBenchmarks(organizationId, organizationSize);

      expect(result).toHaveProperty('approval_rate');
      expect(result).toHaveProperty('onboarding_completion_rate');
      expect(result).toHaveProperty('average_performance_rating');
    });
  });
});