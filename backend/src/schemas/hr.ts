/**
 * HR Management System OpenAPI schemas
 */

// Application Management Schemas
export const ApplicationSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Application ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    user_id: {
      type: 'string' as const,
      description: 'Applicant user ID'
    },
    status: {
      type: 'string' as const,
      enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected'],
      description: 'Application status'
    },
    application_data: {
      type: 'object' as const,
      properties: {
        cover_letter: {
          type: 'string' as const,
          nullable: true,
          description: 'Cover letter text'
        },
        experience: {
          type: 'string' as const,
          nullable: true,
          description: 'Experience description'
        },
        availability: {
          type: 'string' as const,
          nullable: true,
          description: 'Availability information'
        },
        custom_fields: {
          type: 'object' as const,
          nullable: true,
          description: 'Custom application fields'
        }
      },
      description: 'Application data'
    },
    reviewer_id: {
      type: 'string' as const,
      nullable: true,
      description: 'Reviewer user ID'
    },
    review_notes: {
      type: 'string' as const,
      nullable: true,
      description: 'Review notes'
    },
    rejection_reason: {
      type: 'string' as const,
      nullable: true,
      description: 'Rejection reason'
    },
    invite_code: {
      type: 'string' as const,
      nullable: true,
      description: 'Generated invite code for approved applications'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'organization_id', 'user_id', 'status', 'application_data', 'created_at', 'updated_at']
};

export const CreateApplicationRequestSchema = {
  type: 'object' as const,
  properties: {
    application_data: {
      type: 'object' as const,
      properties: {
        cover_letter: {
          type: 'string' as const,
          maxLength: 2000,
          description: 'Cover letter text'
        },
        experience: {
          type: 'string' as const,
          maxLength: 1000,
          description: 'Experience description'
        },
        availability: {
          type: 'string' as const,
          maxLength: 500,
          description: 'Availability information'
        },
        custom_fields: {
          type: 'object' as const,
          description: 'Custom application fields'
        }
      },
      required: ['cover_letter'],
      description: 'Application data'
    }
  },
  required: ['application_data']
};

export const UpdateApplicationStatusRequestSchema = {
  type: 'object' as const,
  properties: {
    status: {
      type: 'string' as const,
      enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected'],
      description: 'New application status'
    },
    review_notes: {
      type: 'string' as const,
      maxLength: 1000,
      description: 'Review notes'
    },
    rejection_reason: {
      type: 'string' as const,
      maxLength: 500,
      description: 'Rejection reason (required for rejected status)'
    }
  },
  required: ['status']
};

export const ApplicationListResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Application' }
    },
    pagination: { $ref: '#/components/schemas/Pagination' }
  },
  required: ['success', 'data', 'pagination']
};

// Onboarding Management Schemas
export const OnboardingTaskSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Task ID'
    },
    title: {
      type: 'string' as const,
      description: 'Task title'
    },
    description: {
      type: 'string' as const,
      description: 'Task description'
    },
    required: {
      type: 'boolean' as const,
      description: 'Whether task is required'
    },
    estimated_hours: {
      type: 'number' as const,
      description: 'Estimated completion hours'
    },
    order_index: {
      type: 'integer' as const,
      description: 'Task order'
    }
  },
  required: ['id', 'title', 'description', 'required', 'estimated_hours', 'order_index']
};

export const OnboardingTemplateSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Template ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    role_name: {
      type: 'string' as const,
      description: 'Role name'
    },
    tasks: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/OnboardingTask' },
      description: 'Onboarding tasks'
    },
    estimated_duration_days: {
      type: 'integer' as const,
      description: 'Estimated completion duration in days'
    },
    is_active: {
      type: 'boolean' as const,
      description: 'Whether template is active'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'organization_id', 'role_name', 'tasks', 'estimated_duration_days', 'is_active', 'created_at', 'updated_at']
};

export const OnboardingProgressSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Progress ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    user_id: {
      type: 'string' as const,
      description: 'User ID'
    },
    template_id: {
      type: 'string' as const,
      description: 'Template ID'
    },
    status: {
      type: 'string' as const,
      enum: ['not_started', 'in_progress', 'completed', 'overdue'],
      description: 'Onboarding status'
    },
    completed_tasks: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Completed task IDs'
    },
    completion_percentage: {
      type: 'number' as const,
      minimum: 0,
      maximum: 100,
      description: 'Completion percentage'
    },
    started_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Start timestamp'
    },
    completed_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      nullable: true,
      description: 'Completion timestamp'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'organization_id', 'user_id', 'template_id', 'status', 'completed_tasks', 'completion_percentage', 'started_at', 'created_at', 'updated_at']
};

export const CreateOnboardingTemplateRequestSchema = {
  type: 'object' as const,
  properties: {
    role_name: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      description: 'Role name'
    },
    tasks: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const, minLength: 1, maxLength: 200 },
          description: { type: 'string' as const, maxLength: 1000 },
          required: { type: 'boolean' as const },
          estimated_hours: { type: 'number' as const, minimum: 0 },
          order_index: { type: 'integer' as const, minimum: 0 }
        },
        required: ['title', 'description', 'required', 'estimated_hours', 'order_index']
      },
      minItems: 1,
      description: 'Onboarding tasks'
    },
    estimated_duration_days: {
      type: 'integer' as const,
      minimum: 1,
      maximum: 365,
      description: 'Estimated completion duration in days'
    }
  },
  required: ['role_name', 'tasks', 'estimated_duration_days']
};

// Performance Management Schemas
export const PerformanceGoalSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Goal ID'
    },
    title: {
      type: 'string' as const,
      description: 'Goal title'
    },
    description: {
      type: 'string' as const,
      description: 'Goal description'
    },
    target_date: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Target completion date'
    },
    status: {
      type: 'string' as const,
      enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
      description: 'Goal status'
    },
    progress_percentage: {
      type: 'number' as const,
      minimum: 0,
      maximum: 100,
      description: 'Progress percentage'
    }
  },
  required: ['id', 'title', 'description', 'target_date', 'status', 'progress_percentage']
};

export const PerformanceReviewSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Review ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    reviewee_id: {
      type: 'string' as const,
      description: 'Reviewee user ID'
    },
    reviewer_id: {
      type: 'string' as const,
      description: 'Reviewer user ID'
    },
    review_period_start: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Review period start date'
    },
    review_period_end: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Review period end date'
    },
    status: {
      type: 'string' as const,
      enum: ['draft', 'submitted', 'acknowledged'],
      description: 'Review status'
    },
    ratings: {
      type: 'object' as const,
      additionalProperties: {
        type: 'object' as const,
        properties: {
          score: { type: 'number' as const, minimum: 1, maximum: 5 },
          comments: { type: 'string' as const, nullable: true }
        },
        required: ['score']
      },
      description: 'Category ratings'
    },
    overall_rating: {
      type: 'number' as const,
      minimum: 1,
      maximum: 5,
      description: 'Overall rating'
    },
    strengths: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Identified strengths'
    },
    areas_for_improvement: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Areas for improvement'
    },
    goals: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/PerformanceGoal' },
      description: 'Performance goals'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'organization_id', 'reviewee_id', 'reviewer_id', 'review_period_start', 'review_period_end', 'status', 'ratings', 'overall_rating', 'strengths', 'areas_for_improvement', 'goals', 'created_at', 'updated_at']
};

export const CreatePerformanceReviewRequestSchema = {
  type: 'object' as const,
  properties: {
    reviewee_id: {
      type: 'string' as const,
      description: 'Reviewee user ID'
    },
    review_period_start: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Review period start date'
    },
    review_period_end: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Review period end date'
    },
    ratings: {
      type: 'object' as const,
      additionalProperties: {
        type: 'object' as const,
        properties: {
          score: { type: 'number' as const, minimum: 1, maximum: 5 },
          comments: { type: 'string' as const, maxLength: 1000 }
        },
        required: ['score']
      },
      description: 'Category ratings'
    },
    overall_rating: {
      type: 'number' as const,
      minimum: 1,
      maximum: 5,
      description: 'Overall rating'
    },
    strengths: {
      type: 'array' as const,
      items: { type: 'string' as const, maxLength: 500 },
      description: 'Identified strengths'
    },
    areas_for_improvement: {
      type: 'array' as const,
      items: { type: 'string' as const, maxLength: 500 },
      description: 'Areas for improvement'
    }
  },
  required: ['reviewee_id', 'review_period_start', 'review_period_end', 'ratings', 'overall_rating']
};

// Skills Management Schemas
export const SkillSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Skill ID'
    },
    name: {
      type: 'string' as const,
      description: 'Skill name'
    },
    category: {
      type: 'string' as const,
      enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership'],
      description: 'Skill category'
    },
    description: {
      type: 'string' as const,
      description: 'Skill description'
    },
    verification_required: {
      type: 'boolean' as const,
      description: 'Whether skill requires verification'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'name', 'category', 'description', 'verification_required', 'created_at', 'updated_at']
};

export const UserSkillSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'User skill ID'
    },
    user_id: {
      type: 'string' as const,
      description: 'User ID'
    },
    skill_id: {
      type: 'string' as const,
      description: 'Skill ID'
    },
    proficiency_level: {
      type: 'string' as const,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      description: 'Proficiency level'
    },
    verified: {
      type: 'boolean' as const,
      description: 'Whether skill is verified'
    },
    verified_by: {
      type: 'string' as const,
      nullable: true,
      description: 'Verifier user ID'
    },
    verified_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      nullable: true,
      description: 'Verification timestamp'
    },
    notes: {
      type: 'string' as const,
      nullable: true,
      description: 'Additional notes'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'user_id', 'skill_id', 'proficiency_level', 'verified', 'created_at', 'updated_at']
};

export const CertificationSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Certification ID'
    },
    user_id: {
      type: 'string' as const,
      description: 'User ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    name: {
      type: 'string' as const,
      description: 'Certification name'
    },
    description: {
      type: 'string' as const,
      description: 'Certification description'
    },
    issued_date: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Issue date'
    },
    expiration_date: {
      type: 'string' as const,
      format: 'date' as const,
      nullable: true,
      description: 'Expiration date'
    },
    issued_by: {
      type: 'string' as const,
      description: 'Issuer user ID'
    },
    certificate_url: {
      type: 'string' as const,
      format: 'uri' as const,
      nullable: true,
      description: 'Certificate URL'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'user_id', 'organization_id', 'name', 'description', 'issued_date', 'issued_by', 'created_at', 'updated_at']
};

// Document Management Schemas
export const DocumentSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Document ID'
    },
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    title: {
      type: 'string' as const,
      description: 'Document title'
    },
    description: {
      type: 'string' as const,
      nullable: true,
      description: 'Document description'
    },
    file_path: {
      type: 'string' as const,
      description: 'File path'
    },
    file_type: {
      type: 'string' as const,
      description: 'File MIME type'
    },
    file_size: {
      type: 'integer' as const,
      description: 'File size in bytes'
    },
    folder_path: {
      type: 'string' as const,
      description: 'Folder path'
    },
    version: {
      type: 'integer' as const,
      description: 'Document version'
    },
    requires_acknowledgment: {
      type: 'boolean' as const,
      description: 'Whether document requires acknowledgment'
    },
    access_roles: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Roles with access to document'
    },
    uploaded_by: {
      type: 'string' as const,
      description: 'Uploader user ID'
    },
    created_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Creation timestamp'
    },
    updated_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'organization_id', 'title', 'file_path', 'file_type', 'file_size', 'folder_path', 'version', 'requires_acknowledgment', 'access_roles', 'uploaded_by', 'created_at', 'updated_at']
};

export const CreateDocumentRequestSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 200,
      description: 'Document title'
    },
    description: {
      type: 'string' as const,
      maxLength: 1000,
      description: 'Document description'
    },
    file_path: {
      type: 'string' as const,
      description: 'File path'
    },
    file_type: {
      type: 'string' as const,
      description: 'File MIME type'
    },
    file_size: {
      type: 'integer' as const,
      minimum: 1,
      description: 'File size in bytes'
    },
    folder_path: {
      type: 'string' as const,
      default: '/',
      description: 'Folder path'
    },
    requires_acknowledgment: {
      type: 'boolean' as const,
      default: false,
      description: 'Whether document requires acknowledgment'
    },
    access_roles: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Roles with access to document'
    }
  },
  required: ['title', 'file_path', 'file_type', 'file_size', 'access_roles']
};

// Analytics Schemas
export const HRAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    organization_id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    period_start: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Analytics period start'
    },
    period_end: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Analytics period end'
    },
    metrics: {
      type: 'object' as const,
      properties: {
        applications: {
          type: 'object' as const,
          properties: {
            total_received: { type: 'integer' as const },
            approval_rate: { type: 'number' as const },
            average_processing_time_days: { type: 'number' as const },
            conversion_rate: { type: 'number' as const }
          },
          required: ['total_received', 'approval_rate', 'average_processing_time_days', 'conversion_rate']
        },
        onboarding: {
          type: 'object' as const,
          properties: {
            total_started: { type: 'integer' as const },
            completion_rate: { type: 'number' as const },
            average_completion_time_days: { type: 'number' as const },
            overdue_count: { type: 'integer' as const }
          },
          required: ['total_started', 'completion_rate', 'average_completion_time_days', 'overdue_count']
        },
        performance: {
          type: 'object' as const,
          properties: {
            reviews_completed: { type: 'integer' as const },
            average_rating: { type: 'number' as const },
            improvement_plans_active: { type: 'integer' as const },
            goals_completion_rate: { type: 'number' as const }
          },
          required: ['reviews_completed', 'average_rating', 'improvement_plans_active', 'goals_completion_rate']
        },
        skills: {
          type: 'object' as const,
          properties: {
            total_skills_tracked: { type: 'integer' as const },
            verification_rate: { type: 'number' as const },
            skill_gaps: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  skill_name: { type: 'string' as const },
                  required_count: { type: 'integer' as const },
                  current_count: { type: 'integer' as const },
                  gap_percentage: { type: 'number' as const }
                },
                required: ['skill_name', 'required_count', 'current_count', 'gap_percentage']
              }
            }
          },
          required: ['total_skills_tracked', 'verification_rate', 'skill_gaps']
        },
        retention: {
          type: 'object' as const,
          properties: {
            member_turnover_rate: { type: 'number' as const },
            average_tenure_days: { type: 'number' as const },
            exit_reasons: {
              type: 'object' as const,
              additionalProperties: { type: 'integer' as const }
            }
          },
          required: ['member_turnover_rate', 'average_tenure_days', 'exit_reasons']
        }
      },
      required: ['applications', 'onboarding', 'performance', 'skills', 'retention']
    }
  },
  required: ['organization_id', 'period_start', 'period_end', 'metrics']
};

// Response Schemas
export const ApplicationResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/Application' }
  },
  required: ['success', 'data']
};

export const OnboardingTemplateResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/OnboardingTemplate' }
  },
  required: ['success', 'data']
};

export const OnboardingProgressResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/OnboardingProgress' }
  },
  required: ['success', 'data']
};

export const PerformanceReviewResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/PerformanceReview' }
  },
  required: ['success', 'data']
};

export const SkillListResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Skill' }
    },
    total: { type: 'integer' as const },
    page: { type: 'integer' as const },
    limit: { type: 'integer' as const },
    total_pages: { type: 'integer' as const }
  },
  required: ['success', 'data', 'total', 'page', 'limit', 'total_pages']
};

export const DocumentResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/Document' }
  },
  required: ['success', 'data']
};

export const HRAnalyticsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: { $ref: '#/components/schemas/HRAnalytics' }
  },
  required: ['success', 'data']
};

// Additional Analytics Schemas
export const OnboardingAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    total_started: {
      type: 'integer' as const,
      description: 'Total onboarding processes started'
    },
    completion_rate: {
      type: 'number' as const,
      description: 'Completion rate percentage'
    },
    average_completion_time_days: {
      type: 'number' as const,
      description: 'Average completion time in days'
    },
    overdue_count: {
      type: 'integer' as const,
      description: 'Number of overdue onboarding processes'
    },
    completion_by_role: {
      type: 'object' as const,
      additionalProperties: {
        type: 'object' as const,
        properties: {
          total: { type: 'integer' as const },
          completed: { type: 'integer' as const },
          completion_rate: { type: 'number' as const }
        }
      },
      description: 'Completion statistics by role'
    }
  },
  required: ['total_started', 'completion_rate', 'average_completion_time_days', 'overdue_count', 'completion_by_role']
};