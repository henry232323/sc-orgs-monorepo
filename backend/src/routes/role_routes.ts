import { Router } from 'express';
import { RoleController } from '../controllers/role_controller';
import { requireLogin } from '../middleware/auth';
import { oapi } from './openapi_routes';

const router: Router = Router();
const roleController = new RoleController();

// Apply authentication middleware to all routes
router.use(requireLogin as any);

// Get available permissions
oapi.path({
  tags: ['Roles'],
  summary: 'Get available permissions',
  description: 'Get list of all available permissions in the system',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Permissions retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PermissionsResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/permissions',
  roleController.getAvailablePermissions.bind(roleController) as any
);

// Organization role management routes (using spectrum ID)
oapi.path({
  tags: ['Roles'],
  summary: 'Get organization roles',
  description: 'Get all roles for a specific organization',
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
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Organization roles retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RolesResponse' }
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
  '/organizations/:spectrumId/roles',
  roleController.getOrganizationRoles.bind(roleController) as any
);

oapi.path({
  tags: ['Roles'],
  summary: 'Create organization role',
  description: 'Create a new role for an organization',
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
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateRoleRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Role created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RoleResponse' }
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
  '/organizations/:spectrumId/roles',
  roleController.createRole.bind(roleController) as any
);

oapi.path({
  tags: ['Roles'],
  summary: 'Update organization role',
  description: 'Update an existing organization role',
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
      schema: { type: 'string' }
    },
    {
      name: 'roleId',
      in: 'path',
      required: true,
      description: 'Role ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdateRoleRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Role updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RoleResponse' }
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
  '/organizations/:spectrumId/roles/:roleId',
  roleController.updateRole.bind(roleController) as any
);

oapi.path({
  tags: ['Roles'],
  summary: 'Delete organization role',
  description: 'Delete an organization role',
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
      schema: { type: 'string' }
    },
    {
      name: 'roleId',
      in: 'path',
      required: true,
      description: 'Role ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Role deleted successfully',
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
  '/organizations/:spectrumId/roles/:roleId',
  roleController.deleteRole.bind(roleController) as any
);

// Organization member management routes (using spectrum ID)
oapi.path({
  tags: ['Roles'],
  summary: 'Get organization members',
  description: 'Get all members of an organization',
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
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Organization members retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/MembersResponse' }
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
  '/organizations/:spectrumId/members',
  roleController.getOrganizationMembers.bind(roleController) as any
);

oapi.path({
  tags: ['Roles'],
  summary: 'Assign role to member',
  description: 'Assign a role to an organization member',
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
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AssignRoleRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Role assigned successfully',
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
  '/organizations/:spectrumId/members/assign-role',
  roleController.assignRole.bind(roleController) as any
);

oapi.path({
  tags: ['Roles'],
  summary: 'Remove organization member',
  description: 'Remove a member from an organization',
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
      schema: { type: 'string' }
    },
    {
      name: 'userId',
      in: 'path',
      required: true,
      description: 'User ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Member removed successfully',
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
  '/organizations/:spectrumId/members/:userId',
  roleController.removeMember.bind(roleController) as any
);

export default router;
