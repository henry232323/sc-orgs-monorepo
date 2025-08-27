/**
 * Role-related OpenAPI schemas
 */

// Permission Schema
export const PermissionSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Permission ID'
    },
    name: {
      type: 'string' as const,
      description: 'Permission name'
    },
    description: {
      type: 'string' as const,
      description: 'Permission description'
    },
    category: {
      type: 'string' as const,
      description: 'Permission category'
    }
  },
  required: ['id', 'name', 'description', 'category']
};

// Role Schema
export const RoleSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Role ID'
    },
    name: {
      type: 'string' as const,
      description: 'Role name'
    },
    description: {
      type: 'string' as const,
      description: 'Role description',
      nullable: true
    },
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    permissions: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Permission'
      },
      description: 'List of permissions for this role'
    },
    memberCount: {
      type: 'integer' as const,
      description: 'Number of members with this role'
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Role creation timestamp'
    },
    updatedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Role last update timestamp'
    }
  },
  required: ['id', 'name', 'organizationId', 'permissions', 'memberCount', 'createdAt', 'updatedAt']
};

// Create Role Request Schema
export const CreateRoleRequestSchema = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string' as const,
      description: 'Role name',
      minLength: 1,
      maxLength: 100
    },
    description: {
      type: 'string' as const,
      description: 'Role description',
      maxLength: 500,
      nullable: true
    },
    permissions: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      },
      description: 'List of permission IDs',
      minItems: 1
    }
  },
  required: ['name', 'permissions']
};

// Update Role Request Schema
export const UpdateRoleRequestSchema = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string' as const,
      description: 'Role name',
      minLength: 1,
      maxLength: 100
    },
    description: {
      type: 'string' as const,
      description: 'Role description',
      maxLength: 500,
      nullable: true
    },
    permissions: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      },
      description: 'List of permission IDs',
      minItems: 1
    }
  }
};

// Organization Member Schema
export const OrganizationMemberSchema = {
  type: 'object' as const,
  properties: {
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
    rsiHandle: {
      type: 'string' as const,
      description: 'User RSI handle'
    },
    roleId: {
      type: 'string' as const,
      description: 'User role ID',
      nullable: true
    },
    roleName: {
      type: 'string' as const,
      description: 'User role name',
      nullable: true
    },
    joinedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When user joined the organization'
    }
  },
  required: ['userId', 'username', 'discriminator', 'rsiHandle', 'joinedAt']
};

// Assign Role Request Schema
export const AssignRoleRequestSchema = {
  type: 'object' as const,
  properties: {
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    roleId: {
      type: 'string' as const,
      description: 'Role ID',
      nullable: true
    }
  },
  required: ['userId']
};

// Permissions Response Schema
export const PermissionsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Permission'
      },
      description: 'List of available permissions'
    }
  },
  required: ['success', 'data']
};

// Roles Response Schema
export const RolesResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Role'
      },
      description: 'List of organization roles'
    }
  },
  required: ['success', 'data']
};

// Role Response Schema
export const RoleResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/Role'
    }
  },
  required: ['success', 'data']
};

// Members Response Schema
export const MembersResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/OrganizationMember'
      },
      description: 'List of organization members'
    }
  },
  required: ['success', 'data']
};
