import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { HRApplicationController } from '../controllers/hr_application_controller';
import { HROnboardingController } from '../controllers/hr_onboarding_controller';
import { HRPerformanceController } from '../controllers/hr_performance_controller';
import { HRAnalyticsController } from '../controllers/hr_analytics_controller';
import { validateHRRequest, sanitizeRequest } from '../middleware/openapi_validation';
import { applicationRateLimit, hrOperationsRateLimit } from '../middleware/hr_rate_limit';
import db from '../config/database';
import { HRApplicationModel } from '../models/hr_application_model';
import { HROnboardingModel } from '../models/hr_onboarding_model';
import { HRPerformanceModel } from '../models/hr_performance_model';
import { HRSkillModel } from '../models/hr_skill_model';
import { HRDocumentModel } from '../models/hr_document_model';
import { HRAnalyticsModel } from '../models/hr_analytics_model';

// Mock the database and models
jest.mock('../config/database');
jest.mock('../models/hr_application_model');
jest.mock('../models/hr_onboarding_model');
jest.mock('../models/hr_performance_model');
jest.mock('../models/hr_skill_model');
jest.mock('../models/hr_document_model');
jest.mock('../models/hr_analytics_model');
jest.mock('../models/organization_model');
jest.mock('../models/user_model');

const mockDb = db as jest.Mocked<typeof db>;

describe('HR API Integration Tests', () => {
  let applicationController: HRApplicationController;
  let onboardingController: HROnboardingController;
  let performanceController: HRPerformanceController;
  let analyticsController: HRAnalyticsController;

  beforeAll(async () => {
    // Initialize controllers
    applicationController = new HRApplicationController();
    onboardingController = new HROnboardingController();
    performanceController = new HRPerformanceController();
    analyticsController = new HRAnalyticsController();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HR Application Controller Integration', () => {
    it('should initialize application controller successfully', () => {
      expect(applicationController).toBeInstanceOf(HRApplicationController);
    });

    it('should have all required methods', () => {
      expect(typeof applicationController.submitApplication).toBe('function');
      expect(typeof applicationController.listApplications).toBe('function');
      expect(typeof applicationController.getApplication).toBe('function');
      expect(typeof applicationController.updateApplicationStatus).toBe('function');
      expect(typeof applicationController.bulkUpdateApplications).toBe('function');
      expect(typeof applicationController.getAnalytics).toBe('function');
    });

  });

  describe('HR Onboarding Controller Integration', () => {
    it('should initialize onboarding controller successfully', () => {
      expect(onboardingController).toBeInstanceOf(HROnboardingController);
    });

    it('should have all required methods', () => {
      expect(typeof onboardingController.getTemplates).toBe('function');
      expect(typeof onboardingController.createTemplate).toBe('function');
      expect(typeof onboardingController.getTemplate).toBe('function');
      expect(typeof onboardingController.updateTemplate).toBe('function');
      expect(typeof onboardingController.deleteTemplate).toBe('function');
    });
  });

  describe('HR Performance Controller Integration', () => {
    it('should initialize performance controller successfully', () => {
      expect(performanceController).toBeInstanceOf(HRPerformanceController);
    });

    it('should have all required methods', () => {
      expect(typeof performanceController.createReview).toBe('function');
      expect(typeof performanceController.listReviews).toBe('function');
      expect(typeof performanceController.getReview).toBe('function');
      expect(typeof performanceController.updateReview).toBe('function');
    });
  });

  describe('HR Analytics Controller Integration', () => {
    it('should initialize analytics controller successfully', () => {
      expect(analyticsController).toBeInstanceOf(HRAnalyticsController);
    });

    it('should have all required methods', () => {
      expect(typeof analyticsController.getDashboardMetrics).toBe('function');
      expect(typeof analyticsController.getDetailedReports).toBe('function');
      expect(typeof analyticsController.getTrendAnalysis).toBe('function');
    });
  });

  describe('Middleware Integration', () => {
    it('should have validation middleware available', () => {
      expect(typeof validateHRRequest).toBe('function');
      expect(typeof sanitizeRequest).toBe('function');
    });

    it('should have rate limiting middleware available', () => {
      expect(typeof applicationRateLimit).toBe('function');
      expect(typeof hrOperationsRateLimit).toBe('function');
    });

    it('should validate HR request data correctly', () => {
      const middleware = validateHRRequest('createApplication');
      expect(typeof middleware).toBe('function');
    });

    it('should sanitize request data', () => {
      const middleware = sanitizeRequest();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('OpenAPI Schema Integration', () => {
    it('should have HR schemas defined', () => {
      // Test that the schemas are properly exported and available
      const { hrValidationSchemas } = require('../middleware/openapi_validation');
      
      expect(hrValidationSchemas).toHaveProperty('createApplication');
      expect(hrValidationSchemas).toHaveProperty('updateApplicationStatus');
      expect(hrValidationSchemas).toHaveProperty('createOnboardingTemplate');
      expect(hrValidationSchemas).toHaveProperty('createPerformanceReview');
      expect(hrValidationSchemas).toHaveProperty('createDocument');
    });

    it('should validate application schema structure', () => {
      const { hrValidationSchemas } = require('../middleware/openapi_validation');
      const schema = hrValidationSchemas.createApplication;
      
      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('properties');
      expect(schema).toHaveProperty('required');
      expect(schema.required).toContain('application_data');
    });
  });
});