import { Request, Response } from 'express';
import { HRAnalyticsModel, AlertThreshold } from '../models/hr_analytics_model';
import { HRAnalyticsService } from '../services/hr_analytics_service';
import { getUserFromRequest } from '../utils/user-casting';

export class HRAnalyticsController {
  private analyticsModel: HRAnalyticsModel;
  private analyticsService: HRAnalyticsService;

  constructor() {
    this.analyticsModel = new HRAnalyticsModel();
    this.analyticsService = new HRAnalyticsService();
  }

  /**
   * GET /api/organizations/:id/hr-analytics/dashboard
   * Get main HR analytics dashboard metrics
   */
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const { period_days = '30' } = req.query;

      // Validate organization access
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user has access to this organization
      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      const periodDays = parseInt(period_days as string);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Try to get cached metrics first
      let metrics = await this.analyticsModel.getCachedMetrics(
        organizationId,
        startDate,
        endDate,
        60 // 1 hour cache
      );

      if (!metrics) {
        // Calculate fresh metrics
        metrics = await this.analyticsModel.calculateMetrics(
          organizationId,
          startDate,
          endDate
        );

        // Cache the results
        await this.analyticsModel.cacheMetrics(organizationId, metrics);
      }

      // Get trend data for key metrics
      const [
        applicationsTrend,
        onboardingTrend,
        performanceTrend,
        retentionTrend,
      ] = await Promise.all([
        this.analyticsModel.getTrendAnalysis(organizationId, 'applications_received', 6),
        this.analyticsModel.getTrendAnalysis(organizationId, 'onboarding_completion_rate', 6),
        this.analyticsModel.getTrendAnalysis(organizationId, 'average_performance_rating', 6),
        this.analyticsModel.getTrendAnalysis(organizationId, 'turnover_rate', 6),
      ]);

      const dashboardData = {
        metrics: metrics.metrics,
        period: {
          start: metrics.period_start,
          end: metrics.period_end,
          days: periodDays,
        },
        trends: {
          applications: applicationsTrend,
          onboarding: onboardingTrend,
          performance: performanceTrend,
          retention: retentionTrend,
        },
        calculated_at: metrics.calculated_at,
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
    }
  }

  /**
   * GET /api/organizations/:id/hr-analytics/reports
   * Get detailed HR analytics reports with filtering options
   */
  async getDetailedReports(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const {
        period_start,
        period_end,
        metrics = 'all',
        comparison_period = 'false',
        format = 'json',
      } = req.query;

      // Validate organization access
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      // Parse date parameters
      let startDate: Date;
      let endDate: Date;

      if (period_start && period_end) {
        startDate = new Date(period_start as string);
        endDate = new Date(period_end as string);
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Validate date range
      if (startDate >= endDate) {
        res.status(400).json({ error: 'Start date must be before end date' });
        return;
      }

      const maxDays = 365;
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        res.status(400).json({ error: `Date range cannot exceed ${maxDays} days` });
        return;
      }

      let reportData: any;

      if (comparison_period === 'true') {
        // Generate comparative analysis
        const periodLength = endDate.getTime() - startDate.getTime();
        const comparisonEndDate = new Date(startDate.getTime() - 1);
        const comparisonStartDate = new Date(comparisonEndDate.getTime() - periodLength);

        reportData = await this.analyticsModel.getComparativeAnalysis(
          organizationId,
          startDate,
          endDate,
          comparisonStartDate,
          comparisonEndDate
        );
      } else {
        // Generate standard metrics
        reportData = await this.analyticsModel.calculateMetrics(
          organizationId,
          startDate,
          endDate
        );
      }

      // Filter metrics if specific ones requested
      if (metrics !== 'all') {
        const requestedMetrics = (metrics as string).split(',');
        const filteredMetrics: any = {};
        
        for (const metric of requestedMetrics) {
          if (reportData.metrics && reportData.metrics[metric]) {
            filteredMetrics[metric] = reportData.metrics[metric];
          }
        }
        
        if (comparison_period === 'true') {
          reportData.current_period.metrics = filteredMetrics;
          // Also filter comparison period metrics
          const filteredComparisonMetrics: any = {};
          for (const metric of requestedMetrics) {
            if (reportData.comparison_period.metrics && reportData.comparison_period.metrics[metric]) {
              filteredComparisonMetrics[metric] = reportData.comparison_period.metrics[metric];
            }
          }
          reportData.comparison_period.metrics = filteredComparisonMetrics;
        } else {
          reportData.metrics = filteredMetrics;
        }
      }

      // Handle different export formats
      if (format === 'csv') {
        const csvData = await this.analyticsService.exportToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="hr-analytics-${organizationId}-${startDate.toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
        return;
      } else if (format === 'pdf') {
        const pdfBuffer = await this.analyticsService.exportToPDF(reportData, organizationId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="hr-analytics-${organizationId}-${startDate.toISOString().split('T')[0]}.pdf"`);
        res.send(pdfBuffer);
        return;
      }

      res.json(reportData);
    } catch (error) {
      console.error('Error getting detailed reports:', error);
      res.status(500).json({ error: 'Failed to retrieve detailed reports' });
    }
  }

  /**
   * GET /api/organizations/:id/hr-analytics/trends
   * Get trend analysis for specific metrics
   */
  async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const { metric_name, period_months = '12' } = req.query;

      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      if (!metric_name) {
        res.status(400).json({ error: 'metric_name parameter is required' });
        return;
      }

      const periodMonths = parseInt(period_months as string);
      if (periodMonths < 1 || periodMonths > 24) {
        res.status(400).json({ error: 'period_months must be between 1 and 24' });
        return;
      }

      const trendData = await this.analyticsModel.getTrendAnalysis(
        organizationId,
        metric_name as string,
        periodMonths
      );

      res.json({
        metric_name,
        period_months: periodMonths,
        trend_data: trendData,
        generated_at: new Date(),
      });
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve trend analysis' });
    }
  }

  /**
   * GET /api/organizations/:id/hr-analytics/alerts
   * Get current alerts based on metric thresholds
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;

      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      // Get default alert thresholds (in a real system, these would be configurable)
      const defaultThresholds: AlertThreshold[] = [
        {
          metric_name: 'approval_rate',
          threshold_value: 50,
          comparison_type: 'less_than',
          alert_level: 'warning',
        },
        {
          metric_name: 'onboarding_completion_rate',
          threshold_value: 80,
          comparison_type: 'less_than',
          alert_level: 'warning',
        },
        {
          metric_name: 'turnover_rate',
          threshold_value: 20,
          comparison_type: 'greater_than',
          alert_level: 'critical',
        },
        {
          metric_name: 'document_compliance_rate',
          threshold_value: 90,
          comparison_type: 'less_than',
          alert_level: 'warning',
        },
      ];

      const alerts = await this.analyticsModel.checkAlerts(organizationId, defaultThresholds);

      res.json({
        alerts,
        thresholds_checked: defaultThresholds.length,
        generated_at: new Date(),
      });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
  }

  /**
   * POST /api/organizations/:id/hr-analytics/export
   * Export analytics data in various formats
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;
      const {
        format = 'json',
        period_start,
        period_end,
        metrics = 'all',
        include_trends = false,
      } = req.body;

      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      // Parse date parameters
      let startDate: Date;
      let endDate: Date;

      if (period_start && period_end) {
        startDate = new Date(period_start);
        endDate = new Date(period_end);
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Get analytics data
      const analyticsData = await this.analyticsModel.calculateMetrics(
        organizationId,
        startDate,
        endDate
      );

      let exportData: any = analyticsData;

      // Add trend data if requested
      if (include_trends) {
        const trends = await Promise.all([
          this.analyticsModel.getTrendAnalysis(organizationId, 'applications_received', 6),
          this.analyticsModel.getTrendAnalysis(organizationId, 'onboarding_completion_rate', 6),
          this.analyticsModel.getTrendAnalysis(organizationId, 'average_performance_rating', 6),
        ]);

        exportData = {
          ...analyticsData,
          trends: {
            applications_received: trends[0],
            onboarding_completion_rate: trends[1],
            average_performance_rating: trends[2],
          },
        };
      }

      // Filter metrics if specific ones requested
      if (metrics !== 'all') {
        const requestedMetrics = metrics.split(',');
        const filteredMetrics: any = {};
        
        for (const metric of requestedMetrics) {
          if (exportData.metrics && exportData.metrics[metric]) {
            filteredMetrics[metric] = exportData.metrics[metric];
          }
        }
        
        exportData.metrics = filteredMetrics;
      }

      // Handle different export formats
      switch (format) {
        case 'csv':
          const csvData = await this.analyticsService.exportToCSV(exportData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="hr-analytics-export-${Date.now()}.csv"`);
          res.send(csvData);
          break;

        case 'pdf':
          const pdfBuffer = await this.analyticsService.exportToPDF(exportData, organizationId);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="hr-analytics-export-${Date.now()}.pdf"`);
          res.send(pdfBuffer);
          break;

        case 'excel':
          const excelBuffer = await this.analyticsService.exportToExcel(exportData);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="hr-analytics-export-${Date.now()}.xlsx"`);
          res.send(excelBuffer);
          break;

        default:
          res.json(exportData);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  }

  /**
   * GET /api/organizations/:id/hr-analytics/summary
   * Get high-level summary metrics for quick overview
   */
  async getSummaryMetrics(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;

      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      // Get last 30 days metrics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await this.analyticsModel.calculateMetrics(
        organizationId,
        startDate,
        endDate
      );

      // Extract key summary metrics
      const summary = {
        active_members: metrics.metrics.retention.active_members,
        applications_received: metrics.metrics.applications.total_received,
        approval_rate: metrics.metrics.applications.approval_rate,
        onboarding_completion_rate: metrics.metrics.onboarding.completion_rate,
        average_performance_rating: metrics.metrics.performance.average_rating,
        skill_verification_rate: metrics.metrics.skills.verification_rate,
        document_compliance_rate: metrics.metrics.documents.compliance_rate,
        member_turnover_rate: metrics.metrics.retention.member_turnover_rate,
        period: {
          start: startDate,
          end: endDate,
          days: 30,
        },
        calculated_at: new Date(),
      };

      res.json(summary);
    } catch (error) {
      console.error('Error getting summary metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve summary metrics' });
    }
  }

  /**
   * POST /api/organizations/:id/hr-analytics/refresh-cache
   * Manually refresh analytics cache
   */
  async refreshCache(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.id;

      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await this.analyticsService.checkOrganizationAccess(
        user.id,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to organization analytics' });
        return;
      }

      // Clear existing cache and recalculate
      await this.analyticsService.clearCache(organizationId);

      // Recalculate metrics for common periods
      const periods = [
        { days: 7, label: 'week' },
        { days: 30, label: 'month' },
        { days: 90, label: 'quarter' },
      ];

      const refreshResults = [];

      for (const period of periods) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period.days);

        const metrics = await this.analyticsModel.calculateMetrics(
          organizationId,
          startDate,
          endDate
        );

        await this.analyticsModel.cacheMetrics(organizationId, metrics);

        refreshResults.push({
          period: period.label,
          days: period.days,
          cached_at: new Date(),
        });
      }

      res.json({
        message: 'Analytics cache refreshed successfully',
        periods_refreshed: refreshResults,
        refreshed_at: new Date(),
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      res.status(500).json({ error: 'Failed to refresh analytics cache' });
    }
  }
}