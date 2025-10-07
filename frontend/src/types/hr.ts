// HR System Types for Frontend

// Application Management Types
export interface Application {
  id: string;
  organization_id: string;
  user_id: string;
  status: 'pending' | 'under_review' | 'interview_scheduled' | 'approved' | 'rejected';
  application_data: {
    cover_letter?: string;
    experience?: string;
    availability?: string;
    custom_fields?: Record<string, any>;
  };
  reviewer_id?: string;
  review_notes?: string;
  rejection_reason?: string;
  invite_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  status: string;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export interface CreateApplicationData {
  cover_letter?: string;
  experience?: string;
  availability?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateApplicationStatusData {
  status: 'pending' | 'under_review' | 'interview_scheduled' | 'approved' | 'rejected';
  review_notes?: string;
  rejection_reason?: string;
}

// Onboarding Management Types
export interface OnboardingTemplate {
  id: string;
  organization_id: string;
  role_name: string;
  tasks: OnboardingTask[];
  estimated_duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  required: boolean;
  estimated_hours: number;
  order_index: number;
}

export interface OnboardingProgress {
  id: string;
  organization_id: string;
  user_id: string;
  template_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  completed_tasks: string[];
  completion_percentage: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOnboardingTemplateData {
  role_name: string;
  tasks: Omit<OnboardingTask, 'id'>[];
  estimated_duration_days: number;
}

export interface UpdateOnboardingProgressData {
  completed_tasks: string[];
}

// Performance Management Types
export interface PerformanceReview {
  id: string;
  organization_id: string;
  reviewee_id: string;
  reviewer_id: string;
  review_period_start: string;
  review_period_end: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  ratings: {
    [category: string]: {
      score: number;
      comments?: string;
    };
  };
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  goals: PerformanceGoal[];
  created_at: string;
  updated_at: string;
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
}

export interface CreatePerformanceReviewData {
  reviewee_id: string;
  review_period_start: string;
  review_period_end: string;
  ratings: {
    [category: string]: {
      score: number;
      comments?: string;
    };
  };
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  goals: Omit<PerformanceGoal, 'id'>[];
}

// Skills Management Types
export interface Skill {
  id: string;
  organization_id: string;
  name: string;
  category: 'pilot' | 'engineer' | 'medic' | 'security' | 'logistics' | 'leadership';
  description: string;
  verification_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  organization_id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  description: string;
  issued_date: string;
  expiration_date?: string;
  issued_by: string;
  certificate_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillData {
  name: string;
  category: 'pilot' | 'engineer' | 'medic' | 'security' | 'logistics' | 'leadership';
  description: string;
  verification_required: boolean;
}

export interface CreateUserSkillData {
  skill_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  notes?: string;
}

export interface VerifySkillData {
  verified: boolean;
  notes?: string;
}

// Document Management Types
export interface Document {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  content: string;
  word_count: number;
  estimated_reading_time: number;
  folder_path: string;
  version: number;
  requires_acknowledgment: boolean;
  access_roles: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  user_id: string;
  acknowledged_at: string;
  ip_address?: string;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  content: string;
  word_count?: number;
  estimated_reading_time?: number;
  folder_path: string;
  requires_acknowledgment: boolean;
  access_roles: string[];
}

export interface AcknowledgeDocumentData {
  document_id: string;
}

// Analytics and Reporting Types
export interface HRAnalytics {
  organization_id: string;
  period_start: string;
  period_end: string;
  metrics: {
    applications: {
      total_received: number;
      approval_rate: number;
      average_processing_time_days: number;
      conversion_rate: number;
    };
    onboarding: {
      total_started: number;
      completion_rate: number;
      average_completion_time_days: number;
      overdue_count: number;
    };
    performance: {
      reviews_completed: number;
      average_rating: number;
      improvement_plans_active: number;
      goals_completion_rate: number;
    };
    skills: {
      total_skills_tracked: number;
      verification_rate: number;
      skill_gaps: SkillGap[];
    };
    retention: {
      member_turnover_rate: number;
      average_tenure_days: number;
      exit_reasons: Record<string, number>;
    };
  };
}

export interface SkillGap {
  skill_name: string;
  required_count: number;
  current_count: number;
  gap_percentage: number;
}

// API Response Types
export interface HRAnalyticsResponse {
  success: boolean;
  data: HRAnalytics;
}

export interface ApplicationListResponse {
  success: boolean;
  data: {
    data: Application[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface OnboardingProgressListResponse {
  success: boolean;
  data: {
    data: OnboardingProgress[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface PerformanceReviewListResponse {
  success: boolean;
  data: {
    data: PerformanceReview[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface SkillListResponse {
  success: boolean;
  data: {
    data: Skill[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface DocumentListResponse {
  success: boolean;
  data: {
    data: Document[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// Filter and Query Types
export interface ApplicationFilters {
  status?: 'pending' | 'under_review' | 'interview_scheduled' | 'approved' | 'rejected';
  reviewer_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface OnboardingFilters {
  status?: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  role_name?: string;
  user_id?: string;
}

export interface PerformanceReviewFilters {
  status?: 'draft' | 'submitted' | 'acknowledged';
  reviewee_id?: string;
  reviewer_id?: string;
  period_start?: string;
  period_end?: string;
}

export interface SkillFilters {
  category?: 'pilot' | 'engineer' | 'medic' | 'security' | 'logistics' | 'leadership';
  verified?: boolean;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface DocumentFilters {
  folder_path?: string;
  requires_acknowledgment?: boolean;
  access_roles?: string[];
}

// HR Event Integration Types
export interface HREventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  organization_id: string;
  attended: boolean;
  attendance_date: string;
  performance_notes?: string;
  skill_demonstrations?: string[];
  created_at: string;
  updated_at: string;
}

export interface EventAttendanceData {
  user_id: string;
  attended: boolean;
  performance_notes?: string;
  skill_demonstrations?: string[];
}

export interface HREventAnalytics {
  event_participation: {
    total_events: number;
    attended_events: number;
    attendance_rate: number;
    recent_events: {
      event_id: string;
      event_title: string;
      event_date: string;
      attended: boolean;
      performance_rating?: number;
    }[];
  };
  skill_development: {
    skills_demonstrated: string[];
    skill_verifications_earned: number;
    training_events_attended: number;
  };
  performance_correlation: {
    attendance_vs_performance: {
      high_attendance_high_performance: number;
      high_attendance_low_performance: number;
      low_attendance_high_performance: number;
      low_attendance_low_performance: number;
    };
  };
}

export interface EventBasedSkillVerification {
  event_id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verification_notes?: string;
  verified_by: string;
  verification_date: string;
}

// HR Activity Feed Types
export interface HRActivity {
  id: string;
  organization_id: string;
  activity_type: 'application_submitted' | 'application_status_changed' | 'onboarding_completed' | 'performance_review_submitted' | 'skill_verified' | 'document_acknowledged';
  user_id: string;
  user_handle: string;
  user_avatar_url?: string;
  title: string;
  description: string;
  metadata: {
    application_id?: string;
    review_id?: string;
    skill_id?: string;
    document_id?: string;
    old_status?: string;
    new_status?: string;
  };
  created_at: string;
}

export interface HRActivityListResponse {
  success: boolean;
  data: {
    data: HRActivity[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface HRActivityFilters {
  page?: number;
  limit?: number;
  activity_types?: string[];
  date_from?: string;
  date_to?: string;
}

// Skills Statistics Types
export interface SkillStatistics {
  skill_id: string;
  total_members: number;
  verified_members: number;
  verification_rate: number;
  proficiency_breakdown: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
  recent_verifications: number;
  last_updated: string;
}

export interface OrganizationSkillsStatistics {
  [skillId: string]: SkillStatistics;
}

export interface SkillsStatisticsResponse {
  success: boolean;
  data: OrganizationSkillsStatistics;
}

// Document Acknowledgment Status Types
export interface UserAcknowledgment {
  user_id: string;
  user_handle: string;
  acknowledged_at: string;
  ip_address?: string;
}

export interface DocumentAcknowledmentStatus {
  document_id: string;
  user_acknowledgments: UserAcknowledgment[];
  total_required: number;
  total_acknowledged: number;
  acknowledgment_rate: number;
  current_user_acknowledged: boolean;
  current_user_acknowledged_at?: string;
  last_updated: string;
}

export interface DocumentAcknowledmentStatusResponse {
  success: boolean;
  data: DocumentAcknowledmentStatus;
}