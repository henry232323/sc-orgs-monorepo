import db from '../config/database';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  required: boolean;
  estimated_hours: number;
  order_index: number;
}

export interface HROnboardingTemplate {
  id: string;
  organization_id: string;
  role_name: string;
  tasks: OnboardingTask[];
  estimated_duration_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHROnboardingTemplateData {
  organization_id: string;
  role_name: string;
  tasks: OnboardingTask[];
  estimated_duration_days?: number;
}

export interface UpdateHROnboardingTemplateData {
  role_name?: string;
  tasks?: OnboardingTask[];
  estimated_duration_days?: number;
  is_active?: boolean;
}

export interface HROnboardingProgress {
  id: string;
  organization_id: string;
  user_id: string;
  template_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  completed_tasks: string[];
  completion_percentage: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHROnboardingProgressData {
  organization_id: string;
  user_id: string;
  template_id: string;
}

export interface UpdateHROnboardingProgressData {
  status?: HROnboardingProgress['status'];
  completed_tasks?: string[];
  completion_percentage?: number;
  started_at?: Date;
  completed_at?: Date;
}

export class HROnboardingModel {
  // Template methods
  async createTemplate(templateData: CreateHROnboardingTemplateData): Promise<HROnboardingTemplate> {
    const insertData = {
      ...templateData,
      estimated_duration_days: templateData.estimated_duration_days || 30,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [template] = await db('hr_onboarding_templates')
      .insert(insertData)
      .returning('*');

    return template;
  }

  async findTemplateById(id: string): Promise<HROnboardingTemplate | null> {
    const template = await db('hr_onboarding_templates').where({ id }).first();
    return template || null;
  }

  async findTemplateByRoleAndOrganization(
    organizationId: string,
    roleName: string
  ): Promise<HROnboardingTemplate | null> {
    const template = await db('hr_onboarding_templates')
      .where({ organization_id: organizationId, role_name: roleName, is_active: true })
      .first();
    return template || null;
  }

  async updateTemplate(
    id: string,
    updateData: UpdateHROnboardingTemplateData
  ): Promise<HROnboardingTemplate | null> {
    const [template] = await db('hr_onboarding_templates')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return template || null;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = await db('hr_onboarding_templates').where({ id }).del();
    return deleted > 0;
  }

  async listTemplates(
    organizationId: string,
    filters: {
      is_active?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HROnboardingTemplate[]; total: number }> {
    let query = db('hr_onboarding_templates').where({ organization_id: organizationId });

    if (filters.is_active !== undefined) {
      query = query.where({ is_active: filters.is_active });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const templates = await query.orderBy('role_name', 'asc');

    return { data: templates, total };
  }

  // Progress methods
  async createProgress(progressData: CreateHROnboardingProgressData): Promise<HROnboardingProgress> {
    const insertData = {
      ...progressData,
      status: 'not_started' as const,
      completed_tasks: [],
      completion_percentage: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [progress] = await db('hr_onboarding_progress')
      .insert(insertData)
      .returning('*');

    return progress;
  }

  async findProgressById(id: string): Promise<HROnboardingProgress | null> {
    const progress = await db('hr_onboarding_progress').where({ id }).first();
    return progress || null;
  }

  async findProgressByUserAndOrganization(
    organizationId: string,
    userId: string
  ): Promise<HROnboardingProgress | null> {
    const progress = await db('hr_onboarding_progress')
      .where({ organization_id: organizationId, user_id: userId })
      .first();
    return progress || null;
  }

  async updateProgress(
    id: string,
    updateData: UpdateHROnboardingProgressData
  ): Promise<HROnboardingProgress | null> {
    const [progress] = await db('hr_onboarding_progress')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return progress || null;
  }

  async deleteProgress(id: string): Promise<boolean> {
    const deleted = await db('hr_onboarding_progress').where({ id }).del();
    return deleted > 0;
  }

  async listProgress(
    organizationId: string,
    filters: {
      status?: HROnboardingProgress['status'];
      user_id?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HROnboardingProgress[]; total: number }> {
    let query = db('hr_onboarding_progress').where({ organization_id: organizationId });

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.user_id) {
      query = query.where({ user_id: filters.user_id });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const progress = await query.orderBy('created_at', 'desc');

    return { data: progress, total };
  }

  async completeTask(progressId: string, taskId: string): Promise<HROnboardingProgress | null> {
    const progress = await this.findProgressById(progressId);
    if (!progress) return null;

    const template = await this.findTemplateById(progress.template_id);
    if (!template) return null;

    // Add task to completed tasks if not already completed
    const completedTasks = progress.completed_tasks || [];
    if (!completedTasks.includes(taskId)) {
      completedTasks.push(taskId);
    }

    // Calculate completion percentage
    const totalTasks = template.tasks.length;
    const completionPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    // Determine status
    let status: HROnboardingProgress['status'] = 'in_progress';
    let completedAt: Date | undefined;

    if (completionPercentage === 100) {
      status = 'completed';
      completedAt = new Date();
    } else if (progress.status === 'not_started') {
      status = 'in_progress';
    }

    const updateData: UpdateHROnboardingProgressData = {
      completed_tasks: completedTasks,
      completion_percentage: completionPercentage,
      status,
      started_at: progress.started_at || new Date(),
    };

    if (completedAt) {
      updateData.completed_at = completedAt;
    }

    return this.updateProgress(progressId, updateData);
  }

  async getProgressWithUserInfo(
    organizationId: string,
    filters: {
      status?: HROnboardingProgress['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[]; total: number }> {
    let query = db('hr_onboarding_progress')
      .join('users', 'hr_onboarding_progress.user_id', 'users.id')
      .join('hr_onboarding_templates', 'hr_onboarding_progress.template_id', 'hr_onboarding_templates.id')
      .where({ 'hr_onboarding_progress.organization_id': organizationId })
      .select(
        'hr_onboarding_progress.*',
        'users.rsi_handle as user_rsi_handle',
        'users.discord_username as user_discord_username',
        'hr_onboarding_templates.role_name',
        'hr_onboarding_templates.tasks',
        'hr_onboarding_templates.estimated_duration_days'
      );

    if (filters.status) {
      query = query.where({ 'hr_onboarding_progress.status': filters.status });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_onboarding_progress.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const progress = await query.orderBy('hr_onboarding_progress.created_at', 'desc');

    return { data: progress, total };
  }

  async getOverdueProgress(organizationId: string): Promise<HROnboardingProgress[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db('hr_onboarding_progress')
      .where({ organization_id: organizationId })
      .whereIn('status', ['not_started', 'in_progress'])
      .where('created_at', '<', thirtyDaysAgo);
  }

  async markOverdueProgress(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const updated = await db('hr_onboarding_progress')
      .whereIn('status', ['not_started', 'in_progress'])
      .where('created_at', '<', thirtyDaysAgo)
      .update({
        status: 'overdue',
        updated_at: new Date(),
      });

    return updated;
  }

  // Additional methods for progress calculation and completion validation
  async calculateProgressPercentage(progressId: string): Promise<number> {
    const progress = await this.findProgressById(progressId);
    if (!progress) return 0;

    const template = await this.findTemplateById(progress.template_id);
    if (!template || !template.tasks.length) return 0;

    const completedTasks = progress.completed_tasks || [];
    return (completedTasks.length / template.tasks.length) * 100;
  }

  async validateTaskCompletion(progressId: string, taskId: string): Promise<boolean> {
    const progress = await this.findProgressById(progressId);
    if (!progress) return false;

    const template = await this.findTemplateById(progress.template_id);
    if (!template) return false;

    // Check if task exists in template
    const taskExists = template.tasks.some(task => task.id === taskId);
    if (!taskExists) return false;

    // Check if task is already completed
    const completedTasks = progress.completed_tasks || [];
    return !completedTasks.includes(taskId);
  }

  async getRequiredTasksRemaining(progressId: string): Promise<OnboardingTask[]> {
    const progress = await this.findProgressById(progressId);
    if (!progress) return [];

    const template = await this.findTemplateById(progress.template_id);
    if (!template) return [];

    const completedTasks = progress.completed_tasks || [];
    return template.tasks.filter(task => 
      task.required && !completedTasks.includes(task.id)
    );
  }

  async isOnboardingComplete(progressId: string): Promise<boolean> {
    const progress = await this.findProgressById(progressId);
    if (!progress) return false;

    const template = await this.findTemplateById(progress.template_id);
    if (!template) return false;

    const completedTasks = progress.completed_tasks || [];
    const requiredTasks = template.tasks.filter(task => task.required);
    
    // Check if all required tasks are completed
    return requiredTasks.every(task => completedTasks.includes(task.id));
  }

  async getEstimatedCompletionDate(progressId: string): Promise<Date | null> {
    const progress = await this.findProgressById(progressId);
    if (!progress || !progress.started_at) return null;

    const template = await this.findTemplateById(progress.template_id);
    if (!template) return null;

    const startDate = new Date(progress.started_at);
    const estimatedDate = new Date(startDate);
    estimatedDate.setDate(startDate.getDate() + template.estimated_duration_days);

    return estimatedDate;
  }

  async getOnboardingStatistics(organizationId: string): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
    not_started: number;
    average_completion_time_days: number;
    completion_rate: number;
  }> {
    const stats = await db('hr_onboarding_progress')
      .where({ organization_id: organizationId })
      .select('status')
      .count('* as count')
      .groupBy('status');

    const statusCounts = {
      total: 0,
      completed: 0,
      in_progress: 0,
      overdue: 0,
      not_started: 0,
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count as string);
      statusCounts.total += count;
      statusCounts[stat.status as keyof typeof statusCounts] = count;
    });

    // Calculate average completion time for completed onboarding
    const completedProgress = await db('hr_onboarding_progress')
      .where({ organization_id: organizationId, status: 'completed' })
      .whereNotNull('started_at')
      .whereNotNull('completed_at')
      .select('started_at', 'completed_at');

    let averageCompletionTimeDays = 0;
    if (completedProgress.length > 0) {
      const totalDays = completedProgress.reduce((sum, progress) => {
        const startDate = new Date(progress.started_at);
        const endDate = new Date(progress.completed_at);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      averageCompletionTimeDays = totalDays / completedProgress.length;
    }

    const completionRate = statusCounts.total > 0 
      ? (statusCounts.completed / statusCounts.total) * 100 
      : 0;

    return {
      ...statusCounts,
      average_completion_time_days: Math.round(averageCompletionTimeDays * 100) / 100,
      completion_rate: Math.round(completionRate * 100) / 100,
    };
  }
}