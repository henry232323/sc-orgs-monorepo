import db from '../config/database';
import { HRAnalyticsMetrics, HRAlert, AlertThreshold } from '../models/hr_analytics_model';
import { NotificationService } from './notification_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export class HRAnalyticsService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }
  /**
   * Check if user has access to organization analytics
   */
  async checkOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    try {
      // First check if user is the organization owner
      const organization = await db('organizations')
        .where({ id: organizationId })
        .first();

      if (organization && organization.owner_id === userId) {
        return true; // Organization owner always has access
      }

      // Check if user is a member of the organization
      const membership = await db('organization_members')
        .where({ user_id: userId, organization_id: organizationId, is_active: true })
        .first();

      if (!membership) {
        return false;
      }

      // Check if user has analytics permissions
      const hasPermission = await db('organization_role_permissions')
        .join('organization_member_roles', 'organization_role_permissions.role_id', 'organization_member_roles.role_id')
        .where({
          'organization_member_roles.user_id': userId,
          'organization_member_roles.organization_id': organizationId,
        })
        .whereIn('organization_role_permissions.permission', ['VIEW_ANALYTICS', 'HR_MANAGER', 'ADMIN'])
        .first();

      return !!hasPermission;
    } catch (error) {
      console.error('Error checking organization access:', error);
      return false;
    }
  }

  /**
   * Clear analytics cache for an organization
   */
  async clearCache(organizationId: string): Promise<void> {
    try {
      await db('hr_analytics_cache')
        .where({ organization_id: organizationId })
        .del();
    } catch (error) {
      console.error('Error clearing analytics cache:', error);
      throw new Error('Failed to clear analytics cache');
    }
  }

  /**
   * Export analytics data to CSV format
   */
  async exportToCSV(analyticsData: any): Promise<string> {
    try {
      const csvRows: string[] = [];
      
      // Add header
      csvRows.push('Metric Category,Metric Name,Value,Period Start,Period End');

      // Process metrics data
      if (analyticsData.metrics) {
        const metrics = analyticsData.metrics;
        const periodStart = analyticsData.period_start || '';
        const periodEnd = analyticsData.period_end || '';

        // Applications metrics
        if (metrics.applications) {
          csvRows.push(`Applications,Total Received,${metrics.applications.total_received},${periodStart},${periodEnd}`);
          csvRows.push(`Applications,Approval Rate,${metrics.applications.approval_rate}%,${periodStart},${periodEnd}`);
          csvRows.push(`Applications,Average Processing Time (Days),${metrics.applications.average_processing_time_days},${periodStart},${periodEnd}`);
          csvRows.push(`Applications,Conversion Rate,${metrics.applications.conversion_rate}%,${periodStart},${periodEnd}`);
        }

        // Onboarding metrics
        if (metrics.onboarding) {
          csvRows.push(`Onboarding,Total Started,${metrics.onboarding.total_started},${periodStart},${periodEnd}`);
          csvRows.push(`Onboarding,Completion Rate,${metrics.onboarding.completion_rate}%,${periodStart},${periodEnd}`);
          csvRows.push(`Onboarding,Average Completion Time (Days),${metrics.onboarding.average_completion_time_days},${periodStart},${periodEnd}`);
          csvRows.push(`Onboarding,Overdue Count,${metrics.onboarding.overdue_count},${periodStart},${periodEnd}`);
        }

        // Performance metrics
        if (metrics.performance) {
          csvRows.push(`Performance,Reviews Completed,${metrics.performance.reviews_completed},${periodStart},${periodEnd}`);
          csvRows.push(`Performance,Average Rating,${metrics.performance.average_rating},${periodStart},${periodEnd}`);
          csvRows.push(`Performance,Active Improvement Plans,${metrics.performance.improvement_plans_active},${periodStart},${periodEnd}`);
          csvRows.push(`Performance,Goals Completion Rate,${metrics.performance.goals_completion_rate}%,${periodStart},${periodEnd}`);
        }

        // Skills metrics
        if (metrics.skills) {
          csvRows.push(`Skills,Total Skills Tracked,${metrics.skills.total_skills_tracked},${periodStart},${periodEnd}`);
          csvRows.push(`Skills,Verification Rate,${metrics.skills.verification_rate}%,${periodStart},${periodEnd}`);
        }

        // Documents metrics
        if (metrics.documents) {
          csvRows.push(`Documents,Total Documents,${metrics.documents.total_documents},${periodStart},${periodEnd}`);
          csvRows.push(`Documents,Requiring Acknowledgment,${metrics.documents.documents_requiring_acknowledgment},${periodStart},${periodEnd}`);
          csvRows.push(`Documents,Compliance Rate,${metrics.documents.compliance_rate}%,${periodStart},${periodEnd}`);
          csvRows.push(`Documents,Pending Acknowledgments,${metrics.documents.pending_acknowledgments},${periodStart},${periodEnd}`);
        }

        // Retention metrics
        if (metrics.retention) {
          csvRows.push(`Retention,Active Members,${metrics.retention.active_members},${periodStart},${periodEnd}`);
          csvRows.push(`Retention,Turnover Rate,${metrics.retention.member_turnover_rate}%,${periodStart},${periodEnd}`);
          csvRows.push(`Retention,Average Tenure (Days),${metrics.retention.average_tenure_days},${periodStart},${periodEnd}`);
          csvRows.push(`Retention,New Members,${metrics.retention.new_members_period},${periodStart},${periodEnd}`);
          csvRows.push(`Retention,Departed Members,${metrics.retention.departed_members_period},${periodStart},${periodEnd}`);
        }
      }

      // Add trend data if available
      if (analyticsData.trends) {
        csvRows.push(''); // Empty row separator
        csvRows.push('Trend Analysis');
        csvRows.push('Metric,Period,Value,Change %');

        Object.entries(analyticsData.trends).forEach(([metricName, trendData]: [string, any]) => {
          if (Array.isArray(trendData)) {
            trendData.forEach((point: any) => {
              csvRows.push(`${metricName},${point.period},${point.value},${point.change_percentage || ''}`);
            });
          }
        });
      }

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Failed to export analytics data to CSV');
    }
  }

  /**
   * Export analytics data to PDF format
   */
  async exportToPDF(analyticsData: any, organizationId: string): Promise<Buffer> {
    try {
      // This is a simplified implementation
      // In a real system, you'd use a library like puppeteer or pdfkit
      const pdfContent = this.generatePDFContent(analyticsData, organizationId);
      
      // For now, return the content as a buffer (would be actual PDF in real implementation)
      return Buffer.from(pdfContent, 'utf-8');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Failed to export analytics data to PDF');
    }
  }

  /**
   * Export analytics data to Excel format
   */
  async exportToExcel(analyticsData: any): Promise<Buffer> {
    try {
      // This is a simplified implementation
      // In a real system, you'd use a library like exceljs
      const excelContent = this.generateExcelContent(analyticsData);
      
      // For now, return the content as a buffer (would be actual Excel in real implementation)
      return Buffer.from(excelContent, 'utf-8');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export analytics data to Excel');
    }
  }

  /**
   * Generate predictive insights based on historical data
   */
  async generatePredictiveInsights(
    organizationId: string,
    metricName: string,
    historicalData: any[]
  ): Promise<{
    prediction: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    insights: string[];
  }> {
    try {
      if (historicalData.length < 3) {
        return {
          prediction: 0,
          confidence: 0,
          trend: 'stable',
          insights: ['Insufficient data for prediction'],
        };
      }

      // Simple linear regression for prediction
      const values = historicalData.map(d => d.value);
      const n = values.length;
      
      // Calculate trend
      const firstHalf = values.slice(0, Math.floor(n / 2));
      const secondHalf = values.slice(Math.floor(n / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const trendThreshold = 0.05; // 5% change threshold
      
      if (secondAvg > firstAvg * (1 + trendThreshold)) {
        trend = 'increasing';
      } else if (secondAvg < firstAvg * (1 - trendThreshold)) {
        trend = 'decreasing';
      }

      // Simple prediction (next period based on trend)
      const recentValues = values.slice(-3);
      const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      
      let prediction = recentAvg;
      if (trend === 'increasing') {
        prediction = recentAvg * 1.1; // 10% increase
      } else if (trend === 'decreasing') {
        prediction = recentAvg * 0.9; // 10% decrease
      }

      // Calculate confidence based on data consistency
      const variance = values.reduce((sum, val) => sum + Math.pow(val - recentAvg, 2), 0) / n;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / recentAvg;
      const confidence = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

      // Generate insights
      const insights = this.generateMetricInsights(metricName, trend, prediction, recentAvg);

      return {
        prediction: Math.round(prediction * 100) / 100,
        confidence: Math.round(confidence),
        trend,
        insights,
      };
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return {
        prediction: 0,
        confidence: 0,
        trend: 'stable',
        insights: ['Error generating insights'],
      };
    }
  }

  /**
   * Detect anomalies in metric data
   */
  async detectAnomalies(
    metricName: string,
    currentValue: number,
    historicalData: any[]
  ): Promise<{
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }> {
    try {
      if (historicalData.length < 5) {
        return {
          isAnomaly: false,
          severity: 'low',
          description: 'Insufficient historical data for anomaly detection',
        };
      }

      const values = historicalData.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);

      // Z-score based anomaly detection
      const zScore = Math.abs((currentValue - mean) / standardDeviation);
      
      let isAnomaly = false;
      let severity: 'low' | 'medium' | 'high' = 'low';
      let description = 'Value is within normal range';

      if (zScore > 3) {
        isAnomaly = true;
        severity = 'high';
        description = `${metricName} value (${currentValue}) is significantly outside normal range (${zScore.toFixed(2)} standard deviations)`;
      } else if (zScore > 2) {
        isAnomaly = true;
        severity = 'medium';
        description = `${metricName} value (${currentValue}) is moderately outside normal range (${zScore.toFixed(2)} standard deviations)`;
      } else if (zScore > 1.5) {
        isAnomaly = true;
        severity = 'low';
        description = `${metricName} value (${currentValue}) is slightly outside normal range (${zScore.toFixed(2)} standard deviations)`;
      }

      return { isAnomaly, severity, description };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return {
        isAnomaly: false,
        severity: 'low',
        description: 'Error detecting anomalies',
      };
    }
  }

  /**
   * Generate automated recommendations based on metrics
   */
  async generateRecommendations(
    organizationId: string,
    metrics: HRAnalyticsMetrics['metrics']
  ): Promise<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    action_items: string[];
  }[]> {
    const recommendations: any[] = [];

    try {
      // Application process recommendations
      if (metrics.applications.approval_rate < 50) {
        recommendations.push({
          priority: 'high',
          category: 'Applications',
          title: 'Low Application Approval Rate',
          description: `Current approval rate of ${metrics.applications.approval_rate}% is below optimal range. This may indicate issues with application quality or overly strict criteria.`,
          action_items: [
            'Review application criteria and requirements',
            'Provide clearer guidance to applicants',
            'Consider adjusting screening process',
            'Analyze rejection reasons for patterns',
          ],
        });
      }

      if (metrics.applications.average_processing_time_days > 14) {
        recommendations.push({
          priority: 'medium',
          category: 'Applications',
          title: 'Slow Application Processing',
          description: `Average processing time of ${metrics.applications.average_processing_time_days} days exceeds recommended 14-day target.`,
          action_items: [
            'Streamline application review process',
            'Assign dedicated reviewers',
            'Implement automated screening for basic requirements',
            'Set up application review reminders',
          ],
        });
      }

      // Onboarding recommendations
      if (metrics.onboarding.completion_rate < 80) {
        recommendations.push({
          priority: 'high',
          category: 'Onboarding',
          title: 'Low Onboarding Completion Rate',
          description: `Onboarding completion rate of ${metrics.onboarding.completion_rate}% is below the 80% target, indicating potential issues with the onboarding process.`,
          action_items: [
            'Review onboarding checklist complexity',
            'Provide better support for new members',
            'Implement onboarding buddy system',
            'Gather feedback from incomplete onboarding cases',
          ],
        });
      }

      if (metrics.onboarding.overdue_count > 5) {
        recommendations.push({
          priority: 'medium',
          category: 'Onboarding',
          title: 'High Number of Overdue Onboarding',
          description: `${metrics.onboarding.overdue_count} members have overdue onboarding tasks.`,
          action_items: [
            'Follow up with overdue members',
            'Review onboarding timeline expectations',
            'Provide additional support for struggling members',
            'Consider extending deadlines for complex tasks',
          ],
        });
      }

      // Performance recommendations
      if (metrics.performance.average_rating < 3.5) {
        recommendations.push({
          priority: 'high',
          category: 'Performance',
          title: 'Low Average Performance Rating',
          description: `Average performance rating of ${metrics.performance.average_rating} indicates potential performance issues across the organization.`,
          action_items: [
            'Implement performance improvement programs',
            'Provide additional training and development',
            'Review performance evaluation criteria',
            'Increase frequency of feedback sessions',
          ],
        });
      }

      if (metrics.performance.goals_completion_rate < 70) {
        recommendations.push({
          priority: 'medium',
          category: 'Performance',
          title: 'Low Goal Completion Rate',
          description: `Goal completion rate of ${metrics.performance.goals_completion_rate}% suggests issues with goal setting or achievement.`,
          action_items: [
            'Review goal setting process for realism',
            'Provide better goal tracking tools',
            'Implement regular goal progress check-ins',
            'Offer support for goal achievement',
          ],
        });
      }

      // Skills recommendations
      if (metrics.skills.verification_rate < 60) {
        recommendations.push({
          priority: 'medium',
          category: 'Skills',
          title: 'Low Skill Verification Rate',
          description: `Only ${metrics.skills.verification_rate}% of skills are verified, which may impact skill reliability.`,
          action_items: [
            'Streamline skill verification process',
            'Train more skill validators',
            'Implement peer verification system',
            'Provide incentives for skill verification',
          ],
        });
      }

      // Document compliance recommendations
      if (metrics.documents.compliance_rate < 90) {
        recommendations.push({
          priority: 'high',
          category: 'Documents',
          title: 'Low Document Compliance Rate',
          description: `Document compliance rate of ${metrics.documents.compliance_rate}% is below the 90% target, indicating potential compliance risks.`,
          action_items: [
            'Send reminders for pending acknowledgments',
            'Simplify document acknowledgment process',
            'Review document accessibility and clarity',
            'Implement mandatory compliance training',
          ],
        });
      }

      // Retention recommendations
      if (metrics.retention.member_turnover_rate > 15) {
        recommendations.push({
          priority: 'high',
          category: 'Retention',
          title: 'High Member Turnover Rate',
          description: `Member turnover rate of ${metrics.retention.member_turnover_rate}% exceeds the 15% threshold, indicating retention issues.`,
          action_items: [
            'Conduct exit interviews to understand reasons',
            'Improve member engagement programs',
            'Review organizational culture and environment',
            'Implement retention incentives',
          ],
        });
      }

      // Sort recommendations by priority
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      // Send notifications for high priority recommendations
      await this.sendAnalyticsAlerts(organizationId, recommendations.filter(r => r.priority === 'high'));

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Send analytics alerts for high priority issues
   */
  private async sendAnalyticsAlerts(
    organizationId: string,
    highPriorityRecommendations: any[]
  ): Promise<void> {
    try {
      if (highPriorityRecommendations.length === 0) {
        return;
      }

      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(organizationId);
      if (!organization) {
        logger.warn('Organization not found for analytics alert', { organizationId });
        return;
      }

      // Send alert to organization owner and HR managers
      const notifierIds = [organization.owner_id];

      for (const recommendation of highPriorityRecommendations) {
        await this.notificationService.createNotification({
          user_id: organization.owner_id,
          entity_type: NotificationEntityType.HR_ANALYTICS_ALERT,
          entity_id: organizationId,
          title: `HR Alert: ${recommendation.title}`,
          message: recommendation.description,
          actor_id: 'system',
          custom_data: {
            organization_id: organizationId,
            alert_category: recommendation.category,
            alert_priority: recommendation.priority,
            action_items: recommendation.action_items,
          },
        });
      }

      logger.info('Analytics alerts sent', {
        organizationId,
        alertCount: highPriorityRecommendations.length,
        notifierCount: notifierIds.length,
      });
    } catch (error) {
      logger.error('Failed to send analytics alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        alertCount: highPriorityRecommendations.length,
      });
    }
  }

  /**
   * Calculate metric benchmarks based on organization size and type
   */
  async calculateBenchmarks(
    organizationId: string,
    organizationSize: 'small' | 'medium' | 'large'
  ): Promise<Record<string, { target: number; good: number; excellent: number }>> {
    // Industry benchmarks based on organization size
    const benchmarks = {
      small: {
        approval_rate: { target: 60, good: 70, excellent: 80 },
        onboarding_completion_rate: { target: 75, good: 85, excellent: 95 },
        average_performance_rating: { target: 3.5, good: 4.0, excellent: 4.5 },
        skill_verification_rate: { target: 50, good: 70, excellent: 85 },
        document_compliance_rate: { target: 85, good: 92, excellent: 98 },
        member_turnover_rate: { target: 20, good: 15, excellent: 10 },
      },
      medium: {
        approval_rate: { target: 55, good: 65, excellent: 75 },
        onboarding_completion_rate: { target: 80, good: 88, excellent: 95 },
        average_performance_rating: { target: 3.6, good: 4.1, excellent: 4.6 },
        skill_verification_rate: { target: 60, good: 75, excellent: 90 },
        document_compliance_rate: { target: 88, good: 94, excellent: 99 },
        member_turnover_rate: { target: 18, good: 12, excellent: 8 },
      },
      large: {
        approval_rate: { target: 50, good: 60, excellent: 70 },
        onboarding_completion_rate: { target: 85, good: 90, excellent: 96 },
        average_performance_rating: { target: 3.7, good: 4.2, excellent: 4.7 },
        skill_verification_rate: { target: 70, good: 80, excellent: 92 },
        document_compliance_rate: { target: 90, good: 95, excellent: 99 },
        member_turnover_rate: { target: 15, good: 10, excellent: 6 },
      },
    };

    return benchmarks[organizationSize];
  }

  /**
   * Generate PDF content (simplified implementation)
   */
  private generatePDFContent(analyticsData: any, organizationId: string): string {
    const date = new Date().toLocaleDateString();
    
    return `
HR Analytics Report
Organization ID: ${organizationId}
Generated: ${date}

=== EXECUTIVE SUMMARY ===
${this.formatMetricsForPDF(analyticsData.metrics)}

=== DETAILED METRICS ===
${JSON.stringify(analyticsData.metrics, null, 2)}

=== TRENDS ===
${analyticsData.trends ? JSON.stringify(analyticsData.trends, null, 2) : 'No trend data available'}
    `.trim();
  }

  /**
   * Generate Excel content (simplified implementation)
   */
  private generateExcelContent(analyticsData: any): string {
    return JSON.stringify(analyticsData, null, 2);
  }

  /**
   * Format metrics for PDF display
   */
  private formatMetricsForPDF(metrics: any): string {
    if (!metrics) return 'No metrics available';

    const sections = [];

    if (metrics.applications) {
      sections.push(`Applications: ${metrics.applications.total_received} received, ${metrics.applications.approval_rate}% approved`);
    }

    if (metrics.onboarding) {
      sections.push(`Onboarding: ${metrics.onboarding.completion_rate}% completion rate`);
    }

    if (metrics.performance) {
      sections.push(`Performance: ${metrics.performance.average_rating}/5 average rating`);
    }

    if (metrics.retention) {
      sections.push(`Retention: ${metrics.retention.member_turnover_rate}% turnover rate`);
    }

    return sections.join('\n');
  }

  /**
   * Generate metric-specific insights
   */
  private generateMetricInsights(
    metricName: string,
    trend: 'increasing' | 'decreasing' | 'stable',
    prediction: number,
    currentAvg: number
  ): string[] {
    const insights: string[] = [];

    switch (metricName) {
      case 'applications_received':
        if (trend === 'increasing') {
          insights.push('Application volume is growing, consider scaling review capacity');
        } else if (trend === 'decreasing') {
          insights.push('Application volume is declining, review recruitment strategies');
        }
        break;

      case 'onboarding_completion_rate':
        if (trend === 'decreasing') {
          insights.push('Onboarding effectiveness is declining, review process complexity');
        } else if (trend === 'increasing') {
          insights.push('Onboarding improvements are showing positive results');
        }
        break;

      case 'average_performance_rating':
        if (trend === 'decreasing') {
          insights.push('Performance ratings are declining, consider additional support programs');
        } else if (trend === 'increasing') {
          insights.push('Performance improvements indicate effective management practices');
        }
        break;

      case 'turnover_rate':
        if (trend === 'increasing') {
          insights.push('Rising turnover rate requires immediate attention to retention strategies');
        } else if (trend === 'decreasing') {
          insights.push('Improving retention indicates successful engagement initiatives');
        }
        break;
    }

    const changePercent = ((prediction - currentAvg) / currentAvg) * 100;
    if (Math.abs(changePercent) > 10) {
      insights.push(`Predicted ${Math.abs(changePercent).toFixed(1)}% ${changePercent > 0 ? 'increase' : 'decrease'} next period`);
    }

    return insights;
  }
}