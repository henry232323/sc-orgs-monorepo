import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice, useGetHRActivitiesQuery, useGetSkillsStatisticsQuery, useGetDocumentAcknowledmentStatusQuery } from '../apiSlice';

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      api: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createMockStore()}>{children}</Provider>
);

describe('HR Endpoints Integration', () => {
  it('should initialize useGetHRActivitiesQuery hook correctly', () => {
    const { result } = renderHook(
      () => useGetHRActivitiesQuery({
        organizationId: 'test-org-id',
        page: 1,
        limit: 10,
      }),
      { wrapper }
    );

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should initialize useGetSkillsStatisticsQuery hook correctly', () => {
    const { result } = renderHook(
      () => useGetSkillsStatisticsQuery({
        organizationId: 'test-org-id',
      }),
      { wrapper }
    );

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should initialize useGetDocumentAcknowledmentStatusQuery hook correctly', () => {
    const { result } = renderHook(
      () => useGetDocumentAcknowledmentStatusQuery({
        organizationId: 'test-org-id',
        documentId: 'test-doc-id',
      }),
      { wrapper }
    );

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle query parameters correctly for HR activities', () => {
    const { result } = renderHook(
      () => useGetHRActivitiesQuery({
        organizationId: 'test-org-id',
        page: 2,
        limit: 5,
        activity_types: ['application_submitted', 'skill_verified'],
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      }),
      { wrapper }
    );

    // The hook should be initialized without errors
    expect(result.current.isLoading).toBeDefined();
  });

  it('should handle optional parameters correctly', () => {
    const { result: hrResult } = renderHook(
      () => useGetHRActivitiesQuery({
        organizationId: 'test-org-id',
        // Only required params
      }),
      { wrapper }
    );

    const { result: skillsResult } = renderHook(
      () => useGetSkillsStatisticsQuery({
        organizationId: 'test-org-id',
      }),
      { wrapper }
    );

    const { result: docResult } = renderHook(
      () => useGetDocumentAcknowledmentStatusQuery({
        organizationId: 'test-org-id',
        documentId: 'test-doc-id',
      }),
      { wrapper }
    );

    expect(hrResult.current.isLoading).toBeDefined();
    expect(skillsResult.current.isLoading).toBeDefined();
    expect(docResult.current.isLoading).toBeDefined();
  });
});