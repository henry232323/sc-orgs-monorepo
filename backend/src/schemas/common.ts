/**
 * Common OpenAPI schemas used across all endpoints
 */

export const ErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      description: 'Error type or code'
    },
    message: { 
      type: 'string' as const,
      description: 'Human-readable error message'
    },
    details: { 
      type: 'object' as const,
      description: 'Additional error details',
      nullable: true
    },
    timestamp: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When the error occurred'
    }
  },
  required: ['error', 'message']
};

export const PaginationSchema = {
  type: 'object' as const,
  properties: {
    page: { 
      type: 'integer' as const, 
      minimum: 1,
      description: 'Current page number'
    },
    limit: { 
      type: 'integer' as const, 
      minimum: 1, 
      maximum: 100,
      description: 'Number of items per page'
    },
    total: { 
      type: 'integer' as const,
      description: 'Total number of items'
    },
    totalPages: { 
      type: 'integer' as const,
      description: 'Total number of pages'
    },
    hasNext: {
      type: 'boolean' as const,
      description: 'Whether there is a next page'
    },
    hasPrev: {
      type: 'boolean' as const,
      description: 'Whether there is a previous page'
    }
  },
  required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
};

export const SuccessResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { 
      type: 'boolean' as const,
      description: 'Whether the operation was successful'
    },
    message: { 
      type: 'string' as const,
      description: 'Success message'
    },
    data: {
      type: 'object' as const,
      description: 'Response data',
      nullable: true
    }
  },
  required: ['success']
};

export const ValidationErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      example: 'Validation Error'
    },
    message: { 
      type: 'string' as const,
      example: 'Request validation failed'
    },
    details: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          field: { type: 'string' as const },
          message: { type: 'string' as const },
          value: { type: 'string' as const }
        }
      }
    }
  },
  required: ['error', 'message', 'details']
};

export const UnauthorizedErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      example: 'Unauthorized'
    },
    message: { 
      type: 'string' as const,
      example: 'Authentication required'
    }
  },
  required: ['error', 'message']
};

export const ForbiddenErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      example: 'Forbidden'
    },
    message: { 
      type: 'string' as const,
      example: 'Insufficient permissions'
    }
  },
  required: ['error', 'message']
};

export const NotFoundErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      example: 'Not Found'
    },
    message: { 
      type: 'string' as const,
      example: 'Resource not found'
    }
  },
  required: ['error', 'message']
};

export const InternalServerErrorSchema = {
  type: 'object' as const,
  properties: {
    error: { 
      type: 'string' as const,
      example: 'Internal Server Error'
    },
    message: { 
      type: 'string' as const,
      example: 'Something went wrong'
    }
  },
  required: ['error', 'message']
};

// Common response schemas for different HTTP status codes
export const CommonResponses = {
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ValidationError' }
      }
    }
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UnauthorizedError' }
      }
    }
  },
  403: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ForbiddenError' }
      }
    }
  },
  404: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/NotFoundError' }
      }
    }
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/InternalServerError' }
      }
    }
  }
};