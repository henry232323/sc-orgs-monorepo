import { VALID_PLAYSTYLE_TAGS, VALID_ACTIVITY_TAGS } from '../utils/tagValidation';
import { VALID_LANGUAGES } from '../utils/languageValidation';
/**
 * Organization-related OpenAPI schemas
 */

export const OrganizationSchema = {
  type: 'object' as const,
  properties: {
    id: { 
      type: 'string' as const,
      description: 'Internal organization ID'
    },
    rsi_org_id: { 
      type: 'string' as const,
      description: 'RSI organization ID'
    },
    name: { 
      type: 'string' as const,
      description: 'Organization name'
    },
    description: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization description'
    },
    website: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization website URL'
    },
    discord_invite: { 
      type: 'string' as const,
      nullable: true,
      description: 'Discord server invite link'
    },
    spectrum_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Spectrum organization URL'
    },
    logo_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization logo URL'
    },
    banner_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization banner URL'
    },
    playstyle_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_PLAYSTYLE_TAGS]
      },
      description: 'Organization playstyle tags'
    },
    activity_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_ACTIVITY_TAGS]
      },
      description: 'Organization activity tags'
    },
    languages: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_LANGUAGES]
      },
      description: 'Languages spoken by the organization',
      minItems: 1,
      maxItems: 10
    },
    member_count: { 
      type: 'integer' as const,
      description: 'Number of members'
    },
    is_active: { 
      type: 'boolean' as const,
      description: 'Whether the organization is active'
    },
    created_at: { 
      type: 'string' as const, 
      format: 'date-time' as const,
      description: 'Organization creation timestamp'
    },
    updated_at: { 
      type: 'string' as const, 
      format: 'date-time' as const,
      description: 'Last update timestamp'
    }
  },
  required: ['id', 'rsi_org_id', 'name', 'playstyle_tags', 'activity_tags', 'languages', 'member_count', 'is_active', 'created_at', 'updated_at']
};

export const CreateOrganizationRequestSchema = {
  type: 'object' as const,
  properties: {
    rsi_org_id: { 
      type: 'string' as const,
      description: 'RSI organization ID',
      minLength: 1
    },
    description: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization description',
      maxLength: 1000
    },
    website: { 
      type: 'string' as const,
      description: 'Organization website URL',
      anyOf: [
        { const: '' },
        { format: 'uri' as const }
      ]
    },
    discord_invite: { 
      type: 'string' as const,
      description: 'Discord server invite link',
      anyOf: [
        { const: '' },
        { format: 'uri' as const }
      ]
    },
    spectrum_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Spectrum organization URL',
      format: 'uri' as const
    },
    logo_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization logo URL',
      format: 'uri' as const
    },
    banner_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization banner URL',
      format: 'uri' as const
    },
    playstyle_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_PLAYSTYLE_TAGS]
      },
      description: 'Organization playstyle tags',
      minItems: 1,
      maxItems: 5
    },
    focus_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_ACTIVITY_TAGS]
      },
      description: 'Organization activity tags',
      minItems: 1,
      maxItems: 5
    }
  },
  required: ['rsi_org_id', 'playstyle_tags', 'focus_tags', 'languages']
};

export const UpdateOrganizationRequestSchema = {
  type: 'object' as const,
  properties: {
    name: { 
      type: 'string' as const,
      description: 'Organization name',
      minLength: 1,
      maxLength: 100
    },
    description: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization description',
      maxLength: 1000
    },
    website: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization website URL',
      format: 'uri' as const
    },
    discord_invite: { 
      type: 'string' as const,
      nullable: true,
      description: 'Discord server invite link',
      format: 'uri' as const
    },
    spectrum_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Spectrum organization URL',
      format: 'uri' as const
    },
    logo_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization logo URL',
      format: 'uri' as const
    },
    banner_url: { 
      type: 'string' as const,
      nullable: true,
      description: 'Organization banner URL',
      format: 'uri' as const
    },
    playstyle_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_PLAYSTYLE_TAGS]
      },
      description: 'Organization playstyle tags',
      minItems: 1,
      maxItems: 5
    },
    activity_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_ACTIVITY_TAGS]
      },
      description: 'Organization activity tags',
      minItems: 1,
      maxItems: 5
    }
  }
};

export const OrganizationListResponseSchema = {
  type: 'object' as const,
  properties: {
    organizations: {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Organization' }
    },
    pagination: { 
      $ref: '#/components/schemas/Pagination' 
    }
  },
  required: ['organizations', 'pagination']
};

export const OrganizationSearchRequestSchema = {
  type: 'object' as const,
  properties: {
    query: { 
      type: 'string' as const,
      description: 'Search query',
      minLength: 1,
      maxLength: 100
    },
    playstyle_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_PLAYSTYLE_TAGS]
      },
      description: 'Filter by playstyle tags'
    },
    activity_tags: {
      type: 'array' as const,
      items: { 
        type: 'string' as const,
        enum: [...VALID_ACTIVITY_TAGS]
      },
      description: 'Filter by activity tags'
    },
    min_members: { 
      type: 'integer' as const,
      minimum: 0,
      description: 'Minimum member count'
    },
    max_members: { 
      type: 'integer' as const,
      minimum: 0,
      description: 'Maximum member count'
    },
    page: { 
      type: 'integer' as const, 
      minimum: 1,
      default: 1,
      description: 'Page number'
    },
    limit: { 
      type: 'integer' as const, 
      minimum: 1, 
      maximum: 100,
      default: 20,
      description: 'Number of items per page'
    }
  },
  required: ['query']
};

export const OrganizationAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    total_views: { 
      type: 'integer' as const,
      description: 'Total number of views'
    },
    unique_visitors: { 
      type: 'integer' as const,
      description: 'Number of unique visitors'
    },
    views_by_day: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          date: { type: 'string' as const, format: 'date' as const },
          views: { type: 'integer' as const }
        }
      },
      description: 'Daily view statistics'
    },
    views_by_source: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          source: { type: 'string' as const },
          views: { type: 'integer' as const }
        }
      },
      description: 'Views by traffic source'
    }
  },
  required: ['total_views', 'unique_visitors', 'views_by_day', 'views_by_source']
};