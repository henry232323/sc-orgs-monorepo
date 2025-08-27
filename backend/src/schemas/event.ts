/**
 * Event-related OpenAPI schemas
 */

// Event Schema
export const EventSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Event ID'
    },
    title: {
      type: 'string' as const,
      description: 'Event title'
    },
    description: {
      type: 'string' as const,
      description: 'Event description',
      nullable: true
    },
    startTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event start time'
    },
    endTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event end time',
      nullable: true
    },
    location: {
      type: 'string' as const,
      description: 'Event location',
      nullable: true
    },
    maxParticipants: {
      type: 'integer' as const,
      description: 'Maximum number of participants',
      nullable: true
    },
    isPrivate: {
      type: 'boolean' as const,
      description: 'Whether the event is private'
    },
    status: {
      type: 'string' as const,
      description: 'Event status',
      enum: ['draft', 'published', 'cancelled', 'completed']
    },
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID that owns the event'
    },
    organizationName: {
      type: 'string' as const,
      description: 'Organization name'
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event creation timestamp'
    },
    updatedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event last update timestamp'
    },
    participantCount: {
      type: 'integer' as const,
      description: 'Current number of registered participants'
    },
    averageRating: {
      type: 'number' as const,
      description: 'Average rating of the event',
      nullable: true
    },
    reviewCount: {
      type: 'integer' as const,
      description: 'Number of reviews for the event'
    }
  },
  required: ['id', 'title', 'startTime', 'isPrivate', 'status', 'organizationId', 'organizationName', 'createdAt', 'updatedAt', 'participantCount', 'reviewCount']
};

// Create Event Request Schema
export const CreateEventRequestSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Event title',
      minLength: 1,
      maxLength: 200
    },
    description: {
      type: 'string' as const,
      description: 'Event description',
      maxLength: 2000,
      nullable: true
    },
    startTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event start time'
    },
    endTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event end time',
      nullable: true
    },
    location: {
      type: 'string' as const,
      description: 'Event location',
      maxLength: 200,
      nullable: true
    },
    maxParticipants: {
      type: 'integer' as const,
      description: 'Maximum number of participants',
      minimum: 1,
      nullable: true
    },
    isPrivate: {
      type: 'boolean' as const,
      description: 'Whether the event is private'
    }
  },
  required: ['title', 'startTime', 'isPrivate']
};

// Update Event Request Schema
export const UpdateEventRequestSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Event title',
      minLength: 1,
      maxLength: 200
    },
    description: {
      type: 'string' as const,
      description: 'Event description',
      maxLength: 2000,
      nullable: true
    },
    startTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event start time'
    },
    endTime: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Event end time',
      nullable: true
    },
    location: {
      type: 'string' as const,
      description: 'Event location',
      maxLength: 200,
      nullable: true
    },
    maxParticipants: {
      type: 'integer' as const,
      description: 'Maximum number of participants',
      minimum: 1,
      nullable: true
    },
    isPrivate: {
      type: 'boolean' as const,
      description: 'Whether the event is private'
    },
    status: {
      type: 'string' as const,
      description: 'Event status',
      enum: ['draft', 'published', 'cancelled', 'completed']
    }
  }
};

// Event Search Request Schema
export const EventSearchRequestSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string' as const,
      description: 'Search query',
      nullable: true
    },
    organizationId: {
      type: 'string' as const,
      description: 'Filter by organization ID',
      nullable: true
    },
    startDate: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Filter events starting from this date',
      nullable: true
    },
    endDate: {
      type: 'string' as const,
      format: 'date' as const,
      description: 'Filter events ending before this date',
      nullable: true
    },
    isPrivate: {
      type: 'boolean' as const,
      description: 'Filter by privacy status',
      nullable: true
    },
    status: {
      type: 'string' as const,
      description: 'Filter by event status',
      enum: ['draft', 'published', 'cancelled', 'completed'],
      nullable: true
    },
    page: {
      type: 'integer' as const,
      description: 'Page number for pagination',
      minimum: 1,
      default: 1
    },
    limit: {
      type: 'integer' as const,
      description: 'Number of events per page',
      minimum: 1,
      maximum: 100,
      default: 20
    }
  }
};

// Event List Response Schema
export const EventListResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Event'
      },
      description: 'List of events'
    },
    pagination: {
      $ref: '#/components/schemas/Pagination'
    }
  },
  required: ['success', 'data', 'pagination']
};

// Event Registration Schema
export const EventRegistrationSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Registration ID'
    },
    eventId: {
      type: 'string' as const,
      description: 'Event ID'
    },
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    username: {
      type: 'string' as const,
      description: 'User username'
    },
    discriminator: {
      type: 'string' as const,
      description: 'User discriminator'
    },
    avatar: {
      type: 'string' as const,
      description: 'User avatar URL',
      nullable: true
    },
    registeredAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Registration timestamp'
    }
  },
  required: ['id', 'eventId', 'userId', 'username', 'discriminator', 'registeredAt']
};

// Event Registrations Response Schema
export const EventRegistrationsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/EventRegistration'
      },
      description: 'List of event registrations'
    },
    pagination: {
      $ref: '#/components/schemas/Pagination'
    }
  },
  required: ['success', 'data', 'pagination']
};

// Event Review Schema
export const EventReviewSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Review ID'
    },
    eventId: {
      type: 'string' as const,
      description: 'Event ID'
    },
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    username: {
      type: 'string' as const,
      description: 'User username'
    },
    discriminator: {
      type: 'string' as const,
      description: 'User discriminator'
    },
    avatar: {
      type: 'string' as const,
      description: 'User avatar URL',
      nullable: true
    },
    rating: {
      type: 'integer' as const,
      description: 'Rating (1-5)',
      minimum: 1,
      maximum: 5
    },
    comment: {
      type: 'string' as const,
      description: 'Review comment',
      maxLength: 1000,
      nullable: true
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Review creation timestamp'
    },
    updatedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Review last update timestamp'
    }
  },
  required: ['id', 'eventId', 'userId', 'username', 'discriminator', 'rating', 'createdAt', 'updatedAt']
};

// Create Event Review Request Schema
export const CreateEventReviewRequestSchema = {
  type: 'object' as const,
  properties: {
    rating: {
      type: 'integer' as const,
      description: 'Rating (1-5)',
      minimum: 1,
      maximum: 5
    },
    comment: {
      type: 'string' as const,
      description: 'Review comment',
      maxLength: 1000,
      nullable: true
    }
  },
  required: ['rating']
};

// Update Event Review Request Schema
export const UpdateEventReviewRequestSchema = {
  type: 'object' as const,
  properties: {
    rating: {
      type: 'integer' as const,
      description: 'Rating (1-5)',
      minimum: 1,
      maximum: 5
    },
    comment: {
      type: 'string' as const,
      description: 'Review comment',
      maxLength: 1000,
      nullable: true
    }
  },
  required: ['rating']
};

// Event Reviews Response Schema
export const EventReviewsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/EventReview'
      },
      description: 'List of event reviews'
    },
    pagination: {
      $ref: '#/components/schemas/Pagination'
    }
  },
  required: ['success', 'data', 'pagination']
};

// Event Rating Summary Schema
export const EventRatingSummarySchema = {
  type: 'object' as const,
  properties: {
    averageRating: {
      type: 'number' as const,
      description: 'Average rating',
      nullable: true
    },
    totalReviews: {
      type: 'integer' as const,
      description: 'Total number of reviews'
    },
    ratingDistribution: {
      type: 'object' as const,
      properties: {
        '1': { type: 'integer' as const },
        '2': { type: 'integer' as const },
        '3': { type: 'integer' as const },
        '4': { type: 'integer' as const },
        '5': { type: 'integer' as const }
      },
      description: 'Distribution of ratings'
    }
  },
  required: ['averageRating', 'totalReviews', 'ratingDistribution']
};

// Event Rating Summary Response Schema
export const EventRatingSummaryResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/EventRatingSummary'
    }
  },
  required: ['success', 'data']
};

// Event Notification Usage Schema
export const EventNotificationUsageSchema = {
  type: 'object' as const,
  properties: {
    notificationsSent: {
      type: 'integer' as const,
      description: 'Number of notifications sent'
    },
    notificationsRemaining: {
      type: 'integer' as const,
      description: 'Number of notifications remaining'
    },
    lastNotificationSent: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last notification sent timestamp',
      nullable: true
    }
  },
  required: ['notificationsSent', 'notificationsRemaining']
};

// Event Notification Usage Response Schema
export const EventNotificationUsageResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/EventNotificationUsage'
    }
  },
  required: ['success', 'data']
};

// Send Notification Request Schema
export const SendNotificationRequestSchema = {
  type: 'object' as const,
  properties: {
    message: {
      type: 'string' as const,
      description: 'Notification message',
      minLength: 1,
      maxLength: 2000
    }
  },
  required: ['message']
};

// Event Analytics Schema
export const EventAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    totalViews: {
      type: 'integer' as const,
      description: 'Total number of views'
    },
    uniqueViews: {
      type: 'integer' as const,
      description: 'Number of unique viewers'
    },
    registrations: {
      type: 'integer' as const,
      description: 'Number of registrations'
    },
    viewsByDay: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          date: { type: 'string' as const, format: 'date' as const },
          views: { type: 'integer' as const }
        }
      },
      description: 'Views broken down by day'
    }
  },
  required: ['totalViews', 'uniqueViews', 'registrations', 'viewsByDay']
};

// Event Analytics Response Schema
export const EventAnalyticsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/EventAnalytics'
    }
  },
  required: ['success', 'data']
};

// Review Eligibility Schema
export const ReviewEligibilitySchema = {
  type: 'object' as const,
  properties: {
    canReview: {
      type: 'boolean' as const,
      description: 'Whether user can review the event'
    },
    reason: {
      type: 'string' as const,
      description: 'Reason if user cannot review',
      nullable: true
    },
    hasExistingReview: {
      type: 'boolean' as const,
      description: 'Whether user has an existing review'
    }
  },
  required: ['canReview', 'hasExistingReview']
};

// Review Eligibility Response Schema
export const ReviewEligibilityResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/ReviewEligibility'
    }
  },
  required: ['success', 'data']
};
