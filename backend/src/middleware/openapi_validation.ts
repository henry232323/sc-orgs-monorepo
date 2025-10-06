import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import logger from '../config/logger';

// Initialize AJV with formats support
const ajv = new Ajv({ 
  allErrors: true, 
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true
});
addFormats(ajv);

// Cache for compiled validators
const validatorCache = new Map<string, ValidateFunction>();

/**
 * OpenAPI validation middleware factory
 * Creates middleware that validates request body against OpenAPI schema
 */
export function validateRequestBody(schemaRef: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip validation if no body
      if (!req.body || Object.keys(req.body).length === 0) {
        return next();
      }

      // Get or compile validator
      let validator = validatorCache.get(schemaRef);
      if (!validator) {
        // In a real implementation, we would resolve the schema reference
        // For now, we'll create a basic validator that allows any object
        const basicSchema = {
          type: 'object',
          additionalProperties: true
        };
        validator = ajv.compile(basicSchema);
        validatorCache.set(schemaRef, validator);
      }

      // Validate request body
      const valid = validator(req.body);
      if (!valid) {
        const errors = validator.errors?.map(error => ({
          field: error.instancePath || error.schemaPath,
          message: error.message || 'Validation failed',
          value: error.data
        })) || [];

        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors,
          body: req.body
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: errors
        });
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      next(error);
    }
  };
}

/**
 * Validate query parameters against schema
 */
export function validateQueryParams(schemaRef: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get or compile validator
      let validator = validatorCache.get(`query_${schemaRef}`);
      if (!validator) {
        // Basic query parameter validation
        const basicSchema = {
          type: 'object',
          additionalProperties: true
        };
        validator = ajv.compile(basicSchema);
        validatorCache.set(`query_${schemaRef}`, validator);
      }

      // Validate query parameters
      const valid = validator(req.query);
      if (!valid) {
        const errors = validator.errors?.map(error => ({
          field: error.instancePath || error.schemaPath,
          message: error.message || 'Validation failed',
          value: error.data
        })) || [];

        logger.warn('Query parameter validation failed', {
          path: req.path,
          method: req.method,
          errors,
          query: req.query
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Query parameter validation failed',
          details: errors
        });
      }

      next();
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      next(error);
    }
  };
}

/**
 * Sanitize request data to prevent XSS and injection attacks
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      next();
    } catch (error) {
      logger.error('Sanitization middleware error:', error);
      next(error);
    }
  };
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * HR-specific validation schemas
 */
export const hrValidationSchemas = {
  // Application schemas
  createApplication: {
    type: 'object',
    properties: {
      application_data: {
        type: 'object',
        properties: {
          cover_letter: { type: 'string', maxLength: 2000 },
          experience: { type: 'string', maxLength: 1000 },
          availability: { type: 'string', maxLength: 500 },
          custom_fields: { type: 'object' }
        },
        required: ['cover_letter'],
        additionalProperties: false
      }
    },
    required: ['application_data'],
    additionalProperties: false
  },

  updateApplicationStatus: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected']
      },
      review_notes: { type: 'string', maxLength: 1000 },
      rejection_reason: { type: 'string', maxLength: 500 }
    },
    required: ['status'],
    additionalProperties: false
  },

  // Onboarding schemas
  createOnboardingTemplate: {
    type: 'object',
    properties: {
      role_name: { type: 'string', minLength: 1, maxLength: 100 },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 1000 },
            required: { type: 'boolean' },
            estimated_hours: { type: 'number', minimum: 0 },
            order_index: { type: 'integer', minimum: 0 }
          },
          required: ['title', 'description', 'required', 'estimated_hours', 'order_index'],
          additionalProperties: false
        },
        minItems: 1
      },
      estimated_duration_days: { type: 'integer', minimum: 1, maximum: 365 }
    },
    required: ['role_name', 'tasks', 'estimated_duration_days'],
    additionalProperties: false
  },

  // Performance review schemas
  createPerformanceReview: {
    type: 'object',
    properties: {
      reviewee_id: { type: 'string' },
      review_period_start: { type: 'string', format: 'date' },
      review_period_end: { type: 'string', format: 'date' },
      ratings: {
        type: 'object',
        patternProperties: {
          '^[a-zA-Z_][a-zA-Z0-9_]*$': {
            type: 'object',
            properties: {
              score: { type: 'number', minimum: 1, maximum: 5 },
              comments: { type: 'string', maxLength: 1000 }
            },
            required: ['score'],
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      overall_rating: { type: 'number', minimum: 1, maximum: 5 },
      strengths: {
        type: 'array',
        items: { type: 'string', maxLength: 500 }
      },
      areas_for_improvement: {
        type: 'array',
        items: { type: 'string', maxLength: 500 }
      }
    },
    required: ['reviewee_id', 'review_period_start', 'review_period_end', 'ratings', 'overall_rating'],
    additionalProperties: false
  },

  // Document schemas
  createDocument: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
      file_path: { type: 'string' },
      file_type: { type: 'string' },
      file_size: { type: 'integer', minimum: 1 },
      folder_path: { type: 'string', default: '/' },
      requires_acknowledgment: { type: 'boolean', default: false },
      access_roles: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['title', 'file_path', 'file_type', 'file_size', 'access_roles'],
    additionalProperties: false
  }
};

/**
 * Create validation middleware for HR endpoints
 */
export function validateHRRequest(schemaName: keyof typeof hrValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = hrValidationSchemas[schemaName];
      if (!schema) {
        logger.error(`Unknown HR validation schema: ${schemaName}`);
        return next();
      }

      // Get or compile validator
      let validator = validatorCache.get(`hr_${schemaName}`);
      if (!validator) {
        validator = ajv.compile(schema);
        validatorCache.set(`hr_${schemaName}`, validator);
      }

      // Validate request body
      const valid = validator(req.body);
      if (!valid) {
        const errors = validator.errors?.map(error => ({
          field: error.instancePath.replace(/^\//, '') || error.schemaPath,
          message: error.message || 'Validation failed',
          value: error.data
        })) || [];

        logger.warn('HR request validation failed', {
          path: req.path,
          method: req.method,
          schema: schemaName,
          errors,
          body: req.body
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: errors
        });
      }

      next();
    } catch (error) {
      logger.error('HR validation middleware error:', error);
      next(error);
    }
  };
}