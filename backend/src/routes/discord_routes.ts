import { Router } from 'express';
import { DiscordController } from '../controllers/discord_controller';
import { DiscordService } from '../services/discord_service';
import { authenticateJWT } from '../middleware/auth';
import { resolveOrganization } from '../middleware/organization_resolver';
import { requireOrganizationPermission, requireResolvedOrganizationPermission } from '../middleware/permissions';
import { oapi } from './openapi_routes';

const router = Router();
const discordController = new DiscordController();
const discordService = new DiscordService();

// Discord Server Management Routes

/**
 * @route GET /api/organizations/:rsi_org_id/discord/servers
 * @desc Get Discord server information for an organization (read-only)
 * @access Private (Organization Member)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Get organization Discord server',
  description: 'Get Discord server information for a specific organization',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'rsi_org_id',
      in: 'path',
      required: true,
      description: 'RSI organization ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Discord server information retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DiscordServerResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/organizations/:rsi_org_id/discord/servers',
  resolveOrganization,
  requireResolvedOrganizationPermission('VIEW_ORGANIZATION'),
  (req, res) => discordController.getDiscordServer(req, res)
);

/**
 * @route DELETE /api/organizations/:rsi_org_id/discord/servers
 * @desc Disconnect Discord server from organization
 * @access Private (Organization Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Disconnect Discord server',
  description: 'Disconnect Discord server from organization',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'rsi_org_id',
      in: 'path',
      required: true,
      description: 'RSI organization ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Discord server disconnected successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/organizations/:rsi_org_id/discord/servers',
  resolveOrganization,
  requireResolvedOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.disconnectDiscordServer(req, res)
);

// Discord Event Management Routes
// Utility Routes

/**
 * @route GET /api/discord/user-servers
 * @desc Get Discord servers connected to user's organizations (read-only)
 * @access Private (Authenticated User)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Get user Discord servers',
  description: 'Get Discord servers connected to user organizations',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'User Discord servers retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DiscordServersResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/discord/user-servers',
  (req, res) => discordController.getUserDiscordServers(req, res)
);

/**
 * @route POST /api/discord/webhook
 * @desc Handle Discord webhook interactions (slash commands)
 * @access Public (Discord webhook with signature validation)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Handle Discord webhook',
  description: 'Handle Discord webhook interactions and slash commands',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/DiscordWebhook' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Webhook handled successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/WebhookResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/discord/webhook',
  discordService.client.validateSignature,
  (req, res) => discordController.handleDiscordWebhook(req, res)
);

/**
 * @route GET /api/discord/health
 * @desc Check Discord service health
 * @access Public
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Discord health check',
  description: 'Check the health status of Discord services',
  responses: {
    '200': {
      description: 'Health check completed successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DiscordHealthCheckResponse' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/discord/health',
  (req, res) => discordController.healthCheck(req, res)
);

/**
 * @route POST /api/discord/register-commands
 * @desc Register Discord slash commands
 * @access Private (Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Register Discord slash commands',
  description: 'Register Discord slash commands for the application',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Slash commands registered successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/discord/register-commands',
  requireOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.registerSlashCommands(req, res)
);

// Bulk Synchronization Routes

/**
 * @route POST /api/discord/sync/pending
 * @desc Sync all pending Discord events
 * @access Private (Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Sync pending Discord events',
  description: 'Sync all pending Discord events',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Pending events synced successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/discord/sync/pending',
  requireOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.syncAllPendingEvents(req, res)
);

/**
 * @route POST /api/discord/sync/retry-failed
 * @desc Retry all failed Discord events
 * @access Private (Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Retry failed Discord events',
  description: 'Retry all failed Discord event synchronizations',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Failed events retried successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/discord/sync/retry-failed',
  requireOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.retryFailedEvents(req, res)
);

/**
 * @route POST /api/organizations/:rsi_org_id/discord/sync-events
 * @desc Sync all events for a specific organization
 * @access Private (Organization Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Sync organization Discord events',
  description: 'Sync all Discord events for a specific organization',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'rsi_org_id',
      in: 'path',
      required: true,
      description: 'RSI organization ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/SyncEventsRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Organization events synced successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/organizations/:rsi_org_id/discord/sync-events',
  resolveOrganization,
  requireResolvedOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.syncOrganizationEvents(req, res)
);

/**
 * @route GET /api/discord/sync/stats
 * @desc Get Discord event sync statistics
 * @access Private (Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Get Discord sync statistics',
  description: 'Get Discord event synchronization statistics',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Sync statistics retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/DiscordSyncStatsResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/discord/sync/stats',
  requireOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.getSyncStats(req, res)
);

/**
 * @route POST /api/discord/sync/cleanup
 * @desc Cleanup cancelled Discord events
 * @access Private (Admin)
 */
oapi.path({
  tags: ['Discord'],
  summary: 'Cleanup cancelled Discord events',
  description: 'Cleanup cancelled Discord events from the system',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Cancelled events cleaned up successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/discord/sync/cleanup',
  requireOrganizationPermission('MANAGE_ORGANIZATION'),
  (req, res) => discordController.cleanupCancelledEvents(req, res)
);

export default router;
