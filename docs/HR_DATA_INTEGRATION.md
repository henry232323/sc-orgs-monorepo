# HR Data Integration Guide

This document provides comprehensive guidance for integrating with the HR Management System's data layer, including best practices, patterns, and API usage examples.

## Overview

The HR Management System uses a modern data integration approach with:
- **RTK Query** for efficient data fetching and caching
- **Real-time updates** through cache invalidation
- **Type-safe APIs** with TypeScript interfaces
- **Optimistic updates** for better user experience
- **Error handling** with graceful degradation

## Architecture Patterns

### Data Flow Architecture

```
Frontend Components
       ↓
RTK Query Hooks
       ↓
API Slice (RTK Query)
       ↓
Backend Controllers
       ↓
Service Layer
       ↓
Model Layer
       ↓
Database
```

### Key Principles

1. **Single Source of Truth**: All data flows through RTK Query cache
2. **Optimistic Updates**: UI updates immediately, syncs with backend
3. **Error Boundaries**: Graceful error handling at component level
4. **Loading States**: Consistent loading indicators across components
5. **Cache Invalidation**: Automatic data refresh when related data changes

## RTK Query Integration Patterns

### 1. Basic Query Hook Usage

```typescript
// ✅ Correct: Use RTK Query hooks for data fetching
const HRDashboard: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { 
    data: activities, 
    isLoading, 
    error,
    refetch 
  } = useGetHRActivitiesQuery({
    organizationId,
    limit: 5
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!activities?.data.length) return <EmptyState />;

  return (
    <div>
      {activities.data.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
};

// ❌ Incorrect: Don't use hardcoded data
const HRDashboard: React.FC = () => {
  const activities = [
    { id: '1', title: 'John_Doe submitted application' }, // Don't do this
  ];
  // ...
};
```

### 2. Conditional Queries

```typescript
// ✅ Correct: Skip queries when data isn't needed
const DocumentAcknowledgmentStatus: React.FC<{ document: Document }> = ({ document }) => {
  const { data: acknowledgmentStatus } = useGetDocumentAcknowledmentStatusQuery({
    organizationId: document.organization_id,
    documentId: document.id,
  }, {
    skip: !document.requires_acknowledgment, // Skip if acknowledgment not required
  });

  if (!document.requires_acknowledgment) {
    return null;
  }

  return acknowledgmentStatus?.current_user_acknowledged ? (
    <AcknowledgedBadge />
  ) : (
    <PendingBadge />
  );
};
```

### 3. Cache Configuration

```typescript
// API Slice configuration with proper caching
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['HRActivity', 'SkillStatistics', 'DocumentAcknowledment'],
  endpoints: (builder) => ({
    getHRActivities: builder.query({
      query: ({ organizationId, page = 1, limit = 20 }) => 
        `/organizations/${organizationId}/hr-activities?page=${page}&limit=${limit}`,
      providesTags: (result, error, { organizationId }) => [
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: 'LIST' },
      ],
      keepUnusedDataFor: 300, // 5 minutes - adjust based on data freshness needs
    }),
    
    getSkillsStatistics: builder.query({
      query: ({ organizationId }) => 
        `/organizations/${organizationId}/skills/statistics`,
      providesTags: (result, error, { organizationId }) => [
        { type: 'SkillStatistics', id: organizationId },
      ],
      keepUnusedDataFor: 600, // 10 minutes - statistics change less frequently
    }),
  }),
});
```

### 4. Cache Invalidation Strategies

```typescript
// Mutation with proper cache invalidation
acknowledgeDocument: builder.mutation({
  query: ({ organizationId, documentId, ipAddress }) => ({
    url: `/organizations/${organizationId}/documents/${documentId}/acknowledgments`,
    method: 'POST',
    body: { ip_address: ipAddress },
  }),
  invalidatesTags: (result, error, { organizationId, documentId }) => [
    { type: 'DocumentAcknowledment', id: documentId },
    { type: 'HRActivity', id: organizationId }, // Also invalidate activities
  ],
  // Optimistic update
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
      patchResult.undo(); // Revert optimistic update on error
    }
  },
}),
```

## Component Integration Patterns

### 1. Data State Management

```typescript
// ✅ Correct: Comprehensive state handling
const SkillsMatrix: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { 
    data: skills, 
    isLoading: skillsLoading,
    error: skillsError,
    refetch: refetchSkills
  } = useGetSkillsQuery({ organizationId });
  
  const { 
    data: statistics,
    isLoading: statsLoading 
  } = useGetSkillsStatisticsQuery({ organizationId });

  // Handle loading states
  if (skillsLoading || statsLoading) {
    return <SkillsMatrixSkeleton />;
  }

  // Handle errors with retry option
  if (skillsError) {
    return (
      <ErrorState 
        error={skillsError} 
        onRetry={refetchSkills}
        title="Failed to Load Skills"
        description="Unable to fetch skills data. Please try again."
      />
    );
  }

  // Handle empty states
  if (!skills?.data.length) {
    return (
      <EmptyState
        icon={AcademicCapIcon}
        title="No Skills Found"
        description="No skills have been added to this organization yet."
        action={<Button onClick={() => navigate('/skills/add')}>Add Skill</Button>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skills.data.map(skill => {
        const stats = statistics?.[skill.id];
        return (
          <SkillCard 
            key={skill.id} 
            skill={skill}
            memberCount={stats?.total_members ?? 0}
            verificationRate={stats?.verification_rate ?? 0}
          />
        );
      })}
    </div>
  );
};
```

### 2. Error Boundary Integration

```typescript
// Component-level error boundary
const HRDashboardWithErrorBoundary: React.FC<Props> = (props) => (
  <HRErrorBoundary>
    <HRDashboard {...props} />
  </HRErrorBoundary>
);

// Custom HR Error Boundary
export class HRErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HR Component Error:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
          title="HR System Error"
          description="An unexpected error occurred in the HR system."
        />
      );
    }

    return this.props.children;
  }
}
```

### 3. Performance Optimization

```typescript
// Memoized components for performance
const SkillCard = React.memo<{
  skill: Skill;
  memberCount: number;
  verificationRate: number;
}>(({ skill, memberCount, verificationRate }) => {
  return (
    <Paper variant="glass-subtle" size="lg" interactive>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-primary mb-2">
          {skill.name}
        </h3>
        <p className="text-sm text-secondary mb-4">
          {skill.description}
        </p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <StatSmall className="text-accent-blue">
              {memberCount}
            </StatSmall>
            <ComponentSubtitle className="text-tertiary text-xs">
              Members
            </ComponentSubtitle>
          </div>
          <div>
            <StatSmall className="text-success">
              {(verificationRate * 100).toFixed(0)}%
            </StatSmall>
            <ComponentSubtitle className="text-tertiary text-xs">
              Verified
            </ComponentSubtitle>
          </div>
        </div>
      </div>
    </Paper>
  );
});
```

## Data Transformation Patterns

### 1. Date Formatting

```typescript
// Utility for consistent date formatting
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

// Usage in components
const ActivityItem: React.FC<{ activity: HRActivity }> = ({ activity }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-primary">
        {activity.title}
      </h4>
      <p className="text-sm text-secondary">
        {activity.description}
      </p>
      <p className="text-xs text-tertiary mt-1">
        {formatRelativeTime(activity.created_at)}
      </p>
    </div>
  </div>
);
```

### 2. Statistics Calculations

```typescript
// Utility for statistics formatting
export const formatStatistics = {
  percentage: (value: number): string => `${(value * 100).toFixed(0)}%`,
  count: (value: number): string => value.toLocaleString(),
  rate: (numerator: number, denominator: number): number => 
    denominator > 0 ? numerator / denominator : 0,
};

// Usage
const stats = statistics?.[skill.id];
const verificationPercentage = formatStatistics.percentage(stats?.verification_rate ?? 0);
const memberCount = formatStatistics.count(stats?.total_members ?? 0);
```

## Testing Patterns

### 1. RTK Query Hook Testing

```typescript
// Mock RTK Query hooks for testing
const mockUseGetHRActivitiesQuery = jest.fn();
jest.mock('../services/apiSlice', () => ({
  useGetHRActivitiesQuery: mockUseGetHRActivitiesQuery,
}));

describe('HRDashboard', () => {
  beforeEach(() => {
    mockUseGetHRActivitiesQuery.mockReset();
  });

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
    
    // Ensure no dummy data is present
    expect(screen.queryByText('John_Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane_Smith')).not.toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseGetHRActivitiesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<HRDashboard organizationId="org_1" />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('handles error state with retry', () => {
    const mockRefetch = jest.fn();
    mockUseGetHRActivitiesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Network error' },
      refetch: mockRefetch,
    });

    render(<HRDashboard organizationId="org_1" />);
    
    expect(screen.getByText('Failed to Load Data')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });
});
```

### 2. Integration Testing

```typescript
// Integration test for complete data flow
describe('HR Data Integration', () => {
  it('displays real data from API', async () => {
    // Mock API responses
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
          total: 1,
          page: 1,
          limit: 20,
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
      expect(screen.getByText('Real user performed real action')).toBeInTheDocument();
    });

    // Verify no dummy data
    expect(screen.queryByText('John_Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane_Smith')).not.toBeInTheDocument();
  });
});
```

## Common Anti-Patterns to Avoid

### ❌ Don't Use Hardcoded Data

```typescript
// DON'T DO THIS
const activities = [
  { id: '1', title: 'John_Doe submitted application' },
  { id: '2', title: 'Jane_Smith completed onboarding' },
];

// DON'T DO THIS
const getAcknowledgmentStatus = () => {
  return Math.random() > 0.5 ? 'acknowledged' : 'pending';
};

// DON'T DO THIS
const memberCount = 0; // Hardcoded zero
```

### ❌ Don't Skip Error Handling

```typescript
// DON'T DO THIS
const { data } = useGetHRActivitiesQuery({ organizationId });
return (
  <div>
    {data.map(activity => <ActivityCard key={activity.id} activity={activity} />)}
  </div>
);
```

### ❌ Don't Ignore Loading States

```typescript
// DON'T DO THIS
const { data, isLoading } = useGetSkillsStatisticsQuery({ organizationId });
return (
  <div>
    {data && Object.entries(data).map(([skillId, stats]) => (
      <SkillCard key={skillId} stats={stats} />
    ))}
  </div>
);
```

## Performance Best Practices

### 1. Cache Configuration

- **Short-lived data** (activities): 5 minutes (`keepUnusedDataFor: 300`)
- **Medium-lived data** (statistics): 10 minutes (`keepUnusedDataFor: 600`)
- **Long-lived data** (analytics): 15 minutes (`keepUnusedDataFor: 900`)

### 2. Selective Invalidation

Use specific tags for targeted cache invalidation:

```typescript
// Good: Specific invalidation
invalidatesTags: [
  { type: 'HRActivity', id: organizationId },
  { type: 'SkillStatistics', id: skillId },
]

// Avoid: Broad invalidation
invalidatesTags: ['HRActivity', 'SkillStatistics'] // Invalidates everything
```

### 3. Conditional Queries

Skip unnecessary queries:

```typescript
const { data } = useGetDocumentAcknowledmentStatusQuery(
  { organizationId, documentId },
  { skip: !document.requires_acknowledgment }
);
```

## Migration Checklist

When migrating from dummy data to real API integration:

- [ ] Replace hardcoded arrays with RTK Query hooks
- [ ] Remove `Math.random()` simulations
- [ ] Add proper loading states
- [ ] Implement error handling with retry
- [ ] Add empty state handling
- [ ] Configure appropriate cache timing
- [ ] Set up cache invalidation tags
- [ ] Add TypeScript interfaces
- [ ] Write comprehensive tests
- [ ] Update component documentation

## Troubleshooting

### Common Issues

1. **Data not updating**: Check cache invalidation tags
2. **Infinite loading**: Verify API endpoint and query parameters
3. **Type errors**: Ensure TypeScript interfaces match API responses
4. **Performance issues**: Review cache configuration and component memoization
5. **Stale data**: Check `keepUnusedDataFor` settings

### Debug Tools

- Redux DevTools for RTK Query state inspection
- Network tab for API request monitoring
- React DevTools Profiler for performance analysis

## Additional Resources

- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)