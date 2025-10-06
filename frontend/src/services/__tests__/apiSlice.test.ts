import { describe, it, expect } from 'vitest';
import { apiSlice } from '../apiSlice';

describe('API Slice - HR Endpoints', () => {
  it('should have getHRActivities endpoint', () => {
    expect(apiSlice.endpoints.getHRActivities).toBeDefined();
    expect(apiSlice.endpoints.getHRActivities.name).toBe('getHRActivities');
  });

  it('should have getSkillsStatistics endpoint', () => {
    expect(apiSlice.endpoints.getSkillsStatistics).toBeDefined();
    expect(apiSlice.endpoints.getSkillsStatistics.name).toBe('getSkillsStatistics');
  });

  it('should have getDocumentAcknowledmentStatus endpoint', () => {
    expect(apiSlice.endpoints.getDocumentAcknowledmentStatus).toBeDefined();
    expect(apiSlice.endpoints.getDocumentAcknowledmentStatus.name).toBe('getDocumentAcknowledmentStatus');
  });

  it('should export the new hooks', () => {
    expect(apiSlice.useGetHRActivitiesQuery).toBeDefined();
    expect(apiSlice.useGetSkillsStatisticsQuery).toBeDefined();
    expect(apiSlice.useGetDocumentAcknowledmentStatusQuery).toBeDefined();
  });

  it('should have correct endpoint configurations', () => {
    // Just verify the endpoints are properly configured as query endpoints
    expect(typeof apiSlice.endpoints.getHRActivities.initiate).toBe('function');
    expect(typeof apiSlice.endpoints.getSkillsStatistics.initiate).toBe('function');
    expect(typeof apiSlice.endpoints.getDocumentAcknowledmentStatus.initiate).toBe('function');
  });
});