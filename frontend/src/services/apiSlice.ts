import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Organization,
  Event,
  Comment,
  User,
  CreateOrganizationData,
  UpdateOrganizationData,
  CreateEventData,
  UpdateEventData,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentListResponse,
  ListResponse,
  RatingStats,
  OrganizationRating,
  CreateRatingRequest,
  HomePageStats,
  UserStats,
  EventReview,
  EventReviewWithUser,
  CreateEventReviewData,
  OrganizationRatingSummary,
  ReviewEligibility,
} from '../types';
import {
  transformEventResponse,
  transformEventReviewResponse,
  transformPaginatedResponse,
} from '../utils/responseTransformers';
import type {
  Notification,
  NotificationListResponse,
  NotificationStats,
  NotificationPreferences,
  UpdateNotificationRequest,
} from '../types/notification';

// Common response types
export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

// Base query with auth token handling
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  prepareHeaders: headers => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Create the API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQuery,
  tagTypes: [
    'Organization',
    'Event',
    'EventRegistrations',
    'Comment',
    'User',
    'UserOrganization',
    'Rating',
    'VerificationCode',
    'Role',
    'Member',
    'Notification',
    'EventReview',
    'OrganizationRating',
    'Invite',
    'Activity',
    'DiscordServer',
    // Reputation system tags
    'ScPlayer',
    'PlayerReport',
    'PlayerComment',
    'PlayerTag',
    'PlayerAttestation',
    // Enhanced reporting system tags
    'OrganizationReport',
    'AltAccountReport',
    'AffiliatedPeopleReport',
    'OrganizationReportCorroboration',
    'AltAccountReportCorroboration',
    'AffiliatedPeopleReportCorroboration',
    // HR system tags
    'Application',
    'OnboardingProgress',
    'PerformanceReview',
    'Skill',
    'Document',
    'HRAnalytics',
    'HRActivity',
    'SkillStatistics',
    'DocumentAcknowledment',
  ],
  // Configure serialization to handle non-serializable data
  serializeQueryArgs: ({ queryArgs, endpointName }) => {
    return `${endpointName}(${JSON.stringify(queryArgs)})`;
  },
  endpoints: builder => ({
    // Organization endpoints
    getOrganizations: builder.query<
      ListResponse<Organization>,
      {
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_order?: string;
        tags?: string[];
        is_registered?: boolean;
        is_active?: boolean;
        languages?: string;
      }
    >({
      query: ({
        page = 1,
        limit = 20,
        sort_by,
        sort_order,
        tags,
        is_registered,
        is_active,
        languages,
      }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (sort_by) params.append('sort_by', sort_by);
        if (sort_order) params.append('sort_order', sort_order);
        if (tags && tags.length > 0) params.append('tags', tags.join(','));
        if (is_registered !== undefined)
          params.append('is_registered', is_registered.toString());
        if (is_active !== undefined)
          params.append('is_active', is_active.toString());
        if (languages) params.append('languages', languages);
        return `/api/organizations?${params.toString()}`;
      },
      transformResponse: (
        response: { data: Organization[]; total: number },
        _meta,
        arg
      ) => ({
        data: response.data,
        total: response.total,
        page: arg.page || 1,
        limit: arg.limit || 20,
      }),
      providesTags: result =>
        result
          ? [
            ...result.data.map(({ rsi_org_id }) => ({
              type: 'Organization' as const,
              id: rsi_org_id,
            })),
            { type: 'Organization', id: 'LIST' },
          ]
          : [{ type: 'Organization', id: 'LIST' }],
      // Cache organizations for 5 minutes
      keepUnusedDataFor: 300,
    }),

    getUserVerificationCode: builder.query<
      { verification_code: string; instructions: string },
      void
    >({
      query: () => '/api/auth/verification-code',
      transformResponse: (
        response: ApiSuccessResponse<{
          verification_code: string;
          instructions: string;
        }>
      ) => response.data,
      providesTags: ['VerificationCode'],
    }),

    getOrganization: builder.query<Organization, string>({
      query: spectrumId => `/api/organizations/${spectrumId}`,
      transformResponse: (response: ApiSuccessResponse<Organization>) =>
        response.data,
      providesTags: (_, __, spectrumId) => [
        { type: 'Organization', id: spectrumId },
      ],
      // Cache individual organizations for 10 minutes
      keepUnusedDataFor: 600,
    }),

    getOrganizationById: builder.query<Organization, string>({
      query: organizationId => `/api/organizations/${organizationId}`,
      transformResponse: (response: ApiSuccessResponse<Organization>) =>
        response.data,
      providesTags: (_, __, organizationId) => [
        { type: 'Organization', id: organizationId },
      ],
      // Cache individual organizations for 10 minutes
      keepUnusedDataFor: 600,
    }),

    createOrganization: builder.mutation<Organization, CreateOrganizationData>({
      query: data => ({
        url: '/api/organizations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
      // Optimistic updates could be added here
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Handle error if needed
        }
      },
    }),

    updateOrganization: builder.mutation<
      Organization,
      { rsi_org_id: string; data: UpdateOrganizationData }
    >({
      query: ({ rsi_org_id, data }) => ({
        url: `/api/organizations/${rsi_org_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { rsi_org_id }) => [
        { type: 'Organization', id: rsi_org_id },
        { type: 'Organization', id: 'LIST' },
      ],
      // Optimistic updates could be added here
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Handle error if needed
        }
      },
    }),

    deleteOrganization: builder.mutation<void, string>({
      query: rsi_org_id => ({
        url: `/api/organizations/${rsi_org_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
    }),

    searchOrganizations: builder.query<
      ListResponse<Organization>,
      {
        query: string;
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_order?: string;
        tags?: string[];
        is_registered?: boolean;
        languages?: string;
      }
    >({
      query: ({
        query,
        page = 1,
        limit = 20,
        sort_by,
        sort_order,
        tags,
        is_registered,
        languages,
      }) => {
        const params = new URLSearchParams({
          q: encodeURIComponent(query),
          page: page.toString(),
          limit: limit.toString(),
        });
        if (sort_by) params.append('sort_by', sort_by);
        if (sort_order) params.append('sort_order', sort_order);
        if (tags && tags.length > 0) params.append('tags', tags.join(','));
        if (is_registered !== undefined)
          params.append('is_registered', is_registered.toString());
        if (languages) params.append('languages', languages);
        return `/api/organizations/search?${params.toString()}`;
      },
      transformResponse: (
        response: { data: Organization[]; total: number },
        _meta,
        arg
      ) => ({
        data: response.data,
        total: response.total,
        page: arg.page || 1,
        limit: arg.limit || 20,
      }),
      providesTags: result =>
        result
          ? [
            ...result.data.map(({ rsi_org_id }) => ({
              type: 'Organization' as const,
              id: rsi_org_id,
            })),
            { type: 'Organization', id: 'SEARCH' },
          ]
          : [{ type: 'Organization', id: 'SEARCH' }],
      // Cache search results for 2 minutes (shorter than main list)
      keepUnusedDataFor: 120,
    }),

    // Discord Server endpoints
    getOrganizationDiscordServer: builder.query<
      import('../types/discord').DiscordServer,
      string
    >({
      query: organizationId => `/api/organizations/${organizationId}/discord/servers`,
      transformResponse: (response: import('../types/discord').DiscordServerResponse) =>
        response.data,
      providesTags: (_, __, organizationId) => [
        { type: 'DiscordServer', id: organizationId },
      ],
      // Cache Discord server info for 5 minutes
      keepUnusedDataFor: 300,
    }),

    getUserDiscordServers: builder.query<
      import('../types/discord').DiscordServer[],
      void
    >({
      query: () => '/api/discord/user-servers',
      transformResponse: (response: import('../types/discord').DiscordServersResponse) =>
        response.data.servers,
      providesTags: result =>
        result
          ? result.map(({ id }) => ({ type: 'DiscordServer', id }))
          : [{ type: 'DiscordServer', id: 'USER_LIST' }],
      // Cache user Discord servers for 5 minutes
      keepUnusedDataFor: 300,
    }),

    // Discord Server Management endpoints
    disconnectDiscordServer: builder.mutation<
      ApiMessageResponse,
      string
    >({
      query: organizationId => ({
        url: `/api/organizations/${organizationId}/discord/servers`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, organizationId) => [
        { type: 'DiscordServer', id: organizationId },
        { type: 'DiscordServer', id: 'USER_LIST' },
      ],
    }),

    syncOrganizationDiscordEvents: builder.mutation<
      ApiMessageResponse,
      string
    >({
      query: organizationId => ({
        url: `/api/organizations/${organizationId}/discord/sync-events`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, organizationId) => [
        { type: 'DiscordServer', id: organizationId },
      ],
    }),

    getUserDashboardOrganizations: builder.query<Organization[], void>({
      query: () => '/api/auth/dashboard/organizations',
      transformResponse: (response: ApiSuccessResponse<Organization[]>) =>
        response.data,
      providesTags: result =>
        result
          ? [
            ...result.map(({ rsi_org_id }) => ({
              type: 'Organization' as const,
              id: rsi_org_id,
            })),
            { type: 'Organization', id: 'USER' },
          ]
          : [{ type: 'Organization', id: 'USER' }],
      // Cache user orgs for 3 minutes
      keepUnusedDataFor: 180,
    }),

    verifyOrganization: builder.mutation<
      ApiMessageResponse,
      { id: string; verificationCode: string; rsiOrgId?: string }
    >({
      query: ({ id, verificationCode }) => ({
        url: `/api/organizations/${id}/verify`,
        method: 'POST',
        body: { verification_code: verificationCode },
      }),
      invalidatesTags: (_, __, { id, rsiOrgId }) => {
        const tags = [
          // Invalidate by internal ID
          { type: 'Organization' as const, id },
          // Invalidate lists
          { type: 'Organization' as const, id: 'LIST' },
          { type: 'Organization' as const, id: 'USER' },
          { type: 'Organization' as const, id: 'SEARCH' },
        ];

        // Add RSI org ID invalidation if provided
        if (rsiOrgId) {
          tags.push({ type: 'Organization' as const, id: rsiOrgId });
        }

        return tags;
      },
    }),

    // Event endpoints
    getEvents: builder.query<
      ListResponse<Event>,
      { page?: number; limit?: number; is_upcoming?: boolean; private_only?: boolean }
    >({
      query: ({ page = 1, limit = 20, is_upcoming, private_only }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (is_upcoming !== undefined) {
          params.append('is_upcoming', is_upcoming.toString());
        }
        if (private_only !== undefined) {
          params.append('private_only', private_only.toString());
        }
        return `/api/events?${params.toString()}`;
      },
      transformResponse: (response: ApiSuccessResponse<ListResponse<Event>>): ListResponse<Event> =>
        transformPaginatedResponse(response.data, transformEventResponse) as ListResponse<Event>,
      providesTags: result =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Event' as const,
              id,
            })),
            { type: 'Event', id: 'LIST' },
          ]
          : [{ type: 'Event', id: 'LIST' }],
      // Cache events for 3 minutes (events change more frequently)
      keepUnusedDataFor: 180,
    }),

    getEvent: builder.query<Event, string>({
      query: id => `/api/events/${id}`,
      transformResponse: (response: ApiSuccessResponse<Event>) =>
        transformEventResponse(response.data),
      providesTags: (_, __, id) => [{ type: 'Event', id }],
      // Cache individual events for 5 minutes
      keepUnusedDataFor: 300,
    }),

    createEvent: builder.mutation<Event, CreateEventData>({
      query: data => ({
        url: '/api/events',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<Event>) =>
        transformEventResponse(response.data),
      invalidatesTags: [{ type: 'Event', id: 'LIST' }],
    }),

    updateEvent: builder.mutation<Event, { id: string; data: UpdateEventData }>(
      {
        query: ({ id, data }) => ({
          url: `/api/events/${id}`,
          method: 'PUT',
          body: data,
        }),
        transformResponse: (response: ApiSuccessResponse<Event>) =>
          transformEventResponse(response.data),
        invalidatesTags: (_, __, { id }) => [
          { type: 'Event', id },
          { type: 'Event', id: 'LIST' },
        ],
      }
    ),

    deleteEvent: builder.mutation<void, string>({
      query: id => ({
        url: `/api/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Event', id: 'LIST' }],
    }),

    searchEvents: builder.query<
      ListResponse<Event>,
      { query: string; page?: number; limit?: number; is_upcoming?: boolean }
    >({
      query: ({ query, page = 1, limit = 20, is_upcoming }) => {
        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (is_upcoming !== undefined) {
          params.append('is_upcoming', is_upcoming.toString());
        }
        return `/api/events/search?${params.toString()}`;
      },
      providesTags: result =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Event' as const,
              id,
            })),
            { type: 'Event', id: 'SEARCH' },
          ]
          : [{ type: 'Event', id: 'SEARCH' }],
      // Cache search results for 2 minutes
      keepUnusedDataFor: 120,
    }),

    getEventsByOrganization: builder.query<
      ListResponse<Event>,
      { spectrumId: string; page?: number; limit?: number }
    >({
      query: ({ spectrumId, page = 1, limit = 20 }) =>
        `/api/organizations/${spectrumId}/events?page=${page}&limit=${limit}`,
      transformResponse: (response: {
        success: boolean;
        data: {
          data: Event[];
          total: number;
          pagination: {
            page: number;
            limit: number;
            total: number;
          };
        };
      }): ListResponse<Event> =>
        transformPaginatedResponse(response.data, transformEventResponse) as ListResponse<Event>,
      providesTags: result =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Event' as const,
              id,
            })),
            { type: 'Event', id: 'ORG' },
          ]
          : [{ type: 'Event', id: 'ORG' }],
      // Cache org events for 2 minutes
      keepUnusedDataFor: 120,
    }),

    registerForEvent: builder.mutation<ApiMessageResponse, { eventId: string }>(
      {
        query: ({ eventId }) => ({
          url: `/api/events/${eventId}/registrations`,
          method: 'POST',
        }),
        invalidatesTags: (_, __, { eventId }) => [
          { type: 'Event', id: eventId },
          { type: 'Event', id: 'LIST' },
          { type: 'EventRegistrations', id: eventId },
        ],
      }
    ),

    unregisterFromEvent: builder.mutation<
      ApiMessageResponse,
      { eventId: string }
    >({
      query: ({ eventId }) => ({
        url: `/api/events/${eventId}/registrations`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Event', id: eventId },
        { type: 'Event', id: 'LIST' },
        { type: 'EventRegistrations', id: eventId },
      ],
    }),

    sendEventNotification: builder.mutation<
      {
        success: boolean;
        message: string;
        notifications_sent: number;
        remaining: number;
      },
      { eventId: string; title: string; message: string }
    >({
      query: ({ eventId, title, message }) => ({
        url: `/api/events/${eventId}/notify`,
        method: 'POST',
        body: { title, message },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Notification', id: 'LIST' },
        { type: 'Event', id: `${eventId}-usage` },
      ],
    }),

    getEventNotificationUsage: builder.query<
      { notifications_sent: number },
      { eventId: string }
    >({
      query: ({ eventId }) => `/api/events/${eventId}/notification-usage`,
      transformResponse: (
        response: ApiSuccessResponse<{ notifications_sent: number }>
      ) => response.data,
      providesTags: (_, __, { eventId }) => [
        { type: 'Event', id: `${eventId}-usage` },
      ],
    }),

    markNotificationAsRead: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: notificationId => ({
        url: `/api/notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),

    markEventNotificationsAsRead: builder.mutation<
      { success: boolean; message: string; marked_count: number },
      string
    >({
      query: eventId => ({
        url: `/api/notifications/events/${eventId}/mark-read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),

    deleteNotification: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: notificationId => ({
        url: `/api/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    bulkMarkAllAsRead: builder.mutation<
      { success: boolean; message: string; affected_count: number },
      void
    >({
      query: () => ({
        url: `/api/notifications/bulk-read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    bulkDeleteAllNotifications: builder.mutation<
      { success: boolean; message: string; affected_count: number },
      void
    >({
      query: () => ({
        url: `/api/notifications/bulk`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    getEventRegistrations: builder.query<
      {
        data: any[];
        pagination: { limit: number; offset: number; total: number };
      },
      string
    >({
      query: eventId => `/api/events/${eventId}/registrations`,
      providesTags: (_, __, eventId) => [
        { type: 'Event', id: eventId },
        { type: 'EventRegistrations', id: eventId },
      ],
      keepUnusedDataFor: 60, // Cache for 1 minute (registrations change frequently)
    }),

    getUserEvents: builder.query<
      ListResponse<Event>,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 20 }) =>
        `/api/auth/dashboard/events?page=${page}&limit=${limit}`,
      transformResponse: (response: {
        success: boolean;
        data: {
          data: Event[];
          total: number;
          pagination: {
            page: number;
            limit: number;
            total: number;
          };
        };
      }): ListResponse<Event> =>
        transformPaginatedResponse(response.data, transformEventResponse) as ListResponse<Event>,
      providesTags: [{ type: 'Event', id: 'USER' }],
    }),

    getUpcomingEvents: builder.query<
      ListResponse<Event>,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 20 }) =>
        `/api/events/upcoming?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Event', id: 'UPCOMING' }],
    }),

    getPrivateEvents: builder.query<
      ListResponse<Event>,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 20 }) =>
        `/api/events/private?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Event', id: 'PRIVATE' }],
      // Cache private events for 2 minutes (shorter than public events)
      keepUnusedDataFor: 120,
    }),

    // Home page endpoints
    getFeaturedOrganizations: builder.query<Organization[], { limit?: number }>(
      {
        query: ({ limit = 3 }) => `/api/organizations/featured?limit=${limit}`,
        transformResponse: (response: ApiSuccessResponse<Organization[]>) =>
          response.data,
        providesTags: [{ type: 'Organization', id: 'FEATURED' }],
        keepUnusedDataFor: 300, // Cache for 5 minutes
      }
    ),

    getHomePageStats: builder.query<HomePageStats, void>({
      query: () => '/api/organizations/stats/home',
      transformResponse: (response: ApiSuccessResponse<HomePageStats>) =>
        response.data,
      providesTags: [{ type: 'Organization', id: 'STATS' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    getUpcomingEventsHome: builder.query<Event[], { limit?: number }>({
      query: ({ limit = 3 }) => `/api/events/upcoming?limit=${limit}`,
      transformResponse: (response: ApiSuccessResponse<Event[]>) =>
        response.data,
      providesTags: [{ type: 'Event', id: 'UPCOMING_HOME' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Comment endpoints
    getComments: builder.query<
      CommentListResponse,
      { eventId: string; page?: number; limit?: number }
    >({
      query: ({ eventId, page = 1, limit = 20 }) =>
        `/api/events/${eventId}/comments?page=${page}&limit=${limit}`,
      providesTags: (_, __, { eventId }) => [
        { type: 'Comment', id: 'EVENT' },
        { type: 'Event', id: eventId },
      ],
      // Cache comments for 1 minute (they change frequently)
      keepUnusedDataFor: 60,
    }),

    createComment: builder.mutation<
      Comment,
      { eventId: string; data: CreateCommentRequest }
    >({
      query: ({ eventId, data }) => ({
        url: `/api/events/${eventId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment', id: 'EVENT' },
        { type: 'Event', id: eventId },
      ],
      // Optimistic updates for comments
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Handle error if needed
        }
      },
    }),

    updateComment: builder.mutation<
      Comment,
      { commentId: string; data: UpdateCommentRequest }
    >({
      query: ({ commentId, data }) => ({
        url: `/api/comments/${commentId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { commentId }) => [
        { type: 'Comment', id: commentId },
      ],
    }),

    deleteComment: builder.mutation<void, string>({
      query: commentId => ({
        url: `/api/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, commentId) => [
        { type: 'Comment', id: commentId },
      ],
    }),

    // User endpoints
    getCurrentUser: builder.query<User, void>({
      query: () => '/api/auth/me',
      transformResponse: (response: ApiSuccessResponse<User>) => response.data,
      providesTags: [{ type: 'User', id: 'CURRENT' }],
      // User data is relatively stable - 5 minutes caching
      keepUnusedDataFor: 300,
    }),

    getPublicUserProfile: builder.query<
      {
        user: {
          id: string;
          rsi_handle: string;
          avatar_url?: string;
          avatar_source?: string;
          is_rsi_verified: boolean;
          created_at: string;
        };
        organizations: Organization[];
        events: Event[];
        stats: {
          totalOrganizations: number;
          totalEvents: number;
          totalUpvotes: number;
          averageRating: number;
          lastActivityAt: string;
        };
      },
      string
    >({
      query: (rsiHandle) => `/api/user/public/${rsiHandle}`,
      transformResponse: (response: ApiSuccessResponse<any>) => response.data,
      providesTags: (_, __, rsiHandle) => [
        { type: 'User', id: `PUBLIC_${rsiHandle}` },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    updateProfile: builder.mutation<User, Partial<User>>({
      query: data => ({
        url: '/api/auth/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),

    // Authentication endpoints
    loginWithDiscord: builder.mutation<
      { token: string; user: User },
      { code: string }
    >({
      query: data => ({
        url: '/api/auth/discord/exchange',
        method: 'POST',
        body: data,
      }),
      // On successful login, invalidate user cache to fetch fresh user data
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),

    verifyRsiAccount: builder.mutation<
      ApiMessageResponse,
      { rsi_handle: string }
    >({
      query: data => ({
        url: '/api/auth/verify-rsi',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),

    generateVerificationCode: builder.mutation<
      { verification_code: string; instructions: string; user: User },
      void
    >({
      query: () => ({
        url: '/api/auth/generate-verification-code',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      // Clear all user-related cache on logout
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Note: We can't use dispatch here in RTK Query v1.9.7
          // Cache clearing will be handled by the component calling this mutation
        } catch {
          // Handle error if needed
        }
      },
    }),

    // Rating endpoints
    getOrganizationRatingStats: builder.query<RatingStats, string>({
      query: organizationId =>
        `/api/ratings/organizations/${organizationId}/ratings/stats`,
      transformResponse: (response: ApiSuccessResponse<RatingStats>) =>
        response.data,
      providesTags: (_, __, organizationId) => [
        { type: 'Organization', id: organizationId },
        { type: 'Rating', id: organizationId },
      ],
    }),

    getUserRating: builder.query<OrganizationRating | null, string>({
      query: organizationId =>
        `/api/ratings/organizations/${organizationId}/ratings/user`,
      transformResponse: (
        response: ApiSuccessResponse<OrganizationRating | null>
      ) => response.data,
      providesTags: (_, __, organizationId) => [
        { type: 'Rating', id: organizationId },
      ],
    }),

    rateOrganization: builder.mutation<
      OrganizationRating,
      { organizationId: string; data: CreateRatingRequest }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/ratings/organizations/${organizationId}/rate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Rating', id: organizationId },
        { type: 'Organization', id: organizationId },
      ],
    }),

    deleteRating: builder.mutation<void, string>({
      query: ratingId => ({
        url: `/api/ratings/${ratingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, ratingId) => [{ type: 'Rating', id: ratingId }],
    }),

    // Dashboard endpoints
    getUserDashboardStats: builder.query<UserStats, void>({
      query: () => '/api/auth/dashboard/stats',
      transformResponse: (response: ApiSuccessResponse<UserStats>) =>
        response.data,
      providesTags: [{ type: 'User', id: 'DASHBOARD_STATS' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    getUserRatingSummary: builder.query<
      {
        user_id: string;
        average_rating: number;
        total_reviews: number;
        rating_breakdown: {
          1: number;
          2: number;
          3: number;
          4: number;
          5: number;
        };
        events_created: number;
        events_attended: number;
        organizations_member: number;
      },
      void
    >({
      query: () => '/api/auth/dashboard/rating-summary',
      providesTags: [{ type: 'User', id: 'RATING_SUMMARY' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    getUserDashboardEvents: builder.query<Event[], void>({
      query: () => '/api/auth/dashboard/events',
      transformResponse: (response: ApiSuccessResponse<Event[]>) =>
        response.data,
      providesTags: [{ type: 'Event', id: 'USER_DASHBOARD' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    getUserActivity: builder.query<
      import('../types/activity').ActivityItem[],
      { limit?: number }
    >({
      query: ({ limit = 10 }) => `/api/auth/activity?limit=${limit}`,
      transformResponse: (response: import('../types/activity').ActivityResponse) =>
        response.data,
      providesTags: [{ type: 'Activity', id: 'USER' }],
      // Cache for 2 minutes since activity changes frequently
      keepUnusedDataFor: 120,
    }),

    // Analytics endpoints
    getOrganizationAnalytics: builder.query<
      import('../types/analytics').ViewAnalytics,
      { spectrumId: string; startDate?: string; endDate?: string; includeViewers?: boolean }
    >({
      query: ({ spectrumId, startDate, endDate, includeViewers = false }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (includeViewers) params.append('include_viewers', 'true');

        const queryString = params.toString();
        return `/api/organizations/${spectrumId}/analytics/views${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: import('../types/analytics').AnalyticsResponse) =>
        response.data,
      providesTags: (_result, _error, { spectrumId }) => [
        { type: 'Organization', id: spectrumId }
      ],
      // Cache for 5 minutes since analytics don't change frequently
      keepUnusedDataFor: 300,
    }),

    getEventAnalytics: builder.query<
      import('../types/analytics').ViewAnalytics,
      { eventId: string; startDate?: string; endDate?: string; includeViewers?: boolean }
    >({
      query: ({ eventId, startDate, endDate, includeViewers = false }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (includeViewers) params.append('include_viewers', 'true');

        const queryString = params.toString();
        return `/api/events/${eventId}/analytics/views${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: import('../types/analytics').AnalyticsResponse) =>
        response.data,
      providesTags: (_result, _error, { eventId }) => [
        { type: 'Event', id: eventId }
      ],
      // Cache for 5 minutes since analytics don't change frequently
      keepUnusedDataFor: 300,
    }),

    // Role Management endpoints
    getOrganizationRoles: builder.query<any[], string>({
      query: spectrumId =>
        `/api/roles/organizations/${spectrumId}/roles`,
      transformResponse: (response: { roles: any[] }) => response.roles,
      providesTags: (_, __, organizationId) => [
        { type: 'Role', id: organizationId },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    createRole: builder.mutation<
      any,
      {
        spectrumId: string;
        name: string;
        description?: string;
        rank: number;
        permissions: string[];
      }
    >({
      query: ({ spectrumId, ...data }) => ({
        url: `/api/roles/organizations/${spectrumId}/roles`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Role', id: spectrumId },
      ],
    }),

    updateRole: builder.mutation<
      any,
      {
        spectrumId: string;
        roleId: string;
        name?: string;
        description?: string;
        rank?: number;
        permissions?: string[];
        is_active?: boolean;
      }
    >({
      query: ({ spectrumId, roleId, ...data }) => ({
        url: `/api/roles/organizations/${spectrumId}/roles/${roleId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Role', id: spectrumId },
      ],
    }),

    deleteRole: builder.mutation<
      void,
      {
        spectrumId: string;
        roleId: string;
      }
    >({
      query: ({ spectrumId, roleId }) => ({
        url: `/api/roles/organizations/${spectrumId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Role', id: spectrumId },
      ],
    }),

    getOrganizationMembers: builder.query<any[], string>({
      query: spectrumId =>
        `/api/roles/organizations/${spectrumId}/members`,
      transformResponse: (response: { members: any[] }) => response.members,
      providesTags: (_, __, spectrumId) => [
        { type: 'Member', id: spectrumId },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    assignRole: builder.mutation<
      any,
      {
        spectrumId: string;
        targetUserId: string;
        roleId: string;
      }
    >({
      query: ({ spectrumId, ...data }) => ({
        url: `/api/roles/organizations/${spectrumId}/members/assign-role`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Member', id: spectrumId },
        { type: 'Role', id: spectrumId },
      ],
    }),

    removeMember: builder.mutation<
      any,
      {
        spectrumId: string;
        userId: string;
      }
    >({
      query: ({ spectrumId, userId }) => ({
        url: `/api/roles/organizations/${spectrumId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Member', id: spectrumId },
      ],
    }),

    // Search organization members
    searchOrganizationMembers: builder.query<
      { id: string; rsi_handle: string }[],
      { organizationId: string; query: string; limit?: number }
    >({
      query: ({ organizationId, query, limit = 10 }) => {
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
        });
        return `/api/organizations/${organizationId}/members/search?${params.toString()}`;
      },
      transformResponse: (response: ApiSuccessResponse<{ id: string; rsi_handle: string }[]>) =>
        response.data,
      keepUnusedDataFor: 60, // Cache for 1 minute (members change frequently)
    }),

    generateInviteCode: builder.mutation<
      any,
      {
        spectrumId: string;
        role_id?: string;
        maxUses?: number;
        expiresAt?: string;
      }
    >({
      query: ({ spectrumId, ...data }) => ({
        url: `/api/organizations/spectrum/${spectrumId}/invites`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Invite', id: spectrumId },
      ],
    }),

    deleteInviteCode: builder.mutation<
      any,
      {
        spectrumId: string;
        inviteId: string;
      }
    >({
      query: ({ spectrumId, inviteId }) => ({
        url: `/api/organizations/spectrum/${spectrumId}/invites/${inviteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { spectrumId }) => [
        { type: 'Invite', id: spectrumId },
      ],
    }),

    // Invite Management
    getInviteCodes: builder.query<{ inviteCodes: any[] }, string>({
      query: spectrumId => `/api/organizations/spectrum/${spectrumId}/invites`,
      transformResponse: (response: { data: any[] }) => ({
        inviteCodes: response.data || [],
      }),
      providesTags: (_, __, spectrumId) => [
        { type: 'Invite', id: spectrumId },
      ],
    }),

    joinWithInvite: builder.mutation<
      { organization_id: string },
      { inviteCode: string }
    >({
      query: ({ inviteCode }) => ({
        url: `/api/organizations/join/${inviteCode}`,
        method: 'POST',
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ organization_id: string }>
      ) => response.data,
      invalidatesTags: () => [
        { type: 'Organization', id: 'LIST' },
        { type: 'Member', id: 'LIST' },
      ],
    }),

    // Organization upvoting
    upvoteOrganization: builder.mutation<
      ApiSuccessResponse<{
        hasUpvoted: boolean;
        canUpvote: boolean;
        nextUpvoteDate?: string;
      }>,
      string
    >({
      query: spectrumId => ({
        url: `/api/organizations/spectrum/${spectrumId}/upvote`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, spectrumId) => [
        { type: 'Organization', id: spectrumId },
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id: `${spectrumId}_UPVOTE` },
      ],
    }),

    removeUpvote: builder.mutation<
      ApiSuccessResponse<{
        hasUpvoted: boolean;
        canUpvote: boolean;
        nextUpvoteDate?: string;
      }>,
      string
    >({
      query: spectrumId => ({
        url: `/api/organizations/spectrum/${spectrumId}/upvote`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, spectrumId) => [
        { type: 'Organization', id: spectrumId },
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id: `${spectrumId}_UPVOTE` },
      ],
    }),

    getUpvoteStatus: builder.query<
      ApiSuccessResponse<{
        hasUpvoted: boolean;
        canUpvote: boolean;
        nextUpvoteDate?: string;
      }>,
      string
    >({
      query: spectrumId =>
        `/api/organizations/spectrum/${spectrumId}/upvote/status`,
      providesTags: (_result, _error, spectrumId) => [
        { type: 'Organization', id: `${spectrumId}_UPVOTE` },
      ],
    }),

    getAvailablePermissions: builder.query<
      { permissions: Record<string, string> },
      void
    >({
      query: () => '/api/roles/permissions',
      transformResponse: (response: { permissions: Record<string, string> }) =>
        response,
      providesTags: [{ type: 'Role', id: 'PERMISSIONS' }],
      keepUnusedDataFor: 600, // Cache for 10 minutes (permissions don't change often)
    }),

    // Notification endpoints
    getNotifications: builder.query<
      NotificationListResponse,
      {
        page?: number;
        limit?: number;
        is_read?: boolean;
        entity_type?: number;
        sort_by?: string;
        sort_order?: string;
      }
    >({
      query: ({
        page = 1,
        limit = 20,
        is_read,
        entity_type,
        sort_by = 'created_at',
        sort_order = 'desc',
      }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sort_by,
          sort_order,
        });
        if (is_read !== undefined) params.append('is_read', is_read.toString());
        if (entity_type !== undefined)
          params.append('entity_type', entity_type.toString());
        return `/api/notifications?${params.toString()}`;
      },
      transformResponse: (
        response: ApiSuccessResponse<NotificationListResponse>
      ) => response.data,
      providesTags: ['Notification'],
    }),

    getNotificationStats: builder.query<NotificationStats, void>({
      query: () => '/api/notifications/stats',
      transformResponse: (response: ApiSuccessResponse<NotificationStats>) =>
        response.data,
      providesTags: ['Notification'],
    }),

    getNotificationById: builder.query<Notification, string>({
      query: id => `/api/notifications/${id}`,
      transformResponse: (response: ApiSuccessResponse<Notification>) =>
        response.data,
      providesTags: (_, __, id) => [{ type: 'Notification', id }],
    }),

    updateNotification: builder.mutation<
      Notification,
      { id: string; data: UpdateNotificationRequest }
    >({
      query: ({ id, data }) => ({
        url: `/api/notifications/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<Notification>) =>
        response.data,
      invalidatesTags: (_, __, { id }) => [
        { type: 'Notification', id },
        'Notification',
      ],
    }),

    markNotificationsAsRead: builder.mutation<
      { updated_count: number },
      { notification_ids: string[] }
    >({
      query: ({ notification_ids }) => ({
        url: '/api/notifications/mark-read',
        method: 'POST',
        body: { notification_ids },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ updated_count: number }>
      ) => response.data,
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsAsRead: builder.mutation<
      { updated_count: number },
      void
    >({
      query: () => ({
        url: '/api/notifications/mark-all-read',
        method: 'POST',
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ updated_count: number }>
      ) => response.data,
      invalidatesTags: ['Notification'],
    }),

    deleteNotifications: builder.mutation<
      { deleted_count: number },
      { notification_ids: string[] }
    >({
      query: ({ notification_ids }) => ({
        url: '/api/notifications',
        method: 'DELETE',
        body: { notification_ids },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ deleted_count: number }>
      ) => response.data,
      invalidatesTags: ['Notification'],
    }),

    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => '/api/notifications/preferences',
      transformResponse: (
        response: ApiSuccessResponse<NotificationPreferences>
      ) => response.data,
      providesTags: ['Notification'],
    }),

    updateNotificationPreferences: builder.mutation<
      { message: string },
      Partial<NotificationPreferences>
    >({
      query: data => ({
        url: '/api/notifications/preferences',
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiMessageResponse) => response,
      invalidatesTags: ['Notification'],
    }),

    // Event Review endpoints
    getEventReviews: builder.query<
      { data: EventReviewWithUser[]; pagination: any },
      { eventId: string; page?: number; limit?: number }
    >({
      query: ({ eventId, page = 1, limit = 20 }) => ({
        url: `/api/events/${eventId}/reviews`,
        params: { page, limit },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          data: EventReviewWithUser[];
          pagination: any;
        }>
      ): { data: EventReviewWithUser[]; pagination: any } =>
        transformPaginatedResponse(response.data, transformEventReviewResponse) as { data: EventReviewWithUser[]; pagination: any },
      providesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: eventId },
        { type: 'EventReview', id: 'LIST' },
      ],
    }),

    getEventRatingSummary: builder.query<
      {
        event_id: string;
        average_rating: number;
        total_reviews: number;
        rating_breakdown: {
          1: number;
          2: number;
          3: number;
          4: number;
          5: number;
        };
      },
      string
    >({
      query: (eventId) => `/api/events/${eventId}/reviews/summary`,
      providesTags: (_result, _error, eventId) => [
        { type: 'EventReview', id: eventId },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes (ratings don't change frequently)
    }),

    createEventReview: builder.mutation<
      EventReview,
      { eventId: string; reviewData: CreateEventReviewData }
    >({
      query: ({ eventId, reviewData }) => ({
        url: `/api/events/${eventId}/reviews`,
        method: 'POST',
        body: reviewData,
      }),
      transformResponse: (response: ApiSuccessResponse<EventReview>) =>
        response.data,
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: eventId },
        { type: 'EventReview', id: 'LIST' },
        { type: 'EventReview', id: `eligibility-${eventId}` },
        { type: 'EventReview', id: `my-${eventId}` },
        { type: 'OrganizationRating', id: 'LIST' },
      ],
    }),

    updateEventReview: builder.mutation<
      EventReview,
      { eventId: string; reviewData: Partial<CreateEventReviewData> }
    >({
      query: ({ eventId, reviewData }) => ({
        url: `/api/events/${eventId}/reviews`,
        method: 'PUT',
        body: reviewData,
      }),
      transformResponse: (response: ApiSuccessResponse<EventReview>) =>
        response.data,
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: eventId },
        { type: 'EventReview', id: 'LIST' },
        { type: 'EventReview', id: `eligibility-${eventId}` },
        { type: 'EventReview', id: `my-${eventId}` },
        { type: 'OrganizationRating', id: 'LIST' },
      ],
    }),

    deleteEventReview: builder.mutation<
      { message: string },
      { eventId: string }
    >({
      query: ({ eventId }) => ({
        url: `/api/events/${eventId}/reviews`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiMessageResponse) => response,
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: eventId },
        { type: 'EventReview', id: 'LIST' },
        { type: 'EventReview', id: `eligibility-${eventId}` },
        { type: 'EventReview', id: `my-${eventId}` },
        { type: 'OrganizationRating', id: 'LIST' },
      ],
    }),

    getUserEventReview: builder.query<EventReview | null, { eventId: string }>({
      query: ({ eventId }) => ({
        url: `/api/events/${eventId}/reviews/my`,
      }),
      transformResponse: (response: ApiSuccessResponse<EventReview | null>) =>
        response.data,
      providesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: `my-${eventId}` },
      ],
    }),

    checkReviewEligibility: builder.query<
      ReviewEligibility,
      { eventId: string }
    >({
      query: ({ eventId }) => ({
        url: `/api/events/${eventId}/reviews/eligibility`,
      }),
      transformResponse: (response: ApiSuccessResponse<ReviewEligibility>) =>
        response.data,
      providesTags: (_result, _error, { eventId }) => [
        { type: 'EventReview', id: `eligibility-${eventId}` },
      ],
    }),

    // Organization Rating endpoints
    getOrganizationRatingSummary: builder.query<
      OrganizationRatingSummary,
      { organizationId: string }
    >({
      query: ({ organizationId }) => ({
        url: `/api/organizations/${organizationId}/reviews/summary`,
      }),
      transformResponse: (
        response: ApiSuccessResponse<OrganizationRatingSummary>
      ) => response.data,
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRating', id: organizationId },
      ],
    }),

    getOrganizationReviews: builder.query<
      { data: EventReviewWithUser[]; pagination: any },
      { organizationId: string; page?: number; limit?: number }
    >({
      query: ({ organizationId, page = 1, limit = 20 }) => ({
        url: `/api/organizations/${organizationId}/reviews`,
        params: { page, limit },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          data: EventReviewWithUser[];
          pagination: any;
        }>
      ) => response.data,
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRating', id: organizationId },
        { type: 'OrganizationRating', id: 'LIST' },
      ],
    }),

    // User organization management endpoints
    getUserOrganizationsForManagement: builder.query<
      Array<{
        id: string;
        rsi_org_id: string;
        name: string;
        description?: string;
        logo_url?: string;
        is_active: boolean;
        is_hidden: boolean;
        role_name: string;
        is_owner: boolean;
        joined_at: Date;
        member_count: number;
      }>,
      void
    >({
      query: () => '/api/user/organizations',
      transformResponse: (response: ApiSuccessResponse<Array<any>>) =>
        response.data,
      providesTags: [{ type: 'UserOrganization', id: 'LIST' }],
    }),

    leaveOrganization: builder.mutation<{ message: string }, string>({
      query: spectrumId => ({
        url: `/api/user/organizations/${spectrumId}/leave`,
        method: 'POST',
      }),
      transformResponse: (response: ApiSuccessResponse<{ message: string }>) =>
        response.data,
      invalidatesTags: [
        { type: 'UserOrganization', id: 'LIST' },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    toggleOrganizationVisibility: builder.mutation<{ message: string }, string>(
      {
        query: spectrumId => ({
          url: `/api/user/organizations/${spectrumId}/toggle-visibility`,
          method: 'POST',
        }),
        transformResponse: (
          response: ApiSuccessResponse<{ message: string }>
        ) => response.data,
        invalidatesTags: [{ type: 'UserOrganization', id: 'LIST' }],
      }
    ),

    // HR System endpoints

    // HR Analytics endpoints
    getHRAnalytics: builder.query<
      import('../types/hr').HRAnalytics,
      { organizationId: string; startDate?: string; endDate?: string }
    >({
      query: ({ organizationId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const queryString = params.toString();
        return `/api/organizations/${organizationId}/hr-analytics/dashboard${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: import('../types/hr').HRAnalyticsResponse) =>
        response.data,
      providesTags: (_, __, { organizationId, startDate, endDate }) => {
        const dateRange = startDate && endDate ? `-${startDate}-${endDate}` : '';
        return [
          { type: 'HRAnalytics', id: organizationId },
          { type: 'HRAnalytics', id: `${organizationId}-dashboard${dateRange}` },
        ];
      },
      keepUnusedDataFor: 600, // Cache for 10 minutes (analytics change less frequently)
      // Disable refetch on focus for analytics (they don't need real-time updates)
    }),

    getHRReports: builder.query<
      import('../types/hr').HRAnalytics,
      { organizationId: string; reportType?: string; startDate?: string; endDate?: string }
    >({
      query: ({ organizationId, reportType, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (reportType) params.append('report_type', reportType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const queryString = params.toString();
        return `/api/organizations/${organizationId}/hr-analytics/reports${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: import('../types/hr').HRAnalyticsResponse) =>
        response.data,
      providesTags: (_, __, { organizationId }) => [
        { type: 'HRAnalytics', id: `${organizationId}-reports` },
      ],
      keepUnusedDataFor: 180, // Cache for 3 minutes (reports change more frequently)
    }),

    // Application Management endpoints
    getApplications: builder.query<
      import('../types').ListResponse<import('../types/hr').Application>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        filters?: import('../types/hr').ApplicationFilters;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: Math.min(limit, 50).toString(), // Cap limit at 50 for performance
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });

        return `/api/organizations/${organizationId}/applications?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').ApplicationListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId, page = 1, filters = {} }) => {
        const filterKey = Object.keys(filters).length > 0 ?
          `-filtered-${JSON.stringify(filters)}` : '';

        return result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Application' as const,
              id,
            })),
            { type: 'Application', id: organizationId },
            { type: 'Application', id: `${organizationId}-page-${page}${filterKey}` },
            { type: 'Application', id: `${organizationId}-list` },
          ]
          : [{ type: 'Application', id: organizationId }];
      },
      keepUnusedDataFor: 90, // Cache for 1.5 minutes (applications change frequently)
      // Enable refetch on focus for applications
    }),

    createApplication: builder.mutation<
      import('../types/hr').Application,
      { organizationId: string; data: import('../types/hr').CreateApplicationData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/applications`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').Application>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        // Invalidate all application lists for this organization
        { type: 'Application', id: `${organizationId}-list` },
        // Invalidate first page specifically (most likely to be viewed)
        { type: 'Application', id: `${organizationId}-page-1` },
        // Invalidate analytics
        { type: 'HRAnalytics', id: organizationId },
        { type: 'HRAnalytics', id: `${organizationId}-dashboard` },
        // Invalidate HR activities (new application creates activity)
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: `${organizationId}-page-1` },
      ],
      // Optimistic update for better UX
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Could add optimistic updates here if needed
        } catch {
          // Handle error if needed
        }
      },
    }),

    updateApplicationStatus: builder.mutation<
      import('../types/hr').Application,
      {
        organizationId: string;
        applicationId: string;
        data: import('../types/hr').UpdateApplicationStatusData;
      }
    >({
      query: ({ organizationId, applicationId, data }) => ({
        url: `/api/organizations/${organizationId}/applications/${applicationId}/status`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').Application>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId, applicationId }) => [
        // Invalidate specific application
        { type: 'Application', id: applicationId },
        // Invalidate all application lists (status change affects filtering)
        { type: 'Application', id: `${organizationId}-list` },
        // Invalidate analytics
        { type: 'HRAnalytics', id: organizationId },
        { type: 'HRAnalytics', id: `${organizationId}-dashboard` },
        // Invalidate HR activities (status change creates activity)
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: `${organizationId}-page-1` },
      ],
      // Optimistic update for better UX
      async onQueryStarted(_, { queryFulfilled }) {
        // Could implement optimistic updates here
        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
        }
      },
    }),

    bulkUpdateApplications: builder.mutation<
      { updated_count: number },
      {
        organizationId: string;
        applicationIds: string[];
        data: import('../types/hr').UpdateApplicationStatusData;
      }
    >({
      query: ({ organizationId, applicationIds, data }) => ({
        url: `/api/organizations/${organizationId}/applications/bulk`,
        method: 'PUT',
        body: { application_ids: applicationIds, ...data },
      }),
      transformResponse: (response: ApiSuccessResponse<{ updated_count: number }>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Application', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    // Onboarding Management endpoints
    getOnboardingTemplates: builder.query<
      import('../types/hr').OnboardingTemplate[],
      { organizationId: string }
    >({
      query: ({ organizationId }) => `/api/organizations/${organizationId}/onboarding/templates`,
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').OnboardingTemplate[]>) =>
        response.data,
      providesTags: (_, __, { organizationId }) => [
        { type: 'OnboardingProgress', id: `${organizationId}-templates` },
      ],
      keepUnusedDataFor: 600, // Cache for 10 minutes (templates don't change often)
    }),

    createOnboardingTemplate: builder.mutation<
      import('../types/hr').OnboardingTemplate,
      { organizationId: string; data: import('../types/hr').CreateOnboardingTemplateData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/onboarding/templates`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').OnboardingTemplate>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'OnboardingProgress', id: `${organizationId}-templates` },
      ],
    }),

    getOnboardingProgress: builder.query<
      import('../types').ListResponse<import('../types/hr').OnboardingProgress>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        filters?: import('../types/hr').OnboardingFilters;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });

        return `/api/organizations/${organizationId}/onboarding/progress?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').OnboardingProgressListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId }) =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'OnboardingProgress' as const,
              id,
            })),
            { type: 'OnboardingProgress', id: organizationId },
          ]
          : [{ type: 'OnboardingProgress', id: organizationId }],
      keepUnusedDataFor: 180, // Cache for 3 minutes
    }),

    updateOnboardingProgress: builder.mutation<
      import('../types/hr').OnboardingProgress,
      {
        organizationId: string;
        userId: string;
        data: import('../types/hr').UpdateOnboardingProgressData;
      }
    >({
      query: ({ organizationId, userId, data }) => ({
        url: `/api/organizations/${organizationId}/onboarding/progress/${userId}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').OnboardingProgress>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId, userId }) => [
        { type: 'OnboardingProgress', id: userId },
        { type: 'OnboardingProgress', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    completeOnboardingTask: builder.mutation<
      import('../types/hr').OnboardingProgress,
      { organizationId: string; taskId: string }
    >({
      query: ({ organizationId, taskId }) => ({
        url: `/api/organizations/${organizationId}/onboarding/tasks/${taskId}/complete`,
        method: 'POST',
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').OnboardingProgress>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'OnboardingProgress', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    // Performance Review endpoints
    getPerformanceReviews: builder.query<
      import('../types').ListResponse<import('../types/hr').PerformanceReview>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        filters?: import('../types/hr').PerformanceReviewFilters;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });

        return `/api/organizations/${organizationId}/performance/reviews?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').PerformanceReviewListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId }) =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'PerformanceReview' as const,
              id,
            })),
            { type: 'PerformanceReview', id: organizationId },
          ]
          : [{ type: 'PerformanceReview', id: organizationId }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    createPerformanceReview: builder.mutation<
      import('../types/hr').PerformanceReview,
      { organizationId: string; data: import('../types/hr').CreatePerformanceReviewData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/performance/reviews`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').PerformanceReview>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'PerformanceReview', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    updatePerformanceReview: builder.mutation<
      import('../types/hr').PerformanceReview,
      {
        organizationId: string;
        reviewId: string;
        data: Partial<import('../types/hr').CreatePerformanceReviewData>;
      }
    >({
      query: ({ organizationId, reviewId, data }) => ({
        url: `/api/organizations/${organizationId}/performance/reviews/${reviewId}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').PerformanceReview>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId, reviewId }) => [
        { type: 'PerformanceReview', id: reviewId },
        { type: 'PerformanceReview', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    getPerformanceAnalytics: builder.query<
      import('../types/hr').HRAnalytics['metrics']['performance'],
      { organizationId: string; startDate?: string; endDate?: string }
    >({
      query: ({ organizationId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const queryString = params.toString();
        return `/api/organizations/${organizationId}/performance/analytics${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').HRAnalytics['metrics']['performance']>) =>
        response.data,
      providesTags: (_, __, { organizationId }) => [
        { type: 'HRAnalytics', id: `${organizationId}-performance` },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Skills Management endpoints
    getSkills: builder.query<
      import('../types').ListResponse<import('../types/hr').Skill>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        filters?: import('../types/hr').SkillFilters;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });

        return `/api/organizations/${organizationId}/skills?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').SkillListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId, page = 1 }) =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Skill' as const,
              id,
            })),
            { type: 'Skill', id: organizationId },
            { type: 'Skill', id: `${organizationId}-page-${page}` },
            // Tag for filtered results
            { type: 'Skill', id: `${organizationId}-list` },
          ]
          : [{ type: 'Skill', id: organizationId }],
      keepUnusedDataFor: 900, // Cache for 15 minutes (skills don't change often)
      // Disable refetch on focus for skills list
    }),

    createSkill: builder.mutation<
      import('../types/hr').Skill,
      { organizationId: string; data: import('../types/hr').CreateSkillData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/skills`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').Skill>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Skill', id: organizationId },
      ],
    }),

    addUserSkill: builder.mutation<
      import('../types/hr').UserSkill,
      { organizationId: string; data: import('../types/hr').CreateUserSkillData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/skills/user`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').UserSkill>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Skill', id: organizationId },
        { type: 'HRAnalytics', id: organizationId },
      ],
    }),

    verifySkill: builder.mutation<
      import('../types/hr').UserSkill,
      {
        organizationId: string;
        skillId: string;
        data: import('../types/hr').VerifySkillData;
      }
    >({
      query: ({ organizationId, skillId, data }) => ({
        url: `/api/organizations/${organizationId}/skills/${skillId}/verify`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').UserSkill>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId, skillId }) => [
        // Invalidate specific skill
        { type: 'Skill', id: skillId },
        // Invalidate skill lists
        { type: 'Skill', id: `${organizationId}-list` },
        // Invalidate skill statistics (verification affects stats)
        { type: 'SkillStatistics', id: organizationId },
        { type: 'SkillStatistics', id: `${organizationId}-${skillId}` },
        // Invalidate analytics
        { type: 'HRAnalytics', id: organizationId },
        { type: 'HRAnalytics', id: `${organizationId}-skills` },
        // Invalidate HR activities (skill verification creates activity)
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: `${organizationId}-page-1` },
      ],
    }),

    getSkillsAnalytics: builder.query<
      import('../types/hr').HRAnalytics['metrics']['skills'],
      { organizationId: string }
    >({
      query: ({ organizationId }) => `/api/organizations/${organizationId}/skills/analytics`,
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').HRAnalytics['metrics']['skills']>) =>
        response.data,
      providesTags: (_, __, { organizationId }) => [
        { type: 'HRAnalytics', id: `${organizationId}-skills` },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Document Management endpoints
    getDocuments: builder.query<
      import('../types').ListResponse<import('../types/hr').Document>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        filters?: import('../types/hr').DocumentFilters;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, value.toString());
            }
          }
        });

        return `/api/organizations/${organizationId}/documents?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').DocumentListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId }) =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Document' as const,
              id,
            })),
            { type: 'Document', id: organizationId },
          ]
          : [{ type: 'Document', id: organizationId }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    uploadDocument: builder.mutation<
      import('../types/hr').Document,
      { organizationId: string; data: FormData }
    >({
      query: ({ organizationId, data }) => ({
        url: `/api/organizations/${organizationId}/documents`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').Document>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Document', id: organizationId },
      ],
    }),

    acknowledgeDocument: builder.mutation<
      import('../types/hr').DocumentAcknowledgment,
      { organizationId: string; documentId: string }
    >({
      query: ({ organizationId, documentId }) => ({
        url: `/api/organizations/${organizationId}/documents/${documentId}/acknowledge`,
        method: 'PUT',
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/hr').DocumentAcknowledgment>) =>
        response.data,
      invalidatesTags: (_, __, { organizationId, documentId }) => [
        // Invalidate specific document
        { type: 'Document', id: documentId },
        // Invalidate document lists
        { type: 'Document', id: `${organizationId}-list` },
        // Invalidate acknowledgment status
        { type: 'DocumentAcknowledment', id: documentId },
        { type: 'DocumentAcknowledment', id: `${organizationId}-${documentId}` },
        // Invalidate HR activities (acknowledgment creates activity)
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: `${organizationId}-page-1` },
      ],
      // Optimistic update for better UX
      async onQueryStarted({ organizationId, documentId }, { dispatch, queryFulfilled }) {
        // Optimistically update acknowledgment status
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getDocumentAcknowledmentStatus',
            { organizationId, documentId },
            (draft) => {
              draft.current_user_acknowledged = true;
              draft.current_user_acknowledged_at = new Date().toISOString();
              draft.total_acknowledged += 1;
              draft.acknowledgment_rate = draft.total_acknowledged / draft.total_required;
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
    }),

    searchDocuments: builder.query<
      import('../types').ListResponse<import('../types/hr').Document>,
      { organizationId: string; query: string; page?: number; limit?: number }
    >({
      query: ({ organizationId, query, page = 1, limit = 20 }) => {
        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          limit: limit.toString(),
        });

        return `/api/organizations/${organizationId}/documents/search?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').DocumentListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
      }),
      providesTags: (result, _, { organizationId }) =>
        result
          ? [
            ...result.data.map(({ id }) => ({
              type: 'Document' as const,
              id,
            })),
            { type: 'Document', id: `${organizationId}-search` },
          ]
          : [{ type: 'Document', id: `${organizationId}-search` }],
      keepUnusedDataFor: 120, // Cache search results for 2 minutes
    }),

    // HR Notification endpoints
    getHRNotifications: builder.query<
      NotificationListResponse,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        is_read?: boolean;
        hr_type?: 'application' | 'onboarding' | 'performance' | 'skill' | 'document' | 'analytics';
        sort_by?: string;
        sort_order?: string;
      }
    >({
      query: ({
        organizationId,
        page = 1,
        limit = 20,
        is_read,
        hr_type,
        sort_by = 'created_at',
        sort_order = 'desc',
      }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sort_by,
          sort_order,
        });
        if (is_read !== undefined) params.append('is_read', is_read.toString());
        if (hr_type) params.append('hr_type', hr_type);
        return `/api/organizations/${organizationId}/notifications/hr?${params.toString()}`;
      },
      transformResponse: (
        response: ApiSuccessResponse<NotificationListResponse>
      ) => response.data,
      providesTags: (_, __, { organizationId }) => [
        { type: 'Notification', id: `HR_${organizationId}` },
        'Notification',
      ],
      keepUnusedDataFor: 60, // Cache HR notifications for 1 minute (they change frequently)
    }),

    createHRNotification: builder.mutation<
      { success: boolean; message: string },
      {
        organizationId: string;
        entity_type: import('../types/notification').NotificationEntityType;
        entity_id: string;
        notifier_ids: string[];
        title?: string;
        message?: string;
        custom_data?: Record<string, any>;
      }
    >({
      query: ({ organizationId, ...data }) => ({
        url: `/api/organizations/${organizationId}/notifications/hr`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Notification', id: `HR_${organizationId}` },
        'Notification',
      ],
    }),

    markHRNotificationsAsRead: builder.mutation<
      { updated_count: number },
      { organizationId: string; notification_ids: string[] }
    >({
      query: ({ organizationId, notification_ids }) => ({
        url: `/api/organizations/${organizationId}/notifications/hr/mark-read`,
        method: 'POST',
        body: { notification_ids },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ updated_count: number }>
      ) => response.data,
      invalidatesTags: (_, __, { organizationId }) => [
        { type: 'Notification', id: `HR_${organizationId}` },
        'Notification',
      ],
    }),

    updateHRNotificationPreferences: builder.mutation<
      { message: string },
      Partial<NotificationPreferences>
    >({
      query: data => ({
        url: '/api/notifications/preferences/hr',
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiMessageResponse) => response,
      invalidatesTags: ['Notification'],
    }),

    // HR Event Integration endpoints
    getHREventAttendance: builder.query<
      {
        data: {
          event_id: string;
          user_id: string;
          attended: boolean;
          attendance_date: string;
          performance_notes?: string;
        }[];
        total: number;
        pagination: {
          page: number;
          limit: number;
          total: number;
        };
      },
      {
        organizationId: string;
        userId?: string;
        eventId?: string;
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: ({ organizationId, userId, eventId, page = 1, limit = 20, startDate, endDate }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (userId) params.append('user_id', userId);
        if (eventId) params.append('event_id', eventId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        return `/api/organizations/${organizationId}/hr/event-attendance?${params.toString()}`;
      },
      transformResponse: (response: ApiSuccessResponse<any>) => response.data,
      providesTags: (_, __, { organizationId, userId }) => [
        { type: 'HRAnalytics' as const, id: `${organizationId}-attendance` },
        ...(userId ? [{ type: 'User' as const, id: userId }] : []),
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    recordEventAttendance: builder.mutation<
      { success: boolean; message: string },
      {
        organizationId: string;
        eventId: string;
        attendanceData: {
          user_id: string;
          attended: boolean;
          performance_notes?: string;
        }[];
      }
    >({
      query: ({ organizationId, eventId, attendanceData }) => ({
        url: `/api/organizations/${organizationId}/hr/events/${eventId}/attendance`,
        method: 'POST',
        body: { attendance_data: attendanceData },
      }),
      invalidatesTags: (_, __, { organizationId, eventId }) => [
        { type: 'HRAnalytics', id: `${organizationId}-attendance` },
        { type: 'Event', id: eventId },
        { type: 'EventRegistrations', id: eventId },
      ],
    }),

    getHREventAnalytics: builder.query<
      {
        event_participation: {
          total_events: number;
          attended_events: number;
          attendance_rate: number;
          recent_events: {
            event_id: string;
            event_title: string;
            event_date: string;
            attended: boolean;
            performance_rating?: number;
          }[];
        };
        skill_development: {
          skills_demonstrated: string[];
          skill_verifications_earned: number;
          training_events_attended: number;
        };
        performance_correlation: {
          attendance_vs_performance: {
            high_attendance_high_performance: number;
            high_attendance_low_performance: number;
            low_attendance_high_performance: number;
            low_attendance_low_performance: number;
          };
        };
      },
      {
        organizationId: string;
        userId?: string;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: ({ organizationId, userId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const queryString = params.toString();
        return `/api/organizations/${organizationId}/hr/event-analytics${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: ApiSuccessResponse<any>) => response.data,
      providesTags: (_, __, { organizationId, userId }) => [
        { type: 'HRAnalytics' as const, id: `${organizationId}-event-analytics` },
        ...(userId ? [{ type: 'User' as const, id: userId }] : []),
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    createEventBasedSkillVerification: builder.mutation<
      { success: boolean; message: string; verification_id: string },
      {
        organizationId: string;
        eventId: string;
        userId: string;
        skillId: string;
        proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        verificationNotes?: string;
      }
    >({
      query: ({ organizationId, eventId, ...data }) => ({
        url: `/api/organizations/${organizationId}/hr/events/${eventId}/skill-verification`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { organizationId, userId }) => [
        { type: 'Skill' as const, id: `${organizationId}-${userId}` },
        { type: 'HRAnalytics' as const, id: `${organizationId}-skills` },
        { type: 'User' as const, id: userId },
      ],
    }),

    // HR Activity Feed endpoints
    getHRActivities: builder.query<
      import('../types').ListResponse<import('../types/hr').HRActivity>,
      {
        organizationId: string;
        page?: number;
        limit?: number;
        activity_types?: string[];
        date_from?: string;
        date_to?: string;
      }
    >({
      query: ({ organizationId, page = 1, limit = 20, activity_types, date_from, date_to }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (activity_types?.length) params.append('activity_types', activity_types.join(','));
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);

        return `/api/organizations/${organizationId}/hr-activities?${params.toString()}`;
      },
      transformResponse: (response: import('../types/hr').HRActivityListResponse) => ({
        data: response.data.data,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
      }),
      providesTags: (result, _, { organizationId, page = 1 }) => [
        { type: 'HRActivity', id: organizationId },
        { type: 'HRActivity', id: `${organizationId}-page-${page}` },
        { type: 'HRActivity', id: 'LIST' },
        // Tag individual activities for selective invalidation
        ...(result?.data.map(activity => ({ type: 'HRActivity' as const, id: activity.id })) || []),
      ],
      keepUnusedDataFor: 180, // 3 minutes cache (activities change frequently)
      // Enable refetch on focus for real-time updates
      // Enable refetch on reconnect
    }),

    // Skills Statistics endpoints
    getSkillsStatistics: builder.query<
      import('../types/hr').OrganizationSkillsStatistics,
      { organizationId: string }
    >({
      query: ({ organizationId }) => `/api/organizations/${organizationId}/skills/statistics`,
      transformResponse: (response: import('../types/hr').SkillsStatisticsResponse) => response.data,
      providesTags: (result, _, { organizationId }) => [
        { type: 'SkillStatistics', id: organizationId },
        // Tag individual skill statistics for selective invalidation
        ...(result ? Object.keys(result).map(skillId => ({
          type: 'SkillStatistics' as const,
          id: `${organizationId}-${skillId}`
        })) : []),
      ],
      keepUnusedDataFor: 900, // 15 minutes cache for statistics (they change less frequently)
      // Disable refetch on focus for statistics (they don't need real-time updates)
    }),

    // Document Acknowledgment Status endpoints
    getDocumentAcknowledmentStatus: builder.query<
      import('../types/hr').DocumentAcknowledmentStatus,
      { organizationId: string; documentId: string }
    >({
      query: ({ organizationId, documentId }) =>
        `/api/organizations/${organizationId}/documents/${documentId}/acknowledgments`,
      transformResponse: (response: import('../types/hr').DocumentAcknowledmentStatusResponse) => response.data,
      providesTags: (_, __, { organizationId, documentId }) => [
        { type: 'DocumentAcknowledment', id: documentId },
        { type: 'DocumentAcknowledment', id: `${organizationId}-${documentId}` },
        { type: 'Document', id: documentId },
      ],
      keepUnusedDataFor: 240, // 4 minutes cache (acknowledgments change moderately)
      // Enable refetch on focus for acknowledgment status
    }),

    // Reputation System endpoints
    searchPlayers: builder.query<
      import('../types/reputation').PlayerSearchResponse,
      import('../types/reputation').PlayerSearchQuery
    >({
      query: ({ page = 1, limit = 20, search, tags, orgs, sort }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search) params.append('search', search);
        if (tags?.length) params.append('tags', tags.join(','));
        if (orgs?.length) params.append('orgs', orgs.join(','));
        if (sort) params.append('sort', sort);
        return `/api/reputation/?${params.toString()}`;
      },
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerSearchResponse>) =>
        response.data,
      providesTags: result =>
        result ? [
          ...result.players.map(({ id }) => ({ type: 'ScPlayer' as const, id })),
          { type: 'ScPlayer', id: 'LIST' },
        ] : [{ type: 'ScPlayer', id: 'LIST' }],
      keepUnusedDataFor: 180, // 3 minutes cache
    }),

    searchPlayersByHandle: builder.mutation<
      import('../types/reputation').PlayerSearchByHandleResponse,
      { handle: string }
    >({
      query: ({ handle }) => ({
        url: '/api/reputation/search',
        method: 'POST',
        body: { handle },
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerSearchByHandleResponse>) =>
        response.data,
      invalidatesTags: (result) => [
        { type: 'ScPlayer', id: 'LIST' },
        // Invalidate specific player details for all found players
        ...(result?.users?.map(user => ({ type: 'ScPlayer' as const, id: user.spectrum_id })) || []),
      ],
    }),

    getPlayerDetails: builder.query<
      import('../types/reputation').PlayerDetails,
      string
    >({
      query: (spectrumId) => `/api/reputation/players/${spectrumId}`,
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerDetails>) =>
        response.data,
      providesTags: (result, _, spectrumId) => [
        { type: 'ScPlayer', id: spectrumId },
        // Provide tags for all related data
        ...(result?.reports?.map(report => ({ type: 'PlayerReport' as const, id: report.id })) || []),
        ...(result?.comments?.map(comment => ({ type: 'PlayerComment' as const, id: comment.id })) || []),
        ...(result?.tags?.map(tag => ({ type: 'PlayerTag' as const, id: tag.id })) || []),
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    lookupPlayer: builder.mutation<
      import('../types/reputation').ScPlayer,
      import('../types/reputation').PlayerLookupRequest
    >({
      query: (data) => ({
        url: '/api/reputation/players/lookup',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').ScPlayer>) =>
        response.data,
      invalidatesTags: (result) => [
        { type: 'ScPlayer', id: 'LIST' },
        // Invalidate specific player details
        ...(result ? [{ type: 'ScPlayer' as const, id: result.spectrum_id }] : []),
      ],
    }),

    syncPlayerData: builder.mutation<
      import('../types/reputation').ScPlayer,
      string
    >({
      query: (spectrumId) => ({
        url: `/api/reputation/players/${spectrumId}/sync`,
        method: 'PUT',
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').ScPlayer>) =>
        response.data,
      invalidatesTags: (_, __, spectrumId) => [
        { type: 'ScPlayer', id: spectrumId },
        { type: 'ScPlayer', id: 'LIST' },
      ],
    }),

    createReport: builder.mutation<
      import('../types/reputation').PlayerReport,
      import('../types/reputation').CreatePlayerReportData
    >({
      query: (data) => ({
        url: '/api/reputation/reports',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerReport>) =>
        response.data,
      invalidatesTags: (result, _, { player_id }) => [
        { type: 'PlayerReport', id: player_id },
        { type: 'ScPlayer', id: result?.player_id || player_id },
      ],
    }),

    getReportDetails: builder.query<
      import('../types/reputation').PlayerReportWithAttestations,
      string
    >({
      query: (reportId) => `/api/reputation/reports/${reportId}`,
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerReportWithAttestations>) =>
        response.data,
      providesTags: (_, __, reportId) => [
        { type: 'PlayerReport', id: reportId },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    attestToReport: builder.mutation<
      import('../types/reputation').PlayerReportAttestation,
      { reportId: string; data: import('../types/reputation').AttestReportRequest }
    >({
      query: ({ reportId, data }) => ({
        url: `/api/reputation/reports/${reportId}/attest`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerReportAttestation>) =>
        response.data,
      invalidatesTags: (result, _, { reportId }) => [
        { type: 'PlayerReport', id: reportId },
        { type: 'PlayerAttestation', id: reportId },
        // Invalidate player details cache since reports are shown there
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    addComment: builder.mutation<
      import('../types/reputation').PlayerComment,
      import('../types/reputation').CreatePlayerCommentData
    >({
      query: (data) => ({
        url: `/api/reputation/players/${data.player_id}/comments`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerComment>) =>
        response.data,
      invalidatesTags: (result, _, { player_id }) => [
        { type: 'PlayerComment', id: player_id },
        { type: 'ScPlayer', id: result?.player_id || player_id },
      ],
    }),

    attestToComment: builder.mutation<
      import('../types/reputation').PlayerCommentAttestation,
      { commentId: string; data: import('../types/reputation').AttestCommentRequest }
    >({
      query: ({ commentId, data }) => ({
        url: `/api/reputation/comments/${commentId}/attest`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerCommentAttestation>) =>
        response.data,
      invalidatesTags: (result, _, { commentId }) => [
        { type: 'PlayerComment', id: commentId },
        { type: 'PlayerAttestation', id: commentId },
        // Invalidate player details cache since comments are shown there
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    addTag: builder.mutation<
      import('../types/reputation').PlayerTag,
      import('../types/reputation').CreatePlayerTagData
    >({
      query: (data) => ({
        url: `/api/reputation/players/${data.player_id}/tags`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerTag>) =>
        response.data,
      invalidatesTags: (result, _, { player_id }) => [
        { type: 'PlayerTag', id: player_id },
        { type: 'ScPlayer', id: result?.player_id || player_id },
      ],
    }),

    attestToTag: builder.mutation<
      import('../types/reputation').PlayerTagAttestation,
      { tagId: string; data: import('../types/reputation').AttestTagRequest }
    >({
      query: ({ tagId, data }) => ({
        url: `/api/reputation/tags/${tagId}/attest`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').PlayerTagAttestation>) =>
        response.data,
      invalidatesTags: (result, _, { tagId }) => [
        { type: 'PlayerTag', id: tagId },
        { type: 'PlayerAttestation', id: tagId },
        // Invalidate player details cache since tags are shown there
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    // Enhanced Reporting System Endpoints

    // Organization Reports
    createOrganizationReport: builder.mutation<
      import('../types/reputation').OrganizationReport,
      import('../types/reputation').CreateOrganizationReportData
    >({
      query: (data) => ({
        url: '/api/reputation/organization-reports',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').OrganizationReport>) =>
        response.data,
      invalidatesTags: (result, _, { player_id }) => [
        { type: 'OrganizationReport', id: player_id },
        { type: 'ScPlayer', id: result?.player_id || player_id },
      ],
    }),

    getOrganizationReportsByPlayer: builder.query<
      { reports: import('../types/reputation').OrganizationReport[]; total: number },
      { playerId: string; page?: number; limit?: number }
    >({
      query: ({ playerId, page = 1, limit = 20 }) =>
        `/api/reputation/players/${playerId}/organization-reports?page=${page}&limit=${limit}`,
      transformResponse: (response: ApiSuccessResponse<{ reports: import('../types/reputation').OrganizationReport[]; total: number }>) =>
        response.data,
      providesTags: (_, __, { playerId }) => [
        { type: 'OrganizationReport', id: playerId },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    voteOnOrganizationReport: builder.mutation<
      import('../types/reputation').OrganizationReportCorroboration,
      { reportId: string; data: import('../types/reputation').CreateOrganizationReportCorroborationData }
    >({
      query: ({ reportId, data }) => ({
        url: `/api/reputation/organization-reports/${reportId}/corroborate`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').OrganizationReportCorroboration>) =>
        response.data,
      invalidatesTags: (result, _, { reportId }) => [
        { type: 'OrganizationReportCorroboration', id: reportId },
        { type: 'OrganizationReport', id: reportId },
        // Invalidate player details cache to refresh vote counts
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    // Alt Account Reports
    createAltAccountReport: builder.mutation<
      import('../types/reputation').AltAccountReport,
      import('../types/reputation').CreateAltAccountReportData
    >({
      query: (data) => ({
        url: '/api/reputation/alt-account-reports',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').AltAccountReport>) =>
        response.data,
      invalidatesTags: (result, _, { main_player_id }) => [
        { type: 'AltAccountReport', id: main_player_id },
        { type: 'ScPlayer', id: result?.player_id || main_player_id },
      ],
    }),

    getAltAccountReportsByPlayer: builder.query<
      { reports: import('../types/reputation').AltAccountReport[]; total: number },
      { playerId: string; page?: number; limit?: number }
    >({
      query: ({ playerId, page = 1, limit = 20 }) =>
        `/api/reputation/players/${playerId}/alt-account-reports?page=${page}&limit=${limit}`,
      transformResponse: (response: ApiSuccessResponse<{ reports: import('../types/reputation').AltAccountReport[]; total: number }>) =>
        response.data,
      providesTags: (_, __, { playerId }) => [
        { type: 'AltAccountReport', id: playerId },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    voteOnAltAccountReport: builder.mutation<
      import('../types/reputation').AltAccountReportCorroboration,
      { reportId: string; data: import('../types/reputation').CreateAltAccountReportCorroborationData }
    >({
      query: ({ reportId, data }) => ({
        url: `/api/reputation/alt-account-reports/${reportId}/corroborate`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').AltAccountReportCorroboration>) =>
        response.data,
      invalidatesTags: (result, _, { reportId }) => [
        { type: 'AltAccountReportCorroboration', id: reportId },
        { type: 'AltAccountReport', id: reportId },
        // Invalidate player details cache to refresh vote counts
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    // Affiliated People Reports
    createAffiliatedPeopleReport: builder.mutation<
      import('../types/reputation').AffiliatedPeopleReport,
      import('../types/reputation').CreateAffiliatedPeopleReportData
    >({
      query: (data) => ({
        url: '/api/reputation/affiliated-people-reports',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').AffiliatedPeopleReport>) =>
        response.data,
      invalidatesTags: (result, _, { main_player_id }) => [
        { type: 'AffiliatedPeopleReport', id: main_player_id },
        { type: 'ScPlayer', id: result?.player_id || main_player_id },
      ],
    }),

    getAffiliatedPeopleReportsByPlayer: builder.query<
      { reports: import('../types/reputation').AffiliatedPeopleReport[]; total: number },
      { playerId: string; page?: number; limit?: number }
    >({
      query: ({ playerId, page = 1, limit = 20 }) =>
        `/api/reputation/players/${playerId}/affiliated-people-reports?page=${page}&limit=${limit}`,
      transformResponse: (response: ApiSuccessResponse<{ reports: import('../types/reputation').AffiliatedPeopleReport[]; total: number }>) =>
        response.data,
      providesTags: (_, __, { playerId }) => [
        { type: 'AffiliatedPeopleReport', id: playerId },
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    voteOnAffiliatedPeopleReport: builder.mutation<
      import('../types/reputation').AffiliatedPeopleReportCorroboration,
      { reportId: string; data: import('../types/reputation').CreateAffiliatedPeopleReportCorroborationData }
    >({
      query: ({ reportId, data }) => ({
        url: `/api/reputation/affiliated-people-reports/${reportId}/corroborate`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiSuccessResponse<import('../types/reputation').AffiliatedPeopleReportCorroboration>) =>
        response.data,
      invalidatesTags: (result, _, { reportId }) => [
        { type: 'AffiliatedPeopleReportCorroboration', id: reportId },
        { type: 'AffiliatedPeopleReport', id: reportId },
        // Invalidate player details cache to refresh vote counts
        ...(result?.player_id ? [{ type: 'ScPlayer' as const, id: result.player_id }] : []),
      ],
    }),

    // Delete/Remove vote mutations
    removeCommentAttestation: builder.mutation<
      void,
      { commentId: string }
    >({
      query: ({ commentId }) => ({
        url: `/api/reputation/comments/${commentId}/attest`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { commentId }) => [
        { type: 'PlayerComment', id: commentId },
        { type: 'PlayerAttestation', id: commentId },
        { type: 'ScPlayer', id: 'LIST' }, // Invalidate all player caches
      ],
    }),

    removeTagAttestation: builder.mutation<
      void,
      { tagId: string }
    >({
      query: ({ tagId }) => ({
        url: `/api/reputation/tags/${tagId}/attest`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tagId }) => [
        { type: 'PlayerTag', id: tagId },
        { type: 'PlayerAttestation', id: tagId },
        { type: 'ScPlayer', id: 'LIST' }, // Invalidate all player caches
      ],
    }),

    removeOrganizationReportVote: builder.mutation<
      void,
      { reportId: string }
    >({
      query: ({ reportId }) => ({
        url: `/api/reputation/organization-reports/${reportId}/corroborate`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { reportId }) => [
        { type: 'OrganizationReportCorroboration', id: reportId },
        { type: 'OrganizationReport', id: reportId },
        { type: 'ScPlayer', id: 'LIST' }, // Invalidate all player caches
      ],
    }),

    removeAltAccountReportVote: builder.mutation<
      void,
      { reportId: string }
    >({
      query: ({ reportId }) => ({
        url: `/api/reputation/alt-account-reports/${reportId}/corroborate`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { reportId }) => [
        { type: 'AltAccountReportCorroboration', id: reportId },
        { type: 'AltAccountReport', id: reportId },
        { type: 'ScPlayer', id: 'LIST' }, // Invalidate all player caches
      ],
    }),

    removeAffiliatedPeopleReportVote: builder.mutation<
      void,
      { reportId: string }
    >({
      query: ({ reportId }) => ({
        url: `/api/reputation/affiliated-people-reports/${reportId}/corroborate`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { reportId }) => [
        { type: 'AffiliatedPeopleReportCorroboration', id: reportId },
        { type: 'AffiliatedPeopleReport', id: reportId },
        { type: 'ScPlayer', id: 'LIST' }, // Invalidate all player caches
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  // Organization hooks
  useGetOrganizationsQuery,
  useGetOrganizationQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useSearchOrganizationsQuery,
  useVerifyOrganizationMutation,
  useGetUserVerificationCodeQuery,

  // Discord server hooks
  useGetOrganizationDiscordServerQuery,
  useGetUserDiscordServersQuery,
  useDisconnectDiscordServerMutation,
  useSyncOrganizationDiscordEventsMutation,

  // Organization upvote hooks
  useUpvoteOrganizationMutation,
  useRemoveUpvoteMutation,
  useGetUpvoteStatusQuery,

  // Event hooks
  useGetEventsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useSendEventNotificationMutation,
  useGetEventNotificationUsageQuery,
  useMarkNotificationAsReadMutation,
  useMarkEventNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useBulkMarkAllAsReadMutation,
  useBulkDeleteAllNotificationsMutation,
  useDeleteEventMutation,
  useSearchEventsQuery,
  useGetEventsByOrganizationQuery,
  useRegisterForEventMutation,
  useUnregisterFromEventMutation,
  useGetEventRegistrationsQuery,
  useGetUserEventsQuery,
  useGetUpcomingEventsQuery,
  useGetPrivateEventsQuery,

  // Home page hooks
  useGetFeaturedOrganizationsQuery,
  useGetHomePageStatsQuery,
  useGetUpcomingEventsHomeQuery,

  // Comment hooks
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,

  // User hooks
  useGetCurrentUserQuery,
  useGetPublicUserProfileQuery,
  useUpdateProfileMutation,
  useVerifyRsiAccountMutation,
  useGenerateVerificationCodeMutation,
  useLogoutMutation,

  // User organization management hooks
  useGetUserOrganizationsForManagementQuery,
  useLeaveOrganizationMutation,
  useToggleOrganizationVisibilityMutation,

  // Authentication hooks
  useLoginWithDiscordMutation,

  // Dashboard hooks
  useGetUserDashboardStatsQuery,
  useGetUserRatingSummaryQuery,
  useGetUserDashboardOrganizationsQuery,
  useGetUserDashboardEventsQuery,
  useGetUserActivityQuery,

  // Analytics hooks
  useGetOrganizationAnalyticsQuery,
  useGetEventAnalyticsQuery,

  // Role Management hooks
  useGetOrganizationRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetOrganizationMembersQuery,
  useAssignRoleMutation,
  useRemoveMemberMutation,
  useGetInviteCodesQuery,
  useGenerateInviteCodeMutation,
  useDeleteInviteCodeMutation,
  useJoinWithInviteMutation,
  useGetAvailablePermissionsQuery,

  // Notification hooks
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useGetNotificationByIdQuery,
  useUpdateNotificationMutation,
  useMarkNotificationsAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationsMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,

  // Event Review hooks
  useGetEventReviewsQuery,
  useGetEventRatingSummaryQuery,
  useCreateEventReviewMutation,
  useUpdateEventReviewMutation,
  useDeleteEventReviewMutation,
  useGetUserEventReviewQuery,
  useCheckReviewEligibilityQuery,

  // Organization Rating hooks
  useGetOrganizationRatingSummaryQuery,
  useGetOrganizationReviewsQuery,

  // Reputation System hooks
  useSearchPlayersQuery,
  useSearchPlayersByHandleMutation,
  useGetPlayerDetailsQuery,
  useLookupPlayerMutation,
  useSyncPlayerDataMutation,
  useCreateReportMutation,
  useGetReportDetailsQuery,
  useAttestToReportMutation,
  useAddCommentMutation,
  useAttestToCommentMutation,
  useAddTagMutation,
  useAttestToTagMutation,

  // Enhanced Reporting System hooks
  useCreateOrganizationReportMutation,
  useGetOrganizationReportsByPlayerQuery,
  useVoteOnOrganizationReportMutation,
  useCreateAltAccountReportMutation,
  useGetAltAccountReportsByPlayerQuery,
  useVoteOnAltAccountReportMutation,
  useCreateAffiliatedPeopleReportMutation,
  useGetAffiliatedPeopleReportsByPlayerQuery,
  useVoteOnAffiliatedPeopleReportMutation,

  // Delete/Remove vote hooks
  useRemoveCommentAttestationMutation,
  useRemoveTagAttestationMutation,
  useRemoveOrganizationReportVoteMutation,
  useRemoveAltAccountReportVoteMutation,
  useRemoveAffiliatedPeopleReportVoteMutation,

  // HR System hooks

  // HR Analytics hooks
  useGetHRAnalyticsQuery,
  useGetHRReportsQuery,

  // Application Management hooks
  useGetApplicationsQuery,
  useCreateApplicationMutation,
  useUpdateApplicationStatusMutation,
  useBulkUpdateApplicationsMutation,

  // Onboarding Management hooks
  useGetOnboardingTemplatesQuery,
  useCreateOnboardingTemplateMutation,
  useGetOnboardingProgressQuery,
  useUpdateOnboardingProgressMutation,
  useCompleteOnboardingTaskMutation,

  // Performance Review hooks
  useGetPerformanceReviewsQuery,
  useCreatePerformanceReviewMutation,
  useUpdatePerformanceReviewMutation,
  useGetPerformanceAnalyticsQuery,

  // Skills Management hooks
  useGetSkillsQuery,
  useCreateSkillMutation,
  useAddUserSkillMutation,
  useVerifySkillMutation,
  useGetSkillsAnalyticsQuery,

  // Document Management hooks
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useAcknowledgeDocumentMutation,
  useSearchDocumentsQuery,

  // HR Notification hooks
  useGetHRNotificationsQuery,
  useCreateHRNotificationMutation,
  useMarkHRNotificationsAsReadMutation,
  useUpdateHRNotificationPreferencesMutation,

  // HR Event Integration hooks
  useGetHREventAttendanceQuery,
  useRecordEventAttendanceMutation,
  useGetHREventAnalyticsQuery,
  useCreateEventBasedSkillVerificationMutation,

  // HR Activity Feed hooks
  useGetHRActivitiesQuery,

  // Skills Statistics hooks
  useGetSkillsStatisticsQuery,

  // Document Acknowledgment Status hooks
  useGetDocumentAcknowledmentStatusQuery,
} = apiSlice;
