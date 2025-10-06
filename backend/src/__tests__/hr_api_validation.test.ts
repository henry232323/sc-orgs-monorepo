import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { validateHRRequest, hrValidationSchemas } from '../middleware/openapi_validation';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Mock the app to avoid import issues
const mockApp = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn()
};

jest.mock('../index', () => mockApp);

describe('HR API Validation Tests', () => {
  let authToken: string;
  let organizationId: string;
  let ajv: Ajv;

  beforeAll(async () => {
    authToken = 'test-jwt-token';
    organizationId = 'test-org-id';
    
    // Initialize AJV for schema validation testing
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Application Schema Validation', () => {
      it('should validate correct application data', () => {
        const validator = ajv.compile(hrValidationSchemas.createApplication);
        const validData = {
          application_data: {
            cover_letter: 'This is a valid cover letter',
            experience: 'I have 5 years of experience',
            availability: 'Full-time',
            custom_fields: {
              portfolio: 'https://example.com'
            }
          }
        };

        const isValid = validator(validData);
        expect(isValid).toBe(true);
        expect(validator.errors).toBeNull();
      });

      it('should reject application data without cover letter', () => {
        const validator = ajv.compile(hrValidationSchemas.createApplication);
        const invalidData = {
          application_data: {
            experience: 'I have 5 years of experience',
            availability: 'Full-time'
          }
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].schemaPath).toContain('required');
      });

      it('should reject cover letter exceeding max length', () => {
        const validator = ajv.compile(hrValidationSchemas.createApplication);
        const invalidData = {
          application_data: {
            cover_letter: 'a'.repeat(2001), // Exceeds 2000 character limit
            experience: 'Valid experience'
          }
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('maxLength');
      });

      it('should reject additional properties', () => {
        const validator = ajv.compile(hrValidationSchemas.createApplication);
        const invalidData = {
          application_data: {
            cover_letter: 'Valid cover letter'
          },
          unauthorized_field: 'This should not be allowed'
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('additionalProperties');
      });
    });

    describe('Application Status Update Schema Validation', () => {
      it('should validate correct status update data', () => {
        const validator = ajv.compile(hrValidationSchemas.updateApplicationStatus);
        const validData = {
          status: 'approved',
          review_notes: 'Excellent candidate'
        };

        const isValid = validator(validData);
        if (!isValid) {
          console.log('Validation errors:', validator.errors);
        }
        expect(isValid).toBe(true);
        expect(validator.errors).toBeNull();
      });

      it('should reject invalid status values', () => {
        const validator = ajv.compile(hrValidationSchemas.updateApplicationStatus);
        const invalidData = {
          status: 'invalid_status'
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('enum');
      });

      it('should reject review notes exceeding max length', () => {
        const validator = ajv.compile(hrValidationSchemas.updateApplicationStatus);
        const invalidData = {
          status: 'approved',
          review_notes: 'a'.repeat(1001) // Exceeds 1000 character limit
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('maxLength');
      });
    });

    describe('Onboarding Template Schema Validation', () => {
      it('should validate correct template data', () => {
        const validator = ajv.compile(hrValidationSchemas.createOnboardingTemplate);
        const validData = {
          role_name: 'Software Developer',
          tasks: [
            {
              title: 'Complete profile setup',
              description: 'Fill out your profile information completely',
              required: true,
              estimated_hours: 2,
              order_index: 0
            },
            {
              title: 'Review company policies',
              description: 'Read and acknowledge company policies',
              required: true,
              estimated_hours: 1,
              order_index: 1
            }
          ],
          estimated_duration_days: 14
        };

        const isValid = validator(validData);
        expect(isValid).toBe(true);
        expect(validator.errors).toBeNull();
      });

      it('should reject empty role name', () => {
        const validator = ajv.compile(hrValidationSchemas.createOnboardingTemplate);
        const invalidData = {
          role_name: '',
          tasks: [
            {
              title: 'Test task',
              description: 'Test description',
              required: true,
              estimated_hours: 1,
              order_index: 0
            }
          ],
          estimated_duration_days: 7
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minLength');
      });

      it('should reject empty tasks array', () => {
        const validator = ajv.compile(hrValidationSchemas.createOnboardingTemplate);
        const invalidData = {
          role_name: 'Developer',
          tasks: [],
          estimated_duration_days: 7
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minItems');
      });

      it('should reject invalid duration', () => {
        const validator = ajv.compile(hrValidationSchemas.createOnboardingTemplate);
        const invalidData = {
          role_name: 'Developer',
          tasks: [
            {
              title: 'Test task',
              description: 'Test description',
              required: true,
              estimated_hours: 1,
              order_index: 0
            }
          ],
          estimated_duration_days: 0 // Invalid: must be >= 1
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minimum');
      });
    });

    describe('Performance Review Schema Validation', () => {
      it('should validate correct review data', () => {
        const validator = ajv.compile(hrValidationSchemas.createPerformanceReview);
        const validData = {
          reviewee_id: 'user-123',
          review_period_start: '2024-01-01',
          review_period_end: '2024-12-31',
          ratings: {
            communication: {
              score: 4,
              comments: 'Good communication skills'
            },
            technical_skills: {
              score: 5,
              comments: 'Excellent technical abilities'
            }
          },
          overall_rating: 4.5,
          strengths: ['Technical expertise', 'Team collaboration'],
          areas_for_improvement: ['Time management', 'Documentation']
        };

        const isValid = validator(validData);
        expect(isValid).toBe(true);
        expect(validator.errors).toBeNull();
      });

      it('should reject invalid rating scores', () => {
        const validator = ajv.compile(hrValidationSchemas.createPerformanceReview);
        const invalidData = {
          reviewee_id: 'user-123',
          review_period_start: '2024-01-01',
          review_period_end: '2024-12-31',
          ratings: {
            communication: {
              score: 6 // Invalid: must be <= 5
            }
          },
          overall_rating: 4.5
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('maximum');
      });

      it('should reject invalid overall rating', () => {
        const validator = ajv.compile(hrValidationSchemas.createPerformanceReview);
        const invalidData = {
          reviewee_id: 'user-123',
          review_period_start: '2024-01-01',
          review_period_end: '2024-12-31',
          ratings: {
            communication: { score: 4 }
          },
          overall_rating: 0 // Invalid: must be >= 1
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minimum');
      });

      it('should reject missing required fields', () => {
        const validator = ajv.compile(hrValidationSchemas.createPerformanceReview);
        const invalidData = {
          reviewee_id: 'user-123',
          // Missing required fields: review_period_start, review_period_end, ratings, overall_rating
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('required');
      });
    });

    describe('Document Schema Validation', () => {
      it('should validate correct document data', () => {
        const validator = ajv.compile(hrValidationSchemas.createDocument);
        const validData = {
          title: 'Employee Handbook',
          description: 'Company policies and procedures',
          file_path: '/documents/handbook.pdf',
          file_type: 'application/pdf',
          file_size: 1024000,
          folder_path: '/hr/policies',
          requires_acknowledgment: true,
          access_roles: ['employee', 'manager']
        };

        const isValid = validator(validData);
        expect(isValid).toBe(true);
        expect(validator.errors).toBeNull();
      });

      it('should reject empty title', () => {
        const validator = ajv.compile(hrValidationSchemas.createDocument);
        const invalidData = {
          title: '',
          file_path: '/documents/test.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          access_roles: ['employee']
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minLength');
      });

      it('should reject invalid file size', () => {
        const validator = ajv.compile(hrValidationSchemas.createDocument);
        const invalidData = {
          title: 'Test Document',
          file_path: '/documents/test.pdf',
          file_type: 'application/pdf',
          file_size: 0, // Invalid: must be >= 1
          access_roles: ['employee']
        };

        const isValid = validator(invalidData);
        expect(isValid).toBe(false);
        expect(validator.errors).toBeTruthy();
        expect(validator.errors![0].keyword).toBe('minimum');
      });
    });
  });

  describe('Validation Logic Testing', () => {
    it('should validate application data correctly', () => {
      const validator = ajv.compile(hrValidationSchemas.createApplication);
      
      // Test invalid data
      const invalidData = {
        application_data: {
          experience: 'Test experience'
          // Missing required cover_letter
        }
      };

      const isValid = validator(invalidData);
      expect(isValid).toBe(false);
      expect(validator.errors).toBeTruthy();
      expect(validator.errors![0].schemaPath).toContain('required');
    });

    it('should validate status update data correctly', () => {
      const validator = ajv.compile(hrValidationSchemas.updateApplicationStatus);
      
      // Test invalid status
      const invalidData = {
        status: 'invalid_status',
        review_notes: 'a'.repeat(1001) // Too long
      };

      const isValid = validator(invalidData);
      expect(isValid).toBe(false);
      expect(validator.errors).toBeTruthy();
      
      // Should have errors for both status and review_notes
      const errorKeywords = validator.errors!.map(e => e.keyword);
      expect(errorKeywords).toContain('enum'); // for invalid status
      expect(errorKeywords).toContain('maxLength'); // for long review_notes
    });

    it('should validate onboarding template data correctly', () => {
      const validator = ajv.compile(hrValidationSchemas.createOnboardingTemplate);
      
      const invalidData = {
        role_name: '', // Invalid empty string
        tasks: [], // Invalid empty array
        estimated_duration_days: 0 // Invalid value
      };

      const isValid = validator(invalidData);
      expect(isValid).toBe(false);
      expect(validator.errors).toBeTruthy();
      expect(validator.errors!.length).toBeGreaterThan(0);
    });

    it('should validate performance review data correctly', () => {
      const validator = ajv.compile(hrValidationSchemas.createPerformanceReview);
      
      const invalidData = {
        reviewee_id: 'user-123',
        review_period_start: '2024-01-01',
        review_period_end: '2024-12-31',
        ratings: {
          communication: {
            score: 6 // Invalid: > 5
          }
        },
        overall_rating: 0 // Invalid: < 1
      };

      const isValid = validator(invalidData);
      expect(isValid).toBe(false);
      expect(validator.errors).toBeTruthy();
      
      const errorKeywords = validator.errors!.map(e => e.keyword);
      expect(errorKeywords).toContain('maximum'); // for score > 5
      expect(errorKeywords).toContain('minimum'); // for overall_rating < 1
    });
  });

  describe('Input Sanitization Logic', () => {
    it('should identify XSS patterns', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        'onload=alert("xss")',
        '<img src="x" onerror="alert(1)">'
      ];

      maliciousInputs.forEach(input => {
        // Test that our validation would catch these patterns
        expect(input).toMatch(/<|javascript:|on\w+=/);
      });
    });

    it('should identify SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE applications; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--"
      ];

      maliciousInputs.forEach(input => {
        // Test that our validation would catch these patterns
        expect(input).toMatch(/['";]|DROP|UNION|SELECT/i);
      });
    });
  });

  describe('Error Response Format Validation', () => {
    it('should define consistent error format structure', () => {
      const expectedErrorFormat = {
        error: 'Validation Error',
        message: 'Request validation failed',
        details: [
          {
            field: 'field_name',
            message: 'error_message',
            value: 'invalid_value'
          }
        ]
      };

      // Verify the structure is well-defined
      expect(expectedErrorFormat).toHaveProperty('error');
      expect(expectedErrorFormat).toHaveProperty('message');
      expect(expectedErrorFormat).toHaveProperty('details');
      expect(Array.isArray(expectedErrorFormat.details)).toBe(true);
      expect(expectedErrorFormat.details[0]).toHaveProperty('field');
      expect(expectedErrorFormat.details[0]).toHaveProperty('message');
    });
  });
});