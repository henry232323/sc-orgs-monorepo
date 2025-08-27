import { Router } from 'express';
import { UserController } from '../controllers/user_controller';
import { requireLogin } from '../middleware/auth';
import { oapi } from './openapi_routes';

const router: Router = Router();
const userController = new UserController();

// Get public user profile by RSI handle (no auth required)
oapi.path({
  
  
  tags: ['Users'],
  summary: 'Get public user profile',
  description: 'Retrieve public profile information for a user by their RSI handle',
  parameters: [
    {
      name: 'rsiHandle',
      in: 'path',
      required: true,
      description: 'RSI handle of the user',
      schema: {
        type: 'string'
      }
    }
  ],
  responses: {
    '200': {
      description: 'Public user profile retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Success status'
              },
              data: {
                $ref: '#/components/schemas/PublicUserProfile'
              }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    '404': {
      $ref: '#/components/responses/NotFound'
    },
    '500': {
      $ref: '#/components/responses/InternalServerError'
    }
  }
});
router.get(
  '/public/:rsiHandle',
  userController.getPublicUserProfile.bind(userController)
);

// Get user's organizations with management info
oapi.path({
  
  
  tags: ['Users'],
  summary: 'Get user organizations',
  description: 'Retrieve all organizations that the authenticated user belongs to',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'User organizations retrieved successfully',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/UserOrganizationsResponse'
          }
        }
      }
    },
    '401': {
      $ref: '#/components/responses/Unauthorized'
    },
    '500': {
      $ref: '#/components/responses/InternalServerError'
    }
  }
});
router.get(
  '/organizations',
  requireLogin as any,
  userController.getUserOrganizations.bind(userController)
);

// Leave an organization
oapi.path({
  
  
  tags: ['Users'],
  summary: 'Leave organization',
  description: 'Leave an organization that the user is a member of',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'spectrumId',
      in: 'path',
      required: true,
      description: 'Spectrum organization ID',
      schema: {
        type: 'string'
      }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/LeaveOrganizationRequest'
        }
      }
    }
  },
  responses: {
    '200': {
      description: 'Successfully left the organization',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/UserSuccessResponse'
          }
        }
      }
    },
    '400': {
      $ref: '#/components/responses/ValidationError'
    },
    '401': {
      $ref: '#/components/responses/Unauthorized'
    },
    '403': {
      $ref: '#/components/responses/Forbidden'
    },
    '404': {
      $ref: '#/components/responses/NotFound'
    },
    '500': {
      $ref: '#/components/responses/InternalServerError'
    }
  }
});
router.post(
  '/organizations/:spectrumId/leave',
  requireLogin as any,
  userController.leaveOrganization.bind(userController)
);

// Toggle organization visibility (hide/unhide)
oapi.path({
  
  
  tags: ['Users'],
  summary: 'Toggle organization visibility',
  description: 'Toggle the visibility of an organization on the user profile',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'spectrumId',
      in: 'path',
      required: true,
      description: 'Spectrum organization ID',
      schema: {
        type: 'string'
      }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ToggleVisibilityRequest'
        }
      }
    }
  },
  responses: {
    '200': {
      description: 'Organization visibility toggled successfully',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/UserSuccessResponse'
          }
        }
      }
    },
    '400': {
      $ref: '#/components/responses/ValidationError'
    },
    '401': {
      $ref: '#/components/responses/Unauthorized'
    },
    '403': {
      $ref: '#/components/responses/Forbidden'
    },
    '404': {
      $ref: '#/components/responses/NotFound'
    },
    '500': {
      $ref: '#/components/responses/InternalServerError'
    }
  }
});
router.post(
  '/organizations/:spectrumId/toggle-visibility',
  requireLogin as any,
  userController.toggleOrganizationVisibility.bind(userController)
);

export default router;
