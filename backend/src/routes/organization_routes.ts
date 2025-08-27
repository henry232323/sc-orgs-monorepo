import { Router } from 'express';
import { OrganizationController } from '../controllers/organization_controller';
import { EventReviewController } from '../controllers/event_review_controller';
import { AnalyticsController } from '../controllers/analytics_controller';
import { requireLogin } from '../middleware/auth';
import { requireOrganizationPermission, requireOrganizationAnalyticsPermission } from '../middleware/permissions';
import { recordOrganizationView } from '../middleware/view_tracking';
import { resolveOrganization } from '../middleware/organization_resolver';
import { oapi } from './openapi_routes';

const router: Router = Router();
const organizationController = new OrganizationController();
const eventReviewController = new EventReviewController();
const analyticsController = new AnalyticsController();

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

export default router;
