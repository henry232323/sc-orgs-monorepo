# HR Components Documentation

This document provides comprehensive documentation for all HR Management System components, their data dependencies, and API integrations.

## Overview

All HR components have been migrated from dummy data to real API integration using RTK Query. This ensures consistent, real-time data across the application with proper error handling and loading states.

## Component Architecture

### Data Flow Pattern

```
Component → RTK Query Hook → API Slice → Backend Controller → Service → Model → Database
```

### Common Patterns

All HR components follow these patterns:
- **RTK Query Integration**: Use `useGetXQuery` hooks for data fetching
- **Loading States**: Display skeleton loaders during data fetch
- **Error Handling**: Show error states with retry functionality
- **Empty States**: Handle cases where no data exists
- **Real-time Updates**: Automatic cache invalidation when data changes

## Core Components

### 1. HRDashboard

**File**: `frontend/src/components/hr/hr_dashboard.tsx`

**Purpose**: Main dashboard showing HR metrics, recent activities, and quick actions.

#### Data Dependencies

```typescript
// Analytics data for metrics
const { data: hrAnalytics, isLoading: analyticsLoading } = useGetHRAnalyticsQuery({
  organizationId,
});

// Recent HR activities
const { 
  data: recentActivities, 
  isLoading: activitiesLoading,
  error: activitiesError,
  refetch: refetchActivities
} = useGetHRActivitiesQuery({
  organizationId,
  limit: 5,
});
```

#### Key Features

- **Real Metrics**: Displays actual application counts, onboarding progress, performance reviews, and skill statistics
- **Activity Feed**: Shows real HR activities with proper timestamps and user information
- **Permission-based UI**: Adapts interface based on user permissions
- **Error Recovery**: Comprehensive error handling with retry mechanisms

#### API Endpoints Used

- `GET /api/organizations/{id}/hr-analytics` - HR metrics and statistics
- `GET /api/organizations/{id}/hr-activities` - Recent HR activities

#### State Management

```typescript
// Loading states
if (activitiesLoading) return <LoadingState />;

// Error states with retry
if (activitiesError) return (
  <ErrorState 
    error={activitiesError} 
    onRetry={refetchActivities}
    title="Failed to Load Activities"
  />
);

// Empty states
if (!recentActivities?.data.length) return (
  <EmptyState
    title="No Recent Activity"
    description="HR activities will appear here as they occur."
  />
);
```

### 2. SkillsMatrix

**File**: `frontend/src/components/hr/skills_matrix.tsx`

**Purpose**: Comprehensive skills management with real statistics and member tracking.

#### Data Dependencies

```typescript
// Skills data with pagination and filtering
const { 
  data: skillsData, 
  isLoading: skillsLoading, 
  error: skillsError,
  refetch: refetchSkills
} = useGetSkillsQuery({
  organizationId,
  page,
  limit: 20,
  filters,
});

// Skills analytics and statistics
const { 
  data: analyticsData,
  isLoading: analyticsLoading,
  error: analyticsError
} = useGetSkillsAnalyticsQuery({
  organizationId,
});

// Enhanced statistics with retry capability
const {
  data: skillsStatistics,
  isLoading: statisticsLoading,
  error: statisticsError,
  retry: retryStatistics,
  isRetrying: statisticsRetrying,
  canRetry: canRetryStatistics
} = useSkillsStatisticsWithRetry({
  organizationId,
});
```

#### Key Features

- **Real Statistics**: Shows actual member counts and verification rates for each skill
- **Category Organization**: Groups skills by categories (pilot, engineer, medic, etc.)
- **Skill Gaps Analysis**: Displays real skill gap data from analytics
- **Event Integration**: Shows skills demonstrated in recent events
- **Enhanced Error Handling**: Retry mechanisms for statistics loading

#### API Endpoints Used

- `GET /api/organizations/{id}/skills` - Skills data with pagination
- `GET /api/organizations/{id}/skills/statistics` - Skills statistics
- `GET /api/organizations/{id}/skills/analytics` - Skills analytics and gaps
- `GET /api/organizations/{id}/hr-events/analytics` - Event-based skill development

#### Statistics Display

```typescript
// Real statistics rendering
<div className='grid grid-cols-2 gap-4 text-center'>
  <div>
    <StatSmall className='text-accent-blue'>
      {statisticsLoading ? (
        <div className="animate-pulse bg-white/10 h-4 w-8 rounded mx-auto"></div>
      ) : statisticsError ? (
        '—'
      ) : (
        skillsStatistics?.[skill.id]?.total_members ?? 0
      )}
    </StatSmall>
    <ComponentSubtitle className='text-tertiary text-xs'>
      Members
    </ComponentSubtitle>
  </div>
  <div>
    <StatSmall className='text-success'>
      {statisticsLoading ? (
        <div className="animate-pulse bg-white/10 h-4 w-8 rounded mx-auto"></div>
      ) : statisticsError ? (
        '—'
      ) : (
        `${((skillsStatistics?.[skill.id]?.verification_rate ?? 0) * 100).toFixed(0)}%`
      )}
    </StatSmall>
    <ComponentSubtitle className='text-tertiary text-xs'>
      Verified
    </ComponentSubtitle>
  </div>
</div>
```

### 3. DocumentLibrary

**File**: `frontend/src/components/hr/document_library.tsx`

**Purpose**: Document management with real acknowledgment tracking.

#### Data Dependencies

```typescript
// Documents with filtering and search
const {
  data: documentsResponse,
  isLoading,
  error,
  refetch,
} = useGetDocumentsQuery(
  { organizationId: organizationId!, filters },
  { skip: !organizationId }
);

// Document acknowledgment status (per document)
const { 
  data: acknowledgmentStatus, 
  isLoading: isLoadingAcknowledgment, 
  error: acknowledgmentError, 
  refetch: refetchAcknowledgment 
} = useGetDocumentAcknowledmentStatusQuery({
  organizationId: organizationId!,
  documentId: doc.id,
}, {
  skip: !doc.requires_acknowledgment || !organizationId,
});
```

#### Key Features

- **Real Acknowledgments**: Shows actual acknowledgment status from backend
- **Folder Structure**: Organizes documents in hierarchical folders
- **Search and Filtering**: Real-time search with debouncing
- **Upload Management**: File upload with metadata
- **Permission-based Access**: Role-based document visibility

#### API Endpoints Used

- `GET /api/organizations/{id}/documents` - Document listing with filters
- `GET /api/organizations/{id}/documents/{docId}/acknowledgments` - Acknowledgment status
- `POST /api/organizations/{id}/documents/{docId}/acknowledgments` - Acknowledge document
- `POST /api/organizations/{id}/documents` - Upload document

#### Acknowledgment Status Implementation

```typescript
const getAcknowledgmentStatus = (doc: Document) => {
  const { 
    data: acknowledgmentStatus, 
    isLoading: isLoadingAcknowledgment, 
    error: acknowledgmentError, 
    refetch: refetchAcknowledgment 
  } = useDocumentAcknowledgmentStatus(doc);
  
  if (!doc.requires_acknowledgment) return null;

  if (isLoadingAcknowledgment) {
    return (
      <Chip variant="default" size="sm" className="text-tertiary">
        <ClockIcon className="w-3 h-3 animate-spin" />
        Loading...
      </Chip>
    );
  }

  if (acknowledgmentError) {
    return (
      <div className="flex items-center gap-1">
        <Chip variant="default" size="sm" className="text-error">
          <ClockIcon className="w-3 h-3" />
          Error
        </Chip>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e?.stopPropagation();
            refetchAcknowledgment();
          }}
          className="text-xs px-1 py-0.5 h-auto"
        >
          Retry
        </Button>
      </div>
    );
  }

  return acknowledgmentStatus?.current_user_acknowledged ? (
    <Chip variant="status" size="sm" className="text-success">
      <CheckCircleIcon className="w-3 h-3" />
      Acknowledged
    </Chip>
  ) : (
    <Chip variant="default" size="sm" className="text-warning">
      <ClockIcon className="w-3 h-3" />
      Pending
    </Chip>
  );
};
```

### 4. ApplicationTracker

**File**: `frontend/src/components/hr/application_tracker.tsx`

**Purpose**: Track and manage job applications with real status updates.

#### Data Dependencies

```typescript
// Applications with filtering and pagination
const { 
  data: applicationsData, 
  isLoading, 
  error,
  refetch 
} = useGetApplicationsQuery({
  organizationId,
  page,
  limit: 20,
  filters,
});

// Application analytics
const { 
  data: analyticsData 
} = useGetApplicationAnalyticsQuery({
  organizationId,
});
```

#### Key Features

- **Real Application Data**: Shows actual applications with current status
- **Status Management**: Update application status with real-time UI updates
- **Analytics Integration**: Display application metrics and trends
- **Filtering and Search**: Advanced filtering by status, position, date range

### 5. PerformanceCenter

**File**: `frontend/src/components/hr/performance_center.tsx`

**Purpose**: Performance review management with real evaluation data.

#### Data Dependencies

```typescript
// Performance reviews
const { 
  data: reviewsData, 
  isLoading, 
  error 
} = useGetPerformanceReviewsQuery({
  organizationId,
  page,
  limit: 20,
  filters,
});

// Performance analytics
const { 
  data: performanceAnalytics 
} = useGetPerformanceAnalyticsQuery({
  organizationId,
});
```

#### Key Features

- **Real Review Data**: Shows actual performance reviews and ratings
- **Goal Tracking**: Track performance goals with real completion rates
- **Analytics Dashboard**: Performance trends and team comparisons
- **Review Scheduling**: Manage review cycles and notifications

### 6. OnboardingChecklist

**File**: `frontend/src/components/hr/onboarding_checklist.tsx`

**Purpose**: Track member onboarding progress with real task completion.

#### Data Dependencies

```typescript
// Onboarding data
const { 
  data: onboardingData, 
  isLoading, 
  error 
} = useGetOnboardingQuery({
  organizationId,
  page,
  limit: 20,
  filters,
});

// Onboarding analytics
const { 
  data: onboardingAnalytics 
} = useGetOnboardingAnalyticsQuery({
  organizationId,
});
```

#### Key Features

- **Real Progress Tracking**: Shows actual onboarding task completion
- **Overdue Alerts**: Highlight overdue onboarding items
- **Template Management**: Create and manage onboarding templates
- **Automated Workflows**: Trigger actions based on completion status

## Shared Components and Utilities

### Error Boundary

**File**: `frontend/src/components/hr/HRErrorBoundary.tsx`

Wraps HR components to catch and handle errors gracefully:

```typescript
<HRErrorBoundary 
  componentName="Skills Matrix"
  organizationId={organizationId}
  enableRetry={true}
>
  <SkillsMatrix organizationId={organizationId} />
</HRErrorBoundary>
```

### Data State Wrapper

**File**: `frontend/src/components/ui/states/DataStateWrapper.tsx`

Provides consistent loading, error, and empty states:

```typescript
<DataStateWrapper
  data={skillsData}
  isLoading={skillsLoading}
  error={skillsError}
  onRetry={() => refetchSkills()}
  isEmpty={(data) => !data?.data || data.data.length === 0}
  loadingProps={{
    title: 'Loading Skills Matrix',
    description: 'Fetching organization skills...',
    variant: 'card',
    skeletonCount: 6,
  }}
  errorProps={{
    title: 'Failed to Load Skills',
    description: 'Unable to fetch skills data.',
    showRetry: true,
  }}
  emptyProps={{
    title: 'No Skills Defined',
    description: 'Start building your skills matrix.',
    action: {
      label: 'Create First Skill',
      onClick: () => setShowCreateSkillModal(true),
    },
  }}
>
  {(skillsData) => (
    // Render skills data
  )}
</DataStateWrapper>
```

### Enhanced Query Hooks

**File**: `frontend/src/hooks/useHRQuery.ts`

Provides enhanced query capabilities with retry logic:

```typescript
export const useSkillsStatisticsWithRetry = (params: { organizationId: string }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const queryResult = useGetSkillsStatisticsQuery(params, {
    retry: (failureCount, error) => {
      return failureCount < 3 && error?.status !== 404;
    },
  });

  const retry = useCallback(async () => {
    if (retryCount >= 3) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await queryResult.refetch();
    } finally {
      setIsRetrying(false);
    }
  }, [queryResult, retryCount]);

  return {
    ...queryResult,
    retry,
    isRetrying,
    canRetry: retryCount < 3,
    retryCount,
  };
};
```

## Testing Patterns

### Component Testing

All HR components include comprehensive tests that verify real data integration:

```typescript
describe('HRDashboard', () => {
  it('displays real activity data', async () => {
    const mockActivities = [
      {
        id: 'act_1',
        title: 'Application Submitted',
        description: 'user123 submitted an application',
        created_at: '2024-01-06T10:00:00Z',
      },
    ];

    mockUseGetHRActivitiesQuery.mockReturnValue({
      data: { data: mockActivities },
      isLoading: false,
      error: null,
    });

    render(<HRDashboard organizationId="org_1" />);

    expect(screen.getByText('Application Submitted')).toBeInTheDocument();
    expect(screen.getByText('user123 submitted an application')).toBeInTheDocument();
    
    // Verify no dummy data is present
    expect(screen.queryByText('John_Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane_Smith')).not.toBeInTheDocument();
  });
});
```

### Integration Testing

Integration tests verify complete data flow from API to UI:

```typescript
describe('HR Data Integration', () => {
  it('displays real data from API', async () => {
    server.use(
      rest.get('/api/organizations/:orgId/hr-activities', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          data: [
            {
              id: 'act_1',
              title: 'Real Activity',
              description: 'Real user performed real action',
              created_at: '2024-01-06T10:00:00Z',
            },
          ],
        }));
      })
    );

    render(
      <Provider store={store}>
        <HRDashboard organizationId="org_1" />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Real Activity')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

### Caching Strategy

Each component uses appropriate cache timing:

- **HR Activities**: 5 minutes (`keepUnusedDataFor: 300`)
- **Skills Statistics**: 10 minutes (`keepUnusedDataFor: 600`)
- **Analytics Data**: 15 minutes (`keepUnusedDataFor: 900`)

### Selective Invalidation

Components use specific cache tags for targeted updates:

```typescript
// When a skill is verified, invalidate related caches
invalidatesTags: [
  { type: 'HRActivity', id: organizationId },
  { type: 'SkillStatistics', id: skillId },
  { type: 'Skill', id: skillId },
]
```

### Optimistic Updates

Components implement optimistic updates for better UX:

```typescript
// Optimistically update acknowledgment status
onQueryStarted: async ({ organizationId, documentId }, { dispatch, queryFulfilled }) => {
  const patchResult = dispatch(
    apiSlice.util.updateQueryData('getDocumentAcknowledmentStatus', 
      { organizationId, documentId }, 
      (draft) => {
        draft.current_user_acknowledged = true;
        draft.current_user_acknowledged_at = new Date().toISOString();
      }
    )
  );
  
  try {
    await queryFulfilled;
  } catch {
    patchResult.undo(); // Revert on error
  }
},
```

## Migration Checklist

When working with HR components, ensure:

- [ ] No hardcoded data arrays or objects
- [ ] No `Math.random()` simulations
- [ ] Proper RTK Query hook usage
- [ ] Loading states implemented
- [ ] Error handling with retry
- [ ] Empty states handled
- [ ] Cache configuration appropriate
- [ ] TypeScript interfaces match API
- [ ] Tests verify real data usage
- [ ] No references to "John_Doe" or "Jane_Smith"

## Common Issues and Solutions

### Issue: Data Not Loading

**Symptoms**: Components show loading state indefinitely
**Solution**: Check API endpoint URLs and query parameters

### Issue: Stale Data

**Symptoms**: Data doesn't update after changes
**Solution**: Verify cache invalidation tags are correct

### Issue: Type Errors

**Symptoms**: TypeScript errors about data structure
**Solution**: Ensure interfaces match actual API responses

### Issue: Performance Problems

**Symptoms**: Slow loading or excessive API calls
**Solution**: Review cache configuration and component memoization

## Future Enhancements

### Real-time Updates

Consider implementing WebSocket connections for real-time updates:

```typescript
// Future: WebSocket integration
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:3001/hr/${organizationId}`);
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // Invalidate relevant caches based on update type
    dispatch(apiSlice.util.invalidateTags([update.cacheTag]));
  };
  
  return () => ws.close();
}, [organizationId]);
```

### Advanced Analytics

Enhanced analytics with more detailed insights:

- Skill development trends over time
- Performance correlation analysis
- Predictive onboarding success metrics
- Document engagement analytics

### Workflow Automation

Automated workflows based on HR events:

- Auto-assign onboarding tasks
- Trigger performance reviews
- Skill verification reminders
- Document acknowledgment follow-ups