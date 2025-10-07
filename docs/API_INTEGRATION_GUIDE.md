# API Integration Guide

This guide provides comprehensive information about integrating with the HR Management System APIs, including authentication, request/response formats, error handling, and best practices.

## Base URL and Authentication

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.company.com/api`

### Authentication

All API requests require authentication using JWT Bearer tokens:

```http
Authorization: Bearer <jwt_token>
```

**Example Request:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.company.com/api/organizations/123/hr-activities
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "details": {
      // Additional error context
    }
  }
}
```

## HR Activities API

### Get HR Activities

Retrieve paginated list of HR activities for an organization.

**Endpoint:** `GET /organizations/{organizationId}/hr-activities`

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `activity_types` (optional): Comma-separated activity types
- `date_from` (optional): Filter from date (ISO 8601)
- `date_to` (optional): Filter to date (ISO 8601)

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
     "https://api.company.com/api/organizations/123/hr-activities?page=1&limit=10&activity_types=application_submitted,skill_verified"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "act_123",
      "organization_id": "org_456",
      "activity_type": "application_submitted",
      "user_id": "user_789",
      "user_handle": "john.doe",
      "user_avatar_url": "https://example.com/avatar.jpg",
      "title": "Application Submitted",
      "description": "john.doe submitted an application for Software Engineer position",
      "metadata": {
        "application_id": "app_101",
        "position": "Software Engineer"
      },
      "created_at": "2024-01-06T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

**Activity Types:**
- `application_submitted` - New job application
- `application_status_changed` - Application status update
- `onboarding_completed` - Member completed onboarding
- `performance_review_submitted` - Performance review completed
- `skill_verified` - Skill verification completed
- `document_acknowledged` - Document acknowledgment

**Frontend Integration:**
```typescript
import { useGetHRActivitiesQuery } from '../services/apiSlice';

const HRDashboard = ({ organizationId }) => {
  const { data, isLoading, error } = useGetHRActivitiesQuery({
    organizationId,
    limit: 5,
    activity_types: ['application_submitted', 'skill_verified'],
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data?.data.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
};
```

## Skills Statistics API

### Get Organization Skills Statistics

Retrieve comprehensive statistics for all skills in an organization.

**Endpoint:** `GET /organizations/{organizationId}/skills/statistics`

**Example Request:**
```bash
curl -H "Authorization: Bearer <token>" \
     "https://api.company.com/api/organizations/123/skills/statistics"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "skill_123": {
      "skill_id": "skill_123",
      "total_members": 15,
      "verified_members": 12,
      "verification_rate": 0.8,
      "proficiency_breakdown": {
        "beginner": 3,
        "intermediate": 7,
        "advanced": 4,
        "expert": 1
      },
      "recent_verifications": 2,
      "last_updated": "2024-01-06T10:30:00Z"
    },
    "skill_456": {
      "skill_id": "skill_456",
      "total_members": 8,
      "verified_members": 6,
      "verification_rate": 0.75,
      "proficiency_breakdown": {
        "beginner": 2,
        "intermediate": 4,
        "advanced": 2,
        "expert": 0
      },
      "recent_verifications": 1,
      "last_updated": "2024-01-06T10:30:00Z"
    }
  }
}
```

### Get Individual Skill Statistics

Retrieve statistics for a specific skill.

**Endpoint:** `GET /organizations/{organizationId}/skills/{skillId}/statistics`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "skill_id": "skill_123",
    "total_members": 15,
    "verified_members": 12,
    "verification_rate": 0.8,
    "proficiency_breakdown": {
      "beginner": 3,
      "intermediate": 7,
      "advanced": 4,
      "expert": 1
    },
    "recent_verifications": 2,
    "last_updated": "2024-01-06T10:30:00Z"
  }
}
```

**Frontend Integration:**
```typescript
import { useGetSkillsStatisticsQuery } from '../services/apiSlice';

const SkillsMatrix = ({ organizationId }) => {
  const { data: statistics, isLoading } = useGetSkillsStatisticsQuery({
    organizationId,
  });

  const renderSkillCard = (skill) => {
    const stats = statistics?.[skill.id];
    
    return (
      <div className="skill-card">
        <h3>{skill.name}</h3>
        <div className="stats">
          <span>Members: {stats?.total_members ?? 0}</span>
          <span>Verified: {((stats?.verification_rate ?? 0) * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };
};
```

## Document Acknowledgments API

### Get Document Acknowledgment Status

Retrieve acknowledgment status for a specific document.

**Endpoint:** `GET /organizations/{organizationId}/documents/{documentId}/acknowledgments`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "doc_123",
    "user_acknowledgments": [
      {
        "user_id": "user_456",
        "user_handle": "john.doe",
        "acknowledged_at": "2024-01-06T10:30:00Z",
        "ip_address": "192.168.1.1"
      }
    ],
    "total_required": 25,
    "total_acknowledged": 20,
    "acknowledgment_rate": 0.8,
    "current_user_acknowledged": true,
    "current_user_acknowledged_at": "2024-01-06T10:30:00Z",
    "last_updated": "2024-01-06T11:00:00Z"
  }
}
```

### Acknowledge Document

Record that the current user has acknowledged a document.

**Endpoint:** `POST /organizations/{organizationId}/documents/{documentId}/acknowledgments`

**Request Body:**
```json
{
  "ip_address": "192.168.1.1"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "acknowledged_at": "2024-01-06T10:30:00Z"
  }
}
```

**Frontend Integration:**
```typescript
import { 
  useGetDocumentAcknowledmentStatusQuery,
  useAcknowledgeDocumentMutation 
} from '../services/apiSlice';

const DocumentCard = ({ document, organizationId }) => {
  const { data: acknowledgmentStatus, isLoading } = useGetDocumentAcknowledmentStatusQuery({
    organizationId,
    documentId: document.id,
  }, {
    skip: !document.requires_acknowledgment,
  });

  const [acknowledgeDocument, { isLoading: isAcknowledging }] = useAcknowledgeDocumentMutation();

  const handleAcknowledge = async () => {
    try {
      await acknowledgeDocument({
        organizationId,
        documentId: document.id,
        ipAddress: '192.168.1.1', // Get from client
      }).unwrap();
    } catch (error) {
      console.error('Failed to acknowledge document:', error);
    }
  };

  if (!document.requires_acknowledgment) return null;

  return (
    <div className="document-card">
      <h3>{document.title}</h3>
      {isLoading ? (
        <span>Loading...</span>
      ) : acknowledgmentStatus?.current_user_acknowledged ? (
        <span className="acknowledged">✓ Acknowledged</span>
      ) : (
        <button onClick={handleAcknowledge} disabled={isAcknowledging}>
          {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
        </button>
      )}
    </div>
  );
};
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (e.g., document already acknowledged)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Examples

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid request parameters",
    "code": "INVALID_PARAMETERS",
    "details": {
      "field": "limit",
      "issue": "Must be between 1 and 50"
    }
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions to access this resource",
    "code": "FORBIDDEN",
    "details": {
      "required_permission": "HR_VIEW_ACTIVITIES"
    }
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "message": "Organization not found",
    "code": "ORGANIZATION_NOT_FOUND",
    "details": {
      "organization_id": "invalid_id"
    }
  }
}
```

**429 Rate Limited:**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "code": "RATE_LIMITED",
    "details": {
      "retry_after": 60,
      "limit": 100,
      "window": "1h"
    }
  }
}
```

### Frontend Error Handling

```typescript
import { useGetHRActivitiesQuery } from '../services/apiSlice';

const HRDashboard = ({ organizationId }) => {
  const { data, isLoading, error, refetch } = useGetHRActivitiesQuery({
    organizationId,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    // Handle different error types
    if (error.status === 401) {
      return <LoginPrompt />;
    }
    
    if (error.status === 403) {
      return <PermissionDenied />;
    }
    
    if (error.status === 429) {
      return <RateLimitExceeded retryAfter={error.data?.error?.details?.retry_after} />;
    }
    
    // Generic error with retry
    return (
      <ErrorState
        title="Failed to Load Activities"
        message={error.data?.error?.message || 'An unexpected error occurred'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div>
      {data?.data.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
};
```

## Rate Limiting

### Limits

- **General API calls**: 1000 requests per hour per user
- **Statistics endpoints**: 100 requests per hour per user
- **Upload endpoints**: 50 requests per hour per user

### Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641024000
```

### Handling Rate Limits

```typescript
// RTK Query configuration with rate limit handling
export const apiSlice = createApi({
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
  endpoints: (builder) => ({
    getHRActivities: builder.query({
      query: (params) => ({
        url: `/organizations/${params.organizationId}/hr-activities`,
        params: { ...params, organizationId: undefined },
      }),
      // Retry with exponential backoff for rate limits
      retry: (failureCount, error) => {
        if (error?.status === 429) {
          const retryAfter = error?.data?.error?.details?.retry_after || 60;
          setTimeout(() => {}, retryAfter * 1000);
          return failureCount < 3;
        }
        return failureCount < 2;
      },
    }),
  }),
});
```

## Pagination

### Request Parameters

- `page`: Page number (1-based)
- `limit`: Items per page (max 50)

### Response Format

```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

### Frontend Pagination

```typescript
const HRActivitiesList = ({ organizationId }) => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useGetHRActivitiesQuery({
    organizationId,
    page,
    limit,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div>
      {/* Activities list */}
      {data?.data.map(activity => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}

      {/* Pagination controls */}
      <div className="pagination">
        <button 
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        
        <span>Page {page} of {totalPages}</span>
        
        <button 
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

## Caching and Performance

### RTK Query Cache Configuration

```typescript
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['HRActivity', 'SkillStatistics', 'DocumentAcknowledment'],
  endpoints: (builder) => ({
    getHRActivities: builder.query({
      query: (params) => `/organizations/${params.organizationId}/hr-activities`,
      providesTags: (result, error, { organizationId }) => [
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: 'LIST' },
      ],
      keepUnusedDataFor: 300, // 5 minutes
    }),
    
    getSkillsStatistics: builder.query({
      query: (params) => `/organizations/${params.organizationId}/skills/statistics`,
      providesTags: (result, error, { organizationId }) => [
        { type: 'SkillStatistics', id: organizationId },
      ],
      keepUnusedDataFor: 600, // 10 minutes
    }),
    
    acknowledgeDocument: builder.mutation({
      query: ({ organizationId, documentId, ipAddress }) => ({
        url: `/organizations/${organizationId}/documents/${documentId}/acknowledgments`,
        method: 'POST',
        body: { ip_address: ipAddress },
      }),
      invalidatesTags: (result, error, { organizationId, documentId }) => [
        { type: 'DocumentAcknowledment', id: documentId },
        { type: 'HRActivity', id: organizationId },
      ],
    }),
  }),
});
```

### Cache Invalidation Strategy

When data changes, invalidate related caches:

```typescript
// When a skill is verified
invalidatesTags: [
  { type: 'HRActivity', id: organizationId },      // New activity created
  { type: 'SkillStatistics', id: organizationId }, // Statistics changed
  { type: 'Skill', id: skillId },                  // Skill data updated
]

// When document is acknowledged
invalidatesTags: [
  { type: 'DocumentAcknowledment', id: documentId }, // Acknowledgment status changed
  { type: 'HRActivity', id: organizationId },        // New activity created
]
```

## Testing API Integration

### Unit Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useGetHRActivitiesQuery } from '../services/apiSlice';

const wrapper = ({ children }) => (
  <Provider store={store}>{children}</Provider>
);

describe('useGetHRActivitiesQuery', () => {
  it('fetches HR activities successfully', async () => {
    const { result } = renderHook(
      () => useGetHRActivitiesQuery({ organizationId: 'org_123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data.data).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import HRDashboard from '../components/hr/HRDashboard';

const server = setupServer(
  rest.get('/api/organizations/:orgId/hr-activities', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [
        {
          id: 'act_1',
          title: 'Test Activity',
          description: 'Test description',
          created_at: '2024-01-06T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HRDashboard Integration', () => {
  it('displays activities from API', async () => {
    render(
      <Provider store={store}>
        <HRDashboard organizationId="org_123" />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Activity')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### 1. Always Handle Loading States

```typescript
const { data, isLoading, error } = useGetHRActivitiesQuery(params);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data?.data.length) return <EmptyState />;

return <ActivityList activities={data.data} />;
```

### 2. Use Proper Cache Configuration

- Short-lived data (activities): 5 minutes
- Medium-lived data (statistics): 10 minutes  
- Long-lived data (analytics): 15 minutes

### 3. Implement Optimistic Updates

```typescript
const [acknowledgeDocument] = useAcknowledgeDocumentMutation({
  onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
    // Optimistic update
    const patchResult = dispatch(
      apiSlice.util.updateQueryData('getDocumentAcknowledmentStatus', 
        { organizationId: args.organizationId, documentId: args.documentId },
        (draft) => {
          draft.current_user_acknowledged = true;
        }
      )
    );
    
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // Revert on error
    }
  },
});
```

### 4. Use Conditional Queries

```typescript
const { data } = useGetDocumentAcknowledmentStatusQuery(
  { organizationId, documentId },
  { skip: !document.requires_acknowledgment } // Skip if not needed
);
```

### 5. Handle Permissions Properly

```typescript
const { hasPermission } = usePermissions(organizationId);

if (!hasPermission('HR_VIEW_ACTIVITIES')) {
  return <PermissionDenied />;
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity and refresh if needed
2. **403 Forbidden**: Verify user has required permissions
3. **404 Not Found**: Confirm organization ID and resource IDs are correct
4. **429 Rate Limited**: Implement exponential backoff retry logic
5. **500 Server Error**: Check server logs and report to development team

### Debug Tools

- Browser Network tab for request/response inspection
- Redux DevTools for RTK Query state inspection
- Server logs for backend error details

### Support

For API issues or questions:
- Check this documentation first
- Review server logs for error details
- Contact the development team with specific error messages and request details