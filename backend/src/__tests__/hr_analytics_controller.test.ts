import { Request, Response } from 'express';
import { HRAnalyticsController } from '../controllers/hr_analytics_controller';
import { HRAnalyticsModel } from '../models/hr_analytics_model';
import { HRAnalyticsService } from '../services/hr_analytics_service';

// Mock the dependencies
jest.mock('../models/hr_analytics_model');
jest.mock('../services/hr_analytics_service');

const MockHRAnalyticsModel = HRAnalyticsModel as jest.MockedClass<typeof HRAnalyticsModel>;
const MockHRAnalyticsService = HRAnalyticsService as jest.MockedClass<typeof HRAnalyticsService>;

describe('HRAnalyticsController', () => {
  let controller: HRAnalyticsController;
  let mockAnalyticsModel: jest.Mocked<HRAnalyticsModel>;
  let mockAnalyticsService: jest.Mocked<HRAnalyticsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const createMockMetrics = (overrides: any = {}) => ({
    organization_id: 'org-123',
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
    metrics: {
      applications: { 
        total_received: 10,
        approval_rate: 65,
        average_processing_time_days: 5,
        conversion_rate: 80,
        by_status: {},
        ...overrides.applications
      },
      onboarding: { 
        total_started: 8,
        completion_rate: 80,
        average_completion_time_days: 14,
        overdue_count: 2,
        by_status: {},
        ...overrides.onboarding
      },
      performance: { 
        reviews_completed: 5,
        average_rating: 4.0,
        improvement_plans_active: 3,
        goals_completion_rate: 70,
        reviews_by_status: {},
        ...overrides.performance
      },
      skills: {
        total_skills_tracked: 50,
        verification_rate: 65,
        skill_gaps: [],
        skills_by_category: {},
        proficiency_distribution: {},
        ...overrides.skills
      },
      documents: {
        total_documents: 20,
        documents_requiring_acknowledgment: 15,
        compliance_rate: 90,
        pending_acknowledgments: 5,
        ...overrides.documents
      },
      retention: { 
        member_turnover_rate: 12,
        average_tenure_days: 365,
        active_members: 50,
        new_members_period: 5,
        departed_members_period: 2,
        ...overrides.retention
      },
    },
    calculated_at: new Date(),
    ...overrides
  });

  beforeEach(() => {
    mockAnalyticsModel = new MockHRAnalyticsModel() as jest.Mocked<HRAnalyticsModel>;
    mockAnalyticsService = new MockHRAnalyticsService() as jest.Mocked<HRAnalyticsService>;
    
    controller = new HRAnalyticsController();
    (controller as any).analyticsModel = mockAnalyticsModel;
    (controller as any).analyticsService = mockAnalyticsService;

    mockRequest = {
      params: { id: 'org-123' },
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics successfully', async () => {
      const mockMetrics = {
        organization_id: 'org-123',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
        metrics: {
          applications: { 
            total_received: 10, 
            approval_rate: 65,
            average_processing_time_days: 5,
            conversion_rate: 80,
            by_status: {}
          },
          onboarding: { 
            total_started: 8,
            completion_rate: 80,
            average_completion_time_days: 14,
            overdue_count: 2,
            by_status: {}
          },
          performance: { 
            reviews_completed: 5,
            average_rating: 4.0,
            improvement_plans_active: 3,
            goals_completion_rate: 70,
            reviews_by_status: {}
          },
          skills: {
            total_skills_tracked: 50,
            verification_rate: 65,
            skill_gaps: [],
            skills_by_category: {},
            proficiency_distribution: {}
          },
          documents: {
            total_documents: 20,
            documents_requiring_acknowledgment: 15,
            compliance_rate: 90,
            pending_acknowledgments: 5
          },
          retention: { 
            member_turnover_rate: 12,
            average_tenure_days: 365,
            active_members: 50,
            new_members_period: 5,
            departed_members_period: 2
          },
        },
        calculated_at: new Date(),
      };

      const mockTrends = [
        { period: '2024-01', value: 8, change_percentage: 0 },
        { period: '2024-02', value: 10, change_percentage: 25 },
      ];

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.getCachedMetrics.mockResolvedValue(null);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockMetrics);
      mockAnalyticsModel.cacheMetrics.mockResolvedValue(undefined);
      mockAnalyticsModel.getTrendAnalysis.mockResolvedValue(mockTrends);

      await controller.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.checkOrganizationAccess).toHaveBeenCalledWith('user-123', 'org-123');
      expect(mockAnalyticsModel.calculateMetrics).toHaveBeenCalled();
      expect(mockAnalyticsModel.cacheMetrics).toHaveBeenCalledWith('org-123', mockMetrics);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: mockMetrics.metrics,
          period: expect.any(Object),
          trends: expect.any(Object),
          calculated_at: mockMetrics.calculated_at,
        })
      );
    });

    it('should return cached metrics when available', async () => {
      const mockCachedMetrics = {
        organization_id: 'org-123',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
        metrics: { 
          applications: { 
            total_received: 15,
            approval_rate: 70,
            average_processing_time_days: 5,
            conversion_rate: 85,
            by_status: {}
          },
          onboarding: { 
            total_started: 10,
            completion_rate: 85,
            average_completion_time_days: 12,
            overdue_count: 1,
            by_status: {}
          },
          performance: { 
            reviews_completed: 6,
            average_rating: 4.2,
            improvement_plans_active: 2,
            goals_completion_rate: 75,
            reviews_by_status: {}
          },
          skills: {
            total_skills_tracked: 55,
            verification_rate: 70,
            skill_gaps: [],
            skills_by_category: {},
            proficiency_distribution: {}
          },
          documents: {
            total_documents: 22,
            documents_requiring_acknowledgment: 18,
            compliance_rate: 92,
            pending_acknowledgments: 3
          },
          retention: { 
            member_turnover_rate: 10,
            average_tenure_days: 400,
            active_members: 52,
            new_members_period: 6,
            departed_members_period: 1
          }
        },
        calculated_at: new Date(),
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.getCachedMetrics.mockResolvedValue(mockCachedMetrics);
      mockAnalyticsModel.getTrendAnalysis.mockResolvedValue([]);

      await controller.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.calculateMetrics).not.toHaveBeenCalled();
      expect(mockAnalyticsModel.cacheMetrics).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 403 when user lacks organization access', async () => {
      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(false);

      await controller.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access denied to organization analytics' });
    });

    it('should handle errors gracefully', async () => {
      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.getCachedMetrics.mockRejectedValue(new Error('Database error'));

      await controller.getDashboardMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to retrieve dashboard metrics' });
    });
  });

  describe('getDetailedReports', () => {
    it('should return detailed reports with default parameters', async () => {
      const mockReportData = {
        organization_id: 'org-123',
        period_start: new Date(),
        period_end: new Date(),
        metrics: { 
          applications: { 
            total_received: 20,
            approval_rate: 65,
            average_processing_time_days: 5,
            conversion_rate: 80,
            by_status: {}
          },
          onboarding: { 
            total_started: 15,
            completion_rate: 80,
            average_completion_time_days: 14,
            overdue_count: 2,
            by_status: {}
          },
          performance: { 
            reviews_completed: 8,
            average_rating: 4.0,
            improvement_plans_active: 3,
            goals_completion_rate: 70,
            reviews_by_status: {}
          },
          skills: {
            total_skills_tracked: 60,
            verification_rate: 65,
            skill_gaps: [],
            skills_by_category: {},
            proficiency_distribution: {}
          },
          documents: {
            total_documents: 25,
            documents_requiring_acknowledgment: 20,
            compliance_rate: 90,
            pending_acknowledgments: 5
          },
          retention: { 
            member_turnover_rate: 12,
            average_tenure_days: 365,
            active_members: 55,
            new_members_period: 8,
            departed_members_period: 3
          }
        },
        calculated_at: new Date(),
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockReportData);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.calculateMetrics).toHaveBeenCalledWith(
        'org-123',
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockReportData);
    });

    it('should handle custom date range', async () => {
      mockRequest.query = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      };

      const mockReportData = {
        organization_id: 'org-123',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
        metrics: {
          applications: { 
            total_received: 12,
            approval_rate: 70,
            average_processing_time_days: 6,
            conversion_rate: 85,
            by_status: {}
          },
          onboarding: { 
            total_started: 10,
            completion_rate: 85,
            average_completion_time_days: 12,
            overdue_count: 1,
            by_status: {}
          },
          performance: { 
            reviews_completed: 6,
            average_rating: 4.1,
            improvement_plans_active: 2,
            goals_completion_rate: 75,
            reviews_by_status: {}
          },
          skills: {
            total_skills_tracked: 45,
            verification_rate: 70,
            skill_gaps: [],
            skills_by_category: {},
            proficiency_distribution: {}
          },
          documents: {
            total_documents: 18,
            documents_requiring_acknowledgment: 15,
            compliance_rate: 92,
            pending_acknowledgments: 3
          },
          retention: { 
            member_turnover_rate: 10,
            average_tenure_days: 380,
            active_members: 48,
            new_members_period: 5,
            departed_members_period: 2
          }
        },
        calculated_at: new Date(),
      };
      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockReportData);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.calculateMetrics).toHaveBeenCalledWith(
        'org-123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });

    it('should handle comparison period', async () => {
      mockRequest.query = {
        period_start: '2024-02-01',
        period_end: '2024-02-29',
        comparison_period: 'true',
      };

      const mockComparativeData = {
        current_period: {
          organization_id: 'org-123',
          period_start: new Date('2024-02-01'),
          period_end: new Date('2024-02-29'),
          metrics: {
            applications: { 
              total_received: 15,
              approval_rate: 75,
              average_processing_time_days: 5,
              conversion_rate: 85,
              by_status: {}
            },
            onboarding: { 
              total_started: 12,
              completion_rate: 85,
              average_completion_time_days: 12,
              overdue_count: 1,
              by_status: {}
            },
            performance: { 
              reviews_completed: 7,
              average_rating: 4.2,
              improvement_plans_active: 2,
              goals_completion_rate: 80,
              reviews_by_status: {}
            },
            skills: {
              total_skills_tracked: 50,
              verification_rate: 75,
              skill_gaps: [],
              skills_by_category: {},
              proficiency_distribution: {}
            },
            documents: {
              total_documents: 20,
              documents_requiring_acknowledgment: 16,
              compliance_rate: 95,
              pending_acknowledgments: 2
            },
            retention: { 
              member_turnover_rate: 8,
              average_tenure_days: 400,
              active_members: 52,
              new_members_period: 6,
              departed_members_period: 1
            }
          },
          calculated_at: new Date(),
        },
        comparison_period: {
          organization_id: 'org-123',
          period_start: new Date('2024-01-01'),
          period_end: new Date('2024-01-31'),
          metrics: {
            applications: { 
              total_received: 10,
              approval_rate: 65,
              average_processing_time_days: 7,
              conversion_rate: 80,
              by_status: {}
            },
            onboarding: { 
              total_started: 8,
              completion_rate: 75,
              average_completion_time_days: 15,
              overdue_count: 3,
              by_status: {}
            },
            performance: { 
              reviews_completed: 5,
              average_rating: 3.8,
              improvement_plans_active: 4,
              goals_completion_rate: 70,
              reviews_by_status: {}
            },
            skills: {
              total_skills_tracked: 45,
              verification_rate: 65,
              skill_gaps: [],
              skills_by_category: {},
              proficiency_distribution: {}
            },
            documents: {
              total_documents: 18,
              documents_requiring_acknowledgment: 15,
              compliance_rate: 88,
              pending_acknowledgments: 5
            },
            retention: { 
              member_turnover_rate: 12,
              average_tenure_days: 350,
              active_members: 48,
              new_members_period: 4,
              departed_members_period: 3
            }
          },
          calculated_at: new Date(),
        },
        changes: {
          applications_received: { value: 5, percentage: 50 },
          approval_rate: { value: 10, percentage: 15.4 }
        },
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.getComparativeAnalysis.mockResolvedValue(mockComparativeData);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.getComparativeAnalysis).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockComparativeData);
    });

    it('should export to CSV format', async () => {
      mockRequest.query = { format: 'csv' };
      const mockReportData = createMockMetrics();
      const mockCSVData = 'CSV,Data,Here';

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockReportData);
      mockAnalyticsService.exportToCSV.mockResolvedValue(mockCSVData);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.exportToCSV).toHaveBeenCalledWith(mockReportData);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.send).toHaveBeenCalledWith(mockCSVData);
    });

    it('should export to PDF format', async () => {
      mockRequest.query = { format: 'pdf' };
      const mockReportData = createMockMetrics();
      const mockPDFBuffer = Buffer.from('PDF content');

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockReportData);
      mockAnalyticsService.exportToPDF.mockResolvedValue(mockPDFBuffer);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.exportToPDF).toHaveBeenCalledWith(mockReportData, 'org-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.send).toHaveBeenCalledWith(mockPDFBuffer);
    });

    it('should validate date range', async () => {
      mockRequest.query = {
        period_start: '2024-01-31',
        period_end: '2024-01-01', // End before start
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Start date must be before end date' });
    });

    it('should validate maximum date range', async () => {
      mockRequest.query = {
        period_start: '2023-01-01',
        period_end: '2024-12-31', // More than 365 days
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);

      await controller.getDetailedReports(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Date range cannot exceed 365 days' });
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return trend analysis for specified metric', async () => {
      mockRequest.query = {
        metric_name: 'applications_received',
        period_months: '6',
      };

      const mockTrendData = [
        { period: '2024-01', value: 10, change_percentage: 0 },
        { period: '2024-02', value: 12, change_percentage: 20 },
      ];

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.getTrendAnalysis.mockResolvedValue(mockTrendData);

      await controller.getTrendAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.getTrendAnalysis).toHaveBeenCalledWith('org-123', 'applications_received', 6);
      expect(mockResponse.json).toHaveBeenCalledWith({
        metric_name: 'applications_received',
        period_months: 6,
        trend_data: mockTrendData,
        generated_at: expect.any(Date),
      });
    });

    it('should require metric_name parameter', async () => {
      mockRequest.query = {}; // Missing metric_name

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);

      await controller.getTrendAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'metric_name parameter is required' });
    });

    it('should validate period_months range', async () => {
      mockRequest.query = {
        metric_name: 'applications_received',
        period_months: '30', // Exceeds maximum of 24
      };

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);

      await controller.getTrendAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'period_months must be between 1 and 24' });
    });
  });

  describe('getAlerts', () => {
    it('should return alerts based on default thresholds', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          organization_id: 'org-123',
          metric_name: 'approval_rate',
          current_value: 45,
          threshold_value: 50,
          alert_level: 'warning' as const,
          message: 'Approval rate is below threshold',
          created_at: new Date(),
        },
      ];

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.checkAlerts.mockResolvedValue(mockAlerts);

      await controller.getAlerts(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.checkAlerts).toHaveBeenCalledWith('org-123', expect.any(Array));
      expect(mockResponse.json).toHaveBeenCalledWith({
        alerts: mockAlerts,
        thresholds_checked: expect.any(Number),
        generated_at: expect.any(Date),
      });
    });

    it('should return empty alerts when no thresholds are exceeded', async () => {
      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.checkAlerts.mockResolvedValue([]);

      await controller.getAlerts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        alerts: [],
        thresholds_checked: expect.any(Number),
        generated_at: expect.any(Date),
      });
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics in JSON format by default', async () => {
      mockRequest.body = {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      };

      const mockAnalyticsData = createMockMetrics();

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockAnalyticsData);

      await controller.exportAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockAnalyticsData);
    });

    it('should include trends when requested', async () => {
      mockRequest.body = {
        include_trends: true,
      };

      const mockAnalyticsData = createMockMetrics();
      const mockTrends = [{ period: '2024-01', value: 10 }];

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockAnalyticsData);
      mockAnalyticsModel.getTrendAnalysis.mockResolvedValue(mockTrends);

      await controller.exportAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsModel.getTrendAnalysis).toHaveBeenCalledTimes(3); // Called for 3 different metrics
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          trends: expect.any(Object),
        })
      );
    });

    it('should export to Excel format', async () => {
      mockRequest.body = { format: 'excel' };
      const mockAnalyticsData = createMockMetrics();
      const mockExcelBuffer = Buffer.from('Excel content');

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockAnalyticsData);
      mockAnalyticsService.exportToExcel.mockResolvedValue(mockExcelBuffer);

      await controller.exportAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.exportToExcel).toHaveBeenCalledWith(mockAnalyticsData);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockExcelBuffer);
    });
  });

  describe('getSummaryMetrics', () => {
    it('should return summary metrics for last 30 days', async () => {
      const mockMetrics = createMockMetrics({
        applications: { total_received: 15, approval_rate: 70 },
        onboarding: { completion_rate: 85 },
        performance: { average_rating: 4.2 },
        skills: { verification_rate: 75 },
        documents: { compliance_rate: 92 },
        retention: { active_members: 50 }
      });

      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(mockMetrics);

      await controller.getSummaryMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          active_members: 50,
          applications_received: 15,
          approval_rate: 70,
          onboarding_completion_rate: 85,
          average_performance_rating: 4.2,
          skill_verification_rate: 75,
          document_compliance_rate: 92,
          period: expect.any(Object),
          calculated_at: expect.any(Date),
        })
      );
    });
  });

  describe('refreshCache', () => {
    it('should refresh cache for multiple periods', async () => {
      mockAnalyticsService.checkOrganizationAccess.mockResolvedValue(true);
      mockAnalyticsService.clearCache.mockResolvedValue(undefined);
      mockAnalyticsModel.calculateMetrics.mockResolvedValue(createMockMetrics());
      mockAnalyticsModel.cacheMetrics.mockResolvedValue(undefined);

      await controller.refreshCache(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.clearCache).toHaveBeenCalledWith('org-123');
      expect(mockAnalyticsModel.calculateMetrics).toHaveBeenCalledTimes(3); // For 3 different periods
      expect(mockAnalyticsModel.cacheMetrics).toHaveBeenCalledTimes(3);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Analytics cache refreshed successfully',
          periods_refreshed: expect.any(Array),
          refreshed_at: expect.any(Date),
        })
      );
    });
  });
});