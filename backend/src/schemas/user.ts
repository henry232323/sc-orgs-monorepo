

// User Profile Schema
export const UserProfileSchema=  {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'User ID'
    },
    rsiHandle: {
      type: 'string' as const,
      description: 'RSI handle'
    },
    discordId: {
      type: 'string' as const,
      description: 'Discord user ID'
    },
    username: {
      type: 'string' as const,
      description: 'Discord username'
    },
    discriminator: {
      type: 'string' as const,
      description: 'Discord discriminator'
    },
    avatar: {
      type: 'string' as const,
      description: 'Discord avatar URL',
      nullable: true
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Account creation timestamp'
    },
    updatedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'rsiHandle', 'discordId', 'username', 'discriminator', 'createdAt', 'updatedAt']
};

// Public User Profile Schema (limited fields)
export const PublicUserProfileSchema=  {
  type: 'object' as const,
  properties: {
    rsiHandle: {
      type: 'string' as const,
      description: 'RSI handle'
    },
    username: {
      type: 'string' as const,
      description: 'Discord username'
    },
    discriminator: {
      type: 'string' as const,
      description: 'Discord discriminator'
    },
    avatar: {
      type: 'string' as const,
      description: 'Discord avatar URL',
      nullable: true
    }
  },
  required: ['rsiHandle', 'username', 'discriminator']
};

// User Organization Schema
export const UserOrganizationSchema=  {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    rsiOrgId: {
      type: 'string' as const,
      description: 'RSI organization ID'
    },
    name: {
      type: 'string' as const,
      description: 'Organization name'
    },
    description: {
      type: 'string' as const,
      description: 'Organization description',
      nullable: true
    },
    logo: {
      type: 'string' as const,
      description: 'Organization logo URL',
      nullable: true
    },
    website: {
      type: 'string' as const,
      description: 'Organization website',
      nullable: true
    },
    spectrumId: {
      type: 'string' as const,
      description: 'Spectrum organization ID'
    },
    role: {
      type: 'string' as const,
      description: 'User role in organization',
      enum: ['owner', 'admin', 'member']
    },
    joinedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When user joined the organization'
    },
    isVisible: {
      type: 'boolean' as const,
      description: 'Whether organization is visible on user profile'
    }
  },
  required: ['id', 'rsiOrgId', 'name', 'spectrumId', 'role', 'joinedAt', 'isVisible']
};

// User Organizations Response Schema
export const UserOrganizationsResponseSchema=  {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/UserOrganization'
      },
      description: 'List of user organizations'
    }
  },
  required: ['success', 'data']
};

// Leave Organization Request Schema
export const LeaveOrganizationRequestSchema=  {
  type: 'object' as const,
  properties: {
    confirmLeave: {
      type: 'boolean' as const,
      description: 'Confirmation to leave organization'
    }
  },
  required: ['confirmLeave']
};

// Toggle Visibility Request Schema
export const ToggleVisibilityRequestSchema=  {
  type: 'object' as const,
  properties: {
    isVisible: {
      type: 'boolean' as const,
      description: 'New visibility state'
    }
  },
  required: ['isVisible']
};

// Success Response Schema
export const UserSuccessResponseSchema=  {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    message: {
      type: 'string' as const,
      description: 'Success message'
    }
  },
  required: ['success', 'message']
};
