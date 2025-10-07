interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FieldErrors {
  [fieldName: string]: string;
}

/**
 * Extracts field-specific validation errors from API error response
 */
export const extractValidationErrors = (error: any): FieldErrors => {
  const fieldErrors: FieldErrors = {};

  // Handle RTK Query error format
  if (error?.data?.details && Array.isArray(error.data.details)) {
    error.data.details.forEach((detail: ValidationError) => {
      fieldErrors[detail.field] = detail.message;
    });
  }

  return fieldErrors;
};

/**
 * Gets a user-friendly error message from various error formats
 */
export const getErrorMessage = (error: any): string => {
  // RTK Query error with data
  if (error?.data?.error) {
    return error.data.error;
  }

  // RTK Query error with message
  if (error?.error) {
    return error.error;
  }

  // Standard error object
  if (error?.message) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

/**
 * Checks if an error contains validation errors
 */
export const hasValidationErrors = (error: any): boolean => {
  return error?.data?.details && Array.isArray(error.data.details);
};
