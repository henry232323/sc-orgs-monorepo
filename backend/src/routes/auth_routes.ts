import { Router } from 'express';
import { AuthController } from '../controllers/auth_controller';
import { ActivityController } from '../controllers/activity_controller';
import { HRActivityController } from '../controllers/hr_activity_controller';
import { requireLogin } from '../middleware/auth';
import passport from 'passport';
import { oapi } from './openapi_routes';

const router: Router = Router();
const authController = new AuthController();
const activityController = new ActivityController();
const hrActivityController = new HRActivityController();

// Discord OAuth routes
router.get('/discord', 
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Initiate Discord OAuth login',
    description: 'Redirects user to Discord OAuth authorization page to begin authentication flow',
    responses: {
      302: {
        description: 'Redirect to Discord OAuth authorization page',
        headers: {
          Location: {
            description: 'Discord OAuth authorization URL',
            schema: { type: 'string' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  authController.discordLogin.bind(authController)
);

router.get('/discord/callback',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Discord OAuth callback',
    description: 'Handles Discord OAuth callback and creates JWT token for authenticated user',
    parameters: [
      {
        name: 'code',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'Authorization code from Discord OAuth'
      },
      {
        name: 'state',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'State parameter for OAuth security'
      }
    ],
    responses: {
      200: {
        description: 'Authentication successful',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthSuccessResponse' }
          }
        }
      },
      401: {
        description: 'Authentication failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthFailureResponse' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  passport.authenticate('discord', {
    session: false,
    failureRedirect: '/auth/failure', // Redirect on failure
  }),
  authController.discordCallback.bind(authController)
);

// Auth failure route
router.get('/failure', 
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Authentication failure',
    description: 'Endpoint called when Discord OAuth authentication fails',
    responses: {
      401: {
        description: 'Authentication failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthFailureResponse' }
          }
        }
      }
    }
  }),
  (req, res) => {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Discord authentication was unsuccessful',
    });
  }
);

// Protected routes (require JWT)
router.get('/me',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get current user',
    description: 'Returns the currently authenticated user information',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current user information',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getCurrentUser.bind(authController)
);

router.get('/user/:id',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user by ID',
    description: 'Returns user information for the specified user ID',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Discord user ID'
      }
    ],
    responses: {
      200: {
        description: 'User information',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' }
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
  authController.getUserById.bind(authController)
);

router.post('/verify-rsi',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Verify RSI account',
    description: 'Verifies user RSI account using verification code',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/VerifyRsiRequest' }
        }
      }
    },
    responses: {
      200: {
        description: 'RSI account verified successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VerifyRsiResponse' }
          }
        }
      },
      400: {
        $ref: '#/components/responses/BadRequest'
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.verifyRsiAccount.bind(authController)
);

router.post('/generate-verification-code',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Generate RSI verification code',
    description: 'Generates a verification code for RSI account verification',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Verification code generated successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GenerateVerificationCodeResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.generateVerificationCode.bind(authController)
);
router.get('/verification-code',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user verification code',
    description: 'Retrieves the current verification code for the authenticated user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current verification code',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GenerateVerificationCodeResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      404: {
        description: 'No verification code found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NotFoundError' }
          }
        }
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getUserVerificationCode.bind(authController)
);

router.post('/logout',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Logout user',
    description: 'Logs out the current user and invalidates their session',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.logout.bind(authController)
);

// Dashboard routes
router.get('/dashboard/stats',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user dashboard statistics',
    description: 'Returns statistics for the user dashboard',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Dashboard statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                total_organizations: { type: 'integer' },
                total_events: { type: 'integer' },
                total_comments: { type: 'integer' },
                total_ratings: { type: 'integer' }
              }
            }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getUserDashboardStats.bind(authController)
);

router.get('/dashboard/rating-summary',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user rating summary',
    description: 'Returns rating summary for the authenticated user',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Rating summary',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                average_rating: { type: 'number' },
                total_ratings: { type: 'integer' },
                rating_breakdown: {
                  type: 'object',
                  properties: {
                    '1': { type: 'integer' },
                    '2': { type: 'integer' },
                    '3': { type: 'integer' },
                    '4': { type: 'integer' },
                    '5': { type: 'integer' }
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
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getUserRatingSummary.bind(authController)
);

router.get('/dashboard/organizations',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user organizations',
    description: 'Returns organizations associated with the authenticated user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'User organizations',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationListResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getUserOrganizations.bind(authController)
);

router.get('/dashboard/events',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user events',
    description: 'Returns events associated with the authenticated user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'User events',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      start_date: { type: 'string', format: 'date-time' },
                      end_date: { type: 'string', format: 'date-time' },
                      organization: { $ref: '#/components/schemas/Organization' }
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
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  authController.getUserEvents.bind(authController)
);

// User activity endpoint
router.get('/activity',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user activity',
    description: 'Returns activity log for the authenticated user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      }
    ],
    responses: {
      200: {
        description: 'User activity log',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ActivityListResponse' }
          }
        }
      },
      401: {
        $ref: '#/components/responses/Unauthorized'
      },
      500: {
        $ref: '#/components/responses/InternalServerError'
      }
    }
  }),
  requireLogin as any,
  activityController.getUserActivity.bind(activityController)
);

// HR-specific user activity endpoint
router.get('/hr-activities',
  oapi.validPath({
    tags: ['Authentication'],
    summary: 'Get user HR activities',
    description: 'Returns HR-specific activity log for the authenticated user',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' as const, minimum: 1, maximum: 50, default: 10 },
        description: 'Maximum number of activities to return'
      }
    ],
    responses: {
      200: {
        description: 'User HR activity log',
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
                total: { type: 'integer' as const }
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
  hrActivityController.getUserActivities.bind(hrActivityController)
);

export default router;
