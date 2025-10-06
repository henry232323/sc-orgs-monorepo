import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger';
import { User } from '../types/user';

/**
 * Rate limiting configuration for HR endpoints
 */
const HR_RATE_LIMITS = {
  // Application submission - more restrictive to prevent spam
  applications: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 applications per 15 minutes per IP
    message: {
      error: 'Too Many Requests',
      message: 'Too many application submissions. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    }
  },

  // General HR operations - moderate limits
  hrOperations: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 requests per 5 minutes per IP
    message: {
      error: 'Too Many Requests',
      message: 'Too many HR requests. Please try again later.',
      retryAfter: 300 // 5 minutes in seconds
    }
  },

  // Analytics and reporting - more lenient
  analytics: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per IP
    message: {
      error: 'Too Many Requests',
      message: 'Too many analytics requests. Please try again later.',
      retryAfter: 60 // 1 minute in seconds
    }
  },

  // Bulk operations - very restrictive
  bulkOperations: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 bulk operations per hour per IP
    message: {
      error: 'Too Many Requests',
      message: 'Too many bulk operations. Please try again later.',
      retryAfter: 3600 // 1 hour in seconds
    }
  }
};

/**
 * Create rate limiter with custom configuration
 */
function createRateLimiter(config: typeof HR_RATE_LIMITS.applications) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: (req.user as User)?.id
      });

      res.status(429).json(config.message);
    },
    skip: (req: Request) => {
      // Skip rate limiting in development for testing
      if (process.env.NODE_ENV === 'development') {
        return false; // Still apply rate limiting in development
      }
      return false;
    },
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return (req.user as User)?.id || req.ip || 'anonymous';
    }
  });
}

/**
 * Rate limiter for application submissions
 */
export const applicationRateLimit = createRateLimiter(HR_RATE_LIMITS.applications);

/**
 * Rate limiter for general HR operations
 */
export const hrOperationsRateLimit = createRateLimiter(HR_RATE_LIMITS.hrOperations);

/**
 * Rate limiter for analytics endpoints
 */
export const analyticsRateLimit = createRateLimiter(HR_RATE_LIMITS.analytics);

/**
 * Rate limiter for bulk operations
 */
export const bulkOperationsRateLimit = createRateLimiter(HR_RATE_LIMITS.bulkOperations);

/**
 * Custom rate limiter for specific endpoints
 */
export function createCustomRateLimit(
  windowMs: number,
  max: number,
  message: string
) {
  return createRateLimiter({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message,
      retryAfter: Math.floor(windowMs / 1000)
    }
  });
}

/**
 * Rate limiting middleware that logs attempts
 */
export function loggedRateLimit(limiter: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log the request attempt
    logger.debug('HR API request', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: (req.user as User)?.id || 'anonymous',
      organizationId: req.params.id
    });

    // Apply rate limiting
    limiter(req, res, next);
  };
}