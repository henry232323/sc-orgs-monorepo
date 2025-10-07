import { Router } from 'express';
import { ReputationController } from '../controllers/reputation_controller';
import { requireLogin, requireRSIVerification } from '../middleware/auth';
import { oapi } from './openapi_routes';

const router: Router = Router();
const reputationController = new ReputationController();

// Public routes (no authentication required)

// Search players
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Search Star Citizen players',
  description: 'Search for players by handle with filtering options',
  parameters: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of players per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    },
    {
      name: 'search',
      in: 'query',
      description: 'Search by player handle',
      schema: { type: 'string' }
    },
    {
      name: 'tags',
      in: 'query',
      description: 'Filter by tags (comma-separated)',
      schema: { type: 'string' }
    },
    {
      name: 'orgs',
      in: 'query',
      description: 'Filter by organizations (comma-separated)',
      schema: { type: 'string' }
    },
    {
      name: 'sort',
      in: 'query',
      description: 'Sort order',
      schema: { 
        type: 'string',
        enum: ['recent', 'reputation', 'alphabetical'],
        default: 'alphabetical'
      }
    }
  ],
  responses: {
    '200': {
      description: 'Players retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlayerSearchResponse' }
        }
      }
    },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/', reputationController.searchPlayers.bind(reputationController));

// Get player details
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Get player details',
  description: 'Get detailed information about a specific player including history, reports, comments, and tags',
  parameters: [
    {
      name: 'spectrumId',
      in: 'path',
      required: true,
      description: 'Player Spectrum ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Player details retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlayerDetailsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/players/:spectrumId', reputationController.getPlayerDetails.bind(reputationController));

// Lookup player by handle
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Lookup player by handle',
  description: 'Lookup a player by their handle and create a new record if not found',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/PlayerLookupRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Player found or created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlayerResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/players/lookup', reputationController.lookupPlayer.bind(reputationController));

// Search players by handle (current and historical)
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Search players by handle (current and historical)',
  description: 'Search for players by handle, including both current users and historical users who previously had that handle',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['handle'],
          properties: {
            handle: {
              type: 'string',
              description: 'Player handle to search for',
              minLength: 2
            }
          }
        }
      }
    }
  },
  responses: {
    '200': {
      description: 'Search results',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ScPlayer' }
                  },
                  total: { type: 'number' },
                  searchTerm: { type: 'string' },
                  currentCount: { type: 'number' },
                  historicalCount: { type: 'number' },
                  spectrumCount: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/search', reputationController.searchPlayersByHandle.bind(reputationController));

// Protected routes (require authentication)

// Sync player data with Spectrum
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Sync player data with Spectrum',
  description: 'Update player data with latest information from Spectrum API',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'spectrumId',
      in: 'path',
      required: true,
      description: 'Player Spectrum ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Player data synced successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlayerResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put('/players/:spectrumId/sync', requireLogin, reputationController.syncPlayerData.bind(reputationController));

// Create report
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Create a player report',
  description: 'Create a new report about a player (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateReportRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Report created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ReportResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/reports', requireRSIVerification, reputationController.createReport.bind(reputationController));

// Get report details
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Get report details',
  description: 'Get detailed information about a report including attestations',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Report ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  responses: {
    '200': {
      description: 'Report details retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ReportWithAttestationsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/reports/:id', reputationController.getReportDetails.bind(reputationController));

// Attest to report
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Attest to a report',
  description: 'Support, dispute, or remain neutral on a report (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Report ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AttestReportRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Attestation created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AttestationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/reports/:id/attest', requireRSIVerification, reputationController.attestToReport.bind(reputationController));

// Add comment
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Add a comment to a player',
  description: 'Add a public or private comment about a player (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'playerId',
      in: 'path',
      required: true,
      description: 'Player ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateCommentRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Comment added successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/players/:playerId/comments', requireRSIVerification, reputationController.addComment.bind(reputationController));

// Attest to comment
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Attest to a comment',
  description: 'Support, dispute, or remain neutral on a comment (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AttestCommentRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Attestation created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AttestationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/comments/:id/attest', requireRSIVerification, reputationController.attestToComment.bind(reputationController));

// Add tag
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Add a tag to a player',
  description: 'Add a positive, negative, or neutral tag to a player (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'playerId',
      in: 'path',
      required: true,
      description: 'Player ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateTagRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Tag added successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/TagResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/players/:playerId/tags', requireRSIVerification, reputationController.addTag.bind(reputationController));

// Attest to tag
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Attest to a tag',
  description: 'Support, dispute, or remain neutral on a tag (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Tag ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AttestTagRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Attestation created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AttestationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/tags/:id/attest', requireRSIVerification, reputationController.attestToTag.bind(reputationController));

// Enhanced Reporting System Routes

// Organization Reports
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Create organization report',
  description: 'Create a report about suspected organization affiliation (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateOrganizationReportRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Organization report created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/OrganizationReportResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/organization-reports', requireRSIVerification, reputationController.createOrganizationReport.bind(reputationController));

// Get organization reports by player
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Get organization reports by player',
  description: 'Get all organization reports for a specific player',
  parameters: [
    {
      name: 'playerId',
      in: 'path',
      required: true,
      description: 'Player ID',
      schema: { type: 'string', format: 'uuid' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of reports per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Organization reports retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/OrganizationReportsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/players/:playerId/organization-reports', reputationController.getOrganizationReportsByPlayer.bind(reputationController));

// Corroborate organization report
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Vote on organization report',
  description: 'Agree, disagree, or remain neutral on an organization report (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'reportId',
      in: 'path',
      required: true,
      description: 'Report ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateOrganizationReportCorroborationRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Vote recorded successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/OrganizationReportCorroborationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/organization-reports/:reportId/corroborate', requireRSIVerification, reputationController.corroborateOrganizationReport.bind(reputationController));

// Alt Account Reports
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Create alt account report',
  description: 'Create a report about suspected alt account (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateAltAccountReportRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Alt account report created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AltAccountReportResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/alt-account-reports', requireRSIVerification, reputationController.createAltAccountReport.bind(reputationController));

// Get alt account reports by player
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Get alt account reports by player',
  description: 'Get all alt account reports for a specific player',
  parameters: [
    {
      name: 'playerId',
      in: 'path',
      required: true,
      description: 'Player ID',
      schema: { type: 'string', format: 'uuid' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of reports per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Alt account reports retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AltAccountReportsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/players/:playerId/alt-account-reports', reputationController.getAltAccountReportsByPlayer.bind(reputationController));

// Corroborate alt account report
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Vote on alt account report',
  description: 'Agree, disagree, or remain neutral on an alt account report (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'reportId',
      in: 'path',
      required: true,
      description: 'Report ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateAltAccountReportCorroborationRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Vote recorded successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AltAccountReportCorroborationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/alt-account-reports/:reportId/corroborate', requireRSIVerification, reputationController.corroborateAltAccountReport.bind(reputationController));

// Affiliated People Reports
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Create affiliated people report',
  description: 'Create a report about suspected affiliated people (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateAffiliatedPeopleReportRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Affiliated people report created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AffiliatedPeopleReportResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/affiliated-people-reports', requireRSIVerification, reputationController.createAffiliatedPeopleReport.bind(reputationController));

// Get affiliated people reports by player
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Get affiliated people reports by player',
  description: 'Get all affiliated people reports for a specific player',
  parameters: [
    {
      name: 'playerId',
      in: 'path',
      required: true,
      description: 'Player ID',
      schema: { type: 'string', format: 'uuid' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of reports per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Affiliated people reports retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AffiliatedPeopleReportsResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFoundError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/players/:playerId/affiliated-people-reports', reputationController.getAffiliatedPeopleReportsByPlayer.bind(reputationController));

// Corroborate affiliated people report
oapi.validPath({
  tags: ['Reputation'],
  summary: 'Vote on affiliated people report',
  description: 'Agree, disagree, or remain neutral on an affiliated people report (requires RSI verification)',
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: 'reportId',
      in: 'path',
      required: true,
      description: 'Report ID',
      schema: { type: 'string', format: 'uuid' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateAffiliatedPeopleReportCorroborationRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Vote recorded successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AffiliatedPeopleReportCorroborationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/BadRequestError' },
    '401': { $ref: '#/components/responses/UnauthorizedError' },
    '403': { $ref: '#/components/responses/ForbiddenError' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/affiliated-people-reports/:reportId/corroborate', requireRSIVerification, reputationController.corroborateAffiliatedPeopleReport.bind(reputationController));

// Delete/Remove vote endpoints
router.delete('/comments/:id/attest', requireRSIVerification, reputationController.removeCommentAttestation.bind(reputationController));
router.delete('/tags/:id/attest', requireRSIVerification, reputationController.removeTagAttestation.bind(reputationController));
router.delete('/organization-reports/:reportId/corroborate', requireRSIVerification, reputationController.removeOrganizationReportCorroboration.bind(reputationController));
router.delete('/alt-account-reports/:reportId/corroborate', requireRSIVerification, reputationController.removeAltAccountReportCorroboration.bind(reputationController));
router.delete('/affiliated-people-reports/:reportId/corroborate', requireRSIVerification, reputationController.removeAffiliatedPeopleReportCorroboration.bind(reputationController));

export default router;
