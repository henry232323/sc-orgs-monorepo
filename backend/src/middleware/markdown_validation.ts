import { Request, Response, NextFunction } from 'express';
import { MarkdownProcessingService, MarkdownProcessingOptions } from '../services/markdown_processing_service';
import { 
  MarkdownValidationError, 
  MarkdownContentTooLargeError,
  MarkdownSecurityError,
  isMarkdownError,
  createUserFriendlyErrorMessage
} from '../errors/markdown_errors';
import logger from '../config/logger';

interface MarkdownValidationConfig {
  maxContentLength?: number;
  maxWordCount?: number;
  strictMode?: boolean;
  allowExternalLinks?: boolean;
  maxLinkCount?: number;
  maxImageCount?: number;
  timeoutMs?: number;
  skipValidationForRoles?: string[];
}

interface ValidatedMarkdownRequest extends Request {
  validatedMarkdown?: {
    content: string;
    sanitizedContent: string;
    wordCount: number;
    estimatedReadingTime: number;
    warnings: string[];
  };
}

/**
 * Middleware for validating markdown content in request bodies
 * Provides comprehensive validation, sanitization, and error handling
 */
export function validateMarkdownContent(config: MarkdownValidationConfig = {}) {
  const markdownService = new MarkdownProcessingService();
  
  const defaultConfig: Required<MarkdownValidationConfig> = {
    maxContentLength: 1000000, // 1MB
    maxWordCount: 100000, // 100k words
    strictMode: false,
    allowExternalLinks: true,
    maxLinkCount: 100,
    maxImageCount: 50,
    timeoutMs: 30000, // 30 seconds
    skipValidationForRoles: ['system', 'admin'],
  };

  const finalConfig = { ...defaultConfig, ...config };

  return async (req: ValidatedMarkdownRequest, res: Response, next: NextFunction) => {
    try {
      const { content } = req.body;

      // Skip validation if content is not provided or empty
      if (!content || typeof content !== 'string') {
        return next();
      }

      // Check if user has roles that skip validation
      const userRoles = req.user?.roles || [];
      const shouldSkipValidation = finalConfig.skipValidationForRoles.some(role => 
        userRoles.includes(role)
      );

      if (shouldSkipValidation) {
        logger.info('Skipping markdown validation for privileged user', {
          userId: req.user?.id,
          roles: userRoles,
          contentLength: content.length,
        });
        return next();
      }

      // Quick content length check before processing
      if (content.length > finalConfig.maxContentLength) {
        throw new MarkdownContentTooLargeError(
          content.length,
          finalConfig.maxContentLength,
          { userId: req.user?.id, organizationId: req.org?.id }
        );
      }

      // Set up timeout for validation
      const validationPromise = validateContentWithTimeout(
        markdownService,
        content,
        finalConfig,
        finalConfig.timeoutMs
      );

      const validationResult = await validationPromise;

      // Store validation results in request for use by controllers
      req.validatedMarkdown = {
        content: validationResult.originalContent,
        sanitizedContent: validationResult.sanitizedContent,
        wordCount: validationResult.wordCount,
        estimatedReadingTime: validationResult.estimatedReadingTime,
        warnings: validationResult.warnings,
      };

      // Log validation success
      logger.info('Markdown content validated successfully', {
        userId: req.user?.id,
        organizationId: req.org?.id,
        contentLength: content.length,
        wordCount: validationResult.wordCount,
        warningCount: validationResult.warnings.length,
        sanitized: validationResult.sanitizedContent !== validationResult.originalContent,
      });

      next();
    } catch (error) {
      handleMarkdownValidationError(error, req, res, next);
    }
  };
}

/**
 * Validates markdown content with timeout protection
 */
async function validateContentWithTimeout(
  markdownService: MarkdownProcessingService,
  content: string,
  config: Required<MarkdownValidationConfig>,
  timeoutMs: number
): Promise<{
  originalContent: string;
  sanitizedContent: string;
  wordCount: number;
  estimatedReadingTime: number;
  warnings: string[];
}> {
  const validationOptions: MarkdownProcessingOptions = {
    maxContentLength: config.maxContentLength,
    maxWordCount: config.maxWordCount,
    strictMode: config.strictMode,
    allowExternalLinks: config.allowExternalLinks,
    maxLinkCount: config.maxLinkCount,
    maxImageCount: config.maxImageCount,
    sanitizeHtml: true,
  };

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Validation timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Race validation against timeout
  const validationPromise = (async () => {
    // Step 1: Validate content
    const validation = await markdownService.validateContent(content, validationOptions);
    
    if (!validation.isValid) {
      throw new MarkdownValidationError(
        'Markdown content validation failed',
        validation.errors,
        validation.warnings,
        { contentLength: content.length }
      );
    }

    // Step 2: Check for security violations
    const securityViolations = validation.warnings.filter(warning => 
      warning.includes('XSS') || 
      warning.includes('dangerous') || 
      warning.includes('suspicious') ||
      warning.includes('security')
    );

    if (securityViolations.length > 0 && config.strictMode) {
      throw new MarkdownSecurityError(
        'Content contains security violations',
        securityViolations,
        content,
        { strictMode: true }
      );
    }

    // Step 3: Sanitize content
    const sanitizedContent = markdownService.sanitizeContent(content, validationOptions);

    return {
      originalContent: content,
      sanitizedContent,
      wordCount: validation.wordCount,
      estimatedReadingTime: validation.estimatedReadingTime,
      warnings: validation.warnings,
    };
  })();

  try {
    return await Promise.race([validationPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      const { MarkdownProcessingTimeoutError } = await import('../errors/markdown_errors');
      throw new MarkdownProcessingTimeoutError('validation', timeoutMs, {
        contentLength: content.length,
      });
    }
    throw error;
  }
}

/**
 * Handles markdown validation errors and sends appropriate responses
 */
function handleMarkdownValidationError(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error with context
  logger.error('Markdown validation error', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    organizationId: req.org?.id,
    contentLength: req.body?.content?.length || 0,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Handle specific markdown errors
  if (isMarkdownError(error)) {
    const userFriendlyMessage = createUserFriendlyErrorMessage(error);
    
    const errorResponse = {
      success: false,
      error: userFriendlyMessage,
      code: error.code,
      details: {
        technical_message: error.message,
        ...(error instanceof MarkdownValidationError && {
          validation_errors: error.errors,
          validation_warnings: error.warnings,
        }),
        ...(error instanceof MarkdownSecurityError && {
          security_violations: error.securityViolations,
        }),
        ...(error instanceof MarkdownContentTooLargeError && {
          content_length: error.contentLength,
          max_length: error.maxLength,
        }),
      },
    };

    return res.status(error.statusCode).json(errorResponse);
  }

  // Handle generic validation errors
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    return res.status(400).json({
      success: false,
      error: 'Content validation failed. Please check your input and try again.',
      code: 'VALIDATION_ERROR',
      details: {
        technical_message: error.message,
      },
    });
  }

  // Handle timeout errors
  if (error.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      error: 'Content processing timed out. Please try again with simpler content.',
      code: 'PROCESSING_TIMEOUT',
      details: {
        technical_message: error.message,
      },
    });
  }

  // Pass other errors to the next error handler
  next(error);
}

/**
 * Middleware to validate markdown content in specific request fields
 */
export function validateMarkdownField(fieldName: string, config: MarkdownValidationConfig = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Temporarily move the field to 'content' for validation
    const originalContent = req.body.content;
    const fieldContent = req.body[fieldName];
    
    if (fieldContent) {
      req.body.content = fieldContent;
    }

    const middleware = validateMarkdownContent(config);
    
    middleware(req, res, (error) => {
      // Restore original content
      req.body.content = originalContent;
      
      if (error) {
        return next(error);
      }
      
      // Move validated content back to original field
      if (req.validatedMarkdown && fieldContent) {
        req.body[fieldName] = req.validatedMarkdown.sanitizedContent;
      }
      
      next();
    });
  };
}

/**
 * Middleware to validate multiple markdown fields
 */
export function validateMarkdownFields(
  fields: Array<{ name: string; config?: MarkdownValidationConfig }>,
  globalConfig: MarkdownValidationConfig = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const markdownService = new MarkdownProcessingService();
      const validationResults: Record<string, any> = {};

      for (const field of fields) {
        const fieldContent = req.body[field.name];
        
        if (fieldContent && typeof fieldContent === 'string') {
          const fieldConfig = { ...globalConfig, ...field.config };
          
          const validationOptions: MarkdownProcessingOptions = {
            maxContentLength: fieldConfig.maxContentLength || 1000000,
            maxWordCount: fieldConfig.maxWordCount || 100000,
            strictMode: fieldConfig.strictMode || false,
            allowExternalLinks: fieldConfig.allowExternalLinks !== false,
            maxLinkCount: fieldConfig.maxLinkCount || 100,
            maxImageCount: fieldConfig.maxImageCount || 50,
            sanitizeHtml: true,
          };

          const validation = await markdownService.validateContent(fieldContent, validationOptions);
          
          if (!validation.isValid) {
            throw new MarkdownValidationError(
              `Validation failed for field '${field.name}'`,
              validation.errors,
              validation.warnings,
              { field: field.name }
            );
          }

          const sanitizedContent = markdownService.sanitizeContent(fieldContent, validationOptions);
          
          // Update the field with sanitized content
          req.body[field.name] = sanitizedContent;
          
          // Store validation results
          validationResults[field.name] = {
            wordCount: validation.wordCount,
            estimatedReadingTime: validation.estimatedReadingTime,
            warnings: validation.warnings,
          };
        }
      }

      // Store all validation results
      (req as any).markdownValidationResults = validationResults;

      next();
    } catch (error) {
      handleMarkdownValidationError(error, req, res, next);
    }
  };
}

/**
 * Type declaration for requests with validated markdown
 */
declare global {
  namespace Express {
    interface Request {
      validatedMarkdown?: {
        content: string;
        sanitizedContent: string;
        wordCount: number;
        estimatedReadingTime: number;
        warnings: string[];
      };
      markdownValidationResults?: Record<string, {
        wordCount: number;
        estimatedReadingTime: number;
        warnings: string[];
      }>;
    }
  }
}

export type { ValidatedMarkdownRequest };