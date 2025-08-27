/**
 * Authentication-related OpenAPI schemas
 */

export const UserSchema = {
  type: 'object' as const,
  properties: {
    id: { 
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
      nullable: true,
      description: 'Discord avatar hash'
    },
    rsi_handle: { 
      type: 'string' as const, 
      nullable: true,
      description: 'RSI handle for verification'
    },
    rsi_verified: {
      type: 'boolean' as const,
      description: 'Whether RSI account is verified'
    },
    created_at: { 
      type: 'string' as const, 
      format: 'date-time' as const,
      description: 'Account creation timestamp'
    },
    updated_at: { 
      type: 'string' as const, 
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'username', 'discriminator', 'rsi_verified', 'created_at', 'updated_at']
};

export const AuthSuccessResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { 
      type: 'boolean' as const,
      example: true
    },
    token: { 
      type: 'string' as const,
      description: 'JWT authentication token'
    },
    user: { 
      $ref: '#/components/schemas/User'
    },
    expires_in: {
      type: 'integer' as const,
      description: 'Token expiration time in seconds'
    }
  },
  required: ['success', 'token', 'user']
};

export const AuthFailureResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { 
      type: 'boolean' as const,
      example: false
    },
    error: { 
      type: 'string' as const,
      example: 'Authentication failed'
    },
    message: { 
      type: 'string' as const,
      example: 'Discord authentication was unsuccessful'
    }
  },
  required: ['success', 'error', 'message']
};

export const VerifyRsiRequestSchema = {
  type: 'object' as const,
  properties: {
    rsi_handle: { 
      type: 'string' as const,
      description: 'RSI handle to verify',
      minLength: 1,
      maxLength: 50
    },
    verification_code: { 
      type: 'string' as const,
      description: 'Verification code from RSI profile',
      minLength: 6,
      maxLength: 6
    }
  },
  required: ['rsi_handle', 'verification_code']
};

export const VerifyRsiResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { 
      type: 'boolean' as const,
      example: true
    },
    message: { 
      type: 'string' as const,
      example: 'RSI account verified successfully'
    },
    user: { 
      $ref: '#/components/schemas/User'
    }
  },
  required: ['success', 'message', 'user']
};

export const GenerateVerificationCodeResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { 
      type: 'boolean' as const,
      example: true
    },
    message: { 
      type: 'string' as const,
      example: 'Verification code generated. Please add it to your RSI profile.'
    },
    verification_code: { 
      type: 'string' as const,
      description: '6-digit verification code to add to RSI profile'
    },
    expires_at: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When the verification code expires'
    }
  },
  required: ['success', 'message', 'verification_code', 'expires_at']
};

export const ActivitySchema = {
  type: 'object' as const,
  properties: {
    id: { 
      type: 'string' as const,
      description: 'Activity ID'
    },
    user_id: { 
      type: 'string' as const,
      description: 'User ID who performed the activity'
    },
    activity_type: { 
      type: 'string' as const,
      enum: ['login', 'logout', 'rsi_verify', 'org_create', 'org_update', 'event_create', 'event_update'],
      description: 'Type of activity'
    },
    description: { 
      type: 'string' as const,
      description: 'Human-readable description of the activity'
    },
    metadata: { 
      type: 'object' as const,
      nullable: true,
      description: 'Additional activity metadata'
    },
    created_at: { 
      type: 'string' as const, 
      format: 'date-time' as const,
      description: 'When the activity occurred'
    }
  },
  required: ['id', 'user_id', 'activity_type', 'description', 'created_at']
};

export const ActivityListResponseSchema = {
  type: 'object' as const,
  properties: {
    activities: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Activity' }
    },
    pagination: { 
      $ref: '#/components/schemas/Pagination' 
    }
  },
  required: ['activities', 'pagination']
};