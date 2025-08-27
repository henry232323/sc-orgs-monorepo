/**
 * Discord-related OpenAPI schemas
 */

// Discord Server Schema
export const DiscordServerSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Discord server ID'
    },
    name: {
      type: 'string' as const,
      description: 'Discord server name'
    },
    icon: {
      type: 'string' as const,
      description: 'Discord server icon URL',
      nullable: true
    },
    memberCount: {
      type: 'integer' as const,
      description: 'Number of members in the server'
    },
    organizationId: {
      type: 'string' as const,
      description: 'Associated organization ID'
    },
    isConnected: {
      type: 'boolean' as const,
      description: 'Whether the server is connected to the organization'
    },
    connectedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When the server was connected',
      nullable: true
    }
  },
  required: ['id', 'name', 'memberCount', 'organizationId', 'isConnected']
};

// Discord Webhook Schema
export const DiscordWebhookSchema = {
  type: 'object' as const,
  properties: {
    type: {
      type: 'integer' as const,
      description: 'Webhook type (1 = PING, 2 = APPLICATION_COMMAND)'
    },
    data: {
      type: 'object' as const,
      description: 'Webhook data',
      nullable: true
    },
    token: {
      type: 'string' as const,
      description: 'Webhook token',
      nullable: true
    }
  },
  required: ['type']
};

// Discord Sync Stats Schema
export const DiscordSyncStatsSchema = {
  type: 'object' as const,
  properties: {
    totalEvents: {
      type: 'integer' as const,
      description: 'Total number of events'
    },
    syncedEvents: {
      type: 'integer' as const,
      description: 'Number of successfully synced events'
    },
    pendingEvents: {
      type: 'integer' as const,
      description: 'Number of pending events'
    },
    failedEvents: {
      type: 'integer' as const,
      description: 'Number of failed events'
    },
    cancelledEvents: {
      type: 'integer' as const,
      description: 'Number of cancelled events'
    },
    lastSyncAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Last sync timestamp',
      nullable: true
    }
  },
  required: ['totalEvents', 'syncedEvents', 'pendingEvents', 'failedEvents', 'cancelledEvents']
};

// Discord Health Check Schema
export const DiscordHealthCheckSchema = {
  type: 'object' as const,
  properties: {
    status: {
      type: 'string' as const,
      description: 'Service status',
      enum: ['healthy', 'unhealthy', 'degraded']
    },
    timestamp: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Health check timestamp'
    },
    services: {
      type: 'object' as const,
      properties: {
        discord: {
          type: 'string' as const,
          description: 'Discord API status'
        },
        database: {
          type: 'string' as const,
          description: 'Database status'
        },
        redis: {
          type: 'string' as const,
          description: 'Redis status'
        }
      },
      description: 'Individual service statuses'
    }
  },
  required: ['status', 'timestamp', 'services']
};

// Discord Servers Response Schema
export const DiscordServersResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/DiscordServer'
      },
      description: 'List of Discord servers'
    }
  },
  required: ['success', 'data']
};

// Discord Server Response Schema
export const DiscordServerResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/DiscordServer'
    }
  },
  required: ['success', 'data']
};

// Discord Sync Stats Response Schema
export const DiscordSyncStatsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/DiscordSyncStats'
    }
  },
  required: ['success', 'data']
};

// Discord Health Check Response Schema
export const DiscordHealthCheckResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/DiscordHealthCheck'
    }
  },
  required: ['success', 'data']
};

// Sync Events Request Schema
export const SyncEventsRequestSchema = {
  type: 'object' as const,
  properties: {
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID to sync events for'
    },
    force: {
      type: 'boolean' as const,
      description: 'Force sync even if already synced',
      default: false
    }
  },
  required: ['organizationId']
};

// Webhook Response Schema
export const WebhookResponseSchema = {
  type: 'object' as const,
  properties: {
    type: {
      type: 'integer' as const,
      description: 'Response type'
    },
    data: {
      type: 'object' as const,
      description: 'Response data',
      nullable: true
    }
  },
  required: ['type']
};
