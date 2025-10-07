import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: any;
  message: string;
}

interface OpenAPIValidationError extends Error {
  validationErrors?: ValidationError[];
  statusCode?: number;
  expose?: boolean;
}

export const errorHandler = (
  err: OpenAPIValidationError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    validationErrors: err.validationErrors,
  });

  // Handle OpenAPI validation errors
  if (err.validationErrors && Array.isArray(err.validationErrors)) {
    const formattedErrors = err.validationErrors.map((validationError: ValidationError) => {
      // Extract field name from instancePath (e.g., '/body/website' -> 'website')
      const fieldPath = validationError.instancePath.replace('/body/', '').replace('/', '');
      const fieldName = fieldPath || 'unknown';
      
      return {
        field: fieldName,
        message: validationError.message,
        code: validationError.keyword,
      };
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  // Handle other known errors with status codes
  const statusCode = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
