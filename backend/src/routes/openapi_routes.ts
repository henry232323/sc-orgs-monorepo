import { Router } from 'express';
import { VALID_PLAYSTYLE_TAGS, VALID_ACTIVITY_TAGS } from '../utils/tagValidation';
import openapi from "@wesleytodd/openapi"
import { OpenAPIV3 } from "openapi-types"
import * as commonSchemas from '../schemas/common';
import * as authSchemas from '../schemas/auth';
import * as organizationSchemas from '../schemas/organization';
import * as userSchemas from '../schemas/user';
import * as eventSchemas from '../schemas/event';
import * as commentSchemas from '../schemas/comment';
import * as roleSchemas from '../schemas/role';
import * as notificationSchemas from '../schemas/notification';
import * as discordSchemas from '../schemas/discord';

const router: Router = Router();

const document: OpenAPIV3.Document = {
  paths: {},
  openapi: "3.1.0",
  info: {
    title: "SC Market OpenAPI Definition",
    description: "The internal API for the SC Market site - A platform for Star Citizen organizations to connect, share events, and build communities.",
    version: "1.0.0",
    contact: {
      name: "SC Market API Support",
      email: "support@sc-orgs.space"
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT"
    }
  },
  servers: [
    {
      url: 'https://api.sc-orgs.space',
      description: 'Production server'
    },
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  components: {
    schemas: {
      // Common schemas
      Error: commonSchemas.ErrorSchema,
      Pagination: commonSchemas.PaginationSchema,
      SuccessResponse: commonSchemas.SuccessResponseSchema,
      ValidationError: commonSchemas.ValidationErrorSchema,
      UnauthorizedError: commonSchemas.UnauthorizedErrorSchema,
      ForbiddenError: commonSchemas.ForbiddenErrorSchema,
      NotFoundError: commonSchemas.NotFoundErrorSchema,
      InternalServerError: commonSchemas.InternalServerErrorSchema,
      
      // Authentication schemas
      User: authSchemas.UserSchema,
      AuthSuccessResponse: authSchemas.AuthSuccessResponseSchema,
      AuthFailureResponse: authSchemas.AuthFailureResponseSchema,
      VerifyRsiRequest: authSchemas.VerifyRsiRequestSchema,
      VerifyRsiResponse: authSchemas.VerifyRsiResponseSchema,
      GenerateVerificationCodeResponse: authSchemas.GenerateVerificationCodeResponseSchema,
      Activity: authSchemas.ActivitySchema,
      ActivityListResponse: authSchemas.ActivityListResponseSchema,
      
      // Organization schemas
      Organization: organizationSchemas.OrganizationSchema,
      CreateOrganizationRequest: organizationSchemas.CreateOrganizationRequestSchema,
      UpdateOrganizationRequest: organizationSchemas.UpdateOrganizationRequestSchema,
      OrganizationListResponse: organizationSchemas.OrganizationListResponseSchema,
      OrganizationSearchRequest: organizationSchemas.OrganizationSearchRequestSchema,
      OrganizationAnalytics: organizationSchemas.OrganizationAnalyticsSchema,
      
      // User schemas
      UserProfile: userSchemas.UserProfileSchema,
      PublicUserProfile: userSchemas.PublicUserProfileSchema,
      UserOrganization: userSchemas.UserOrganizationSchema,
      UserOrganizationsResponse: userSchemas.UserOrganizationsResponseSchema,
      LeaveOrganizationRequest: userSchemas.LeaveOrganizationRequestSchema,
      ToggleVisibilityRequest: userSchemas.ToggleVisibilityRequestSchema,
      UserSuccessResponse: userSchemas.UserSuccessResponseSchema,
      
      // Event schemas
      Event: eventSchemas.EventSchema,
      CreateEventRequest: eventSchemas.CreateEventRequestSchema,
      UpdateEventRequest: eventSchemas.UpdateEventRequestSchema,
      EventSearchRequest: eventSchemas.EventSearchRequestSchema,
      EventListResponse: eventSchemas.EventListResponseSchema,
      EventRegistration: eventSchemas.EventRegistrationSchema,
      EventRegistrationsResponse: eventSchemas.EventRegistrationsResponseSchema,
      EventReview: eventSchemas.EventReviewSchema,
      CreateEventReviewRequest: eventSchemas.CreateEventReviewRequestSchema,
      UpdateEventReviewRequest: eventSchemas.UpdateEventReviewRequestSchema,
      EventReviewsResponse: eventSchemas.EventReviewsResponseSchema,
      EventRatingSummary: eventSchemas.EventRatingSummarySchema,
      EventRatingSummaryResponse: eventSchemas.EventRatingSummaryResponseSchema,
      EventNotificationUsage: eventSchemas.EventNotificationUsageSchema,
      EventNotificationUsageResponse: eventSchemas.EventNotificationUsageResponseSchema,
      SendNotificationRequest: eventSchemas.SendNotificationRequestSchema,
      EventAnalytics: eventSchemas.EventAnalyticsSchema,
      EventAnalyticsResponse: eventSchemas.EventAnalyticsResponseSchema,
      ReviewEligibility: eventSchemas.ReviewEligibilitySchema,
      ReviewEligibilityResponse: eventSchemas.ReviewEligibilityResponseSchema,
      
      // Comment schemas
      Comment: commentSchemas.CommentSchema,
      CreateCommentRequest: commentSchemas.CreateCommentRequestSchema,
      UpdateCommentRequest: commentSchemas.UpdateCommentRequestSchema,
      CommentListResponse: commentSchemas.CommentListResponseSchema,
      CommentResponse: commentSchemas.CommentResponseSchema,
      VoteResponse: commentSchemas.VoteResponseSchema,
      
      // Role schemas
      Permission: roleSchemas.PermissionSchema,
      Role: roleSchemas.RoleSchema,
      CreateRoleRequest: roleSchemas.CreateRoleRequestSchema,
      UpdateRoleRequest: roleSchemas.UpdateRoleRequestSchema,
      OrganizationMember: roleSchemas.OrganizationMemberSchema,
      AssignRoleRequest: roleSchemas.AssignRoleRequestSchema,
      PermissionsResponse: roleSchemas.PermissionsResponseSchema,
      RolesResponse: roleSchemas.RolesResponseSchema,
      RoleResponse: roleSchemas.RoleResponseSchema,
      MembersResponse: roleSchemas.MembersResponseSchema,
      
      // Notification schemas
      Notification: notificationSchemas.NotificationSchema,
      NotificationStats: notificationSchemas.NotificationStatsSchema,
      NotificationPreferences: notificationSchemas.NotificationPreferencesSchema,
      CreateNotificationRequest: notificationSchemas.CreateNotificationRequestSchema,
      UpdateNotificationRequest: notificationSchemas.UpdateNotificationRequestSchema,
      MarkReadRequest: notificationSchemas.MarkReadRequestSchema,
      UpdatePreferencesRequest: notificationSchemas.UpdatePreferencesRequestSchema,
      DeleteNotificationsRequest: notificationSchemas.DeleteNotificationsRequestSchema,
      NotificationsResponse: notificationSchemas.NotificationsResponseSchema,
      NotificationResponse: notificationSchemas.NotificationResponseSchema,
      NotificationStatsResponse: notificationSchemas.NotificationStatsResponseSchema,
      NotificationPreferencesResponse: notificationSchemas.NotificationPreferencesResponseSchema,
      
      // Discord schemas
      DiscordServer: discordSchemas.DiscordServerSchema,
      DiscordWebhook: discordSchemas.DiscordWebhookSchema,
      DiscordSyncStats: discordSchemas.DiscordSyncStatsSchema,
      DiscordHealthCheck: discordSchemas.DiscordHealthCheckSchema,
      DiscordServersResponse: discordSchemas.DiscordServersResponseSchema,
      DiscordServerResponse: discordSchemas.DiscordServerResponseSchema,
      DiscordSyncStatsResponse: discordSchemas.DiscordSyncStatsResponseSchema,
      DiscordHealthCheckResponse: discordSchemas.DiscordHealthCheckResponseSchema,
      SyncEventsRequest: discordSchemas.SyncEventsRequestSchema,
      WebhookResponse: discordSchemas.WebhookResponseSchema
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from Discord OAuth authentication'
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session cookie for authentication'
      }
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UnauthorizedError' }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ForbiddenError' }
          }
        }
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NotFoundError' }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InternalServerError' }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Organizations',
      description: 'Organization management and discovery endpoints'
    },
    {
      name: 'Users',
      description: 'User profile and management endpoints'
    },
    {
      name: 'Events',
      description: 'Event creation and management endpoints'
    },
    {
      name: 'Comments',
      description: 'Comment and interaction endpoints'
    },
    {
      name: 'Roles',
      description: 'Role and permission management endpoints'
    },
    {
      name: 'Notifications',
      description: 'User notification endpoints'
    },
    {
      name: 'Discord',
      description: 'Discord integration endpoints'
    }
  ]
}

// Create the OpenAPI instance with route discovery
export const oapi = openapi(document)

router.use(oapi)
router.get('/ui', oapi.swaggerui());

export default router;
