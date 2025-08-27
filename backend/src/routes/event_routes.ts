import { Router } from 'express';
import { EventController } from '../controllers/event_controller';
import { EventReviewController } from '../controllers/event_review_controller';
import { AnalyticsController } from '../controllers/analytics_controller';
import { requireLogin } from '../middleware/auth';
import {
  requireEventOwnership,
  requireEventNotificationPermission,
} from '../middleware/permissions';
import { recordEventView } from '../middleware/view_tracking';
import { oapi } from './openapi_routes';

const router: Router = Router();
const eventController = new EventController();
const eventReviewController = new EventReviewController();
const analyticsController = new AnalyticsController();

// Public routes (no authentication required)
oapi.path({
  tags: ['Events'],
  summary: 'List events',
  description: 'Get a paginated list of public events',
  parameters: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of events per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    },
    {
      name: 'status',
      in: 'query',
      description: 'Filter by event status',
      schema: { 
        type: 'string',
        enum: ['draft', 'published', 'cancelled', 'completed']
      }
    }
  ],
  responses: {
    '200': {
      description: 'Events retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventListResponse' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/', eventController.listEvents.bind(eventController));

oapi.path({
  tags: ['Events'],
  summary: 'Search events',
  description: 'Search events with filters',
  parameters: [
    {
      name: 'query',
      in: 'query',
      description: 'Search query',
      schema: { type: 'string' }
    },
    {
      name: 'organizationId',
      in: 'query',
      description: 'Filter by organization ID',
      schema: { type: 'string' }
    },
    {
      name: 'startDate',
      in: 'query',
      description: 'Filter events starting from this date',
      schema: { type: 'string', format: 'date' }
    },
    {
      name: 'endDate',
      in: 'query',
      description: 'Filter events ending before this date',
      schema: { type: 'string', format: 'date' }
    },
    {
      name: 'isPrivate',
      in: 'query',
      description: 'Filter by privacy status',
      schema: { type: 'boolean' }
    },
    {
      name: 'status',
      in: 'query',
      description: 'Filter by event status',
      schema: { 
        type: 'string',
        enum: ['draft', 'published', 'cancelled', 'completed']
      }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of events per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Events retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventListResponse' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/search', eventController.searchEvents.bind(eventController));

oapi.path({
  tags: ['Events'],
  summary: 'Get upcoming events',
  description: 'Get a list of upcoming public events',
  parameters: [
    {
      name: 'limit',
      in: 'query',
      description: 'Number of events to return',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  ],
  responses: {
    '200': {
      description: 'Upcoming events retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventListResponse' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/upcoming',
  eventController.getUpcomingEvents.bind(eventController)
);

// Private events for authenticated users
oapi.path({
  tags: ['Events'],
  summary: 'Get private events',
  description: 'Get private events for authenticated users',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of events per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Private events retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventListResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/private',
  requireLogin as any,
  eventController.getPrivateEvents.bind(eventController) as any
);

oapi.path({
  tags: ['Events'],
  summary: 'Get event details',
  description: 'Get detailed information about a specific event',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event details retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/Event' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/:id', recordEventView, eventController.getEvent.bind(eventController));

oapi.path({
  tags: ['Events'],
  summary: 'Get event registrations',
  description: 'Get list of users registered for an event',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of registrations per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Event registrations retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventRegistrationsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/registrations',
  eventController.getEventRegistrations.bind(eventController)
);

// Event reviews (public read, authenticated write)
oapi.path({
  tags: ['Events'],
  summary: 'Get event reviews',
  description: 'Get reviews for a specific event',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of reviews per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Event reviews retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventReviewsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/:id/reviews', (req, res) => {
  console.log('Reviews route hit for event:', req.params.id);
  eventReviewController.getEventReviews(req, res);
});

oapi.path({
  tags: ['Events'],
  summary: 'Get event rating summary',
  description: 'Get rating summary for a specific event',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event rating summary retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventRatingSummaryResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/:id/reviews/summary', (req, res) => {
  eventReviewController.getEventRatingSummary(req, res);
});

// Protected routes (require authentication)
oapi.path({
  tags: ['Events'],
  summary: 'Create event',
  description: 'Create a new event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateEventRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Event created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/Event' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/',
  requireLogin as any,
  eventController.createEvent.bind(eventController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Update event',
  description: 'Update an existing event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdateEventRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Event updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/Event' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put(
  '/:id',
  requireEventOwnership as any,
  eventController.updateEvent.bind(eventController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Delete event',
  description: 'Delete an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/:id',
  requireEventOwnership as any,
  eventController.deleteEvent.bind(eventController)
);

// Event registrations (RESTful)
oapi.path({
  tags: ['Events'],
  summary: 'Register for event',
  description: 'Register for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '201': {
      description: 'Successfully registered for event',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '409': {
      description: 'Already registered for event',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/registrations',
  requireLogin as any,
  eventController.registerForEvent.bind(eventController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Unregister from event',
  description: 'Unregister from an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully unregistered from event',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/:id/registrations',
  requireLogin as any,
  eventController.unregisterFromEvent.bind(eventController)
);

// Custom notifications (event owners only)
oapi.path({
  tags: ['Events'],
  summary: 'Get event notification usage',
  description: 'Get notification usage statistics for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Notification usage retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventNotificationUsageResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/notification-usage',
  requireEventNotificationPermission as any,
  eventController.getEventNotificationUsage.bind(eventController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Send custom notification',
  description: 'Send a custom notification to event participants',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/SendNotificationRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Notification sent successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/notify',
  requireEventNotificationPermission as any,
  eventController.sendCustomNotification.bind(eventController)
);

// Event reviews (authenticated users only)
oapi.path({
  tags: ['Events'],
  summary: 'Create event review',
  description: 'Create a review for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateEventReviewRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Review created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/EventReview' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '409': {
      description: 'Review already exists',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/reviews',
  requireLogin as any,
  eventReviewController.createReview.bind(eventReviewController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Update event review',
  description: 'Update an existing review for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdateEventReviewRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Review updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/EventReview' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put(
  '/:id/reviews',
  requireLogin as any,
  eventReviewController.updateReview.bind(eventReviewController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Delete event review',
  description: 'Delete a review for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Review deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/:id/reviews',
  requireLogin as any,
  eventReviewController.deleteReview.bind(eventReviewController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Get user event review',
  description: 'Get the current user review for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'User review retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { $ref: '#/components/schemas/EventReview' }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/reviews/my',
  requireLogin as any,
  eventReviewController.getUserEventReview.bind(eventReviewController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Check review eligibility',
  description: 'Check if user is eligible to review an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Review eligibility checked successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ReviewEligibilityResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/reviews/eligibility',
  requireLogin as any,
  eventReviewController.checkReviewEligibility.bind(eventReviewController)
);

// Event management (organization owners/admins only)
oapi.path({
  tags: ['Events'],
  summary: 'Cancel event',
  description: 'Cancel an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event cancelled successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/cancel',
  requireLogin as any,
  eventController.cancelEvent.bind(eventController)
);

oapi.path({
  tags: ['Events'],
  summary: 'Complete event',
  description: 'Mark an event as completed',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event completed successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/complete',
  requireLogin as any,
  eventController.completeEvent.bind(eventController)
);

// Analytics routes (require event management permission)
oapi.path({
  tags: ['Events'],
  summary: 'Get event analytics',
  description: 'Get analytics data for an event',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event analytics retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/EventAnalyticsResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/analytics/views',
  requireLogin as any,
  requireEventOwnership,
  analyticsController.getEventAnalytics.bind(analyticsController)
);

export default router;
