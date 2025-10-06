import { Router } from 'express';
import { OrganizationController } from '../controllers/organization_controller';
import { EventReviewController } from '../controllers/event_review_controller';
import { AnalyticsController } from '../controllers/analytics_controller';
import { HRAnalyticsController } from '../controllers/hr_analytics_controller';
import { requireLogin } from '../middleware/auth';
import { requireOrganizationPermission, requireOrganizationAnalyticsPermission } from '../middleware/permissions';
import { recordOrganizationView } from '../middleware/view_tracking';
import { resolveOrganization } from '../middleware/organization_resolver';
import { validateHRRequest, sanitizeRequest } from '../middleware/openapi_validation';
import { applicationRateLimit, hrOperationsRateLimit, analyticsRateLimit, bulkOperationsRateLimit, loggedRateLimit } from '../middleware/hr_rate_limit';
import { oapi } from './openapi_routes';

const router: Router = Router();
const organizationController = new OrganizationController();
const eventReviewController = new EventReviewController();
const analyticsController = new AnalyticsController();
const hrAnalyticsController = new HRAnalyticsController();

// Public routes (no authentication required)
router.get('/',
  oapi.path({
    tags: ['Organizations'],
    summary: 'List organizations',
    description: 'Get a paginated list of all organizations',
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'sort',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['name', 'member_count', 'created_at', 'updated_at'],
          default: 'name'
        },
        description: 'Sort field'
      },
      {
        name: 'order',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['asc', 'desc'],
          default: 'asc'
        },
        description: 'Sort order'
      }
    ],
    responses: {
      200: {
        description: 'List of organizations',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationListResponse' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  organizationController.listOrganizations.bind(organizationController)
);

router.get('/search',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Search organizations',
    description: 'Search organizations by name, description, or tags',
    parameters: [
      {
        name: 'query',
        in: 'query',
        required: true,
        schema: { type: 'string' as const, minLength: 1, maxLength: 100 },
        description: 'Search query'
      },
      {
        name: 'playstyle_tags',
        in: 'query',
        schema: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
            enum: ['casual', 'hardcore', 'pvp', 'pve', 'roleplay', 'trading', 'mining', 'exploration', 'combat', 'social']
          }
        },
        description: 'Filter by playstyle tags'
      },
      {
        name: 'activity_tags',
        in: 'query',
        schema: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
            enum: ['events', 'training', 'operations', 'social', 'competitive', 'educational', 'charity', 'recruitment']
          }
        },
        description: 'Filter by activity tags'
      },
      {
        name: 'min_members',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 0 },
        description: 'Minimum member count'
      },
      {
        name: 'max_members',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 0 },
        description: 'Maximum member count'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Search results',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationListResponse' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  organizationController.searchOrganizations.bind(organizationController)
);

router.get('/:rsi_org_id',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization by RSI ID',
    description: 'Get detailed information about a specific organization',
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Organization details',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Organization' }
          }
        }
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  resolveOrganization,
  recordOrganizationView,
  organizationController.getOrganization.bind(organizationController)
);
router.put('/:rsi_org_id',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Update organization',
    description: 'Update organization information (requires organization permissions)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateOrganizationRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'Organization updated successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Organization' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.updateOrganization.bind(organizationController)
);

// Protected routes (require JWT)
router.post('/',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Create organization',
    description: 'Create a new organization',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateOrganizationRequest' }
        }
      }
    },
    responses: {
      201: {
        description: 'Organization created successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Organization' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      409: {
        description: 'Organization already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.createOrganization.bind(organizationController)
);

router.put('/spectrum/:rsi_org_id',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Update organization by Spectrum ID',
    description: 'Update organization information using Spectrum ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateOrganizationRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'Organization updated successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Organization' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.updateOrganizationBySpectrumId.bind(organizationController)
);

router.delete('/:rsi_org_id',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Delete organization',
    description: 'Delete an organization (requires organization admin permissions)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Organization deleted successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.deleteOrganization.bind(organizationController)
);

// Organization verification and registration
router.post('/:rsi_org_id/generate-verification',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Generate organization verification',
    description: 'Generate verification code for organization ownership',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Verification code generated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const },
                verification_code: { type: 'string' as const },
                expires_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.generateVerificationSentinel.bind(organizationController)
);

router.post('/:rsi_org_id/verify',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Verify organization ownership',
    description: 'Verify organization ownership using verification code',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              verification_code: { 
                type: 'string' as const,
                description: 'Verification code from RSI profile'
              }
            },
            required: ['verification_code']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Organization verified successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.verifyOrganization.bind(organizationController)
);

router.post('/:rsi_org_id/complete-registration',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Complete organization registration',
    description: 'Complete the organization registration process',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Registration completed successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.completeRegistration.bind(organizationController)
);

// Removed duplicate - already defined above

// Removed - use spectrum ID versions instead

// Organization upvoting (by spectrum ID)
router.post('/spectrum/:rsi_org_id/upvote',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Upvote organization',
    description: 'Upvote an organization by Spectrum ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Organization upvoted successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      409: {
        description: 'Already upvoted',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.upvoteOrganizationBySpectrumId.bind(organizationController)
);

router.delete('/spectrum/:rsi_org_id/upvote',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Remove upvote',
    description: 'Remove upvote from an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Upvote removed successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.removeUpvoteBySpectrumId.bind(organizationController)
);

router.get('/spectrum/:rsi_org_id/upvote/status',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get upvote status',
    description: 'Check if user has upvoted an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Upvote status',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                has_upvoted: { type: 'boolean' as const },
                upvote_count: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.getUpvoteStatusBySpectrumId.bind(organizationController)
);

// Organization events
router.get('/:rsi_org_id/events',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization events',
    description: 'Get events for a specific organization',
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Organization events',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                events: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      title: { type: 'string' as const },
                      description: { type: 'string' as const },
                      start_date: { type: 'string' as const, format: 'date-time' as const },
                      end_date: { type: 'string' as const, format: 'date-time' as const },
                      location: { type: 'string' as const },
                      max_participants: { type: 'integer' as const },
                      current_participants: { type: 'integer' as const }
                    }
                  }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  resolveOrganization,
  organizationController.getOrganizationEvents.bind(organizationController)
);

// Organization members
router.get('/:rsi_org_id/members',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization members',
    description: 'Get members of a specific organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Organization members',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                members: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                      role: { type: 'string' as const },
                      joined_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.getOrganizationMembers.bind(organizationController)
);

router.post('/:rsi_org_id/members',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Add organization member',
    description: 'Add a member to an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              user_id: { type: 'string' as const },
              role: { type: 'string' as const, default: 'member' }
            },
            required: ['user_id']
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Member added successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.addMember.bind(organizationController)
);

router.put('/:rsi_org_id/members/:userId',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Update member role',
    description: 'Update a member role in an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              role: { type: 'string' as const }
            },
            required: ['role']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Member role updated successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.updateMemberRole.bind(organizationController)
);

router.delete('/:rsi_org_id/members/:userId',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Remove organization member',
    description: 'Remove a member from an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User ID'
      }
    ],
    responses: {
      200: {
        description: 'Member removed successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  organizationController.removeMember.bind(organizationController)
);

// Home page routes (public)
router.get('/featured',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get featured organizations',
    description: 'Get featured organizations for the home page',
    responses: {
      200: {
        description: 'Featured organizations',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                organizations: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/Organization' }
                }
              }
            }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  organizationController.getFeaturedOrganizations.bind(organizationController)
);

router.get('/stats/home',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get home page statistics',
    description: 'Get statistics for the home page',
    responses: {
      200: {
        description: 'Home page statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                total_organizations: { type: 'integer' as const },
                total_events: { type: 'integer' as const },
                total_members: { type: 'integer' as const },
                active_organizations: { type: 'integer' as const }
              }
            }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  organizationController.getHomePageStats.bind(organizationController)
);

// Organization invites (by spectrum ID)
router.get('/spectrum/:rsi_org_id/invites',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization invite codes',
    description: 'Get invite codes for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Organization invite codes',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                invites: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      code: { type: 'string' as const },
                      uses_left: { type: 'integer' as const },
                      max_uses: { type: 'integer' as const },
                      expires_at: { type: 'string' as const, format: 'date-time' as const },
                      created_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.getInviteCodes.bind(organizationController)
);

router.post('/spectrum/:rsi_org_id/invites',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Generate invite code',
    description: 'Generate a new invite code for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              max_uses: { type: 'integer' as const, default: 1 },
              expires_in_hours: { type: 'integer' as const, default: 24 }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Invite code generated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                invite_code: { type: 'string' as const },
                expires_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.generateInviteCode.bind(organizationController)
);

router.delete('/spectrum/:rsi_org_id/invites/:inviteId',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Delete invite code',
    description: 'Delete an invite code for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'inviteId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Invite code ID'
      }
    ],
    responses: {
      200: {
        description: 'Invite code deleted successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.deleteInviteCode.bind(organizationController)
);

router.post('/join/:inviteCode',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Join organization with invite',
    description: 'Join an organization using an invite code',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'inviteCode',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Invite code'
      }
    ],
    responses: {
      200: {
        description: 'Successfully joined organization',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const },
                organization: { $ref: '#/components/schemas/Organization' }
              }
            }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  organizationController.joinWithInvite.bind(organizationController)
);

// Organization reviews (public read)
router.get('/:rsi_org_id/reviews',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization reviews',
    description: 'Get reviews for a specific organization',
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Organization reviews',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                reviews: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      rating: { type: 'integer' as const, minimum: 1, maximum: 5 },
                      comment: { type: 'string' as const },
                      author: { $ref: '#/components/schemas/User' },
                      created_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  resolveOrganization,
  eventReviewController.getOrganizationReviews.bind(eventReviewController)
);

router.get('/:rsi_org_id/reviews/summary',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization rating summary',
    description: 'Get rating summary for a specific organization',
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Organization rating summary',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                average_rating: { type: 'number' as const },
                total_reviews: { type: 'integer' as const },
                rating_breakdown: {
                  type: 'object' as const,
                  properties: {
                    '1': { type: 'integer' as const },
                    '2': { type: 'integer' as const },
                    '3': { type: 'integer' as const },
                    '4': { type: 'integer' as const },
                    '5': { type: 'integer' as const }
                  }
                }
              }
            }
          }
        }
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  resolveOrganization,
  eventReviewController.getOrganizationRatingSummary.bind(eventReviewController)
);

// Analytics routes (require VIEW_ANALYTICS permission)
router.get('/:rsi_org_id/analytics/views',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization analytics',
    description: 'Get view analytics for an organization (requires VIEW_ANALYTICS permission)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'period',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['7d', '30d', '90d', '1y'],
          default: '30d'
        },
        description: 'Analytics period'
      }
    ],
    responses: {
      200: {
        description: 'Organization analytics',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationAnalytics' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  analyticsController.getOrganizationAnalytics.bind(analyticsController)
);

router.get('/:rsi_org_id/analytics/events',
  oapi.path({
    tags: ['Organizations'],
    summary: 'Get organization event analytics',
    description: 'Get event analytics for an organization (requires VIEW_ANALYTICS permission)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'rsi_org_id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'RSI organization ID'
      },
      {
        name: 'period',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['7d', '30d', '90d', '1y'],
          default: '30d'
        },
        description: 'Analytics period'
      }
    ],
    responses: {
      200: {
        description: 'Organization event analytics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                total_events: { type: 'integer' as const },
                total_participants: { type: 'integer' as const },
                average_participation: { type: 'number' as const },
                events_by_type: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      event_type: { type: 'string' as const },
                      count: { type: 'integer' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      403: {
        $ref: '#/components/responses/Forbidden'
      },
      404: {
        $ref: '#/components/responses/NotFound'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  analyticsController.getOrganizationEventAnalytics.bind(analyticsController)
);

// HR Analytics routes (require HR_MANAGER or VIEW_ANALYTICS permission)
router.get('/:id/hr-analytics/dashboard',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Get HR analytics dashboard',
    description: 'Get main HR analytics dashboard metrics',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'period_days',
        in: 'query',
        schema: { type: 'string' as const, default: '30' },
        description: 'Analytics period in days'
      }
    ],
    responses: {
      200: {
        description: 'HR analytics dashboard data',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                metrics: { type: 'object' as const },
                period: { type: 'object' as const },
                trends: { type: 'object' as const },
                calculated_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.getDashboardMetrics.bind(hrAnalyticsController)
);

router.get('/:id/hr-analytics/reports',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Get detailed HR analytics reports',
    description: 'Get detailed HR analytics reports with filtering options',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'period_start',
        in: 'query',
        schema: { type: 'string' as const, format: 'date' as const },
        description: 'Report period start date'
      },
      {
        name: 'period_end',
        in: 'query',
        schema: { type: 'string' as const, format: 'date' as const },
        description: 'Report period end date'
      },
      {
        name: 'metrics',
        in: 'query',
        schema: { type: 'string' as const, default: 'all' },
        description: 'Comma-separated list of metrics to include'
      },
      {
        name: 'comparison_period',
        in: 'query',
        schema: { type: 'string' as const, enum: ['true', 'false'], default: 'false' },
        description: 'Include comparison with previous period'
      },
      {
        name: 'format',
        in: 'query',
        schema: { type: 'string' as const, enum: ['json', 'csv', 'pdf'], default: 'json' },
        description: 'Export format'
      }
    ],
    responses: {
      200: {
        description: 'HR analytics report data',
        content: {
          'application/json': {
            schema: { type: 'object' as const }
          },
          'text/csv': {
            schema: { type: 'string' as const }
          },
          'application/pdf': {
            schema: { type: 'string' as const, format: 'binary' as const }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.getDetailedReports.bind(hrAnalyticsController)
);

router.get('/:id/hr-analytics/trends',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Get HR analytics trends',
    description: 'Get trend analysis for specific HR metrics',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'metric_name',
        in: 'query',
        required: true,
        schema: { 
          type: 'string' as const,
          enum: ['applications_received', 'onboarding_completion_rate', 'average_performance_rating', 'turnover_rate']
        },
        description: 'Metric name for trend analysis'
      },
      {
        name: 'period_months',
        in: 'query',
        schema: { type: 'string' as const, default: '12' },
        description: 'Number of months for trend analysis'
      }
    ],
    responses: {
      200: {
        description: 'HR analytics trend data',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                metric_name: { type: 'string' as const },
                period_months: { type: 'integer' as const },
                trend_data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      period: { type: 'string' as const },
                      value: { type: 'number' as const },
                      change_percentage: { type: 'number' as const }
                    }
                  }
                },
                generated_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.getTrendAnalysis.bind(hrAnalyticsController)
);

router.get('/:id/hr-analytics/alerts',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Get HR analytics alerts',
    description: 'Get current alerts based on metric thresholds',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'HR analytics alerts',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                alerts: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      metric_name: { type: 'string' as const },
                      current_value: { type: 'number' as const },
                      threshold_value: { type: 'number' as const },
                      alert_level: { type: 'string' as const, enum: ['info', 'warning', 'critical'] },
                      message: { type: 'string' as const },
                      created_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                thresholds_checked: { type: 'integer' as const },
                generated_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.getAlerts.bind(hrAnalyticsController)
);

router.post('/:id/hr-analytics/export',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Export HR analytics data',
    description: 'Export analytics data in various formats',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              format: { type: 'string' as const, enum: ['json', 'csv', 'pdf', 'excel'], default: 'json' },
              period_start: { type: 'string' as const, format: 'date' as const },
              period_end: { type: 'string' as const, format: 'date' as const },
              metrics: { type: 'string' as const, default: 'all' },
              include_trends: { type: 'boolean' as const, default: false }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Exported analytics data',
        content: {
          'application/json': { schema: { type: 'object' as const } },
          'text/csv': { schema: { type: 'string' as const } },
          'application/pdf': { schema: { type: 'string' as const, format: 'binary' as const } },
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
            schema: { type: 'string' as const, format: 'binary' as const } 
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.exportAnalytics.bind(hrAnalyticsController)
);

router.get('/:id/hr-analytics/summary',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Get HR analytics summary',
    description: 'Get high-level summary metrics for quick overview',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'HR analytics summary',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                active_members: { type: 'integer' as const },
                applications_received: { type: 'integer' as const },
                approval_rate: { type: 'number' as const },
                onboarding_completion_rate: { type: 'number' as const },
                average_performance_rating: { type: 'number' as const },
                skill_verification_rate: { type: 'number' as const },
                document_compliance_rate: { type: 'number' as const },
                member_turnover_rate: { type: 'number' as const },
                period: { type: 'object' as const },
                calculated_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.getSummaryMetrics.bind(hrAnalyticsController)
);

router.post('/:id/hr-analytics/refresh-cache',
  oapi.path({
    tags: ['HR Analytics'],
    summary: 'Refresh HR analytics cache',
    description: 'Manually refresh analytics cache',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Cache refresh result',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                message: { type: 'string' as const },
                periods_refreshed: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      period: { type: 'string' as const },
                      days: { type: 'integer' as const },
                      cached_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                refreshed_at: { type: 'string' as const, format: 'date-time' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrAnalyticsController.refreshCache.bind(hrAnalyticsController)
);

// HR Onboarding routes
import { HROnboardingController } from '../controllers/hr_onboarding_controller';
// HR Performance routes
import { HRPerformanceController } from '../controllers/hr_performance_controller';
// HR Skills routes
import { HRSkillController } from '../controllers/hr_skill_controller';
import { HRSkillStatisticsController } from '../controllers/hr_skill_statistics_controller';
// HR Document routes
import { HRDocumentController } from '../controllers/hr_document_controller';
// HR Application routes
import { HRApplicationController } from '../controllers/hr_application_controller';
// HR Activity routes
import { HRActivityController } from '../controllers/hr_activity_controller';

const hrOnboardingController = new HROnboardingController();
const hrPerformanceController = new HRPerformanceController();
const hrSkillController = new HRSkillController();
const hrSkillStatisticsController = new HRSkillStatisticsController();
const hrDocumentController = new HRDocumentController();
const hrApplicationController = new HRApplicationController();
const hrActivityController = new HRActivityController();

// HR Application Management routes

// Submit application
router.post('/:id/applications',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Submit application',
    description: 'Submit a new application to an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateApplicationRequest' }
        }
      }
    },
    responses: {
      201: {
        description: 'Application submitted successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApplicationResponse' }
          }
        }
      },
      400: { $ref: '#/components/responses/ValidationError' },
      401: { $ref: '#/components/responses/Unauthorized' },
      409: {
        description: 'Application already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  loggedRateLimit(applicationRateLimit),
  sanitizeRequest(),
  validateHRRequest('createApplication'),
  hrApplicationController.submitApplication.bind(hrApplicationController)
);

// List applications
router.get('/:id/applications',
  oapi.path({
    tags: ['HR Management'],
    summary: 'List applications',
    description: 'Get applications for an organization with filtering and pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'status',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected']
        },
        description: 'Filter by application status'
      },
      {
        name: 'reviewer_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by reviewer ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Applications list',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApplicationListResponse' }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  loggedRateLimit(hrOperationsRateLimit),
  hrApplicationController.listApplications.bind(hrApplicationController)
);

// Get specific application
router.get('/:id/applications/:applicationId',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Get application',
    description: 'Get a specific application by ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'applicationId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Application ID'
      }
    ],
    responses: {
      200: {
        description: 'Application details',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApplicationResponse' }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrApplicationController.getApplication.bind(hrApplicationController)
);

// Update application status
router.put('/:id/applications/:applicationId/status',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Update application status',
    description: 'Update the status of an application',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'applicationId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Application ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateApplicationStatusRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'Application status updated',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApplicationResponse' }
          }
        }
      },
      400: { $ref: '#/components/responses/ValidationError' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  sanitizeRequest(),
  validateHRRequest('updateApplicationStatus'),
  hrApplicationController.updateApplicationStatus.bind(hrApplicationController)
);

// Bulk update applications
router.post('/:id/applications/bulk-update',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Bulk update applications',
    description: 'Update multiple applications at once',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              application_ids: {
                type: 'array' as const,
                items: { type: 'string' as const },
                minItems: 1,
                description: 'Application IDs to update'
              },
              status: {
                type: 'string' as const,
                enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected'],
                description: 'New status for all applications'
              },
              review_notes: {
                type: 'string' as const,
                maxLength: 1000,
                description: 'Review notes for all applications'
              }
            },
            required: ['application_ids', 'status']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Applications updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    updated_count: { type: 'integer' as const },
                    failed_count: { type: 'integer' as const }
                  }
                },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/ValidationError' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  loggedRateLimit(bulkOperationsRateLimit),
  sanitizeRequest(),
  hrApplicationController.bulkUpdateApplications.bind(hrApplicationController)
);

// Get application analytics
router.get('/:id/applications/analytics',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Get application analytics',
    description: 'Get application analytics and statistics',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'period_days',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 365, default: 30 },
        description: 'Number of days to analyze'
      }
    ],
    responses: {
      200: {
        description: 'Application analytics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_applications: { type: 'integer' as const },
                    approval_rate: { type: 'number' as const },
                    average_processing_time_days: { type: 'number' as const },
                    applications_by_status: {
                      type: 'object' as const,
                      properties: {
                        pending: { type: 'integer' as const },
                        under_review: { type: 'integer' as const },
                        interview_scheduled: { type: 'integer' as const },
                        approved: { type: 'integer' as const },
                        rejected: { type: 'integer' as const }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  loggedRateLimit(analyticsRateLimit),
  hrApplicationController.getAnalytics.bind(hrApplicationController)
);

// Onboarding template management
router.get('/:id/onboarding/templates',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get onboarding templates',
    description: 'Get onboarding templates for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'is_active',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter by active status'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 0, default: 0 },
        description: 'Number of items to skip'
      }
    ],
    responses: {
      200: {
        description: 'Onboarding templates',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/OnboardingTemplate' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getTemplates.bind(hrOnboardingController)
);

router.post('/:id/onboarding/templates',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Create onboarding template',
    description: 'Create a new onboarding template for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateOnboardingTemplateRequest' }
        }
      }
    },
    responses: {
      201: {
        description: 'Onboarding template created',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingTemplate' },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      409: {
        description: 'Template already exists for this role',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  sanitizeRequest(),
  validateHRRequest('createOnboardingTemplate'),
  hrOnboardingController.createTemplate.bind(hrOnboardingController)
);

router.get('/:id/onboarding/templates/:templateId',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get onboarding template',
    description: 'Get a specific onboarding template',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'templateId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Template ID'
      }
    ],
    responses: {
      200: {
        description: 'Onboarding template',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingTemplate' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getTemplate.bind(hrOnboardingController)
);

router.put('/:id/onboarding/templates/:templateId',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Update onboarding template',
    description: 'Update an existing onboarding template',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'templateId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Template ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateOnboardingTemplateRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'Onboarding template updated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingTemplate' },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.updateTemplate.bind(hrOnboardingController)
);

router.delete('/:id/onboarding/templates/:templateId',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Delete onboarding template',
    description: 'Delete an onboarding template',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'templateId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Template ID'
      }
    ],
    responses: {
      200: {
        description: 'Onboarding template deleted',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.deleteTemplate.bind(hrOnboardingController)
);

// Onboarding progress management
router.get('/:id/onboarding/progress',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get all onboarding progress',
    description: 'Get onboarding progress for all users in an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'status',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['not_started', 'in_progress', 'completed', 'overdue']
        },
        description: 'Filter by status'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 0, default: 0 },
        description: 'Number of items to skip'
      }
    ],
    responses: {
      200: {
        description: 'Onboarding progress list',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/OnboardingProgressWithUser' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getAllProgress.bind(hrOnboardingController)
);

router.get('/:id/onboarding/progress/:userId',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get user onboarding progress',
    description: 'Get onboarding progress for a specific user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User ID'
      }
    ],
    responses: {
      200: {
        description: 'User onboarding progress',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingProgressDetailed' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getProgress.bind(hrOnboardingController)
);

router.put('/:id/onboarding/progress/:userId',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Update user onboarding progress',
    description: 'Update onboarding progress for a specific user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateOnboardingProgressRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'Onboarding progress updated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingProgress' },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.updateProgress.bind(hrOnboardingController)
);

router.post('/:id/onboarding/progress',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Create onboarding progress',
    description: 'Create onboarding progress for a user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateOnboardingProgressRequest' }
        }
      }
    },
    responses: {
      201: {
        description: 'Onboarding progress created',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingProgress' },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      409: {
        description: 'Onboarding progress already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.createProgress.bind(hrOnboardingController)
);

// Task completion
router.post('/:id/onboarding/tasks/:taskId/complete',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Complete onboarding task',
    description: 'Mark an onboarding task as completed',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'taskId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Task ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              user_id: { type: 'string' as const }
            },
            required: ['user_id']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Task completed',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingProgress' },
                message: { type: 'string' as const },
                onboarding_complete: { type: 'boolean' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.completeTask.bind(hrOnboardingController)
);

// Analytics and reporting
router.get('/:id/onboarding/analytics',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get onboarding analytics',
    description: 'Get onboarding analytics and statistics',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Onboarding analytics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/OnboardingAnalytics' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getAnalytics.bind(hrOnboardingController)
);

router.get('/:id/onboarding/overdue',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Get overdue onboarding progress',
    description: 'Get list of overdue onboarding progress',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Overdue onboarding progress',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/OnboardingProgress' }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.getOverdueProgress.bind(hrOnboardingController)
);

router.post('/:id/onboarding/mark-overdue',
  oapi.path({
    tags: ['HR Onboarding'],
    summary: 'Mark overdue onboarding progress',
    description: 'Mark onboarding progress as overdue (system operation)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Overdue progress marked',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    updated_count: { type: 'integer' as const }
                  }
                },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrOnboardingController.markOverdueProgress.bind(hrOnboardingController)
);

// HR Performance Review routes

// Create performance review
router.post('/:id/performance/reviews',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Create performance review',
    description: 'Create a new performance review for an organization member',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              reviewee_id: { type: 'string' as const },
              review_period_start: { type: 'string' as const, format: 'date-time' as const },
              review_period_end: { type: 'string' as const, format: 'date-time' as const },
              ratings: {
                type: 'object' as const,
                additionalProperties: {
                  type: 'object' as const,
                  properties: {
                    score: { type: 'number' as const, minimum: 1, maximum: 5 },
                    comments: { type: 'string' as const }
                  }
                }
              },
              overall_rating: { type: 'number' as const, minimum: 1, maximum: 5 },
              strengths: { type: 'string' as const },
              areas_for_improvement: { type: 'string' as const }
            },
            required: ['reviewee_id', 'review_period_start', 'review_period_end']
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Performance review created',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    reviewee_id: { type: 'string' as const },
                    reviewer_id: { type: 'string' as const },
                    review_period_start: { type: 'string' as const, format: 'date-time' as const },
                    review_period_end: { type: 'string' as const, format: 'date-time' as const },
                    status: { type: 'string' as const, enum: ['draft', 'submitted', 'acknowledged'] },
                    ratings: { type: 'object' as const },
                    overall_rating: { type: 'number' as const },
                    strengths: { type: 'string' as const },
                    areas_for_improvement: { type: 'string' as const },
                    goals: { 
                      type: 'array' as const,
                      items: { type: 'object' as const }
                    },
                    created_at: { type: 'string' as const, format: 'date-time' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  sanitizeRequest(),
  validateHRRequest('createPerformanceReview'),
  hrPerformanceController.createReview.bind(hrPerformanceController)
);

// List performance reviews
router.get('/:id/performance/reviews',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'List performance reviews',
    description: 'Get performance reviews for an organization with filtering and pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'reviewee_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by reviewee ID'
      },
      {
        name: 'reviewer_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by reviewer ID'
      },
      {
        name: 'status',
        in: 'query',
        schema: { type: 'string' as const, enum: ['draft', 'submitted', 'acknowledged'] },
        description: 'Filter by status'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'include_user_info',
        in: 'query',
        schema: { type: 'string' as const, enum: ['true', 'false'], default: 'false' },
        description: 'Include user information in response'
      }
    ],
    responses: {
      200: {
        description: 'Performance reviews list',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      organization_id: { type: 'string' as const },
                      reviewee_id: { type: 'string' as const },
                      reviewer_id: { type: 'string' as const },
                      review_period_start: { type: 'string' as const, format: 'date-time' as const },
                      review_period_end: { type: 'string' as const, format: 'date-time' as const },
                      status: { type: 'string' as const },
                      overall_rating: { type: 'number' as const },
                      created_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrPerformanceController.listReviews.bind(hrPerformanceController)
);

// Get specific performance review
router.get('/:id/performance/reviews/:reviewId',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Get performance review',
    description: 'Get a specific performance review by ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'reviewId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Performance review ID'
      }
    ],
    responses: {
      200: {
        description: 'Performance review details',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    reviewee_id: { type: 'string' as const },
                    reviewer_id: { type: 'string' as const },
                    review_period_start: { type: 'string' as const, format: 'date-time' as const },
                    review_period_end: { type: 'string' as const, format: 'date-time' as const },
                    status: { type: 'string' as const },
                    ratings: { type: 'object' as const },
                    overall_rating: { type: 'number' as const },
                    strengths: { type: 'string' as const },
                    areas_for_improvement: { type: 'string' as const },
                    goals: { 
                      type: 'array' as const,
                      items: { type: 'object' as const }
                    },
                    created_at: { type: 'string' as const, format: 'date-time' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrPerformanceController.getReview.bind(hrPerformanceController)
);

// Update performance review
router.put('/:id/performance/reviews/:reviewId',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Update performance review',
    description: 'Update a performance review',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'reviewId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Performance review ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              status: { type: 'string' as const, enum: ['draft', 'submitted', 'acknowledged'] },
              ratings: {
                type: 'object' as const,
                additionalProperties: {
                  type: 'object' as const,
                  properties: {
                    score: { type: 'number' as const, minimum: 1, maximum: 5 },
                    comments: { type: 'string' as const }
                  }
                }
              },
              overall_rating: { type: 'number' as const, minimum: 1, maximum: 5 },
              strengths: { type: 'string' as const },
              areas_for_improvement: { type: 'string' as const },
              goals: { 
                type: 'array' as const,
                items: { type: 'object' as const }
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Performance review updated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    status: { type: 'string' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.updateReview.bind(hrPerformanceController)
);

// Get performance analytics
router.get('/:id/performance/analytics',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Get performance analytics',
    description: 'Get performance analytics for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Performance analytics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_reviews: { type: 'integer' as const },
                    average_rating: { type: 'number' as const },
                    reviews_by_status: {
                      type: 'object' as const,
                      properties: {
                        draft: { type: 'integer' as const },
                        submitted: { type: 'integer' as const },
                        acknowledged: { type: 'integer' as const }
                      }
                    },
                    goals_completion_rate: { type: 'number' as const },
                    improvement_plans_active: { type: 'integer' as const }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrPerformanceController.getAnalytics.bind(hrPerformanceController)
);

// Get performance trends
router.get('/:id/performance/trends',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Get performance trends',
    description: 'Get performance trends over time for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'period_months',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 24, default: 12 },
        description: 'Number of months to analyze'
      }
    ],
    responses: {
      200: {
        description: 'Performance trends',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      period: { type: 'string' as const },
                      average_rating: { type: 'number' as const },
                      total_reviews: { type: 'integer' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrPerformanceController.getTrends.bind(hrPerformanceController)
);

// Get due reviews
router.get('/:id/performance/due-reviews',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Get due reviews',
    description: 'Get upcoming performance reviews that are due',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'days_ahead',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 90, default: 30 },
        description: 'Number of days ahead to look for due reviews'
      }
    ],
    responses: {
      200: {
        description: 'Due reviews',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      user_id: { type: 'string' as const },
                      rsi_handle: { type: 'string' as const },
                      discord_username: { type: 'string' as const },
                      due_date: { type: 'string' as const, format: 'date-time' as const },
                      days_until_due: { type: 'integer' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.getDueReviews.bind(hrPerformanceController)
);

// Performance Goal Management

// Create performance goal
router.post('/:id/performance/goals',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Create performance goal',
    description: 'Create a new performance goal',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              review_id: { type: 'string' as const },
              user_id: { type: 'string' as const },
              title: { type: 'string' as const },
              description: { type: 'string' as const },
              target_date: { type: 'string' as const, format: 'date-time' as const }
            },
            required: ['review_id', 'user_id', 'title']
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Performance goal created',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    review_id: { type: 'string' as const },
                    user_id: { type: 'string' as const },
                    title: { type: 'string' as const },
                    description: { type: 'string' as const },
                    target_date: { type: 'string' as const, format: 'date-time' as const },
                    status: { type: 'string' as const },
                    progress_percentage: { type: 'integer' as const },
                    created_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.createGoal.bind(hrPerformanceController)
);

// Update performance goal
router.put('/:id/performance/goals/:goalId',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Update performance goal',
    description: 'Update a performance goal',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'goalId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Performance goal ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              description: { type: 'string' as const },
              target_date: { type: 'string' as const, format: 'date-time' as const },
              status: { type: 'string' as const, enum: ['not_started', 'in_progress', 'completed', 'cancelled'] },
              progress_percentage: { type: 'integer' as const, minimum: 0, maximum: 100 }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Performance goal updated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    title: { type: 'string' as const },
                    status: { type: 'string' as const },
                    progress_percentage: { type: 'integer' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.updateGoal.bind(hrPerformanceController)
);

// Update goal progress
router.put('/:id/performance/goals/:goalId/progress',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Update goal progress',
    description: 'Update progress for a performance goal',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'goalId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Performance goal ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              progress_percentage: { type: 'integer' as const, minimum: 0, maximum: 100 },
              notes: { type: 'string' as const }
            },
            required: ['progress_percentage']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Goal progress updated',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    progress_percentage: { type: 'integer' as const },
                    status: { type: 'string' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.updateGoalProgress.bind(hrPerformanceController)
);

// Get overdue goals
router.get('/:id/performance/goals/overdue',
  oapi.path({
    tags: ['HR Performance'],
    summary: 'Get overdue goals',
    description: 'Get overdue performance goals for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Overdue goals',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      title: { type: 'string' as const },
                      target_date: { type: 'string' as const, format: 'date-time' as const },
                      status: { type: 'string' as const },
                      progress_percentage: { type: 'integer' as const },
                      reviewee_rsi_handle: { type: 'string' as const },
                      reviewee_discord_username: { type: 'string' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrPerformanceController.getOverdueGoals.bind(hrPerformanceController)
);

// HR Skills routes

// List all available skills
router.get('/:id/skills',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'List skills',
    description: 'Get a list of all available skills with optional filtering',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'category',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
        },
        description: 'Filter by skill category'
      },
      {
        name: 'verification_required',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter by verification requirement'
      },
      {
        name: 'search',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Search skills by name or description'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'List of skills',
        content: {
          'application/json': {
            schema: {
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
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.listSkills.bind(hrSkillController)
);

// Create a new skill (admin only)
router.post('/:id/skills',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Create skill',
    description: 'Create a new skill (admin only)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['name', 'category'],
            properties: {
              name: { type: 'string' as const },
              category: { 
                type: 'string' as const,
                enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
              },
              description: { type: 'string' as const },
              verification_required: { type: 'boolean' as const, default: false }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Skill created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/Skill' }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      409: { $ref: '#/components/responses/Conflict' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillController.createSkill.bind(hrSkillController)
);

// Get organization skills
router.get('/:id/skills/organization',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get organization skills',
    description: 'Get skills for organization members with filtering',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'category',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
        },
        description: 'Filter by skill category'
      },
      {
        name: 'verified',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter by verification status'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Organization skills',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/UserSkillWithDetails' }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillController.getOrganizationSkills.bind(hrSkillController)
);

// Add skill to user
router.post('/:id/skills/user',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Add user skill',
    description: 'Add a skill to the current user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['skill_id', 'proficiency_level'],
            properties: {
              skill_id: { type: 'string' as const },
              proficiency_level: { 
                type: 'string' as const,
                enum: ['beginner', 'intermediate', 'advanced', 'expert']
              },
              notes: { type: 'string' as const }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'User skill added successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/UserSkill' }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
      409: { $ref: '#/components/responses/Conflict' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.addUserSkill.bind(hrSkillController)
);

// Get user skills
router.get('/:id/skills/user/:userId?',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get user skills',
    description: 'Get skills for a specific user (or current user if no userId provided)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: false,
        schema: { type: 'string' as const },
        description: 'User ID (optional, defaults to current user)'
      },
      {
        name: 'category',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
        },
        description: 'Filter by skill category'
      },
      {
        name: 'verified',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter by verification status'
      },
      {
        name: 'proficiency_level',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['beginner', 'intermediate', 'advanced', 'expert']
        },
        description: 'Filter by proficiency level'
      }
    ],
    responses: {
      200: {
        description: 'User skills',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/UserSkillWithDetails' }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.getUserSkills.bind(hrSkillController)
);

// Verify user skill
router.put('/:id/skills/:skillId/verify',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Verify user skill',
    description: 'Verify a user\'s skill (requires appropriate permissions)',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'skillId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User skill ID'
      }
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              notes: { type: 'string' as const }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Skill verified successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/UserSkill' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillController.verifyUserSkill.bind(hrSkillController)
);

// Update user skill
router.put('/:id/skills/user/:userSkillId',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Update user skill',
    description: 'Update a user\'s skill',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userSkillId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User skill ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              proficiency_level: { 
                type: 'string' as const,
                enum: ['beginner', 'intermediate', 'advanced', 'expert']
              },
              notes: { type: 'string' as const }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'User skill updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/UserSkill' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.updateUserSkill.bind(hrSkillController)
);

// Remove user skill
router.delete('/:id/skills/user/:userSkillId',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Remove user skill',
    description: 'Remove a user\'s skill',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userSkillId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'User skill ID'
      }
    ],
    responses: {
      200: {
        description: 'Skill removed successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.removeUserSkill.bind(hrSkillController)
);

// Get skill analytics
router.get('/:id/skills/analytics',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get skill analytics',
    description: 'Get skill analytics for the organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    responses: {
      200: {
        description: 'Skill analytics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/SkillAnalytics' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrSkillController.getSkillAnalytics.bind(hrSkillController)
);

// Certification routes

// Create certification
router.post('/:id/skills/certifications',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Create certification',
    description: 'Create a new certification',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['user_id', 'name', 'issued_date'],
            properties: {
              user_id: { type: 'string' as const },
              name: { type: 'string' as const },
              description: { type: 'string' as const },
              issued_date: { type: 'string' as const, format: 'date' },
              expiration_date: { type: 'string' as const, format: 'date' },
              certificate_url: { type: 'string' as const }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Certification created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/Certification' }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillController.createCertification.bind(hrSkillController)
);

// Get organization certifications
router.get('/:id/skills/certifications',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get organization certifications',
    description: 'Get certifications for the organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'user_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by user ID'
      },
      {
        name: 'expiring_soon',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter certifications expiring soon'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Organization certifications',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/CertificationWithDetails' }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillController.getOrganizationCertifications.bind(hrSkillController)
);

// Get user certifications
router.get('/:id/skills/certifications/user/:userId?',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get user certifications',
    description: 'Get certifications for a specific user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'userId',
        in: 'path',
        required: false,
        schema: { type: 'string' as const },
        description: 'User ID (optional, defaults to current user)'
      }
    ],
    responses: {
      200: {
        description: 'User certifications',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/CertificationWithDetails' }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrSkillController.getUserCertifications.bind(hrSkillController)
);

// Get expiring certifications
router.get('/:id/skills/certifications/expiring',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Get expiring certifications',
    description: 'Get certifications expiring soon',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'days_ahead',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 30 },
        description: 'Number of days ahead to check for expiring certifications'
      }
    ],
    responses: {
      200: {
        description: 'Expiring certifications',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { $ref: '#/components/schemas/CertificationWithDetails' }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillController.getExpiringCertifications.bind(hrSkillController)
);

// Update certification
router.put('/:id/skills/certifications/:certificationId',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Update certification',
    description: 'Update a certification',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'certificationId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Certification ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              description: { type: 'string' as const },
              issued_date: { type: 'string' as const, format: 'date' },
              expiration_date: { type: 'string' as const, format: 'date' },
              certificate_url: { type: 'string' as const }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Certification updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: { $ref: '#/components/schemas/Certification' }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillController.updateCertification.bind(hrSkillController)
);

// Delete certification
router.delete('/:id/skills/certifications/:certificationId',
  oapi.path({
    tags: ['HR Skills'],
    summary: 'Delete certification',
    description: 'Delete a certification',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'certificationId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Certification ID'
      }
    ],
    responses: {
      200: {
        description: 'Certification deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillController.deleteCertification.bind(hrSkillController)
);

// HR Skills Statistics routes

// Get all skills statistics
router.get('/:id/skills/statistics',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get all skills statistics',
    description: 'Get statistics for all skills in the organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'category',
        in: 'query',
        schema: { 
          type: 'string' as const,
          enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
        },
        description: 'Filter by skill category'
      },
      {
        name: 'skill_ids',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Comma-separated list of skill IDs to include'
      },
      {
        name: 'include_zero_members',
        in: 'query',
        schema: { type: 'boolean' as const, default: false },
        description: 'Include skills with zero members'
      },
      {
        name: 'min_member_count',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 0 },
        description: 'Minimum member count to include skill'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Skills statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  additionalProperties: {
                    type: 'object' as const,
                    properties: {
                      skill_id: { type: 'string' as const },
                      skill_name: { type: 'string' as const },
                      skill_category: { type: 'string' as const },
                      total_members: { type: 'integer' as const },
                      verified_members: { type: 'integer' as const },
                      verification_rate: { type: 'number' as const },
                      proficiency_breakdown: {
                        type: 'object' as const,
                        properties: {
                          beginner: { type: 'integer' as const },
                          intermediate: { type: 'integer' as const },
                          advanced: { type: 'integer' as const },
                          expert: { type: 'integer' as const }
                        }
                      },
                      recent_verifications: { type: 'integer' as const },
                      last_updated: { type: 'string' as const, format: 'date-time' }
                    }
                  }
                },
                organization_id: { type: 'string' as const },
                total_skills: { type: 'integer' as const }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getAllSkillsStatistics.bind(hrSkillStatisticsController)
);

// Get specific skill statistics
router.get('/:id/skills/:skillId/statistics',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get skill statistics',
    description: 'Get statistics for a specific skill',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'skillId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Skill ID'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Skill statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    skill_id: { type: 'string' as const },
                    skill_name: { type: 'string' as const },
                    skill_category: { type: 'string' as const },
                    total_members: { type: 'integer' as const },
                    verified_members: { type: 'integer' as const },
                    verification_rate: { type: 'number' as const },
                    proficiency_breakdown: {
                      type: 'object' as const,
                      properties: {
                        beginner: { type: 'integer' as const },
                        intermediate: { type: 'integer' as const },
                        advanced: { type: 'integer' as const },
                        expert: { type: 'integer' as const }
                      }
                    },
                    recent_verifications: { type: 'integer' as const },
                    last_updated: { type: 'string' as const, format: 'date-time' }
                  }
                },
                organization_id: { type: 'string' as const }
              }
            }
          }
        }
      },
      404: {
        description: 'Skill not found'
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getSkillStatistics.bind(hrSkillStatisticsController)
);

// Get skills statistics by category
router.get('/:id/skills/statistics/category/:category',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get category statistics',
    description: 'Get statistics for skills in a specific category',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'category',
        in: 'path',
        required: true,
        schema: { 
          type: 'string' as const,
          enum: ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership']
        },
        description: 'Skill category'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Category statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    category: { type: 'string' as const },
                    unique_skills: { type: 'integer' as const },
                    total_instances: { type: 'integer' as const },
                    verification_rate: { type: 'number' as const },
                    average_proficiency: { type: 'number' as const },
                    top_skills: {
                      type: 'array' as const,
                      items: {
                        type: 'object' as const,
                        properties: {
                          skill_name: { type: 'string' as const },
                          member_count: { type: 'integer' as const },
                          verification_rate: { type: 'number' as const }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getSkillStatisticsByCategory.bind(hrSkillStatisticsController)
);

// Get organization skills overview
router.get('/:id/skills/statistics/overview',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get skills overview',
    description: 'Get comprehensive organization skills overview',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Skills overview',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_unique_skills: { type: 'integer' as const },
                    total_skill_instances: { type: 'integer' as const },
                    overall_verification_rate: { type: 'number' as const },
                    skills_by_category: {
                      type: 'object' as const,
                      additionalProperties: {
                        type: 'object' as const,
                        properties: {
                          unique_skills: { type: 'integer' as const },
                          total_instances: { type: 'integer' as const },
                          verification_rate: { type: 'number' as const }
                        }
                      }
                    },
                    top_skills: {
                      type: 'array' as const,
                      items: {
                        type: 'object' as const,
                        properties: {
                          skill_name: { type: 'string' as const },
                          member_count: { type: 'integer' as const },
                          verification_rate: { type: 'number' as const }
                        }
                      }
                    },
                    verification_trends: {
                      type: 'array' as const,
                      items: {
                        type: 'object' as const,
                        properties: {
                          date: { type: 'string' as const, format: 'date' },
                          verifications_count: { type: 'integer' as const }
                        }
                      }
                    },
                    last_updated: { type: 'string' as const, format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getOrganizationSkillsOverview.bind(hrSkillStatisticsController)
);

// Get skills statistics summary
router.get('/:id/skills/statistics/summary',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get statistics summary',
    description: 'Get skill statistics summary for dashboard',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Statistics summary',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_skills: { type: 'integer' as const },
                    total_members_with_skills: { type: 'integer' as const },
                    overall_verification_rate: { type: 'number' as const },
                    most_common_skill: {
                      type: 'object' as const,
                      nullable: true,
                      properties: {
                        name: { type: 'string' as const },
                        member_count: { type: 'integer' as const }
                      }
                    },
                    least_verified_category: {
                      type: 'object' as const,
                      nullable: true,
                      properties: {
                        category: { type: 'string' as const },
                        verification_rate: { type: 'number' as const }
                      }
                    },
                    recent_verifications_count: { type: 'integer' as const },
                    skill_gaps_count: { type: 'integer' as const }
                  }
                }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getSkillStatisticsSummary.bind(hrSkillStatisticsController)
);

// Get verification trends
router.get('/:id/skills/statistics/trends',
  loggedRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get verification trends',
    description: 'Get skill verification trends over time',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'skill_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Specific skill ID to get trends for'
      },
      {
        name: 'days',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 365, default: 30 },
        description: 'Number of days to look back'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Verification trends',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      date: { type: 'string' as const, format: 'date' },
                      verifications_count: { type: 'integer' as const },
                      skill_id: { type: 'string' as const },
                      skill_name: { type: 'string' as const }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  hrSkillStatisticsController.getSkillVerificationTrends.bind(hrSkillStatisticsController)
);

// Get skill gap analysis
router.post('/:id/skills/statistics/gaps',
  hrOperationsRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Get skill gap analysis',
    description: 'Perform skill gap analysis for the organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              target_requirements: {
                type: 'object' as const,
                additionalProperties: { type: 'integer' as const },
                description: 'Target member count for each skill ID'
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Skill gap analysis',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      skill_id: { type: 'string' as const },
                      skill_name: { type: 'string' as const },
                      skill_category: { type: 'string' as const },
                      current_members: { type: 'integer' as const },
                      target_members: { type: 'integer' as const },
                      gap_count: { type: 'integer' as const },
                      gap_percentage: { type: 'number' as const },
                      priority: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
                      recommended_actions: {
                        type: 'array' as const,
                        items: { type: 'string' as const }
                      }
                    }
                  }
                },
                total_gaps: { type: 'integer' as const },
                high_priority_gaps: { type: 'integer' as const },
                medium_priority_gaps: { type: 'integer' as const },
                low_priority_gaps: { type: 'integer' as const }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrSkillStatisticsController.getSkillGapAnalysis.bind(hrSkillStatisticsController)
);

// Refresh statistics cache
router.post('/:id/skills/statistics/refresh',
  hrOperationsRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Refresh statistics cache',
    description: 'Refresh the skills statistics cache for the organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Cache refreshed successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const },
                organization_id: { type: 'string' as const },
                refreshed_at: { type: 'string' as const, format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillStatisticsController.refreshStatisticsCache.bind(hrSkillStatisticsController)
);

// Clear statistics cache
router.delete('/:id/skills/statistics/cache',
  hrOperationsRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Clear statistics cache',
    description: 'Clear the skills statistics cache for the organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'skill_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Specific skill ID to clear cache for (optional)'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Cache cleared successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const },
                organization_id: { type: 'string' as const },
                skill_id: { type: 'string' as const, nullable: true },
                cleared_at: { type: 'string' as const, format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrSkillStatisticsController.clearStatisticsCache.bind(hrSkillStatisticsController)
);

// Export skill statistics
router.get('/:id/skills/statistics/export',
  analyticsRateLimit,
  oapi.path({
    tags: ['HR Skills Statistics'],
    summary: 'Export skill statistics',
    description: 'Export skill statistics data in JSON or CSV format',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'format',
        in: 'query',
        schema: { type: 'string' as const, enum: ['json', 'csv'], default: 'json' },
        description: 'Export format'
      },
      {
        name: 'include_details',
        in: 'query',
        schema: { type: 'boolean' as const, default: true },
        description: 'Include detailed statistics'
      }
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Exported statistics data',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                organization_id: { type: 'string' as const },
                organization_name: { type: 'string' as const },
                exported_at: { type: 'string' as const, format: 'date-time' },
                overview: { type: 'object' as const },
                detailed_statistics: { type: 'object' as const }
              }
            }
          },
          'text/csv': {
            schema: {
              type: 'string' as const
            }
          }
        }
      }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationAnalyticsPermission,
  hrSkillStatisticsController.exportSkillStatistics.bind(hrSkillStatisticsController)
);

// HR Document Management routes

// Upload document
router.post('/:id/documents',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Upload document',
    description: 'Upload a new document to an organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['title', 'file_path', 'file_type', 'file_size'],
            properties: {
              title: { type: 'string' as const, minLength: 1, maxLength: 255 },
              description: { type: 'string' as const, maxLength: 1000 },
              file_path: { type: 'string' as const, minLength: 1 },
              file_type: { type: 'string' as const, minLength: 1 },
              file_size: { type: 'integer' as const, minimum: 1 },
              folder_path: { type: 'string' as const, default: '/' },
              requires_acknowledgment: { type: 'boolean' as const, default: false },
              access_roles: {
                type: 'array' as const,
                items: { type: 'string' as const },
                default: []
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Document uploaded successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    title: { type: 'string' as const },
                    description: { type: 'string' as const },
                    file_path: { type: 'string' as const },
                    file_type: { type: 'string' as const },
                    file_size: { type: 'integer' as const },
                    folder_path: { type: 'string' as const },
                    version: { type: 'integer' as const },
                    requires_acknowledgment: { type: 'boolean' as const },
                    access_roles: {
                      type: 'array' as const,
                      items: { type: 'string' as const }
                    },
                    uploaded_by: { type: 'string' as const },
                    created_at: { type: 'string' as const, format: 'date-time' },
                    updated_at: { type: 'string' as const, format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrDocumentController.uploadDocument.bind(hrDocumentController)
);

// List documents
router.get('/:id/documents',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'List documents',
    description: 'Get documents for an organization with filtering and pagination',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'folder_path',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by folder path'
      },
      {
        name: 'file_type',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter by file type'
      },
      {
        name: 'requires_acknowledgment',
        in: 'query',
        schema: { type: 'boolean' as const },
        description: 'Filter by acknowledgment requirement'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'include_uploader_info',
        in: 'query',
        schema: { type: 'boolean' as const, default: false },
        description: 'Include uploader information'
      }
    ],
    responses: {
      200: {
        description: 'Documents retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      organization_id: { type: 'string' as const },
                      title: { type: 'string' as const },
                      description: { type: 'string' as const },
                      file_path: { type: 'string' as const },
                      file_type: { type: 'string' as const },
                      file_size: { type: 'integer' as const },
                      folder_path: { type: 'string' as const },
                      version: { type: 'integer' as const },
                      requires_acknowledgment: { type: 'boolean' as const },
                      access_roles: {
                        type: 'array' as const,
                        items: { type: 'string' as const }
                      },
                      uploaded_by: { type: 'string' as const },
                      created_at: { type: 'string' as const, format: 'date-time' },
                      updated_at: { type: 'string' as const, format: 'date-time' }
                    }
                  }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.listDocuments.bind(hrDocumentController)
);

// Get specific document
router.get('/:id/documents/:documentId',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get document',
    description: 'Get a specific document by ID',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      }
    ],
    responses: {
      200: {
        description: 'Document retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    title: { type: 'string' as const },
                    description: { type: 'string' as const },
                    file_path: { type: 'string' as const },
                    file_type: { type: 'string' as const },
                    file_size: { type: 'integer' as const },
                    folder_path: { type: 'string' as const },
                    version: { type: 'integer' as const },
                    requires_acknowledgment: { type: 'boolean' as const },
                    access_roles: {
                      type: 'array' as const,
                      items: { type: 'string' as const }
                    },
                    uploaded_by: { type: 'string' as const },
                    created_at: { type: 'string' as const, format: 'date-time' },
                    updated_at: { type: 'string' as const, format: 'date-time' },
                    user_acknowledged: { type: 'boolean' as const },
                    acknowledged_at: { type: 'string' as const, format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.getDocument.bind(hrDocumentController)
);

// Update document
router.put('/:id/documents/:documentId',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Update document',
    description: 'Update document metadata',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const, minLength: 1, maxLength: 255 },
              description: { type: 'string' as const, maxLength: 1000 },
              folder_path: { type: 'string' as const },
              requires_acknowledgment: { type: 'boolean' as const },
              access_roles: {
                type: 'array' as const,
                items: { type: 'string' as const }
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Document updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    title: { type: 'string' as const },
                    description: { type: 'string' as const },
                    file_path: { type: 'string' as const },
                    file_type: { type: 'string' as const },
                    file_size: { type: 'integer' as const },
                    folder_path: { type: 'string' as const },
                    version: { type: 'integer' as const },
                    requires_acknowledgment: { type: 'boolean' as const },
                    access_roles: {
                      type: 'array' as const,
                      items: { type: 'string' as const }
                    },
                    uploaded_by: { type: 'string' as const },
                    created_at: { type: 'string' as const, format: 'date-time' },
                    updated_at: { type: 'string' as const, format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrDocumentController.updateDocument.bind(hrDocumentController)
);

// Delete document
router.delete('/:id/documents/:documentId',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Delete document',
    description: 'Delete a document',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      }
    ],
    responses: {
      200: {
        description: 'Document deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                message: { type: 'string' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrDocumentController.deleteDocument.bind(hrDocumentController)
);

// Acknowledge document
router.put('/:id/documents/:documentId/acknowledge',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Acknowledge document',
    description: 'Acknowledge a document that requires acknowledgment',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      }
    ],
    responses: {
      200: {
        description: 'Document acknowledged successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    document_id: { type: 'string' as const },
                    user_id: { type: 'string' as const },
                    acknowledged_at: { type: 'string' as const, format: 'date-time' },
                    ip_address: { type: 'string' as const }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.acknowledgeDocument.bind(hrDocumentController)
);

// Search documents
router.get('/:id/documents/search',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Search documents',
    description: 'Search documents by title and description',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'q',
        in: 'query',
        required: true,
        schema: { type: 'string' as const, minLength: 1 },
        description: 'Search term'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Search results retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      organization_id: { type: 'string' as const },
                      title: { type: 'string' as const },
                      description: { type: 'string' as const },
                      file_path: { type: 'string' as const },
                      file_type: { type: 'string' as const },
                      file_size: { type: 'integer' as const },
                      folder_path: { type: 'string' as const },
                      version: { type: 'integer' as const },
                      requires_acknowledgment: { type: 'boolean' as const },
                      access_roles: {
                        type: 'array' as const,
                        items: { type: 'string' as const }
                      },
                      uploaded_by: { type: 'string' as const },
                      created_at: { type: 'string' as const, format: 'date-time' },
                      updated_at: { type: 'string' as const, format: 'date-time' }
                    }
                  }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const },
                search_term: { type: 'string' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.searchDocuments.bind(hrDocumentController)
);

// Get document version history
router.get('/:id/documents/:documentId/history',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get document history',
    description: 'Get version history for a document',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      }
    ],
    responses: {
      200: {
        description: 'Document history retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      version: { type: 'integer' as const },
                      created_at: { type: 'string' as const, format: 'date-time' },
                      uploaded_by: { type: 'string' as const },
                      file_size: { type: 'integer' as const },
                      file_path: { type: 'string' as const }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.getDocumentHistory.bind(hrDocumentController)
);

// Get folder structure
router.get('/:id/documents/folders',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get folder structure',
    description: 'Get folder structure for the organization',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    responses: {
      200: {
        description: 'Folder structure retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: { type: 'string' as const }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.getFolderStructure.bind(hrDocumentController)
);

// Get document acknowledgments
router.get('/:id/documents/:documentId/acknowledgments',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get document acknowledgments',
    description: 'Get acknowledgments for a document (admin only)',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      },
      {
        name: 'documentId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Document ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'Document acknowledgments retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      document_id: { type: 'string' as const },
                      user_id: { type: 'string' as const },
                      acknowledged_at: { type: 'string' as const, format: 'date-time' },
                      ip_address: { type: 'string' as const },
                      user_rsi_handle: { type: 'string' as const },
                      user_discord_username: { type: 'string' as const }
                    }
                  }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                total_pages: { type: 'integer' as const }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrDocumentController.getDocumentAcknowledgments.bind(hrDocumentController)
);

// Get compliance report
router.get('/:id/documents/compliance-report',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get compliance report',
    description: 'Get compliance report for the organization (admin only)',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    responses: {
      200: {
        description: 'Compliance report retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_documents: { type: 'integer' as const },
                    documents_requiring_acknowledgment: { type: 'integer' as const },
                    total_acknowledgments: { type: 'integer' as const },
                    compliance_rate: { type: 'number' as const },
                    pending_acknowledgments: { type: 'integer' as const }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('MANAGE_MEMBERS'),
  hrDocumentController.getComplianceReport.bind(hrDocumentController)
);

// Get pending acknowledgments for current user
router.get('/:id/documents/pending-acknowledgments',
  oapi.path({
    tags: ['HR Documents'],
    summary: 'Get pending acknowledgments',
    description: 'Get pending acknowledgments for the current user',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization RSI ID'
      }
    ],
    responses: {
      200: {
        description: 'Pending acknowledgments retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      organization_id: { type: 'string' as const },
                      title: { type: 'string' as const },
                      description: { type: 'string' as const },
                      file_path: { type: 'string' as const },
                      file_type: { type: 'string' as const },
                      file_size: { type: 'integer' as const },
                      folder_path: { type: 'string' as const },
                      version: { type: 'integer' as const },
                      requires_acknowledgment: { type: 'boolean' as const },
                      access_roles: {
                        type: 'array' as const,
                        items: { type: 'string' as const }
                      },
                      uploaded_by: { type: 'string' as const },
                      created_at: { type: 'string' as const, format: 'date-time' },
                      updated_at: { type: 'string' as const, format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  hrDocumentController.getPendingAcknowledgments.bind(hrDocumentController)
);

// HR Activity Management routes

// Get organization HR activities
router.get('/:id/hr-activities',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Get organization HR activities',
    description: 'Get paginated HR activities for an organization with filtering options',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        name: 'activity_types',
        in: 'query',
        schema: { 
          type: 'string' as const,
          description: 'Comma-separated list of activity types to filter by'
        },
        description: 'Filter by activity types (application_submitted, application_status_changed, onboarding_completed, performance_review_submitted, skill_verified, document_acknowledged)'
      },
      {
        name: 'date_from',
        in: 'query',
        schema: { type: 'string' as const, format: 'date-time' as const },
        description: 'Filter activities from this date (ISO 8601 format)'
      },
      {
        name: 'date_to',
        in: 'query',
        schema: { type: 'string' as const, format: 'date-time' as const },
        description: 'Filter activities to this date (ISO 8601 format)'
      },
      {
        name: 'user_id',
        in: 'query',
        schema: { type: 'string' as const },
        description: 'Filter activities by specific user ID'
      }
    ],
    responses: {
      200: {
        description: 'HR activities retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'array' as const,
                  items: {
                    type: 'object' as const,
                    properties: {
                      id: { type: 'string' as const },
                      organization_id: { type: 'string' as const },
                      activity_type: { 
                        type: 'string' as const,
                        enum: ['application_submitted', 'application_status_changed', 'onboarding_completed', 'performance_review_submitted', 'skill_verified', 'document_acknowledged']
                      },
                      user_id: { type: 'string' as const },
                      user_handle: { type: 'string' as const },
                      user_avatar_url: { type: 'string' as const },
                      title: { type: 'string' as const },
                      description: { type: 'string' as const },
                      metadata: { type: 'object' as const },
                      created_at: { type: 'string' as const, format: 'date-time' as const },
                      updated_at: { type: 'string' as const, format: 'date-time' as const }
                    }
                  }
                },
                total: { type: 'integer' as const },
                page: { type: 'integer' as const },
                limit: { type: 'integer' as const },
                has_more: { type: 'boolean' as const }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_MEMBERS'),
  loggedRateLimit(hrOperationsRateLimit),
  hrActivityController.getOrganizationActivities.bind(hrActivityController)
);

// Get organization HR activity statistics
router.get('/:id/hr-activities/stats',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Get organization HR activity statistics',
    description: 'Get statistical data about HR activities for an organization',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'Organization ID'
      },
      {
        name: 'date_from',
        in: 'query',
        schema: { type: 'string' as const, format: 'date-time' as const },
        description: 'Filter statistics from this date (ISO 8601 format)'
      },
      {
        name: 'date_to',
        in: 'query',
        schema: { type: 'string' as const, format: 'date-time' as const },
        description: 'Filter statistics to this date (ISO 8601 format)'
      }
    ],
    responses: {
      200: {
        description: 'HR activity statistics retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    total_activities: { type: 'integer' as const },
                    activities_by_type: {
                      type: 'object' as const,
                      properties: {
                        application_submitted: { type: 'integer' as const },
                        application_status_changed: { type: 'integer' as const },
                        onboarding_completed: { type: 'integer' as const },
                        performance_review_submitted: { type: 'integer' as const },
                        skill_verified: { type: 'integer' as const },
                        document_acknowledged: { type: 'integer' as const }
                      }
                    },
                    recent_activity_trend: {
                      type: 'array' as const,
                      items: {
                        type: 'object' as const,
                        properties: {
                          date: { type: 'string' as const },
                          count: { type: 'integer' as const }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  resolveOrganization,
  requireOrganizationPermission('VIEW_ANALYTICS'),
  loggedRateLimit(analyticsRateLimit),
  hrActivityController.getOrganizationActivityStats.bind(hrActivityController)
);

// Get individual HR activity by ID
router.get('/hr-activities/:activityId',
  oapi.path({
    tags: ['HR Management'],
    summary: 'Get HR activity by ID',
    description: 'Get detailed information about a specific HR activity',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'activityId',
        in: 'path',
        required: true,
        schema: { type: 'string' as const },
        description: 'HR Activity ID'
      }
    ],
    responses: {
      200: {
        description: 'HR activity retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                success: { type: 'boolean' as const },
                data: {
                  type: 'object' as const,
                  properties: {
                    id: { type: 'string' as const },
                    organization_id: { type: 'string' as const },
                    activity_type: { 
                      type: 'string' as const,
                      enum: ['application_submitted', 'application_status_changed', 'onboarding_completed', 'performance_review_submitted', 'skill_verified', 'document_acknowledged']
                    },
                    user_id: { type: 'string' as const },
                    user_handle: { type: 'string' as const },
                    user_avatar_url: { type: 'string' as const },
                    title: { type: 'string' as const },
                    description: { type: 'string' as const },
                    metadata: { type: 'object' as const },
                    created_at: { type: 'string' as const, format: 'date-time' as const },
                    updated_at: { type: 'string' as const, format: 'date-time' as const }
                  }
                }
              }
            }
          }
        }
      },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/InternalServerError' }
    }
  }),
  requireLogin as any,
  loggedRateLimit(hrOperationsRateLimit),
  hrActivityController.getActivityById.bind(hrActivityController)
);

export default router;
