import { HRAnalyticsModel, AlertThreshold } from '../models/hr_analytics_model';
import db from '../config/database';

// Mock the database
jest.mock('../config/database', () => {
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    del: jest.fn(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
  };
  
  return jest.fn(() => mockQuery);
});

const mockDb = db as jest.MockedFunction<typeof db>;

describe('HRAnalyticsModel', () => {
  let analyticsModel: HRAnalyticsModel;

  beforeEach(() => {
    analyticsModel = new HRAnalyticsModel();
    jest.clearAllMocks();
  });

  describe('calculateMetrics', () => {
    it('should have calculateMetrics method', () => {
      expect(typeof analyticsModel.calculateMetrics).toBe('function');
    });
  });

  describe('getTrendAnalysis', () => {
    it('should have getTrendAnalysis method', () => {
      expect(typeof analyticsModel.getTrendAnalysis).toBe('function');
    });
  });

  describe('getComparativeAnalysis', () => {
    it('should have getComparativeAnalysis method', () => {
      expect(typeof analyticsModel.getComparativeAnalysis).toBe('function');
    });
  });

  describe('checkAlerts', () => {
    it('should have checkAlerts method', () => {
      expect(typeof analyticsModel.checkAlerts).toBe('function');
    });
  });

  describe('cacheMetrics and getCachedMetrics', () => {
    it('should have cacheMetrics method', () => {
      expect(typeof analyticsModel.cacheMetrics).toBe('function');
    });

    it('should have getCachedMetrics method', () => {
      expect(typeof analyticsModel.getCachedMetrics).toBe('function');
    });
  });
});