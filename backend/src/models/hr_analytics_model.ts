import db from '../config/database';
import { HRApplicationModel } from './hr_application_model';
import { HROnboardingModel } from './hr_onboarding_model';
import { HRPerformanceModel } from './hr_performance_model';
import { HRSkillModel } from './hr_skill_model';
import { HRDocumentModel } from './hr_document_model';

export interface HRAnalyticsMetrics {
  organization_id: string;
  period_start: Date;
  period_end: Date;
  metrics: {
    applications: {
      total_received: number;
      approval_rate: number;
      average_processing_time_days: number;
      conversion_rate: number;
      by_status: Record<string, number>;
    };
    onboarding: {
      total_started: number;
      completion_rate: number;
      average_completion_time_days: number;
      overdue_count: number;
      by_status: Record<string, number>;
    };
    performance: {
      reviews_completed: number;
      average_rating: number;
      improvement_plans_active: number;
      goals_completion_rate: number;
      reviews_by_status: Record<string, number>;
    };
    skills: {
      total_skills_tracked: number;
      verification_rate: number;
      skill_gaps: SkillGap[];
      skills_by_category: Record<string, number>;
      proficiency_distribution: Record<string, number>;
    };
    documents: {
      total_documents: number;
      documents_requiring_acknowledgment: number;
      compliance_rate: number;
      pending_acknowledgments: number;
    };
    retention: {
      member_turnover_rate: number;
      average_tenure_days: number;
      active_members: number;
      new_members_period: number;
      departed_members_period: number;
    };
  };
  calculated_at: Date;
}

export interface SkillGap {
  skill_name: string;
  skill_category: string;
  required_count: number;
  current_count: number;
  gap_percentage: number;
}

export interface TrendData {
  period: string;
  value: number;
  change_percentage?: number;
}

export interface AlertThreshold {
  metric_name: string;
  threshold_value: number;
  comparison_type: 'greater_than' | 'less_than' | 'equals';
  alert_level: 'info' | 'warning' | 'critical';
}

export interface HRAlert {
  id: string;
  organization_id: string;
  metric_name: string;
  current_value: number;
  threshold_value: number;
  alert_level: 'info' | 'warning' | 'critical';
  message: string;
  created_at: Date;
  resolved_at?: Date;
}

export class HRAnalyticsModel {
  private applicationModel: HRApplicationModel;
  private onboardingModel: HROnboardingModel;
  private performanceModel: HRPerformanceModel;
  private skillModel: HRSkillModel;
  private documentModel: HRDocumentModel;

  constructor() {
    this.applicationModel = new HRApplicationModel();
    this.onboardingModel = new HROnboardingModel();
    this.performanceModel = new HRPerformanceModel();
    this.skillModel = new HRSkillModel();
    this.documentModel = new HRDocumentModel();
  }

  /**
   * Calculate comprehensive HR metrics for an organization
   */
  async calculateMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HRAnalyticsMetrics> {
    const [
      applicationMetrics,
      onboardingMetrics,
      performanceMetrics,
      skillMetrics,
      documentMetrics,
      retentionMetrics,
    ] = await Promise.all([
      this.calculateApplicationMetrics(organizationId, periodStart, periodEnd),
      this.calculateOnboardingMetrics(organizationId, periodStart, periodEnd),
      this.calculatePerformanceMetrics(organizationId, periodStart, periodEnd),
      this.calculateSkillMetrics(organizationId),
      this.calculateDocumentMetrics(organizationId),
      this.calculateRetentionMetrics(organizationId, periodStart, periodEnd),
    ]);

    return {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      metrics: {
        applications: applicationMetrics,
        onboarding: onboardingMetrics,
        performance: performanceMetrics,
        skills: skillMetrics,
        documents: documentMetrics,
        retention: retentionMetrics,
      },
      calculated_at: new Date(),
    };
  }

  /**
   * Calculate application tracking metrics
   */
  private async calculateApplicationMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HRAnalyticsMetrics['metrics']['applications']> {
    // Get applications within the period
    const applications = await db('hr_applications')
      .where({ organization_id: organizationId })
      .whereBetween('created_at', [periodStart, periodEnd]);

    const totalReceived = applications.length;
    const approvedCount = applications.filter(app => app.status === 'approved').length;
    const approvalRate = totalReceived > 0 ? (approvedCount / totalReceived) * 100 : 0;

    // Calculate average processing time for completed applications
    const completedApplications = applications.filter(app => 
      ['approved', 'rejected'].includes(app.status)
    );

    let averageProcessingTimeDays = 0;
    if (completedApplications.length > 0) {
      const totalProcessingTime = completedApplications.reduce((sum, app) => {
        const processingTime = new Date(app.updated_at).getTime() - new Date(app.created_at).getTime();
        return sum + (processingTime / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0);
      averageProcessingTimeDays = totalProcessingTime / completedApplications.length;
    }

    // Calculate conversion rate (approved applications that resulted in membership)
    const approvedApplications = applications.filter(app => app.status === 'approved');
    let conversionCount = 0;
    
    for (const app of approvedApplications) {
      const membership = await db('organization_members')
        .where({ organization_id: organizationId, user_id: app.user_id })
        .first();
      if (membership) {
        conversionCount++;
      }
    }

    const conversionRate = approvedCount > 0 ? (conversionCount / approvedCount) * 100 : 0;

    // Count by status
    const byStatus = applications.reduce((acc: Record<string, number>, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total_received: totalReceived,
      approval_rate: Math.round(approvalRate * 100) / 100,
      average_processing_time_days: Math.round(averageProcessingTimeDays * 100) / 100,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      by_status: byStatus,
    };
  }

  /**
   * Calculate onboarding workflow metrics
   */
  private async calculateOnboardingMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HRAnalyticsMetrics['metrics']['onboarding']> {
    // Get onboarding progress within the period
    const onboardingProgress = await db('hr_onboarding_progress')
      .where({ organization_id: organizationId })
      .whereBetween('created_at', [periodStart, periodEnd]);

    const totalStarted = onboardingProgress.length;
    const completedCount = onboardingProgress.filter(progress => progress.status === 'completed').length;
    const completionRate = totalStarted > 0 ? (completedCount / totalStarted) * 100 : 0;

    // Calculate average completion time for completed onboarding
    const completedOnboarding = onboardingProgress.filter(progress => 
      progress.status === 'completed' && progress.started_at && progress.completed_at
    );

    let averageCompletionTimeDays = 0;
    if (completedOnboarding.length > 0) {
      const totalCompletionTime = completedOnboarding.reduce((sum, progress) => {
        const completionTime = new Date(progress.completed_at!).getTime() - new Date(progress.started_at!).getTime();
        return sum + (completionTime / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0);
      averageCompletionTimeDays = totalCompletionTime / completedOnboarding.length;
    }

    const overdueCount = onboardingProgress.filter(progress => progress.status === 'overdue').length;

    // Count by status
    const byStatus = onboardingProgress.reduce((acc: Record<string, number>, progress) => {
      acc[progress.status] = (acc[progress.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total_started: totalStarted,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_completion_time_days: Math.round(averageCompletionTimeDays * 100) / 100,
      overdue_count: overdueCount,
      by_status: byStatus,
    };
  }

  /**
   * Calculate performance review metrics
   */
  private async calculatePerformanceMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HRAnalyticsMetrics['metrics']['performance']> {
    // Get performance reviews within the period
    const reviews = await db('hr_performance_reviews')
      .where({ organization_id: organizationId })
      .whereBetween('created_at', [periodStart, periodEnd]);

    const reviewsCompleted = reviews.filter(review => review.status === 'submitted' || review.status === 'acknowledged').length;
    
    // Calculate average rating
    const reviewsWithRatings = reviews.filter(review => review.overall_rating !== null);
    const averageRating = reviewsWithRatings.length > 0 
      ? reviewsWithRatings.reduce((sum, review) => sum + review.overall_rating, 0) / reviewsWithRatings.length
      : 0;

    // Get active improvement plans (goals in progress)
    const activeGoals = await db('hr_performance_goals')
      .join('hr_performance_reviews', 'hr_performance_goals.review_id', 'hr_performance_reviews.id')
      .where({ 'hr_performance_reviews.organization_id': organizationId })
      .whereIn('hr_performance_goals.status', ['not_started', 'in_progress'])
      .count('* as count')
      .first();

    const improvementPlansActive = parseInt(activeGoals?.count as string) || 0;

    // Calculate goals completion rate
    const allGoals = await db('hr_performance_goals')
      .join('hr_performance_reviews', 'hr_performance_goals.review_id', 'hr_performance_reviews.id')
      .where({ 'hr_performance_reviews.organization_id': organizationId });

    const completedGoals = allGoals.filter(goal => goal.status === 'completed').length;
    const goalsCompletionRate = allGoals.length > 0 ? (completedGoals / allGoals.length) * 100 : 0;

    // Count by status
    const reviewsByStatus = reviews.reduce((acc: Record<string, number>, review) => {
      acc[review.status] = (acc[review.status] || 0) + 1;
      return acc;
    }, {});

    return {
      reviews_completed: reviewsCompleted,
      average_rating: Math.round(averageRating * 100) / 100,
      improvement_plans_active: improvementPlansActive,
      goals_completion_rate: Math.round(goalsCompletionRate * 100) / 100,
      reviews_by_status: reviewsByStatus,
    };
  }

  /**
   * Calculate skills and certification metrics
   */
  private async calculateSkillMetrics(organizationId: string): Promise<HRAnalyticsMetrics['metrics']['skills']> {
    // Get all user skills for organization members
    const userSkills = await db('hr_user_skills')
      .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
      .join('users', 'hr_user_skills.user_id', 'users.id')
      .join('organization_members', 'users.id', 'organization_members.user_id')
      .where({ 'organization_members.organization_id': organizationId })
      .where({ 'organization_members.is_active': true })
      .select(
        'hr_user_skills.*',
        'hr_skills.name as skill_name',
        'hr_skills.category as skill_category'
      );

    const totalSkillsTracked = userSkills.length;
    const verifiedSkills = userSkills.filter(skill => skill.verified).length;
    const verificationRate = totalSkillsTracked > 0 ? (verifiedSkills / totalSkillsTracked) * 100 : 0;

    // Skills by category
    const skillsByCategory = userSkills.reduce((acc: Record<string, number>, skill) => {
      acc[skill.skill_category] = (acc[skill.skill_category] || 0) + 1;
      return acc;
    }, {});

    // Proficiency distribution
    const proficiencyDistribution = userSkills.reduce((acc: Record<string, number>, skill) => {
      acc[skill.proficiency_level] = (acc[skill.proficiency_level] || 0) + 1;
      return acc;
    }, {});

    // Calculate skill gaps (simplified - would need organization requirements for full implementation)
    const skillGaps: SkillGap[] = await this.calculateSkillGaps(organizationId);

    return {
      total_skills_tracked: totalSkillsTracked,
      verification_rate: Math.round(verificationRate * 100) / 100,
      skill_gaps: skillGaps,
      skills_by_category: skillsByCategory,
      proficiency_distribution: proficiencyDistribution,
    };
  }

  /**
   * Calculate document management metrics
   */
  private async calculateDocumentMetrics(organizationId: string): Promise<HRAnalyticsMetrics['metrics']['documents']> {
    const complianceReport = await this.documentModel.getComplianceReport(organizationId);
    
    return {
      total_documents: complianceReport.total_documents,
      documents_requiring_acknowledgment: complianceReport.documents_requiring_acknowledgment,
      compliance_rate: Math.round(complianceReport.compliance_rate * 100) / 100,
      pending_acknowledgments: complianceReport.pending_acknowledgments,
    };
  }

  /**
   * Calculate retention and membership metrics
   */
  private async calculateRetentionMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HRAnalyticsMetrics['metrics']['retention']> {
    // Get current active members
    const activeMembers = await db('organization_members')
      .where({ organization_id: organizationId, is_active: true })
      .count('* as count')
      .first();

    const activeMemberCount = parseInt(activeMembers?.count as string) || 0;

    // Get new members in period
    const newMembers = await db('organization_members')
      .where({ organization_id: organizationId })
      .whereBetween('joined_at', [periodStart, periodEnd])
      .count('* as count')
      .first();

    const newMembersPeriod = parseInt(newMembers?.count as string) || 0;

    // Get departed members in period (assuming left_at field exists)
    const departedMembers = await db('organization_members')
      .where({ organization_id: organizationId, is_active: false })
      .whereBetween('updated_at', [periodStart, periodEnd])
      .count('* as count')
      .first();

    const departedMembersPeriod = parseInt(departedMembers?.count as string) || 0;

    // Calculate turnover rate
    const averageMembers = activeMemberCount + (departedMembersPeriod / 2);
    const memberTurnoverRate = averageMembers > 0 ? (departedMembersPeriod / averageMembers) * 100 : 0;

    // Calculate average tenure
    const memberTenures = await db('organization_members')
      .where({ organization_id: organizationId, is_active: true })
      .select('joined_at');

    let averageTenureDays = 0;
    if (memberTenures.length > 0) {
      const now = new Date();
      const totalTenure = memberTenures.reduce((sum, member) => {
        const tenure = now.getTime() - new Date(member.joined_at).getTime();
        return sum + (tenure / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0);
      averageTenureDays = totalTenure / memberTenures.length;
    }

    return {
      member_turnover_rate: Math.round(memberTurnoverRate * 100) / 100,
      average_tenure_days: Math.round(averageTenureDays * 100) / 100,
      active_members: activeMemberCount,
      new_members_period: newMembersPeriod,
      departed_members_period: departedMembersPeriod,
    };
  }

  /**
   * Calculate skill gaps for an organization
   */
  private async calculateSkillGaps(organizationId: string): Promise<SkillGap[]> {
    // This is a simplified implementation
    // In a real system, you'd have organization skill requirements
    const skillCounts = await db('hr_user_skills')
      .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
      .join('users', 'hr_user_skills.user_id', 'users.id')
      .join('organization_members', 'users.id', 'organization_members.user_id')
      .where({ 'organization_members.organization_id': organizationId })
      .where({ 'organization_members.is_active': true })
      .where({ 'hr_user_skills.verified': true })
      .select('hr_skills.name', 'hr_skills.category')
      .count('* as count')
      .groupBy('hr_skills.name', 'hr_skills.category');

    // For demonstration, assume each skill should have at least 3 verified practitioners
    const requiredCount = 3;
    const skillGaps: SkillGap[] = [];

    for (const skill of skillCounts) {
      const currentCount = parseInt(skill.count as string);
      if (currentCount < requiredCount) {
        const gapPercentage = ((requiredCount - currentCount) / requiredCount) * 100;
        skillGaps.push({
          skill_name: String(skill.name),
          skill_category: String(skill.category),
          required_count: requiredCount,
          current_count: currentCount,
          gap_percentage: Math.round(gapPercentage * 100) / 100,
        });
      }
    }

    return skillGaps.sort((a, b) => b.gap_percentage - a.gap_percentage);
  }

  /**
   * Get trend analysis for metrics over time
   */
  async getTrendAnalysis(
    organizationId: string,
    metricName: string,
    periodMonths: number = 12
  ): Promise<TrendData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const trends: TrendData[] = [];
    
    // Generate monthly data points
    for (let i = 0; i < periodMonths; i++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(startDate.getMonth() + i);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodStart.getMonth() + 1);
      periodEnd.setDate(0); // Last day of the month

      let value = 0;
      
      switch (metricName) {
        case 'applications_received':
          const appCount = await db('hr_applications')
            .where({ organization_id: organizationId })
            .whereBetween('created_at', [periodStart, periodEnd])
            .count('* as count')
            .first();
          value = parseInt(appCount?.count as string) || 0;
          break;
          
        case 'onboarding_completion_rate':
          const onboardingData = await db('hr_onboarding_progress')
            .where({ organization_id: organizationId })
            .whereBetween('created_at', [periodStart, periodEnd]);
          const completed = onboardingData.filter(p => p.status === 'completed').length;
          value = onboardingData.length > 0 ? (completed / onboardingData.length) * 100 : 0;
          break;
          
        case 'average_performance_rating':
          const reviews = await db('hr_performance_reviews')
            .where({ organization_id: organizationId })
            .whereBetween('created_at', [periodStart, periodEnd])
            .whereNotNull('overall_rating');
          value = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
            : 0;
          break;
          
        default:
          value = 0;
      }

      const periodLabel = periodStart.toISOString().substring(0, 7); // YYYY-MM format
      trends.push({
        period: periodLabel,
        value: Math.round(value * 100) / 100,
      });
    }

    // Calculate change percentages
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i].value;
      const previous = trends[i - 1].value;
      const changePercentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      trends[i].change_percentage = Math.round(changePercentage * 100) / 100;
    }

    return trends;
  }

  /**
   * Generate comparative analysis between time periods
   */
  async getComparativeAnalysis(
    organizationId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    comparisonPeriodStart: Date,
    comparisonPeriodEnd: Date
  ): Promise<{
    current_period: HRAnalyticsMetrics;
    comparison_period: HRAnalyticsMetrics;
    changes: Record<string, { value: number; percentage: number }>;
  }> {
    const [currentMetrics, comparisonMetrics] = await Promise.all([
      this.calculateMetrics(organizationId, currentPeriodStart, currentPeriodEnd),
      this.calculateMetrics(organizationId, comparisonPeriodStart, comparisonPeriodEnd),
    ]);

    // Calculate changes for key metrics
    const changes: Record<string, { value: number; percentage: number }> = {};
    
    const keyMetrics = [
      { path: 'applications.total_received', name: 'applications_received' },
      { path: 'applications.approval_rate', name: 'approval_rate' },
      { path: 'onboarding.completion_rate', name: 'onboarding_completion_rate' },
      { path: 'performance.average_rating', name: 'average_performance_rating' },
      { path: 'skills.verification_rate', name: 'skill_verification_rate' },
      { path: 'retention.member_turnover_rate', name: 'turnover_rate' },
    ];

    for (const metric of keyMetrics) {
      const currentValue = this.getNestedValue(currentMetrics.metrics, metric.path);
      const comparisonValue = this.getNestedValue(comparisonMetrics.metrics, metric.path);
      
      const valueDifference = currentValue - comparisonValue;
      const percentageChange = comparisonValue > 0 ? (valueDifference / comparisonValue) * 100 : 0;
      
      changes[metric.name] = {
        value: Math.round(valueDifference * 100) / 100,
        percentage: Math.round(percentageChange * 100) / 100,
      };
    }

    return {
      current_period: currentMetrics,
      comparison_period: comparisonMetrics,
      changes,
    };
  }

  /**
   * Check for metric threshold alerts
   */
  async checkAlerts(organizationId: string, thresholds: AlertThreshold[]): Promise<HRAlert[]> {
    const currentMetrics = await this.calculateMetrics(
      organizationId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    );

    const alerts: HRAlert[] = [];

    for (const threshold of thresholds) {
      const currentValue = this.getMetricValue(currentMetrics, threshold.metric_name);
      let shouldAlert = false;

      switch (threshold.comparison_type) {
        case 'greater_than':
          shouldAlert = currentValue > threshold.threshold_value;
          break;
        case 'less_than':
          shouldAlert = currentValue < threshold.threshold_value;
          break;
        case 'equals':
          shouldAlert = Math.abs(currentValue - threshold.threshold_value) < 0.01;
          break;
      }

      if (shouldAlert) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organizationId,
          metric_name: threshold.metric_name,
          current_value: currentValue,
          threshold_value: threshold.threshold_value,
          alert_level: threshold.alert_level,
          message: this.generateAlertMessage(threshold, currentValue),
          created_at: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Cache metrics for performance optimization
   */
  async cacheMetrics(organizationId: string, metrics: HRAnalyticsMetrics): Promise<void> {
    // In a real implementation, this would use Redis or similar caching system
    // For now, we'll store in database
    await db('hr_analytics_cache')
      .insert({
        organization_id: organizationId,
        period_start: metrics.period_start,
        period_end: metrics.period_end,
        metrics_data: JSON.stringify(metrics),
        cached_at: new Date(),
      })
      .onConflict(['organization_id', 'period_start', 'period_end'])
      .merge(['metrics_data', 'cached_at']);
  }

  /**
   * Get cached metrics if available and fresh
   */
  async getCachedMetrics(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    maxAgeMinutes: number = 60
  ): Promise<HRAnalyticsMetrics | null> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    const cached = await db('hr_analytics_cache')
      .where({
        organization_id: organizationId,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .where('cached_at', '>', cutoffTime)
      .first();

    if (cached) {
      return JSON.parse(cached.metrics_data);
    }

    return null;
  }

  /**
   * Helper method to get nested object values
   */
  private getNestedValue(obj: any, path: string): number {
    return path.split('.').reduce((current, key) => current?.[key] ?? 0, obj);
  }

  /**
   * Helper method to get metric value by name
   */
  private getMetricValue(metrics: HRAnalyticsMetrics, metricName: string): number {
    const metricPaths: Record<string, string> = {
      'applications_received': 'applications.total_received',
      'approval_rate': 'applications.approval_rate',
      'onboarding_completion_rate': 'onboarding.completion_rate',
      'average_performance_rating': 'performance.average_rating',
      'skill_verification_rate': 'skills.verification_rate',
      'turnover_rate': 'retention.member_turnover_rate',
      'document_compliance_rate': 'documents.compliance_rate',
    };

    const path = metricPaths[metricName];
    return path ? this.getNestedValue(metrics.metrics, path) : 0;
  }

  /**
   * Generate alert message based on threshold and current value
   */
  private generateAlertMessage(threshold: AlertThreshold, currentValue: number): string {
    const metricDisplayNames: Record<string, string> = {
      'applications_received': 'Applications Received',
      'approval_rate': 'Application Approval Rate',
      'onboarding_completion_rate': 'Onboarding Completion Rate',
      'average_performance_rating': 'Average Performance Rating',
      'skill_verification_rate': 'Skill Verification Rate',
      'turnover_rate': 'Member Turnover Rate',
      'document_compliance_rate': 'Document Compliance Rate',
    };

    const metricName = metricDisplayNames[threshold.metric_name] || threshold.metric_name;
    const comparison = threshold.comparison_type.replace('_', ' ');
    
    return `${metricName} is ${currentValue} (${comparison} threshold of ${threshold.threshold_value})`;
  }
}