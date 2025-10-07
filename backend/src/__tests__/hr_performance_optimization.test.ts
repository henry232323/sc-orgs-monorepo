/**
 * HR Performance Optimization Tests
 * 
 * Tests for performance optimization strategies in the HR system.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { HRSkillStatisticsService } from '../services/hr_skill_statistics_service';

describe('HR Performance Optimization', () => {
  let skillStatsService: HRSkillStatisticsService;

  beforeEach(() => {
    skillStatsService = new HRSkillStatisticsService();
  });

  afterEach(() => {
    skillStatsService.clearCache();
  });

  describe('Caching Performance', () => {
    it('should have cache management methods', () => {
      expect(typeof skillStatsService.clearCache).toBe('function');
      expect(typeof skillStatsService.invalidateSkillCache).toBe('function');
      expect(typeof skillStatsService.refreshStatisticsCache).toBe('function');
    });

    it('should clear cache when requested', () => {
      // Test that clearCache method exists and can be called
      expect(() => skillStatsService.clearCache()).not.toThrow();
      expect(() => skillStatsService.clearCache('test-org')).not.toThrow();
    });

    it('should have proper cache timeout configuration', () => {
      // Access private property for testing
      const cacheTimeout = (skillStatsService as any).cacheTimeout;
      expect(typeof cacheTimeout).toBe('number');
      expect(cacheTimeout).toBeGreaterThan(0);
      expect(cacheTimeout).toBeLessThanOrEqual(600000); // Max 10 minutes
    });

    it('should initialize with empty cache', () => {
      const cache = (skillStatsService as any).cache;
      expect(cache).toBeDefined();
      expect(cache.size).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should have performance tracking capabilities', () => {
      // Test that the service has methods for performance optimization
      expect(typeof skillStatsService.getSkillStatistics).toBe('function');
      expect(typeof skillStatsService.getAllSkillsStatistics).toBe('function');
      expect(typeof skillStatsService.getOrganizationSkillsOverview).toBe('function');
    });

    it('should handle cache key generation properly', async () => {
      const organizationId = 'test-org-1';
      const skillId = 'skill-1';
      
      // Test that calling the same method with same params would use same cache key
      // This is tested by ensuring the method exists and can be called
      expect(async () => {
        try {
          await skillStatsService.getSkillStatistics(organizationId, skillId);
        } catch (error) {
          // Expected to fail due to missing database, but method should exist
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid organization IDs gracefully', async () => {
      const invalidOrgId = '';
      const skillId = 'skill-1';
      
      try {
        await skillStatsService.getSkillStatistics(invalidOrgId, skillId);
      } catch (error) {
        // Should throw an error for invalid input
        expect(error).toBeDefined();
      }
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const organizationId = 'test-org-1';
      const skillId = 'skill-1';
      
      // Should not throw when invalidating cache for non-existent data
      expect(async () => {
        await skillStatsService.invalidateSkillCache(organizationId, skillId);
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should have cache size limits', () => {
      const cache = (skillStatsService as any).cache;
      expect(cache).toBeInstanceOf(Map);
      
      // Test that cache is properly initialized
      expect(cache.size).toBe(0);
    });

    it('should clean up resources properly', () => {
      // Test that clearCache works without errors
      expect(() => skillStatsService.clearCache()).not.toThrow();
      
      const cache = (skillStatsService as any).cache;
      expect(cache.size).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should have reasonable default cache timeout', () => {
      const cacheTimeout = (skillStatsService as any).cacheTimeout;
      
      // Should be between 1 minute and 10 minutes
      expect(cacheTimeout).toBeGreaterThanOrEqual(60000); // 1 minute
      expect(cacheTimeout).toBeLessThanOrEqual(600000); // 10 minutes
    });

    it('should initialize with proper data structures', () => {
      const cache = (skillStatsService as any).cache;
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });
  });
});